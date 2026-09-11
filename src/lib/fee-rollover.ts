import { db } from "../prisma/db";
import { writeAuditLog } from "./audit";

export type FeeRolloverMode =
  | "AUTO_CARRY_SESSION"
  | "MANUAL_TRANSFER"
  | "CLEAR_WAIVE"
  | "HISTORICAL_OUTSTANDING";

export type FeeRolloverStudent = {
  student: any;
  previousCharges: number;
  previousPayments: number;
  previousBalance: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getFeeRolloverSummary(
  sourceSessionId: number,
  targetSessionId: number,
) {
  const sessions = await db.orm.public.AcademicSession.all();
  const sourceSession = sessions.find((item) => item.id === sourceSessionId);
  const targetSession = sessions.find((item) => item.id === targetSessionId);

  if (!sourceSession || !targetSession) throw new Error("Academic session not found.");
  if (sourceSession.schoolId !== targetSession.schoolId) throw new Error("Academic sessions belong to different schools.");
  if (sourceSession.status !== "COMPLETED") throw new Error("The source session must be completed.");
  if (targetSession.status !== "DRAFT") throw new Error("The target session must be in DRAFT status.");

  const [students, assignments, allocations, payments] = await Promise.all([
    db.orm.public.Student.all(),
    db.orm.public.FeeAssignment.all(),
    db.orm.public.PaymentAllocation.all(),
    db.orm.public.Payment.all(),
  ]);

  const completedPaymentIds = new Set(
    payments
      .filter((payment) => payment.schoolId === sourceSession.schoolId && payment.status === "COMPLETED")
      .map((payment) => payment.id),
  );

  const sourceAssignments = assignments.filter(
    (assignment) =>
      assignment.schoolId === sourceSession.schoolId &&
      assignment.sessionId === sourceSessionId &&
      assignment.status === "ACTIVE",
  );

  const allocatedByAssignment = new Map<number, number>();
  for (const allocation of allocations) {
    if (allocation.schoolId !== sourceSession.schoolId || !completedPaymentIds.has(allocation.paymentId)) continue;
    allocatedByAssignment.set(
      allocation.feeAssignmentId,
      (allocatedByAssignment.get(allocation.feeAssignmentId) ?? 0) + Number(allocation.amount),
    );
  }

  const schoolStudents = students
    .filter((student) => student.schoolId === sourceSession.schoolId)
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  const rows: FeeRolloverStudent[] = [];
  for (const student of schoolStudents) {
    const studentAssignments = sourceAssignments.filter((assignment) => assignment.studentId === student.id);
    const charges = studentAssignments.reduce((sum, assignment) => sum + Number(assignment.amount), 0);
    const paid = studentAssignments.reduce(
      (sum, assignment) => sum + Math.min(Number(assignment.amount), allocatedByAssignment.get(assignment.id) ?? 0),
      0,
    );
    const balance = roundMoney(Math.max(0, charges - paid));

    if (charges > 0 || paid > 0) rows.push({ student, previousCharges: charges, previousPayments: paid, previousBalance: balance });
  }

  return {
    sourceSession,
    targetSession,
    students: rows,
    totals: {
      charges: rows.reduce((sum, row) => sum + row.previousCharges, 0),
      payments: rows.reduce((sum, row) => sum + row.previousPayments, 0),
      outstanding: rows.reduce((sum, row) => sum + row.previousBalance, 0),
    },
  };
}

export async function applyFeeRollover(input: {
  sourceSessionId: number;
  targetSessionId: number;
  actorUserId: number;
  mode: FeeRolloverMode;
  studentIds?: number[];
  reason: string;
}) {
  const reason = input.reason.trim();
  if (!reason) throw new Error("A reason is required for fee rollover.");

  const sessions = await db.orm.public.AcademicSession.all();
  const sourceSession = sessions.find((item) => item.id === input.sourceSessionId);
  const targetSession = sessions.find((item) => item.id === input.targetSessionId);
  if (!sourceSession || !targetSession) throw new Error("Academic session not found.");
  if (sourceSession.schoolId !== targetSession.schoolId) throw new Error("Academic sessions belong to different schools.");
  if (sourceSession.status !== "COMPLETED") throw new Error("The source session must be completed.");
  if (targetSession.status !== "DRAFT") throw new Error("The target session must be in DRAFT status.");

  const [assignments, allocations, payments] = await Promise.all([
    db.orm.public.FeeAssignment.all(),
    db.orm.public.PaymentAllocation.all(),
    db.orm.public.Payment.all(),
  ]);

  const completedPaymentIds = new Set(
    payments.filter((payment) => payment.schoolId === sourceSession.schoolId && payment.status === "COMPLETED").map((payment) => payment.id),
  );
  const allocatedByAssignment = new Map<number, number>();
  for (const allocation of allocations) {
    if (allocation.schoolId !== sourceSession.schoolId || !completedPaymentIds.has(allocation.paymentId)) continue;
    allocatedByAssignment.set(allocation.feeAssignmentId, (allocatedByAssignment.get(allocation.feeAssignmentId) ?? 0) + Number(allocation.amount));
  }

  const sourceAssignments = assignments.filter(
    (assignment) =>
      assignment.schoolId === sourceSession.schoolId &&
      assignment.sessionId === sourceSession.id &&
      assignment.status === "ACTIVE" &&
      (input.mode !== "MANUAL_TRANSFER" || !input.studentIds?.length || input.studentIds.includes(assignment.studentId)),
  );

  if (input.mode === "HISTORICAL_OUTSTANDING" || input.mode === "CLEAR_WAIVE") {
    await writeAuditLog({
      schoolId: sourceSession.schoolId,
      userId: input.actorUserId,
      action: input.mode === "CLEAR_WAIVE" ? "UPDATE" : "CREATE",
      entity: "FeeRollover",
      entityId: targetSession.id,
      newValue: { sourceSessionId: sourceSession.id, targetSessionId: targetSession.id, mode: input.mode, reason },
    });
    return { mode: input.mode, created: 0, skipped: 0, totalCarried: 0 };
  }

  const createdMarker = `Carried from session ${sourceSession.id}, assignment `;
  let created = 0;
  let skipped = 0;
  let totalCarried = 0;

  for (const assignment of sourceAssignments) {
    const outstanding = roundMoney(Math.max(0, Number(assignment.amount) - Math.min(Number(assignment.amount), allocatedByAssignment.get(assignment.id) ?? 0)));
    if (outstanding <= 0) continue;

    const marker = `${createdMarker}${assignment.id}`;
    const alreadyExists = assignments.some(
      (candidate) =>
        candidate.schoolId === targetSession.schoolId &&
        candidate.studentId === assignment.studentId &&
        candidate.sessionId === targetSession.id &&
        candidate.status === "ACTIVE" &&
        candidate.description?.includes(marker),
    );

    if (alreadyExists) {
      skipped += 1;
      continue;
    }

    const createdAssignment = await db.orm.public.FeeAssignment.create({
      schoolId: targetSession.schoolId,
      studentId: assignment.studentId,
      feeTypeId: assignment.feeTypeId,
      sessionId: targetSession.id,
      termId: null,
      classId: null,
      amount: outstanding.toFixed(2),
      dueDate: null,
      description: `${marker} — ${sourceSession.name}. ${assignment.description ?? "Outstanding balance"}`,
      status: "ACTIVE",
    });

    assignments.push(createdAssignment);
    created += 1;
    totalCarried = roundMoney(totalCarried + outstanding);

    await writeAuditLog({
      schoolId: targetSession.schoolId,
      userId: input.actorUserId,
      action: "CREATE",
      entity: "FeeAssignment",
      entityId: createdAssignment.id,
      newValue: {
        rollover: true,
        mode: input.mode,
        sourceSessionId: sourceSession.id,
        sourceAssignmentId: assignment.id,
        amount: outstanding,
        reason,
      },
    });
  }

  await writeAuditLog({
    schoolId: targetSession.schoolId,
    userId: input.actorUserId,
    action: "CREATE",
    entity: "FeeRollover",
    entityId: targetSession.id,
    newValue: { sourceSessionId: sourceSession.id, targetSessionId: targetSession.id, mode: input.mode, created, skipped, totalCarried, reason },
  });

  return { mode: input.mode, created, skipped, totalCarried };
}
