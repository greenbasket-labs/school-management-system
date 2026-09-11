import { db } from "../prisma/db";
import { getSession } from "./session";

const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000;

export async function getCurrentUser() {
  const session = await getSession();

  if (!session.userId || !session.sessionKey) {
    return null;
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) => item.id === session.userId,
  );

  if (!user || user.status !== "ACTIVE" || user.schoolId === null) {
    session.destroy();
    return null;
  }

  const sessions =
    await db.orm.public.UserSession.all();

  const userSession = sessions.find(
    (item) =>
      item.sessionKey === session.sessionKey &&
      item.userId === user.id &&
      item.schoolId === user.schoolId,
  );

  if (!userSession) {
    session.destroy();
    return null;
  }

  if (
    userSession.status === "REVOKED" ||
    userSession.status === "EXPIRED"
  ) {
    session.destroy();
    return null;
  }

  if (userSession.status === "LOCKED") {
    return null;
  }

  const lastActivity = new Date(
    userSession.lastActivityAt,
  ).getTime();

  const now = Date.now();

  if (
    !Number.isNaN(lastActivity) &&
    now - lastActivity >= INACTIVITY_LIMIT_MS
  ) {
    await db.orm.public.UserSession
      .where({ id: userSession.id })
      .update({
        status: "LOCKED",
        lockedAt: new Date().toISOString(),
      });

    return null;
  }

  await db.orm.public.UserSession
    .where({ id: userSession.id })
    .update({
      lastActivityAt: new Date().toISOString(),
    });

  return user;
}

export async function isCurrentSessionLocked() {
  const session = await getSession();

  if (!session.userId || !session.sessionKey) {
    return false;
  }

  const users = await db.orm.public.User.all();
  const user = users.find(
    (item) => item.id === session.userId,
  );

  if (!user || user.schoolId === null) {
    return false;
  }

  const sessions =
    await db.orm.public.UserSession.all();

  const userSession = sessions.find(
    (item) =>
      item.sessionKey === session.sessionKey &&
      item.userId === session.userId &&
      item.schoolId === user.schoolId,
  );

  return userSession?.status === "LOCKED";
}
