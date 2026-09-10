import { db } from "../prisma/db";

export type FeeRolloverStudent = {
  student: any;
  previousCharges: number;
  previousPayments: number;
  previousBalance: number;
};

export async function getFeeRolloverSummary(
  sourceSessionId: number,
  targetSessionId: number,
) {
  const sessions = await db.orm.public.AcademicSession.all();
  const sourceSession = sessions.find((item) => item.id === sourceSessionId);
  const targetSession = sessions.find((item) => item.id === targetSessionId);

  if (!sourceSession || !targetSession) {
    throw new Error("Academic session not found.");
  }
  if (sourceSession.schoolId !== targetSession.schoolId) {
    throw new Error("Academic sessions belong to different schools.");
  }
  if (sourceSession.status !== "COMPLETED") {
    throw new Error("The source session must be completed.");
  }
  if (targetSession.status !== "DRAFT") {
    throw new Error("The target session must be in DRAFT status.");
  }

  const [students, assignments, payments] = await Promise.all([
    db.orm.public.Student.all(),
    db.orm.public.FeeAssignment.all(),
    db.orm.public.Payment.all(),
  ]);

  const schoolStudents = students
    .filter((student) => student.schoolId === sourceSession.schoolId)
    .sort((a, b) => {
      const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
      const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
      return aName.localeCompare(bName);
    });

  const rows: FeeRolloverStudent[] = [];

  for (const student of schoolStudents) {
    const charges = assignments
      .filter(
        (assignment) =>
          assignment.schoolId === sourceSession.schoolId &&
          assignment.studentId === student.id &&
          assignment.sessionId === sourceSessionId &&
          assignment.status === "ACTIVE",
      )
      .reduce((sum, assignment) => sum + Number(assignment.amount), 0);

    const paid = payments
      .filter(
        (payment) =>
          payment.schoolId === sourceSession.schoolId &&
          payment.studentId === student.id &&
          payment.status === "COMPLETED",
      )
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const balance = Math.max(0, charges - paid);

    if (charges > 0 || paid > 0) {
      rows.push({
        student,
        previousCharges: charges,
        previousPayments: paid,
        previousBalance: balance,
      });
    }
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
