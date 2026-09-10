import { db } from "../prisma/db";
import { writeAuditLog } from "./audit";

export type SchoolSettingKey =
  | "STUDENT_PORTAL"
  | "PARENT_PORTAL"
  | "TEACHER_PORTAL"
  | "ONLINE_PAYMENTS"
  | "ATTENDANCE"
  | "EXAMS"
  | "RESULTS"
  | "REPORT_CARDS"
  | "ANNOUNCEMENTS"
  | "NOTIFICATIONS"
  | "REPORTS";

export type SchoolSetting = {
  key: SchoolSettingKey;
  enabled: boolean;
  description: string;
};

export const SCHOOL_SETTINGS: SchoolSetting[] = [
  { key: "STUDENT_PORTAL", enabled: true, description: "Student portal access" },
  { key: "PARENT_PORTAL", enabled: true, description: "Parent portal access" },
  { key: "TEACHER_PORTAL", enabled: true, description: "Teacher portal access" },
  { key: "ONLINE_PAYMENTS", enabled: false, description: "Online fee payments" },
  { key: "ATTENDANCE", enabled: true, description: "Attendance module" },
  { key: "EXAMS", enabled: true, description: "Examinations module" },
  { key: "RESULTS", enabled: true, description: "Results module" },
  { key: "REPORT_CARDS", enabled: true, description: "Report cards" },
  { key: "ANNOUNCEMENTS", enabled: true, description: "School announcements" },
  { key: "NOTIFICATIONS", enabled: true, description: "Notifications" },
  { key: "REPORTS", enabled: true, description: "Reports and exports" },
];

export function getDefaultSchoolSettings(): SchoolSetting[] {
  return SCHOOL_SETTINGS.map((setting) => ({ ...setting }));
}

export async function getSchoolSettings(schoolId: number) {
  const schools = await db.orm.public.School.all();
  if (!schools.some((school) => school.id === schoolId)) {
    throw new Error("School not found");
  }

  const features = await db.orm.public.SchoolFeature.all();
  const schoolFeatures = features.filter((feature) => feature.schoolId === schoolId);

  return getDefaultSchoolSettings().map((setting) => {
    const feature = schoolFeatures.find((item) => item.featureCode === setting.key);
    return {
      ...setting,
      enabled: feature ? feature.enabled : setting.enabled,
      configured: !!feature,
    };
  });
}

export async function isSchoolSettingEnabled(
  schoolId: number,
  key: SchoolSettingKey,
) {
  const settings = await getSchoolSettings(schoolId);
  return settings.find((setting) => setting.key === key)?.enabled ?? false;
}

export async function setSchoolSetting(
  schoolId: number,
  key: SchoolSettingKey,
  enabled: boolean,
  changedByUserId?: number,
) {
  const schools = await db.orm.public.School.all();
  if (!schools.some((school) => school.id === schoolId)) {
    throw new Error("School not found");
  }

  const features = await db.orm.public.SchoolFeature.all();
  const feature = features.find(
    (item) => item.schoolId === schoolId && item.featureCode === key,
  );

  if (!feature) {
    throw new Error(`School setting ${key} has not been provisioned`);
  }

  if (feature.isCore && !enabled) {
    throw new Error("Core school settings cannot be disabled");
  }

  await db.orm.public.SchoolFeature.where({ id: feature.id }).update({ enabled });

  await writeAuditLog({
    schoolId,
    userId: changedByUserId,
    action: "UPDATE",
    entity: "SchoolSetting",
    entityId: feature.id,
    oldValue: { key, enabled: feature.enabled },
    newValue: { key, enabled },
  });

  return true;
}

export function normalizeSearchQuery(value?: string) {
  return value?.trim().replace(/\s+/g, " ") || "";
}

export function paginate<T>(items: T[], page = 1, pageSize = 25) {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const total = items.length;
  const start = (safePage - 1) * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}
