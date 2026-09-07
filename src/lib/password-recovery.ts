import { randomBytes, randomInt, createHash } from "crypto";
import { db } from "../prisma/db";
import { hashPassword } from "./auth";
import { writeAuditLog } from "./audit";

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_48 = 48 * 60 * 60 * 1000;
const HOURS_72 = 72 * 60 * 60 * 1000;

function hashToken(value: string) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function generateVerificationCode() {
  return randomInt(100000, 1000000).toString();
}

function getActivationTime(input: {
  bothVerified: boolean;
  newDevice: boolean;
  suspicious: boolean;
}) {
  if (input.suspicious || input.newDevice) {
    return new Date(Date.now() + HOURS_48);
  }

  if (input.bothVerified) {
    return new Date();
  }

  return new Date(Date.now() + HOURS_24);
}

function getRestrictionTime(newDevice: boolean) {
  return new Date(
    Date.now() +
      (newDevice ? 7 : 3) * HOURS_24,
  );
}

/**
 * Development delivery adapter.
 *
 * V1 does not yet connect to an external email/SMS provider.
 * The verification code is therefore returned only in development.
 *
 * Production delivery must be connected here before password
 * recovery is enabled for a production deployment.
 */
async function deliverVerificationCode(input: {
  method: "EMAIL" | "PHONE";
  email?: string | null;
  phone?: string | null;
  code: string;
}) {
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[PASSWORD RECOVERY] ${input.method} verification code: ${input.code}`,
    );

    return;
  }

  throw new Error(
    "Password recovery delivery is not configured for this deployment.",
  );
}

export async function requestPasswordRecovery(input: {
  login: string;
  newPassword: string;
  newDevice?: boolean;
  suspicious?: boolean;
}) {
  const rawLogin = input.login.trim();
  const login = rawLogin.toLowerCase();

  if (!login) {
    throw new Error(
      "Email, username or phone is required.",
    );
  }

  if (input.newPassword.length < 8) {
    throw new Error(
      "Password must be at least 8 characters.",
    );
  }

  const schools =
    await db.orm.public.School.all();

  const school = schools[0];

  if (!school) {
    throw new Error("School not found.");
  }

  const users =
    await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.schoolId === school.id &&
      (
        item.username?.toLowerCase() === login ||
        item.email?.toLowerCase() === login ||
        item.phone === rawLogin
      ),
  );

  if (!user || user.status !== "ACTIVE") {
    throw new Error("Account not found.");
  }

  const emailVerified =
    Boolean(user.email) &&
    Boolean(user.emailVerifiedAt);

  const phoneVerified =
    Boolean(user.phone) &&
    Boolean(user.phoneVerifiedAt);

  if (!emailVerified && !phoneVerified) {
    throw new Error(
      "No verified recovery method is available for this account.",
    );
  }

  const bothVerified =
    emailVerified && phoneVerified;

  const newDevice = Boolean(input.newDevice);
  const suspicious = Boolean(input.suspicious);

  const activateAt = getActivationTime({
    bothVerified,
    newDevice,
    suspicious,
  });

  let reason:
    | "PASSWORD_FORGOT"
    | "NEW_DEVICE"
    | "SUSPICIOUS" =
    "PASSWORD_FORGOT";

  if (suspicious) {
    reason = "SUSPICIOUS";
  } else if (newDevice) {
    reason = "NEW_DEVICE";
  }

  const roleRestrictedUntil =
    getRestrictionTime(newDevice);

  const token =
    randomBytes(32).toString("hex");

  const verificationCode =
    generateVerificationCode();

  const tokenHash =
    hashToken(token);

  const verificationCodeHash =
    hashToken(verificationCode);

  const newPasswordHash =
    await hashPassword(input.newPassword);

  /*
   * If both recovery methods are verified,
   * use email as the primary recorded method.
   *
   * The security decision itself is based on
   * bothVerified, not the recorded method.
   */
  const method =
    emailVerified
      ? "EMAIL"
      : "PHONE";

  const recovery =
    await db.orm.public.PasswordRecovery.create({
      userId: user.id,
      schoolId: school.id,

      method,

      status: "PENDING",
      reason,

      tokenHash,
      verificationCodeHash,

      newPasswordHash,

      requestedAt:
        new Date().toISOString(),

      verifiedAt: null,

      activateAt:
        activateAt.toISOString(),

      expiresAt:
        new Date(
          Date.now() + HOURS_72,
        ).toISOString(),

      usedAt: null,

      newDevice,

      roleRestrictedUntil:
        roleRestrictedUntil.toISOString(),

      ipAddress: null,
      userAgent: null,
      deviceSessionId: null,
    });

  await deliverVerificationCode({
    method,
    email: user.email,
    phone: user.phone,
    code: verificationCode,
  });

  await writeAuditLog({
    schoolId: school.id,
    userId: user.id,

    action:
      "PASSWORD_RECOVERY_REQUEST",

    entity:
      "PasswordRecovery",

    entityId:
      recovery.id,

    newValue: {
      method,
      reason,
      activateAt:
        recovery.activateAt,
      newDevice,
      suspicious,
      bothVerified,
      roleRestrictedUntil:
        recovery.roleRestrictedUntil,
    },
  });

  return {
    recoveryId: recovery.id,
    token,
    activateAt:
      recovery.activateAt,

    /*
     * Development only.
     * Never returned in production.
     */
    verificationCode:
      process.env.NODE_ENV === "development"
        ? verificationCode
        : undefined,
  };
}

export async function verifyPasswordRecoveryCode(
  recoveryId: number,
  code: string,
) {
  const cleanCode = code.trim();

  if (!cleanCode) {
    throw new Error(
      "Verification code is required.",
    );
  }

  const recoveries =
    await db.orm.public.PasswordRecovery.all();

  const recovery = recoveries.find(
    (item) =>
      item.id === recoveryId &&
      item.status === "PENDING",
  );

  if (!recovery) {
    throw new Error(
      "Invalid or expired recovery request.",
    );
  }

  if (!recovery.verificationCodeHash) {
    throw new Error(
      "Verification code is unavailable.",
    );
  }

  const now = Date.now();

  if (
    recovery.expiresAt &&
    new Date(
      recovery.expiresAt,
    ).getTime() <= now
  ) {
    await db.orm.public.PasswordRecovery
      .where({ id: recovery.id })
      .update({
        status: "EXPIRED",
      });

    throw new Error(
      "Recovery request has expired.",
    );
  }

  const suppliedHash =
    hashToken(cleanCode);

  if (
    suppliedHash !==
    recovery.verificationCodeHash
  ) {
    throw new Error(
      "Invalid verification code.",
    );
  }

  const verifiedAt =
    new Date().toISOString();

  await db.orm.public.PasswordRecovery
    .where({ id: recovery.id })
    .update({
      status: "PENDING",
      verifiedAt,
    });

  await writeAuditLog({
    schoolId: recovery.schoolId,
    userId: recovery.userId,

    action:
      "PASSWORD_RECOVERY_VERIFIED",

    entity:
      "PasswordRecovery",

    entityId:
      recovery.id,

    newValue: {
      verifiedAt,
      method: recovery.method,
      reason: recovery.reason,
    },
  });

  return {
    success: true,
    recoveryId: recovery.id,
    activateAt:
      recovery.activateAt,
  };
}

export async function activatePasswordRecovery(
  token: string,
) {
  const cleanToken = token.trim();

  if (!cleanToken) {
    throw new Error(
      "Recovery token is required.",
    );
  }

  const tokenHash =
    hashToken(cleanToken);

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

  if (!recovery.verifiedAt) {
    throw new Error(
      "Verification is required before the password can be activated.",
    );
  }

  const now = Date.now();

  if (
    recovery.expiresAt &&
    new Date(
      recovery.expiresAt,
    ).getTime() <= now
  ) {
    await db.orm.public.PasswordRecovery
      .where({ id: recovery.id })
      .update({
        status: "EXPIRED",
      });

    throw new Error(
      "Recovery request has expired.",
    );
  }

  const activationTime =
    new Date(
      recovery.activateAt,
    ).getTime();

  if (
    Number.isNaN(activationTime) ||
    activationTime > now
  ) {
    throw new Error(
      `Password recovery is not active yet. It will activate at ${recovery.activateAt}.`,
    );
  }

  const users =
    await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === recovery.userId &&
      item.schoolId === recovery.schoolId,
  );

  if (!user || user.status !== "ACTIVE") {
    throw new Error(
      "User account is unavailable.",
    );
  }

  const activatedAt =
    new Date().toISOString();

  await db.orm.public.User
    .where({
      id: user.id,
      schoolId: user.schoolId,
    })
    .update({
      passwordHash:
        recovery.newPasswordHash,

      roleRestrictedUntil:
        recovery.roleRestrictedUntil,

      roleRestrictionReason:
        recovery.newDevice
          ? "PASSWORD_RECOVERY_NEW_DEVICE"
          : "PASSWORD_RECOVERY",
    });

  await db.orm.public.PasswordRecovery
    .where({ id: recovery.id })
    .update({
      status: "ACTIVATED",
      usedAt: activatedAt,
    });

  /*
   * Existing sessions remain subject to the normal
   * 2-device and inactivity rules.
   *
   * The old password stops working immediately
   * once this password hash is activated.
   */

  await writeAuditLog({
    schoolId:
      recovery.schoolId,

    userId:
      user.id,

    action:
      "PASSWORD_RECOVERY_ACTIVATED",

    entity:
      "PasswordRecovery",

    entityId:
      recovery.id,

    newValue: {
      reason:
        recovery.reason,

      newDevice:
        recovery.newDevice,

      activateAt:
        recovery.activateAt,

      activatedAt,

      roleRestrictedUntil:
        recovery.roleRestrictedUntil,
    },
  });

  return {
    success: true,
    userId: user.id,
  };
}