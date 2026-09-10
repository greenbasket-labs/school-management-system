import { db } from "../prisma/db";
import { hasPermission } from "./permissions";
import { writeAuditLog } from "./audit";

export type AttendanceCorrectionStatus = "PRESENT" | "ABSENT";

export type CorrectAttendanceInput = {
  schoolId: number;
  attendanceId: number;
  newStatus: AttendanceCorrectionStatus;
  reason: string;
  correctedByUserId: number;
  windowMinutes?: number;
};

const DEFAULT_WINDOW_MINUTES = 60;

function getWindowMinutes(value?: number) {
  const minutes = value ?? DEFAULT_WINDOW_MINUTES;
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 24 * 60) {
    throw new Error("Attendance correction window must be between 1 and 1440 minutes.");
  }
  return minutes;
}

function recordTime(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "epochMilliseconds" in value) {
    return Number((value as { epochMilliseconds: number }).epochMilliseconds);
  }
  return new Date(String(value)).getTime();
}

export async function correctAttendance(input: CorrectAttendanceInput) {
  const allowed = await hasPermission(input.correctedByUserId, "attendance.edit");
  if (!allowed) throw new Error("Permission denied: attendance.edit");

  const reason = input.reason.trim();
  if (!reason) throw new Error("Correction reason is required.");

  if (input.newStatus !== "PRESENT" && input.newStatus !== "ABSENT") {
    throw new Error("Invalid attendance status.");
  }

  const windowMinutes = getWindowMinutes(input.windowMinutes);
  const records = await db.orm.public.AttendanceRecord.all();
  const record = records.find(
    (item) => item.id === input.attendanceId && item.schoolId === input.schoolId,
  );

  if (!record) throw new Error("Attendance record not found in this school.");

  const createdAt = recordTime(record.createdAt);
  if (!Number.isFinite(createdAt)) throw new Error("Attendance record has an invalid creation time.");

  const elapsedMinutes = (Date.now() - createdAt) / 60000;
  if (elapsedMinutes > windowMinutes) {
    throw new Error(`Attendance correction window has expired after ${windowMinutes} minutes.`);
  }

  const oldStatus = record.status as AttendanceCorrectionStatus;
  if (oldStatus === input.newStatus) {
    throw new Error("Attendance already has the selected status.");
  }

  const updated = await db.orm.public.AttendanceRecord.where({ id: record.id }).update({
    status: input.newStatus,
    markedByUserId: input.correctedByUserId,
  });

  await writeAuditLog({
    schoolId: input.schoolId,
    userId: input.correctedByUserId,
    action: "UPDATE",
    entity: "Attendance",
    entityId: String(record.id),
    oldValue: {
      status: oldStatus,
      studentId: record.studentId,
      classId: record.classId,
    },
    newValue: {
      status: input.newStatus,
      studentId: record.studentId,
      classId: record.classId,
      reason,
      correctionWindowMinutes: windowMinutes,
    },
  });

  return {
    success: true,
    attendanceId: record.id,
    oldStatus,
    newStatus: input.newStatus,
    reason,
    correctionWindowMinutes: windowMinutes,
    record: updated,
  };
}
