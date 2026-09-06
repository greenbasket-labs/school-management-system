import { randomBytes, createHash } from "crypto";
import { db } from "../prisma/db";
import { hashPassword } from "./auth";
import { writeAuditLog } from "./audit";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordRecovery(input: {
  login: string;
  newPassword: string;
  newDevice?: boolean;
  suspicious?: boolean;
}) {
  const login = input.login.trim().toLowerCase();

  if (!login) {
    throw new Error("Email, username or phone is required.");
  }

  if (input.newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const schools = await db.orm.public.School.all();
  const school = schools[0];

  if (!school) {
    throw new Error("School not found.");
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.schoolId === school.id &&
      (
        item.username?.toLowerCase() === login ||
        item.email?.toLowerCase() === login ||
        item.phone === input.login.trim()
      ),
  );

  if (!user || user.status !== "ACTIVE") {
    throw new Error("Account not found.");
  }

  const emailVerified = Boolean(user.emailVerifiedAt);
  const phoneVerified = Boolean(user.phoneVerifiedAt);

  if (!emailVerified && !phoneVerified) {
    throw new Error(
      "No verified recovery method is available for this account.",
    );
  }

  const bothVerified = emailVerified && phoneVerified;

  let activateAt = new Date();

  if (!bothVerified) {
    activateAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );
  }

  let reason:
    | "PASSWORD_FORGOT"
    | "NEW_DEVICE"
    | "SUSPICIOUS" = "PASSWORD_FORGOT";

  if (input.suspicious) {
    reason = "SUSPICIOUS";

    activateAt = new Date(
      Date.now() + 48 * 60 * 60 * 1000,
    );
  }

  if (input.newDevice) {
    reason = "NEW_DEVICE";

    activateAt = new Date(
      Date.now() + 48 * 60 * 60 * 1000,
    );
  }

  const roleRestrictedUntil = new Date(
    Date.now() +
      (input.newDevice ? 7 : 3) *
        24 *
        60 *
        60 *
        1000,
  );

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const newPasswordHash = await hashPassword(input.newPassword);

  const recovery =
    await db.orm.public.PasswordRecovery.create({
      userId: user.id,
      schoolId: school.id,
      method: bothVerified
        ? "EMAIL"
        : emailVerified
          ? "EMAIL"
          : "PHONE",
      status: "PENDING",
      reason,
      tokenHash,
      newPasswordHash,
      requestedAt: new Date().toISOString(),
      verifiedAt: null,
      activateAt: activateAt.toISOString(),
      expiresAt: new Date(
        Date.now() + 72 * 60 * 60 * 1000,
      ).toISOString(),
      usedAt: null,
      newDevice: Boolean(input.newDevice),
      roleRestrictedUntil:
        roleRestrictedUntil.toISOString(),
      ipAddress: null,
      userAgent: null,
      deviceSessionId: null,
    });

  await writeAuditLog({
    schoolId: school.id,
    userId: user.id,
    action: "PASSWORD_RECOVERY_REQUEST",
    entity: "PasswordRecovery",
    entityId: recovery.id,
    newValue: {
      method: recovery.method,
      reason: recovery.reason,
      activateAt: recovery.activateAt,
      newDevice: recovery.newDevice,
      roleRestrictedUntil:
        recovery.roleRestrictedUntil,
    },
  });

  return {
    recoveryId: recovery.id,
    token,
    activateAt: recovery.activateAt,
  };
}

export async function activatePasswordRecovery(
  token: string,
) {
  const tokenHash = hashToken(token.trim());

  const recoveries =
    await db.orm.public.PasswordRecovery.all();

  const recovery = recoveries.find(
    (item) =>
      item.tokenHash === tokenHash &&
      item.status === "PENDING",
  );

  if (!recovery) {
    throw new Error(
      "Invalid or expired recovery request.",
    );
  }

  const now = Date.now();

  if (
    recovery.expiresAt &&
    new Date(recovery.expiresAt).getTime() <= now
  ) {
    await db.orm.public.PasswordRecovery
      .where({ id: recovery.id })
      .update({
        status: "EXPIRED",
      });

    throw new Error("Recovery request has expired.");
  }

  if (
    new Date(recovery.activateAt).getTime() > now
  ) {
    throw new Error(
      `Password recovery is not active yet. It will activate at ${recovery.activateAt}.`,
    );
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === recovery.userId &&
      item.schoolId === recovery.schoolId,
  );

  if (!user || user.status !== "ACTIVE") {
    throw new Error("User account is unavailable.");
  }

  await db.orm.public.User
    .where({
      id: user.id,
      schoolId: user.schoolId,
    })
    .update({
      passwordHash: recovery.newPasswordHash,
      roleRestrictedUntil:
        recovery.roleRestrictedUntil,
      roleRestrictionReason: recovery.newDevice
        ? "PASSWORD_RECOVERY_NEW_DEVICE"
        : "PASSWORD_RECOVERY",
    });

  await db.orm.public.PasswordRecovery
    .where({ id: recovery.id })
    .update({
      status: "ACTIVATED",
      verifiedAt: new Date().toISOString(),
      usedAt: new Date().toISOString(),
    });

  await writeAuditLog({
    schoolId: recovery.schoolId,
    userId: user.id,
    action: "PASSWORD_RECOVERY_ACTIVATED",
    entity: "PasswordRecovery",
    entityId: recovery.id,
    newValue: {
      reason: recovery.reason,
      newDevice: recovery.newDevice,
      roleRestrictedUntil:
        recovery.roleRestrictedUntil,
    },
  });

  return {
    success: true,
    userId: user.id,
  };
}