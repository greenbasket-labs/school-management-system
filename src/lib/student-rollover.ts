import { Temporal } from "@js-temporal/polyfill";

import { db } from "../prisma/db";
import { writeAuditLog } from "./audit";
import { applyStudentLifecycleAction, type StudentLifecycleAction } from "./student-lifecycle";

export type StudentRolloverDecision = StudentLifecycleAction | "PENDING";

export type StudentRolloverCandidate = {
  student: any;
  currentClass: any | undefined;
  currentHistory: any | undefined;
  alreadyRolledOver: boolean;
};

async function validateSessions(sourceSessionId: number, targetSessionId: number) {
  const sessions = await db.orm.public.AcademicSession.all();
  const sourceSession = sessions.find((item) => item.id === sourceSessionId);
  const targetSession = sessions.find((item) => item.id === targetSessionId);

  if (!sourceSession || !targetSession || sourceSession.schoolId !== targetSession.schoolId) {
    throw new Error("Academic session not found.");
  }
  if (sourceSession.status !== "COMPLETED") throw new Error("The source session must be completed.");
  if (targetSession.status !== "DRAFT") throw new Error("The target session must be in DRAFT status.");

  return { sourceSession, targetSession };
}

export async function getStudentRolloverCandidates(sourceSessionId: number, targetSessionId: number) {
  const { sourceSession, targetSession } = await validateSessions(sourceSessionId, targetSessionId);
  const [students, classes, histories] = await Promise.all([
    db.orm.public.Student.all(),
    db.orm.public.SchoolClass.all(),
    db.orm.public.StudentClassHistory.all(),
  ]);

  const candidates: StudentRolloverCandidate[] = [];
  for (const student of students) {
    if (student.schoolId !== sourceSession.schoolId || student.status !== "ACTIVE") continue;
    const currentHistory = histories.find(
      (item) => item.studentId === student.id && item.sessionId === sourceSessionId && item.isCurrent === true,
    );
    if (!currentHistory) continue;
    const currentClass = classes.find(
      (item) => item.id === currentHistory.classId && item.schoolId === sourceSession.schoolId,
    );
    const targetHistory = histories.find(
      (item) => item.studentId === student.id && item.sessionId === targetSessionId,
    );
    candidates.push({ student, currentClass, currentHistory, alreadyRolledOver: Boolean(targetHistory) });
  }

  return candidates.sort((a, b) => {
    const aName = `${a.student.firstName} ${a.student.lastName}`.toLowerCase();
    const bName = `${b.student.firstName} ${b.student.lastName}`.toLowerCase();
    return aName.localeCompare(bName);
  });
}

export async function applyStudentRolloverDecision(input: {
  sourceSessionId: number;
  targetSessionId: number;
  studentId: number;
  decision: Exclude<StudentRolloverDecision, "PENDING">;
  targetClassId?: number;
  actorUserId?: number;
  effectiveDate: Temporal.Instant;
  reason: string;
}) {
  const { sourceSession, targetSession } = await validateSessions(input.sourceSessionId, input.targetSessionId);
  const reason = input.reason.trim();
  if (!reason) throw new Error("A reason is required for rollover decisions.");

  const histories = await db.orm.public.StudentClassHistory.all();
  const existingTargetHistory = histories.find(
    (item) => item.studentId === input.studentId && item.sessionId === input.targetSessionId,
  );
  if (existingTargetHistory) throw new Error("This student has already been processed for the target session.");

  if (input.decision === "PROMOTE" || input.decision === "REPEAT") {
    if (!input.targetClassId) throw new Error("A target class is required for promotion or repeat.");
  }

  const result = await applyStudentLifecycleAction({
    studentId: input.studentId,
    action: input.decision,
    targetClassId: input.targetClassId,
    sessionId: input.targetSessionId,
    actorUserId: input.actorUserId,
    effectiveDate: input.effectiveDate,
    reason,
    allowDraftSession: true,
  });

  await writeAuditLog({
    schoolId: sourceSession.schoolId,
    userId: input.actorUserId,
    action: "STUDENT_ROLLOVER_DECISION",
    entity: "Student",
    entityId: input.studentId,
    oldValue: { sourceSessionId: sourceSession.id, targetSessionId: targetSession.id },
    newValue: {
      decision: input.decision,
      targetClassId: input.targetClassId ?? null,
      reason,
      effectiveDate,
    },
  });

  return result;
}
