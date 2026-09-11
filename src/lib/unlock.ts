import { db } from "../prisma/db";
import { verifyPassword } from "./auth";
import { getSession } from "./session";
import { writeAuditLog } from "./audit";
import { getSchool } from "./school";

export async function unlockCurrentSession(password: string) {
  const session = await getSession();

  if (!session.userId || !session.sessionKey) {
    return { success: false, reason: "NO_SESSION" };
  }

  const school = await getSchool();

  if (!school) {
    return { success: false, reason: "NO_SCHOOL" };
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === session.userId &&
      item.schoolId === school.id,
  );

  if (!user || user.status !== "ACTIVE") {
    return { success: false, reason: "INVALID_USER" };
  }

  const sessions = await db.orm.public.UserSession.all();

  const userSession = sessions.find(
    (item) =>
      item.sessionKey === session.sessionKey &&
      item.userId === user.id &&
      item.schoolId === school.id,
  );

  if (!userSession) {
    return { success: false, reason: "INVALID_SESSION" };
  }

  if (userSession.status !== "LOCKED") {
    return { success: false, reason: "NOT_LOCKED" };
  }

  const validPassword = await verifyPassword(
    password,
    user.passwordHash,
  );

  if (!validPassword) {
    return { success: false, reason: "INVALID_PASSWORD" };
  }

  const now = new Date().toISOString();

  await db.orm.public.UserSession
    .where({ id: userSession.id })
    .update({
      status: "ACTIVE",
      lockedAt: null,
      lastActivityAt: now,
    });

  await writeAuditLog({
    schoolId: school.id,
    userId: user.id,
    action: "UNLOCK",
    entity: "UserSession",
    entityId: userSession.id,
    newValue: {
      reason: "INACTIVITY_TIMEOUT",
    },
  });

  return {
    success: true,
    userType: user.userType,
  };
}