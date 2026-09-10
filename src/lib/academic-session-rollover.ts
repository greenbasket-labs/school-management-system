import { db } from "../prisma/db";
import { writeAuditLog } from "./audit";

export async function createNextAcademicSession(input: {
  sourceSessionId: number;
  name: string;
  startDate: string;
  endDate: string;
  actorUserId?: number;
  reason: string;
}) {
  const name = input.name.trim();
  const reason = input.reason.trim();

  if (!name) {
    throw new Error("A session name is required.");
  }

  if (!input.startDate || !input.endDate) {
    throw new Error("Start and end dates are required.");
  }

  if (input.endDate <= input.startDate) {
    throw new Error("The end date must be after the start date.");
  }

  if (!reason) {
    throw new Error("A reason is required to create the next academic session.");
  }

  const sessions = await db.orm.public.AcademicSession.all();
  const sourceSession = sessions.find(
    (session) => session.id === input.sourceSessionId,
  );

  if (!sourceSession) {
    throw new Error("Source academic session not found.");
  }

  if (sourceSession.status !== "COMPLETED") {
    throw new Error(
      "The current academic session must be completed before creating its next session.",
    );
  }

  const duplicate = sessions.find(
    (session) =>
      session.schoolId === sourceSession.schoolId &&
      session.name.trim().toLowerCase() === name.toLowerCase(),
  );

  if (duplicate) {
    throw new Error("An academic session with this name already exists.");
  }

  const nextSession = await db.orm.public.AcademicSession.create({
    schoolId: sourceSession.schoolId,
    name,
    startDate: input.startDate,
    endDate: input.endDate,
    status: "DRAFT",
  });

  await writeAuditLog({
    schoolId: sourceSession.schoolId,
    userId: input.actorUserId,
    action: "CREATE_NEXT_ACADEMIC_SESSION",
    entity: "AcademicSession",
    entityId: nextSession.id,
    oldValue: {
      sourceSessionId: sourceSession.id,
      sourceSessionStatus: sourceSession.status,
    },
    newValue: {
      sessionId: nextSession.id,
      name,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "DRAFT",
      reason,
    },
  });

  return nextSession;
}
