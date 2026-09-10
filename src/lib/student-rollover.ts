import { db } from "../prisma/db";

export type StudentRolloverDecision =
  | "PROMOTE"
  | "REPEAT"
  | "WITHDRAW"
  | "TRANSFER"
  | "GRADUATE"
  | "PENDING";

export type StudentRolloverCandidate = {
  student: any;
  currentClass: any | undefined;
  currentHistory: any | undefined;
  alreadyRolledOver: boolean;
};

export async function getStudentRolloverCandidates(
  sourceSessionId: number,
  targetSessionId: number,
) {
  const sessions = await db.orm.public.AcademicSession.all();
  const sourceSession = sessions.find((item) => item.id === sourceSessionId);
  const targetSession = sessions.find((item) => item.id === targetSessionId);

  if (!sourceSession || !targetSession || sourceSession.schoolId !== targetSession.schoolId) {
    throw new Error("Academic session not found.");
  }
  if (sourceSession.status !== "COMPLETED") {
    throw new Error("The source session must be completed.");
  }
  if (targetSession.status !== "DRAFT") {
    throw new Error("The target session must be in DRAFT status.");
  }

  const [students, classes, histories] = await Promise.all([
    db.orm.public.Student.all(),
    db.orm.public.SchoolClass.all(),
    db.orm.public.StudentClassHistory.all(),
  ]);

  const candidates: StudentRolloverCandidate[] = [];

  for (const student of students) {
    if (student.schoolId !== sourceSession.schoolId || student.status !== "ACTIVE") continue;

    const currentHistory = histories.find(
      (item) =>
        item.studentId === student.id &&
        item.sessionId === sourceSessionId &&
        item.isCurrent === true,
    );

    if (!currentHistory) continue;

    const currentClass = classes.find(
      (item) => item.id === currentHistory.classId && item.schoolId === sourceSession.schoolId,
    );

    const targetHistory = histories.find(
      (item) => item.studentId === student.id && item.sessionId === targetSessionId,
    );

    candidates.push({
      student,
      currentClass,
      currentHistory,
      alreadyRolledOver: Boolean(targetHistory),
    });
  }

  return candidates.sort((a, b) => {
    const aName = `${a.student.firstName} ${a.student.lastName}`.toLowerCase();
    const bName = `${b.student.firstName} ${b.student.lastName}`.toLowerCase();
    return aName.localeCompare(bName);
  });
}
