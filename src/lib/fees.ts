import { Temporal } from "@js-temporal/polyfill";
import { db } from "../prisma/db";
import { hasPermission } from "./permissions";
import { writeAuditLog } from "./audit";
import {
  calculatePaymentAllocation,
  type PaymentAllocationCandidate,
} from "./payment-allocation";

function requirePositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
}

function requireValidId(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${field}.`);
  }
}

export async function getFeeTypes(schoolId: number) {
  requireValidId(schoolId, "school ID");

  const feeTypes = await db.orm.public.FeeType.all();

  return feeTypes
    .filter((feeType) => feeType.schoolId === schoolId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getActiveFeeTypes(schoolId: number) {
  const feeTypes = await getFeeTypes(schoolId);
  return feeTypes.filter((feeType) => feeType.status === "ACTIVE");
}

export async function getFeeTypeById(schoolId: number, feeTypeId: number) {
  requireValidId(schoolId, "school ID");
  requireValidId(feeTypeId, "fee type ID");

  const feeTypes = await db.orm.public.FeeType.all();

  return (
    feeTypes.find(
      (feeType) => feeType.id === feeTypeId && feeType.schoolId === schoolId,
    ) ?? null
  );
}

export async function createFeeType(schoolId: number, name: string, description?: string) {
  requireValidId(schoolId, "school ID");
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Fee type name is required.");
  if (normalizedName.length > 150) throw new Error("Fee type name is too long.");

  const existing = await getFeeTypes(schoolId);
  if (existing.some((feeType) => feeType.name.toLowerCase() === normalizedName.toLowerCase())) {
    throw new Error("A fee type with this name already exists.");
  }

  const feeType = await db.orm.public.FeeType.create({
    schoolId,
    name: normalizedName,
    description: description?.trim() || null,
    status: "ACTIVE",
  });

  await writeAuditLog({
    schoolId,
    action: "CREATE",
    entity: "FeeType",
    entityId: feeType.id,
    newValue: { name: normalizedName, description: description?.trim() || null, status: "ACTIVE" },
  });

  return feeType;
}

export async function updateFeeType(schoolId: number, feeTypeId: number, name: string, description?: string) {
  const feeType = await getFeeTypeById(schoolId, feeTypeId);
  if (!feeType) throw new Error("Fee type not found.");

  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Fee type name is required.");
  if (normalizedName.length > 150) throw new Error("Fee type name is too long.");

  const existing = await getFeeTypes(schoolId);
  if (existing.some((item) => item.id !== feeTypeId && item.name.toLowerCase() === normalizedName.toLowerCase())) {
    throw new Error("A fee type with this name already exists.");
  }

  const updated = await db.orm.public.FeeType.where({ id: feeTypeId }).update({
    name: normalizedName,
    description: description?.trim() || null,
  });

  await writeAuditLog({
    schoolId,
    action: "UPDATE",
    entity: "FeeType",
    entityId: feeTypeId,
    oldValue: { name: feeType.name, description: feeType.description, status: feeType.status },
    newValue: { name: normalizedName, description: description?.trim() || null, status: feeType.status },
  });

  return updated;
}

export async function setFeeTypeStatus(schoolId: number, feeTypeId: number, status: "ACTIVE" | "INACTIVE") {
  const feeType = await getFeeTypeById(schoolId, feeTypeId);
  if (!feeType) throw new Error("Fee type not found.");

  const updated = await db.orm.public.FeeType.where({ id: feeTypeId }).update({ status });

  await writeAuditLog({
    schoolId,
    action: "UPDATE",
    entity: "FeeType",
    entityId: feeTypeId,
    oldValue: { status: feeType.status },
    newValue: { status },
  });

  return updated;
}

export async function getStudentsForFeeAssignment(schoolId: number) {
  requireValidId(schoolId, "school ID");
  const students = await db.orm.public.Student.all();
  return students
    .filter((student) => student.schoolId === schoolId && student.status === "ACTIVE")
    .sort((a, b) => `${a.firstName} ${a.lastName}`.toLowerCase().localeCompare(`${b.firstName} ${b.lastName}`.toLowerCase()));
}

export async function getAcademicSessionsForFees(schoolId: number) {
  requireValidId(schoolId, "school ID");
  const sessions = await db.orm.public.AcademicSession.all();
  return sessions.filter((session) => session.schoolId === schoolId).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

export async function getTermsForSession(sessionId: number) {
  requireValidId(sessionId, "session ID");
  const terms = await db.orm.public.Term.all();
  return terms.filter((term) => term.sessionId === sessionId).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export async function getClassesForSession(schoolId: number, sessionId: number) {
  requireValidId(schoolId, "school ID");
  requireValidId(sessionId, "session ID");
  const classes = await db.orm.public.SchoolClass.all();
  return classes
    .filter((schoolClass) => schoolClass.schoolId === schoolId && schoolClass.sessionId === sessionId)
    .sort((a, b) => `${a.name} ${a.section ?? ""}`.trim().localeCompare(`${b.name} ${b.section ?? ""}`.trim()));
}

export async function createFeeAssignment(input: {
  schoolId: number;
  studentId: number;
  feeTypeId: number;
  sessionId: number;
  termId?: number;
  classId?: number;
  amount: number;
  dueDate?: Date;
  description?: string;
}) {
  requireValidId(input.schoolId, "school ID");
  requireValidId(input.studentId, "student ID");
  requireValidId(input.feeTypeId, "fee type ID");
  requireValidId(input.sessionId, "session ID");
  if (input.termId !== undefined) requireValidId(input.termId, "term ID");
  if (input.classId !== undefined) requireValidId(input.classId, "class ID");
  requirePositiveAmount(input.amount);

  const students = await db.orm.public.Student.all();
  const student = students.find((item) => item.id === input.studentId && item.schoolId === input.schoolId);
  if (!student) throw new Error("Student not found in this school.");

  const feeType = await getFeeTypeById(input.schoolId, input.feeTypeId);
  if (!feeType) throw new Error("Fee type not found in this school.");
  if (feeType.status !== "ACTIVE") throw new Error("This fee type is inactive.");

  const sessions = await getAcademicSessionsForFees(input.schoolId);
  if (!sessions.some((item) => item.id === input.sessionId)) throw new Error("Academic session not found in this school.");

  if (input.termId !== undefined) {
    const terms = await getTermsForSession(input.sessionId);
    if (!terms.some((term) => term.id === input.termId)) throw new Error("Term does not belong to the selected session.");
  }

  if (input.classId !== undefined) {
    const classes = await getClassesForSession(input.schoolId, input.sessionId);
    if (!classes.some((schoolClass) => schoolClass.id === input.classId)) {
      throw new Error("Class does not belong to the selected school and session.");
    }
  }

  const assignments = await db.orm.public.FeeAssignment.all();
  const duplicate = assignments.some(
    (assignment) =>
      assignment.schoolId === input.schoolId &&
      assignment.studentId === input.studentId &&
      assignment.feeTypeId === input.feeTypeId &&
      assignment.sessionId === input.sessionId &&
      (assignment.termId ?? null) === (input.termId ?? null) &&
      assignment.status === "ACTIVE",
  );
  if (duplicate) throw new Error("This fee has already been assigned to the student for the selected session/term.");

  const dueDate = input.dueDate ? Temporal.Instant.fromEpochMilliseconds(input.dueDate.getTime()) : null;
  const assignment = await db.orm.public.FeeAssignment.create({
    schoolId: input.schoolId,
    studentId: input.studentId,
    feeTypeId: input.feeTypeId,
    sessionId: input.sessionId,
    termId: input.termId ?? null,
    classId: input.classId ?? null,
    amount: input.amount.toFixed(2),
    dueDate,
    description: input.description?.trim() || null,
    status: "ACTIVE",
  });

  await writeAuditLog({
    schoolId: input.schoolId,
    action: "CREATE",
    entity: "FeeAssignment",
    entityId: assignment.id,
    newValue: {
      studentId: input.studentId,
      feeTypeId: input.feeTypeId,
      sessionId: input.sessionId,
      termId: input.termId ?? null,
      classId: input.classId ?? null,
      amount: input.amount,
      dueDate: input.dueDate ?? null,
      description: input.description?.trim() || null,
      status: "ACTIVE",
    },
  });

  return assignment;
}

export async function getStudentFeeAssignments(schoolId: number, studentId: number) {
  requireValidId(schoolId, "school ID");
  requireValidId(studentId, "student ID");
  const students = await db.orm.public.Student.all();
  if (!students.some((item) => item.id === studentId && item.schoolId === schoolId)) throw new Error("Student not found in this school.");
  const assignments = await db.orm.public.FeeAssignment.all();
  return assignments.filter((assignment) => assignment.schoolId === schoolId && assignment.studentId === studentId).sort((a, b) => b.id - a.id);
}

export async function getStudentPayments(schoolId: number, studentId: number) {
  requireValidId(schoolId, "school ID");
  requireValidId(studentId, "student ID");
  const students = await db.orm.public.Student.all();
  if (!students.some((item) => item.id === studentId && item.schoolId === schoolId)) throw new Error("Student not found in this school.");
  const payments = await db.orm.public.Payment.all();
  return payments.filter((payment) => payment.schoolId === schoolId && payment.studentId === studentId).sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
}

export async function getStudentFinancialSummary(schoolId: number, studentId: number) {
  const assignments = await getStudentFeeAssignments(schoolId, studentId);
  const payments = await getStudentPayments(schoolId, studentId);
  const totalDue = assignments.filter((item) => item.status === "ACTIVE").reduce((total, item) => total + Number(item.amount), 0);
  const totalPaid = payments.filter((item) => item.status === "COMPLETED").reduce((total, item) => total + Number(item.amount), 0);
  const balance = totalDue - totalPaid;
  return { totalDue, totalPaid, balance, assignments, payments };
}

export async function createPayment(input: {
  schoolId: number;
  studentId: number;
  cashierUserId: number;
  amount: number;
  method: "CASH" | "BANK_TRANSFER" | "POS" | "ONLINE" | "OTHER";
  paymentDate: Date;
  reference?: string;
  description?: string;
}) {
  requireValidId(input.schoolId, "school ID");
  requireValidId(input.studentId, "student ID");
  requireValidId(input.cashierUserId, "cashier user ID");
  requirePositiveAmount(input.amount);

  const allowed = await hasPermission(input.cashierUserId, "payments.create");
  if (!allowed) throw new Error("You do not have permission to record payments.");

  const users = await db.orm.public.User.all();
  const cashier = users.find((user) => user.id === input.cashierUserId && user.schoolId === input.schoolId && user.status === "ACTIVE");
  if (!cashier) throw new Error("Cashier is not an active user in this school.");

  const students = await db.orm.public.Student.all();
  const student = students.find((item) => item.id === input.studentId && item.schoolId === input.schoolId);
  if (!student) throw new Error("Student not found in this school.");

  const assignments = await db.orm.public.FeeAssignment.all();
  const studentAssignments = assignments.filter(
    (assignment) => assignment.schoolId === input.schoolId && assignment.studentId === input.studentId && assignment.status === "ACTIVE",
  );

  const paymentAllocations = await db.orm.public.PaymentAllocation.all();
  const allocatedByAssignment = new Map<number, number>();
  for (const allocation of paymentAllocations) {
    if (allocation.schoolId !== input.schoolId || allocation.studentId !== input.studentId) continue;
    const current = allocatedByAssignment.get(allocation.feeAssignmentId) ?? 0;
    allocatedByAssignment.set(allocation.feeAssignmentId, current + Number(allocation.amount));
  }

  const candidates: PaymentAllocationCandidate[] = studentAssignments.map((assignment) => ({
    feeAssignmentId: assignment.id,
    studentId: assignment.studentId,
    schoolId: assignment.schoolId,
    amount: Number(assignment.amount),
    allocatedAmount: allocatedByAssignment.get(assignment.id) ?? 0,
    dueDate: assignment.dueDate ?? null,
    createdAt: assignment.createdAt,
    status: assignment.status,
  }));

  const calculated = calculatePaymentAllocation({
    paymentAmount: input.amount,
    studentId: input.studentId,
    schoolId: input.schoolId,
    candidates,
    strategy: "OLDEST_DUE",
  });

  const payment = await db.orm.public.Payment.create({
    schoolId: input.schoolId,
    studentId: input.studentId,
    cashierUserId: input.cashierUserId,
    amount: input.amount.toFixed(2),
    method: input.method,
    paymentDate: input.paymentDate,
    reference: input.reference?.trim() || null,
    description: input.description?.trim() || null,
    status: "COMPLETED",
  });

  for (const allocation of calculated.allocations) {
    await db.orm.public.PaymentAllocation.create({
      schoolId: input.schoolId,
      studentId: input.studentId,
      paymentId: payment.id,
      feeAssignmentId: allocation.feeAssignmentId,
      amount: allocation.amount.toFixed(2),
    });
  }

  const receiptNumber = await generateReceiptNumber(input.schoolId, payment.id);
  const receipt = await db.orm.public.Receipt.create({
    schoolId: input.schoolId,
    paymentId: payment.id,
    receiptNumber,
  });

  await writeAuditLog({
    schoolId: input.schoolId,
    action: "CREATE",
    entity: "Payment",
    entityId: payment.id,
    newValue: {
      studentId: input.studentId,
      amount: input.amount,
      method: input.method,
      paymentDate: input.paymentDate,
      allocation: calculated.allocations,
      unallocatedAmount: calculated.unallocatedAmount,
      receiptNumber,
    },
  });

  return { payment, receipt, allocations: calculated.allocations, unallocatedAmount: calculated.unallocatedAmount };
}

export async function generateReceiptNumber(schoolId: number, paymentId: number) {
  requireValidId(schoolId, "school ID");
  requireValidId(paymentId, "payment ID");
  const year = new Date().getFullYear();
  return `RCT-${year}-${String(paymentId).padStart(6, "0")}`;
}

export async function getPaymentById(schoolId: number, paymentId: number) {
  requireValidId(schoolId, "school ID");
  requireValidId(paymentId, "payment ID");
  const payments = await db.orm.public.Payment.all();
  return payments.find((payment) => payment.id === paymentId && payment.schoolId === schoolId) ?? null;
}

export async function getReceiptForPayment(schoolId: number, paymentId: number) {
  const payment = await getPaymentById(schoolId, paymentId);
  if (!payment) throw new Error("Payment not found.");
  const receipts = await db.orm.public.Receipt.all();
  return receipts.find((receipt) => receipt.paymentId === paymentId && receipt.schoolId === schoolId) ?? null;
}
