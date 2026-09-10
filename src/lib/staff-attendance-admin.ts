import { db } from "../prisma/db";
import { hasPermission } from "./permissions";
import { writeAuditLog } from "./audit";

const STAFF_TYPES = new Set(["OWNER", "ADMIN", "TEACHER", "CASHIER", "STAFF"]);

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "epochMilliseconds" in value) {
    return new Date(Number((value as { epochMilliseconds: number }).epochMilliseconds));
  }
  return new Date(String(value));
}

export async function listStaffAttendance(schoolId: number, actorId: number, attendanceDate?: Date) {
  const allowed = await hasPermission(actorId, "attendance.staff.view");
  if (!allowed) throw new Error("Permission denied: attendance.staff.view");

  const users = await db.orm.public.User.all();
  const staff = users.filter((user) => user.schoolId === schoolId && STAFF_TYPES.has(String(user.userType)));
  const records = await db.orm.public.StaffAttendanceRecord.all();
  const key = attendanceDate ? attendanceDate.toISOString().slice(0, 10) : null;

  return records
    .filter((record) => {
      if (record.schoolId !== schoolId) return false;
      if (key && asDate(record.attendanceDate).toISOString().slice(0, 10) !== key) return false;
      return staff.some((user) => user.id === record.userId);
    })
    .map((record) => {
      const user = staff.find((item) => item.id === record.userId);
      return { ...record, user: user ? { id: user.id, name: user.name, userType: user.userType, permanentId: user.permanentId } : null };
    });
}

export async function correctStaffAttendance(input: {
  schoolId: number;
  actorId: number;
  attendanceId: number;
  status?: string;
  missedCheckout?: boolean;
  reason: string;
}) {
  const allowed = await hasPermission(input.actorId, "attendance.staff.correct");
  if (!allowed) throw new Error("Permission denied: attendance.staff.correct");

  const reason = input.reason.trim();
  if (!reason) throw new Error("Correction reason is required.");

  const records = await db.orm.public.StaffAttendanceRecord.all();
  const record = records.find((item) => item.id === input.attendanceId && item.schoolId === input.schoolId);
  if (!record) throw new Error("Staff attendance record not found in this school.");

  const oldValue = {
    status: record.status,
    missedCheckout: record.missedCheckout,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
  };

  const updated = await db.orm.public.StaffAttendanceRecord.where({ id: record.id }).update({
    status: input.status?.trim() || record.status,
    missedCheckout: input.missedCheckout ?? record.missedCheckout,
    correctionReason: reason,
    correctedByUserId: input.actorId,
  });

  await writeAuditLog({
    schoolId: input.schoolId,
    userId: input.actorId,
    action: "UPDATE",
    entity: "StaffAttendance",
    entityId: String(record.id),
    oldValue,
    newValue: {
      status: input.status?.trim() || record.status,
      missedCheckout: input.missedCheckout ?? record.missedCheckout,
      reason,
      correctedByUserId: input.actorId,
    },
  });

  return updated;
}
