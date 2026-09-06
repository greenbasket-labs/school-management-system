import { db } from "../prisma/db";

type WriteAuditLogInput = {
  schoolId: number;
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
};

function serializeValue(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function writeAuditLog({
  schoolId,
  userId = null,
  action,
  entity,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
}: WriteAuditLogInput) {
  return db.orm.public.AuditLog.create({
    schoolId,
    userId,
    action: action.trim(),
    entity: entity.trim(),
    entityId:
      entityId === null || entityId === undefined
        ? null
        : String(entityId),
    oldValue: serializeValue(oldValue),
    newValue: serializeValue(newValue),
    ipAddress,
  });
}

export async function getAuditLogs() {
  const schools = await db.orm.public.School.all();

  if (schools.length === 0) {
    throw new Error("School not found");
  }

  const schoolId = schools[0].id;

  const logs = await db.orm.public.AuditLog.all();

  return logs
    .filter((log) => log.schoolId === schoolId)
    .sort((a, b) => {
      const aDate = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

      const bDate = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return bDate - aDate;
    });
}