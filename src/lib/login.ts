import { randomUUID } from "crypto";
import { db } from "../prisma/db";
import { verifyPassword } from "./auth";
import {
  getOrCreateDeviceId,
  getSession,
} from "./session";

export type AuthenticationResult =
  | {
      success: true;
      user: Awaited<
        ReturnType<typeof findUserForLogin>
      >;
    }
  | {
      success: false;
      reason: "INVALID_CREDENTIALS" | "DEVICE_LIMIT";
    };

async function findUserForLogin(login: string) {
  const users = await db.orm.public.User.all();

  const normalizedLogin = login.trim().toLowerCase();

  return users.find(
    (item) =>
      item.username?.toLowerCase() === normalizedLogin ||
      item.email?.toLowerCase() === normalizedLogin ||
      item.phone === login.trim(),
  );
}

export async function authenticateUser(
  login: string,
  password: string,
): Promise<AuthenticationResult> {
  const user = await findUserForLogin(login);

  if (!user) {
    return {
      success: false,
      reason: "INVALID_CREDENTIALS",
    };
  }

  if (user.status !== "ACTIVE") {
    return {
      success: false,
      reason: "INVALID_CREDENTIALS",
    };
  }

  const validPassword = await verifyPassword(
    password,
    user.passwordHash,
  );

  if (!validPassword) {
    return {
      success: false,
      reason: "INVALID_CREDENTIALS",
    };
  }

  const deviceId = await getOrCreateDeviceId();

  const existingSessions =
    await db.orm.public.UserSession.all();

  const userSessions = existingSessions.filter(
    (item) =>
      item.userId === user.id &&
      item.schoolId === user.schoolId,
  );

  const activeSessions = userSessions.filter(
    (item) => item.status === "ACTIVE",
  );

  /*
   * Same browser/device:
   * reuse the existing active session.
   */
  const sameDeviceSession = activeSessions.find(
    (item) => item.deviceId === deviceId,
  );

  if (sameDeviceSession) {
    const now = new Date().toISOString();

    await db.orm.public.UserSession
      .where({ id: sameDeviceSession.id })
      .update({
        lastActivityAt: now,
      });

    const session = await getSession();

    session.userId = user.id;
    session.sessionKey =
      sameDeviceSession.sessionKey;

    await session.save();

    return {
      success: true,
      user,
    };
  }

  /*
   * Maximum 2 active devices.
   */
  if (activeSessions.length >= 2) {
    return {
      success: false,
      reason: "DEVICE_LIMIT",
    };
  }

  const sessionKey = randomUUID();
  const now = new Date().toISOString();

  await db.orm.public.UserSession.create({
    userId: user.id,
    schoolId: user.schoolId,

    sessionKey,
    deviceId,
    deviceName: null,

    ipAddress: null,
    userAgent: null,

    status: "ACTIVE",

    lastActivityAt: now,
    lockedAt: null,
    revokedAt: null,
    expiresAt: null,
  });

  const session = await getSession();

  session.userId = user.id;
  session.sessionKey = sessionKey;

  await session.save();

  return {
    success: true,
    user,
  };
}