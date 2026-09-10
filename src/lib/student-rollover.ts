import { getActiveAcademicSession } from "./academic-sessions";
import { db } from "../prisma/db";

export type StudentRolloverDecision =
  | "PROMOTE"
  | "REPEAT"
  | "WITHDRAW"
  | "TRANSFER"
  | "GRADUATE"
  | "PENDING";

export type StudentRolloverCandidate = {
  studentId: number;
  permanentId: string;
  studentName: string;
  status: string;
  currentClassId: number | null;
  currentClassName: string | null;
  currentSessionId: number | null;
  decision: StudentRolloverDecision;
};

export async function getStudentRolloverCandidates(
  schoolId: number,
  sourceSessionId?: number,
) {
  const activeSession = await getActiveAcademicSession(schoolId);
  const sessionId = sourceSessionId ?? activeSession?.id;

  if (!sessionId) {
    throw new Error("No academic session is available for rollover.");
  }

  const sessions = await db.orm.public.AcademicSession.all();
  const sourceSession = sessions.find(
    (session) =>
      session.id === sessionId &&
      session.schoolId === schoolId,
  );

  if (!sourceSession) {
    throw new Error("Source academic session not found.");
  }

  const students = await db.orm.public.Student.all();
  const classes = await db.orm.public.SchoolClass.all();
  const histories = await db.orm.public.StudentClassHistory.all();

  const candidates: StudentRolloverCandidate[] = [];

  for (const student of students) {
    if (student.schoolId !== schoolId || student.status !== "ACTIVE") {
      continue;
    }

    const currentHistory = histories.find(
      (item) =>
        item.studentId === student.id &&
        item.sessionId === sessionId &&
        item.isCurrent === true,
    );

    if (!currentHistory) {
      continue;
    }

    const currentClass = classes.find(
      (schoolClass) =>
        schoolClass.id === currentHistory.classId &&
        schoolClass.schoolId === schoolId,
    );

    candidates.push({
      studentId: student.id,
      permanentId: student.permanentId,
      studentName: [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" "),
      status: student.status,
      currentClassId: currentHistory.classId,
      currentClassName: currentClass?.name ?? null,
      currentSessionId: currentHistory.sessionId,
      decision: "PENDING",
    });
  }

  return {
    sourceSession,
    candidates: candidates.sort((a, b) =>
      a.studentName.localeCompare(b.studentName),
    ),
  };
}
