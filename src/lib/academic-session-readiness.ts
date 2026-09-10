import { db } from "../prisma/db";

export type AcademicSessionReadiness = {
  ready: boolean;
  checks: {
    hasTerms: boolean;
    hasClasses: boolean;
    rolloverComplete: boolean;
    noDuplicateTargetAssignments: boolean;
  };
  counts: {
    terms: number;
    classes: number;
    activeStudentsFromPreviousSession: number;
    studentsAssignedToTargetSession: number;
    studentsPendingRollover: number;
    duplicateTargetAssignments: number;
  };
  sourceSessionId?: number;
};

export async function getAcademicSessionReadiness(
  targetSessionId: number,
): Promise<AcademicSessionReadiness> {
  const sessions = await db.orm.public.AcademicSession.all();
  const targetSession = sessions.find((item) => item.id === targetSessionId);

  if (!targetSession) {
    throw new Error("Academic session not found.");
  }

  const [terms, classes, students, histories] = await Promise.all([
    db.orm.public.Term.all(),
    db.orm.public.SchoolClass.all(),
    db.orm.public.Student.all(),
    db.orm.public.StudentClassHistory.all(),
  ]);

  const sessionTerms = terms.filter((term) => term.sessionId === targetSessionId);
  const targetClasses = classes.filter(
    (item) =>
      item.schoolId === targetSession.schoolId &&
      item.sessionId === targetSessionId &&
      item.status === "ACTIVE",
  );

  const sourceSession = sessions
    .filter(
      (session) =>
        session.schoolId === targetSession.schoolId &&
        session.status === "COMPLETED" &&
        String(session.endDate) < String(targetSession.startDate),
    )
    .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))[0];

  let activeStudentsFromPreviousSession = 0;
  let studentsAssignedToTargetSession = 0;
  let studentsPendingRollover = 0;

  if (sourceSession) {
    const sourceCurrentHistories = histories.filter(
      (history) =>
        history.sessionId === sourceSession.id &&
        history.isCurrent === true,
    );

    const sourceStudentIds = new Set(
      students
        .filter(
          (student) =>
            student.schoolId === targetSession.schoolId &&
            student.status === "ACTIVE" &&
            sourceCurrentHistories.some(
              (history) => history.studentId === student.id,
            ),
        )
        .map((student) => student.id),
    );

    activeStudentsFromPreviousSession = sourceStudentIds.size;

    for (const studentId of sourceStudentIds) {
      const targetHistory = histories.find(
        (history) =>
          history.studentId === studentId &&
          history.sessionId === targetSessionId,
      );

      if (targetHistory) {
        studentsAssignedToTargetSession += 1;
      } else {
        studentsPendingRollover += 1;
      }
    }
  }

  const targetHistoryCounts = new Map<number, number>();

  for (const history of histories) {
    if (history.sessionId !== targetSessionId) continue;
    targetHistoryCounts.set(
      history.studentId,
      (targetHistoryCounts.get(history.studentId) ?? 0) + 1,
    );
  }

  const duplicateTargetAssignments = Array.from(targetHistoryCounts.values()).filter(
    (count) => count > 1,
  ).length;

  const checks = {
    hasTerms: sessionTerms.length > 0,
    hasClasses: targetClasses.length > 0,
    rolloverComplete: !sourceSession || studentsPendingRollover === 0,
    noDuplicateTargetAssignments: duplicateTargetAssignments === 0,
  };

  return {
    ready: Object.values(checks).every(Boolean),
    checks,
    counts: {
      terms: sessionTerms.length,
      classes: targetClasses.length,
      activeStudentsFromPreviousSession,
      studentsAssignedToTargetSession,
      studentsPendingRollover,
      duplicateTargetAssignments,
    },
    sourceSessionId: sourceSession?.id,
  };
}
