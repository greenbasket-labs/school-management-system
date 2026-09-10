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
  const [assignments, payments, students, feeTypes, classes] =
    await Promise.all([
      db.orm.public.FeeAssignment.all(),
      db.orm.public.Payment.all(),
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

  const totalBilled = activeAssignments.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalCollected = completedPayments.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalRefunded = refundedPayments.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const paymentByMethod = schoolPayments.reduce<Record<string, number>>(
    (summary, payment) => {
      summary[payment.method] =
        (summary[payment.method] ?? 0) + Number(payment.amount);
      return summary;
    },
    {},
  );

  const feeTypeTotals = activeAssignments.reduce<Record<string, number>>(
    (summary, assignment) => {
      const feeType = feeTypes.find((item) => item.id === assignment.feeTypeId);
      const key = feeType?.name ?? `Fee #${assignment.feeTypeId}`;
      summary[key] = (summary[key] ?? 0) + Number(assignment.amount);
      return summary;
    },
    {},
  );

  const classTotals = activeAssignments.reduce<Record<string, number>>(
    (summary, assignment) => {
      const schoolClass = classes.find((item) => item.id === assignment.classId);
      const key = schoolClass
        ? `${schoolClass.name}${schoolClass.section ? ` — ${schoolClass.section}` : ""}`
        : "Unassigned";
      summary[key] = (summary[key] ?? 0) + Number(assignment.amount);
      return summary;
    },
    {},
  );

  return {
    schoolId,
    filters,
    totals: {
      totalBilled,
      totalCollected,
      totalRefunded,
      outstanding: Math.max(totalBilled - totalCollected, 0),
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

  const [students, assignments, payments, feeTypes] = await Promise.all([
    db.orm.public.Student.all(),
    db.orm.public.FeeAssignment.all(),
    db.orm.public.Payment.all(),
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
      (!filters.termId || item.termId === filters.termId),
  );

  const statementPayments = payments.filter(
    (item) =>
      item.schoolId === schoolId &&
      item.studentId === studentId &&
      inDateRange(item.paymentDate, filters.startDate, filters.endDate),
  );

  return {
    student: {
      id: student.id,
      permanentId: student.permanentId,
      name: [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" "),
    },
    totals: report.totals,
    charges: statementAssignments.map((item) => ({
      id: item.id,
      fee: feeTypes.find((fee) => fee.id === item.feeTypeId)?.name ?? "Fee",
      amount: Number(item.amount),
      dueDate: item.dueDate,
      status: item.status,
      description: item.description,
    })),
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
