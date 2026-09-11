import { Temporal } from "@js-temporal/polyfill";
import { db } from "../prisma/db";
import { hasPermission } from "./permissions";
import { writeAuditLog } from "./audit";

export type StaffAttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

const STAFF_TYPES = new Set(["OWNER", "ADMIN", "TEACHER", "CASHIER", "STAFF"]);
const DEFAULT_START_HOUR = 8;
const DEFAULT_START_MINUTE = 0;
const DEFAULT_GRACE_MINUTES = 15;

function nowInstant() {
  return Temporal.Now.instant().toString();
}

function asDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "epochMilliseconds" in value) {
    return new Date(Number((value as { epochMilliseconds: number }).epochMilliseconds));
  }
  return new Date(String(value));
}

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function minutesFromStart(date: Date, startHour: number, startMinute: number) {
  return Math.max(0, date.getHours() * 60 + date.getMinutes() - (startHour * 60 + startMinute));
}

function assertStaffType(userType: string) {
  if (!STAFF_TYPES.has(userType)) {
    throw new Error("Only staff, teachers, cashiers, administrators, or owners can use staff attendance.");
  }
}

async function getUser(schoolId: number, userId: number) {
  const users = await db.orm.public.User.all();
  return users.find((user) => user.id === userId && user.schoolId === schoolId) ?? null;
}

async function getRecord(schoolId: number, userId: number, attendanceDate: Date) {
  const records = await db.orm.public.StaffAttendanceRecord.all();
  const key = dayKey(attendanceDate);
  return records.find((record) => {
    const recordDate = asDate(record.attendanceDate);
    return record.schoolId === schoolId && record.userId === userId && dayKey(recordDate) === key;
  }) ?? null;
}

export async function staffCheckIn(input: {
  schoolId: number;
  userId: number;
  attendanceDate?: Date;
  startHour?: number;
  startMinute?: number;
  graceMinutes?: number;
}) {
  const allowed = await hasPermission(input.userId, "attendance.staff.checkin");
  if (!allowed) throw new Error("Permission denied: attendance.staff.checkin");

  const user = await getUser(input.schoolId, input.userId);
  if (!user) throw new Error("Staff account not found in this school.");
  assertStaffType(String(user.userType));
  if (String(user.status) !== "ACTIVE") throw new Error("Staff account is not active.");

  const checkIn = new Date();
  const attendanceDate = input.attendanceDate ?? checkIn;
  const existing = await getRecord(input.schoolId, input.userId, attendanceDate);
  if (existing?.checkInAt) throw new Error("Staff attendance has already been checked in for this day.");

  const startHour = input.startHour ?? DEFAULT_START_HOUR;
  const startMinute = input.startMinute ?? DEFAULT_START_MINUTE;
  const graceMinutes = input.graceMinutes ?? DEFAULT_GRACE_MINUTES;
  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23 || !Number.isInteger(startMinute) || startMinute < 0 || startMinute > 59 || !Number.isInteger(graceMinutes) || graceMinutes < 0 || graceMinutes > 1440) {
    throw new Error("Invalid staff attendance timing configuration.");
  }

  const lateMinutes = minutesFromStart(checkIn, startHour, startMinute);
  const status: StaffAttendanceStatus = lateMinutes > graceMinutes ? "LATE" : "PRESENT";
  const checkInAt = nowInstant();

  const record = existing
    ? await db.orm.public.StaffAttendanceRecord.where({ id: existing.id }).update({ checkInAt, status, lateMinutes, missedCheckout: false, updatedAt: checkInAt })
    : await db.orm.public.StaffAttendanceRecord.create({
        schoolId: input.schoolId,
        userId: input.userId,
        attendanceDate: Temporal.Instant.fromEpochMilliseconds(attendanceDate.getTime()),
        checkInAt,
        checkOutAt: null,
        status,
        lateMinutes,
        missedCheckout: false,
        correctionReason: null,
        correctedByUserId: null,
      });

  if (!record) throw new Error("Unable to save staff attendance.");

  await writeAuditLog({
    schoolId: input.schoolId,
    userId: input.userId,
    action: existing ? "UPDATE" : "CREATE",
    entity: "StaffAttendance",
    entityId: String(record.id),
    newValue: { checkInAt, attendanceDate, status, lateMinutes },
  });

  return record;
}

export async function staffCheckOut(input: { schoolId: number; userId: number; attendanceDate?: Date }) {
  const allowed = await hasPermission(input.userId, "attendance.staff.checkout");
  if (!allowed) throw new Error("Permission denied: attendance.staff.checkout");

  const user = await getUser(input.schoolId, input.userId);
  if (!user) throw new Error("Staff account not found in this school.");
  assertStaffType(String(user.userType));
  if (String(user.status) !== "ACTIVE") throw new Error("Staff account is not active.");

  const attendanceDate = input.attendanceDate ?? new Date();
  const existing = await getRecord(input.schoolId, input.userId, attendanceDate);
  if (!existing?.checkInAt) throw new Error("Staff must check in before checking out.");
  if (existing.checkOutAt) throw new Error("Staff attendance has already been checked out for this day.");

  const checkOutAt = nowInstant();
  const updated = await db.orm.public.StaffAttendanceRecord.where({ id: existing.id }).update({ checkOutAt, missedCheckout: false, updatedAt: checkOutAt });
  if (!updated) throw new Error("Unable to save staff checkout.");

  await writeAuditLog({
    schoolId: input.schoolId,
    userId: input.userId,
    action: "UPDATE",
    entity: "StaffAttendance",
    entityId: String(existing.id),
    oldValue: { checkOutAt: existing.checkOutAt },
    newValue: { checkOutAt },
  });

  return updated;
}

export async function getStaffAttendance(input: { schoolId: number; userId?: number; attendanceDate?: Date }) {
  const records = await db.orm.public.StaffAttendanceRecord.all();
  const key = input.attendanceDate ? dayKey(input.attendanceDate) : null;
  return records.filter((record) => {
    if (record.schoolId !== input.schoolId) return false;
    if (input.userId !== undefined && record.userId !== input.userId) return false;
    if (key && dayKey(asDate(record.attendanceDate)) !== key) return false;
    return true;
  });
}
