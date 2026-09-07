import { db } from "../prisma/db";
import { getSession } from "./session";
import { getSchool } from "./school";
import { writeAuditLog } from "./audit";

export async function getMyDevices() {
  const session = await getSession();

  if (!session.userId || !session.sessionKey) {
    return [];
  }

  const school = await getSchool();

  if (!school) {
    return [];
  }

  const sessions =
    await db.orm.public.UserSession.all();

  return sessions
    .filter(
      (item) =>
        item.userId === session.userId &&
        item.schoolId === school.id &&
        item.status !== "REVOKED",
    )
    .sort((a, b) => {
      const aDate = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

      const bDate = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return bDate - aDate;
    })
    .map((item) => ({
      id: item.id,
      deviceName: item.deviceName,
      deviceId: item.deviceId,
      status: item.status,
      lastActivityAt: item.lastActivityAt,
      createdAt: item.createdAt,
      isCurrent:
        item.sessionKey === session.sessionKey,
    }));
}

export async function revokeMyDevice(
  sessionId: number,
) {
  const session = await getSession();

  if (!session.userId || !session.sessionKey) {
    throw new Error("Not authenticated.");
  }

  const school = await getSchool();

  if (!school) {
    throw new Error("School not found.");
  }

  const sessions =
    await db.orm.public.UserSession.all();

  const target = sessions.find(
    (item) =>
      item.id === sessionId &&
      item.userId === session.userId &&
      item.schoolId === school.id,
  );

  if (!target) {
    throw new Error("Device not found.");
  }

  if (target.sessionKey === session.sessionKey) {
    throw new Error(
      "You cannot revoke your current device.",
    );
  }

  if (target.status === "REVOKED") {
    return;
  }

  await db.orm.public.UserSession
    .where({ id: target.id })
    .update({
      status: "REVOKED",
      revokedAt: new Date().toISOString(),
    });

  await writeAuditLog({
    schoolId: school.id,
    userId: session.userId,
    action: "REVOKE_DEVICE",
    entity: "UserSession",
    entityId: target.id,
    newValue: {
      deviceId: target.deviceId,
      status: "REVOKED",
    },
  });
}