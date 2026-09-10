import { db } from "../prisma/db";
import { hasPermission } from "./permissions";
import { writeAuditLog } from "./audit";

export type StaffAttendanceSettings = {
  startHour: number;
  startMinute: number;
  graceMinutes: number;
  closingHour: number;
  closingMinute: number;
  requireCheckout: boolean;
  missedCheckoutAction: "FLAG" | "AUTO_MARK";
};

const DEFAULTS: StaffAttendanceSettings = {
  startHour: 8,
  startMinute: 0,
  graceMinutes: 15,
  closingHour: 16,
  closingMinute: 0,
  requireCheckout: false,
  missedCheckoutAction: "FLAG",
};

const KEY = "staff_attendance_settings";

async function readSchoolFeatures(schoolId: number) {
  const rows = await db.orm.public.SchoolFeature.all();
  return rows.filter((row) => row.schoolId === schoolId);
}

export async function getStaffAttendanceSettings(schoolId: number): Promise<StaffAttendanceSettings> {
  const features = await readSchoolFeatures(schoolId);
  const feature = features.find((row) => row.featureCode === KEY);
  if (!feature?.description) return { ...DEFAULTS };

  try {
    const parsed = JSON.parse(feature.description) as Partial<StaffAttendanceSettings>;
    return {
      startHour: Number.isInteger(parsed.startHour) ? Number(parsed.startHour) : DEFAULTS.startHour,
      startMinute: Number.isInteger(parsed.startMinute) ? Number(parsed.startMinute) : DEFAULTS.startMinute,
      graceMinutes: Number.isInteger(parsed.graceMinutes) ? Number(parsed.graceMinutes) : DEFAULTS.graceMinutes,
      closingHour: Number.isInteger(parsed.closingHour) ? Number(parsed.closingHour) : DEFAULTS.closingHour,
      closingMinute: Number.isInteger(parsed.closingMinute) ? Number(parsed.closingMinute) : DEFAULTS.closingMinute,
      requireCheckout: typeof parsed.requireCheckout === "boolean" ? parsed.requireCheckout : DEFAULTS.requireCheckout,
      missedCheckoutAction: parsed.missedCheckoutAction === "AUTO_MARK" ? "AUTO_MARK" : "FLAG",
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function validate(input: Partial<StaffAttendanceSettings>) {
  const values = { ...DEFAULTS, ...input };
  if (values.startHour < 0 || values.startHour > 23 || values.closingHour < 0 || values.closingHour > 23) throw new Error("Invalid attendance hour.");
  if (values.startMinute < 0 || values.startMinute > 59 || values.closingMinute < 0 || values.closingMinute > 59) throw new Error("Invalid attendance minute.");
  if (values.graceMinutes < 0 || values.graceMinutes > 1440) throw new Error("Grace period must be between 0 and 1440 minutes.");
  if (values.missedCheckoutAction !== "FLAG" && values.missedCheckoutAction !== "AUTO_MARK") throw new Error("Invalid missed checkout action.");
  return values;
}

export async function updateStaffAttendanceSettings(input: {
  schoolId: number;
  userId: number;
  settings: Partial<StaffAttendanceSettings>;
}) {
  if (!(await hasPermission(input.userId, "attendance.staff.settings"))) throw new Error("Permission denied: attendance.staff.settings");
  const current = await getStaffAttendanceSettings(input.schoolId);
  const next = validate({ ...current, ...input.settings });
  const features = await readSchoolFeatures(input.schoolId);
  const feature = features.find((row) => row.featureCode === KEY);
  if (!feature) throw new Error("Staff attendance settings feature is not provisioned for this school.");

  const description = JSON.stringify(next);
  const updated = await db.orm.public.SchoolFeature.where({ id: feature.id }).update({ description, updatedAt: new Date().toISOString() });
  await writeAuditLog({
    schoolId: input.schoolId,
    userId: input.userId,
    action: "UPDATE",
    entity: "StaffAttendanceSettings",
    entityId: String(feature.id),
    oldValue: current,
    newValue: next,
  });
  return updated;
}

export { DEFAULTS as DEFAULT_STAFF_ATTENDANCE_SETTINGS };
