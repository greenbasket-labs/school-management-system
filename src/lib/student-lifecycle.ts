import { Temporal } from "@js-temporal/polyfill";

import { db } from "../prisma/db";
import { writeAuditLog } from "./audit";
import { assignStudentToClass, removeStudentFromClass } from "./student-class";

export type StudentLifecycleAction =
  | "PROMOTE"
  | "REPEAT"
  | "TRANSFER"
  | "WITHDRAW"
  | "GRADUATE";

const TERMINAL_ACTION_STATUS = {
  TRANSFER: "TRANSFERRED",
  WITHDRAW: "WITHDRAWN",
  GRADUATE: "GRADUATED",
} as const;

function lifecycleStatusForAction(action: StudentLifecycleAction) {
  if (action === "TRANSFER") return TERMINAL_ACTION_STATUS.TRANSFER;
  if (action === "WITHDRAW") return TERMINAL_ACTION_STATUS.WITHDRAW;
  if (action === "GRADUATE") return TERMINAL_ACTION_STATUS.GRADUATE;
  return "ACTIVE" as const;
}

export async function applyStudentLifecycleAction(input: {
  studentId: number;
  action: StudentLifecycleAction;
  actorUserId?: number;
  targetClassId?: number;
  sessionId?: number;
  effectiveDate?: Temporal.Instant;
  reason?: string;
  allowDraftSession?: boolean;
}) {
  const students = await db.orm.public.Student.all();
  const student = students.find((item) => item.id === input.studentId);

  if (!student) throw new Error("Student not found.");
  if (student.status !== "ACTIVE") {
    throw new Error("Only active students can undergo a lifecycle action.");
  }
  if (!input.reason?.trim()) {
    throw new Error("A reason is required for student lifecycle actions.");
  }

  const effectiveDate = input.effectiveDate ?? Temporal.Now.instant();
  const oldValue = {
    status: student.status,
    currentClassId: student.currentClassId,
  };

  if (input.action === "PROMOTE" || input.action === "REPEAT") {
    if (!input.targetClassId || !input.sessionId) {
      throw new Error("A target class and academic session are required for promotion or repeat.");
    }

    const historyBefore = await db.orm.public.StudentClassHistory.all();
    const currentHistory = historyBefore.find(
      (item) => item.studentId === student.id && item.isCurrent === true,
    );

    if (!currentHistory) {
      throw new Error("Student has no current class assignment to transition from.");
    }

    const result = await assignStudentToClass(
      student.id,
      input.targetClassId,
      input.sessionId,
      effectiveDate,
      { allowDraftSession: input.allowDraftSession === true },
    );

    await writeAuditLog({
      schoolId: student.schoolId,
      userId: input.actorUserId,
      action: input.action,
      entity: "Student",
      entityId: student.id,
      oldValue,
      newValue: {
        status: "ACTIVE",
        currentClassId: input.targetClassId,
        sessionId: input.sessionId,
        reason: input.reason.trim(),
        effectiveDate,
      },
    });

    return {
      student: await db.orm.public.Student.where({ id: student.id }).first(),
      classHistory: result,
    };
  }

  const newStatus = lifecycleStatusForAction(input.action);

  await removeStudentFromClass(student.id, effectiveDate);

  const updatedStudent = await db.orm.public.Student.where({ id: student.id }).update({
    status: newStatus,
    currentClassId: null,
  });

  await writeAuditLog({
    schoolId: student.schoolId,
    userId: input.actorUserId,
    action: input.action,
    entity: "Student",
    entityId: student.id,
    oldValue,
    newValue: {
      status: newStatus,
      currentClassId: null,
      reason: input.reason.trim(),
      effectiveDate,
    },
  });

  return { student: updatedStudent, classHistory: null };
}

export async function promoteStudent(input: {
  studentId: number;
  targetClassId: number;
  sessionId: number;
  actorUserId?: number;
  effectiveDate?: Temporal.Instant;
  reason: string;
  allowDraftSession?: boolean;
}) {
  return applyStudentLifecycleAction({ ...input, action: "PROMOTE" });
}

export async function repeatStudent(input: {
  studentId: number;
  targetClassId: number;
  sessionId: number;
  actorUserId?: number;
  effectiveDate?: Temporal.Instant;
  reason: string;
  allowDraftSession?: boolean;
}) {
  return applyStudentLifecycleAction({ ...input, action: "REPEAT" });
}

export async function transferStudent(input: {
  studentId: number;
  actorUserId?: number;
  effectiveDate?: Temporal.Instant;
  reason: string;
}) {
  return applyStudentLifecycleAction({ ...input, action: "TRANSFER" });
}

export async function withdrawStudent(input: {
  studentId: number;
  actorUserId?: number;
  effectiveDate?: Temporal.Instant;
  reason: string;
}) {
  return applyStudentLifecycleAction({ ...input, action: "WITHDRAW" });
}

export async function graduateStudent(input: {
  studentId: number;
  actorUserId?: number;
  effectiveDate?: Temporal.Instant;
  reason: string;
}) {
  return applyStudentLifecycleAction({ ...input, action: "GRADUATE" });
}
