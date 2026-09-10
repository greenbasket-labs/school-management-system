import { db } from "../prisma/db";
import { getCurrentUser } from "./current-user";
import { hasPermission } from "./authorization";
import { writeAuditLog } from "./audit";

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  return user;
}

export async function requireSchoolAccess(schoolId: number) {
  const user = await requireAuthenticatedUser();
  if (user.schoolId !== schoolId) throw new Error("School access denied");
  return user;
}

export async function requirePermission(
  permissionCode: string,
  schoolId?: number,
) {
  const user = await requireAuthenticatedUser();
  if (schoolId !== undefined && user.schoolId !== schoolId) {
    throw new Error("School access denied");
  }

  const allowed = await hasPermission(user.id, permissionCode);
  if (!allowed) throw new Error("Permission denied");
  return user;
}

export async function auditSecurityEvent(input: {
  schoolId: number;
  userId?: number;
  action: string;
  entity: string;
  entityId?: number | string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  return writeAuditLog({
    schoolId: input.schoolId,
    userId: input.userId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    oldValue: input.oldValue,
    newValue: input.newValue,
  });
}

export async function assertUserBelongsToSchool(
  userId: number,
  schoolId: number,
) {
  const users = await db.orm.public.User.all();
  const user = users.find(
    (item) => item.id === userId && item.schoolId === schoolId,
  );

  if (!user) throw new Error("User does not belong to this school");
  return user;
}

export function safePageSize(value?: number, fallback = 25) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(1, Math.floor(value as number)));
}
