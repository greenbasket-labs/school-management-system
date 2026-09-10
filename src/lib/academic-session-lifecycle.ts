import { db } from "../prisma/db";
import { writeAuditLog } from "./audit";

export type AcademicSessionLifecycleAction =
  | "ACTIVATE"
  | "COMPLETE"
  | "ARCHIVE";

export async function applyAcademicSessionLifecycleAction(input: {
  sessionId: number;
  action: AcademicSessionLifecycleAction;
  actorUserId?: number;
  reason: string;
}) {
  const sessions = await db.orm.public.AcademicSession.all();
  const session = sessions.find((item) => item.id === input.sessionId);

  if (!session) {
    throw new Error("Academic session not found.");
  }

  if (!input.reason?.trim()) {
    throw new Error("A reason is required for academic session lifecycle actions.");
  }

  const oldStatus = session.status;

  if (input.action === "ACTIVATE") {
    if (session.status !== "DRAFT") {
      throw new Error("Only draft academic sessions can be activated.");
    }

    const activeSession = sessions.find(
      (item) =>
        item.schoolId === session.schoolId &&
        item.status === "ACTIVE" &&
        item.id !== session.id,
    );

    if (activeSession) {
      throw new Error(
        "This school already has an active academic session. Complete the current session before activating another.",
      );
    }

    const terms = await db.orm.public.Term.all();
    const sessionTerms = terms.filter(
      (term) => term.sessionId === session.id,
    );

    if (sessionTerms.length === 0) {
      throw new Error("An academic session must have at least one term before activation.");
    }

    await db.orm.public.AcademicSession.where({
      id: session.id,
    }).update({
      status: "ACTIVE",
    });
  } else if (input.action === "COMPLETE") {
    if (session.status !== "ACTIVE") {
      throw new Error("Only an active academic session can be completed.");
    }

    await db.orm.public.AcademicSession.where({
      id: session.id,
    }).update({
      status: "COMPLETED",
    });
  } else {
    if (session.status !== "COMPLETED") {
      throw new Error("Only a completed academic session can be archived.");
    }

    await db.orm.public.AcademicSession.where({
      id: session.id,
    }).update({
      status: "ARCHIVED",
    });
  }

  const newStatus =
    input.action === "ACTIVATE"
      ? "ACTIVE"
      : input.action === "COMPLETE"
        ? "COMPLETED"
        : "ARCHIVED";

  await writeAuditLog({
    schoolId: session.schoolId,
    userId: input.actorUserId,
    action: input.action,
    entity: "AcademicSession",
    entityId: session.id,
    oldValue: {
      status: oldStatus,
    },
    newValue: {
      status: newStatus,
      reason: input.reason.trim(),
    },
  });

  return db.orm.public.AcademicSession.where({
    id: session.id,
  }).first();
}

export async function activateAcademicSession(input: {
  sessionId: number;
  actorUserId?: number;
  reason: string;
}) {
  return applyAcademicSessionLifecycleAction({
    ...input,
    action: "ACTIVATE",
  });
}

export async function completeAcademicSession(input: {
  sessionId: number;
  actorUserId?: number;
  reason: string;
}) {
  return applyAcademicSessionLifecycleAction({
    ...input,
    action: "COMPLETE",
  });
}

export async function archiveAcademicSession(input: {
  sessionId: number;
  actorUserId?: number;
  reason: string;
}) {
  return applyAcademicSessionLifecycleAction({
    ...input,
    action: "ARCHIVE",
  });
}
