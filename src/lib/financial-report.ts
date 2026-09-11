import { db } from "../prisma/db";

export type FinancialReportFilters = {
  sessionId?: number;
  termId?: number;
  classId?: number;
  studentId?: number;
  startDate?: Date;
  endDate?: Date;
};

function inDateRange(value: Date, startDate?: Date, endDate?: Date) {
  const time = value.getTime();
  if (startDate && time < startDate.getTime()) return false;
  if (endDate && time > endDate.getTime()) return false;
  return true;
}

export async function getSchoolFinancialReport(
  schoolId: number,
  filters: FinancialReportFilters = {},
) {
  const [assignments, payments, paymentAllocations, students, feeTypes, classes] =
    await Promise.all([
      db.orm.public.FeeAssignment.all(),
      db.orm.public.Payment.all(),
      db.orm.public.PaymentAllocation.all(),
      db.orm.public.Student.all(),
      db.orm.public.FeeType.all(),
      db.orm.public.SchoolClass.all(),
    ]);

  const schoolAssignments = assignments.filter((item) => {
    if (item.schoolId !== schoolId) return false;
    if (filters.sessionId && item.sessionId !== filters.sessionId) return false;
    if (filters.termId && item.termId !== filters.termId) return false;
    if (filters.classId && item.classId !== filters.classId) return false;
    if (filters.studentId && item.studentId !== filters.studentId) return false;
    return true;
  });

  const schoolPayments = payments.filter((item) => {
    if (item.schoolId !== schoolId) return false;
    if (filters.studentId && item.studentId !== filters.studentId) return false;
    if (!inDateRange(item.paymentDate, filters.startDate, filters.endDate)) {
      return false;
    }

    if (filters.classId) {
      const student = students.find((candidate) => candidate.id === item.studentId);
      if (!student || student.currentClassId !== filters.classId) return false;
    }

    return true;
  });

  const activeAssignments = schoolAssignments.filter(
    (item) => item.status === "ACTIVE",
  );
  const completedPayments = schoolPayments.filter(
    (item) => item.status === "COMPLETED",
  );
  const refundedPayments = schoolPayments.filter(
    (item) => item.status === "REFUNDED",
  );

  const completedPaymentIds = new Set(completedPayments.map((item) => item.id));
  const selectedAssignmentIds = new Set(activeAssignments.map((item) => item.id));

  const relevantAllocations = paymentAllocations.filter(
    (allocation) =>
      allocation.schoolId === schoolId &&
      selectedAssignmentIds.has(allocation.feeAssignmentId) &&
      completedPaymentIds.has(allocation.paymentId),
  );

  const paidByAssignment = new Map<number, number>();
  const collectedByPayment = new Map<number, number>();
  for (const allocation of relevantAllocations) {
    paidByAssignment.set(
      allocation.feeAssignmentId,
      (paidByAssignment.get(allocation.feeAssignmentId) ?? 0) + Number(allocation.amount),
    );
    collectedByPayment.set(
      allocation.paymentId,
      (collectedByPayment.get(allocation.paymentId) ?? 0) + Number(allocation.amount),
    );
  }

  // A payment may be allocated to an assignment outside the current report
  // filter. Calculate its total allocation across the whole school before
  // calling any remainder "unallocated credit".
  const allocatedByPayment = new Map<number, number>();
  for (const allocation of paymentAllocations) {
    if (allocation.schoolId !== schoolId || !completedPaymentIds.has(allocation.paymentId)) {
      continue;
    }
    allocatedByPayment.set(
      allocation.paymentId,
      (allocatedByPayment.get(allocation.paymentId) ?? 0) + Number(allocation.amount),
    );
  }

  const totalBilled = activeAssignments.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalCollected = relevantAllocations.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalRefunded = refundedPayments.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const outstanding = activeAssignments.reduce(
    (sum, item) =>
      sum + Math.max(Number(item.amount) - (paidByAssignment.get(item.id) ?? 0), 0),
    0,
  );

  const unallocatedCredit = completedPayments.reduce(
    (sum, payment) =>
      sum + Math.max(Number(payment.amount) - (allocatedByPayment.get(payment.id) ?? 0), 0),
    0,
  );

  const paymentByMethod = completedPayments.reduce<Record<string, number>>(
    (summary, payment) => {
      const collected = collectedByPayment.get(payment.id) ?? 0;
      if (collected > 0) {
        summary[payment.method] = (summary[payment.method] ?? 0) + collected;
      }
      return summary;
    },
    {},
  );

  const feeTypeTotals = activeAssignments.reduce<
    Record<string, { billed: number; collected: number; outstanding: number }>
  >((summary, assignment) => {
    const feeType = feeTypes.find((item) => item.id === assignment.feeTypeId);
    const key = feeType?.name ?? `Fee #${assignment.feeTypeId}`;
    const billed = Number(assignment.amount);
    const collected = Math.min(paidByAssignment.get(assignment.id) ?? 0, billed);
    const outstanding = Math.max(billed - collected, 0);

    if (!summary[key]) {
      summary[key] = { billed: 0, collected: 0, outstanding: 0 };
    }
    summary[key].billed += billed;
    summary[key].collected += collected;
    summary[key].outstanding += outstanding;
    return summary;
  }, {});

  const classTotals = activeAssignments.reduce<
    Record<string, { billed: number; collected: number; outstanding: number }>
  >((summary, assignment) => {
    const schoolClass = classes.find((item) => item.id === assignment.classId);
    const key = schoolClass
      ? `${schoolClass.name}${schoolClass.section ? ` — ${schoolClass.section}` : ""}`
      : "Unassigned";
    const billed = Number(assignment.amount);
    const collected = Math.min(paidByAssignment.get(assignment.id) ?? 0, billed);
    const outstanding = Math.max(billed - collected, 0);

    if (!summary[key]) {
      summary[key] = { billed: 0, collected: 0, outstanding: 0 };
    }
    summary[key].billed += billed;
    summary[key].collected += collected;
    summary[key].outstanding += outstanding;
    return summary;
  }, {});

  return {
    schoolId,
    filters,
    totals: {
      totalBilled,
      totalCollected,
      totalRefunded,
      outstanding,
      unallocatedCredit,
      collectionPercent:
        totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
      assignments: activeAssignments.length,
      payments: completedPayments.length,
    },
    paymentByMethod,
    feeTypeTotals,
    classTotals,
  };
}

export async function getStudentFinancialStatement(
  schoolId: number,
  studentId: number,
  filters: Omit<FinancialReportFilters, "studentId"> = {},
) {
  const report = await getSchoolFinancialReport(schoolId, {
    ...filters,
    studentId,
  });

  const [students, assignments, payments, paymentAllocations, feeTypes] = await Promise.all([
    db.orm.public.Student.all(),
    db.orm.public.FeeAssignment.all(),
    db.orm.public.Payment.all(),
    db.orm.public.PaymentAllocation.all(),
    db.orm.public.FeeType.all(),
  ]);

  const student = students.find(
    (item) => item.id === studentId && item.schoolId === schoolId,
  );
  if (!student) throw new Error("Student not found in this school.");

  const statementAssignments = assignments.filter(
    (item) =>
      item.schoolId === schoolId &&
      item.studentId === studentId &&
      (!filters.sessionId || item.sessionId === filters.sessionId) &&
      (!filters.termId || item.termId === filters.termId) &&
      (!filters.classId || item.classId === filters.classId),
  );

  const statementPayments = payments.filter(
    (item) =>
      item.schoolId === schoolId &&
      item.studentId === studentId &&
      inDateRange(item.paymentDate, filters.startDate, filters.endDate),
  );

  const statementPaymentIds = new Set(
    statementPayments
      .filter((payment) => payment.status === "COMPLETED")
      .map((payment) => payment.id),
  );
  const statementAssignmentIds = new Set(statementAssignments.map((item) => item.id));
  const statementPaidByAssignment = new Map<number, number>();

  for (const allocation of paymentAllocations) {
    if (
      allocation.schoolId !== schoolId ||
      !statementAssignmentIds.has(allocation.feeAssignmentId) ||
      !statementPaymentIds.has(allocation.paymentId)
    ) {
      continue;
    }
    statementPaidByAssignment.set(
      allocation.feeAssignmentId,
      (statementPaidByAssignment.get(allocation.feeAssignmentId) ?? 0) + Number(allocation.amount),
    );
  }

  return {
    student: {
      id: student.id,
      permanentId: student.permanentId,
      name: [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" "),
    },
    totals: report.totals,
    charges: statementAssignments.map((item) => {
      const amount = Number(item.amount);
      const paid = Math.min(statementPaidByAssignment.get(item.id) ?? 0, amount);
      return {
        id: item.id,
        fee: feeTypes.find((fee) => fee.id === item.feeTypeId)?.name ?? "Fee",
        amount,
        paid,
        outstanding: Math.max(amount - paid, 0),
        dueDate: item.dueDate,
        status: item.status,
        description: item.description,
      };
    }),
    payments: statementPayments.map((item) => ({
      id: item.id,
      amount: Number(item.amount),
      method: item.method,
      paymentDate: item.paymentDate,
      reference: item.reference,
      status: item.status,
      description: item.description,
    })),
  };
}
