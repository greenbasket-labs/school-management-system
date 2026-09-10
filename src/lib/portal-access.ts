import { db } from "../prisma/db";
import { getCurrentUser } from "./current-user";
import { hasPermission } from "./permissions";

export type PortalType = "STUDENT" | "PARENT" | "TEACHER";

export type PortalFeature =
  | "PORTAL"
  | "PORTAL_PROFILE"
  | "PORTAL_ATTENDANCE"
  | "PORTAL_RESULTS"
  | "PORTAL_REPORT_CARDS"
  | "PORTAL_FEES"
  | "PORTAL_RECEIPTS"
  | "PORTAL_ANNOUNCEMENTS"
  | "PORTAL_MESSAGES"
  | "PORTAL_DOCUMENTS"
  | "PORTAL_REQUESTS"
  | "PORTAL_PAYMENTS";

const PORTAL_USER_TYPES: Record<PortalType, string> = {
  STUDENT: "STUDENT",
  PARENT: "PARENT",
  TEACHER: "TEACHER",
};

async function getSchoolId() {
  const schools = await db.orm.public.School.all();
  return schools[0]?.id ?? null;
}

export async function isPortalFeatureEnabled(
  schoolId: number,
  featureCode: PortalFeature,
) {
  const features = await db.orm.public.SchoolFeature.all();
  const feature = features.find(
    (item) =>
      item.schoolId === schoolId &&
      item.featureCode === featureCode,
  );

  // Missing feature rows are treated as enabled so a new deployment
  // remains usable before optional feature configuration is seeded.
  if (!feature) return true;

  return feature.status === "AVAILABLE" && feature.enabled;
}

export async function requirePortal(
  portal: PortalType,
  featureCode: PortalFeature = "PORTAL",
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const schoolId = await getSchoolId();

  if (!schoolId || user.schoolId !== schoolId) {
    throw new Error("School access denied");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Account is not active");
  }

  if (user.userType !== PORTAL_USER_TYPES[portal]) {
    throw new Error("Portal access denied");
  }

  if (!(await isPortalFeatureEnabled(schoolId, featureCode))) {
    throw new Error("This portal feature is disabled by the school");
  }

  return user;
}

export async function canAccessPortal(
  portal: PortalType,
  featureCode: PortalFeature = "PORTAL",
) {
  try {
    await requirePortal(portal, featureCode);
    return true;
  } catch {
    return false;
  }
}

export async function getStudentPortalRecord(
  userId: number,
  studentId?: number,
) {
  const schoolId = await getSchoolId();
  if (!schoolId) return null;

  const students = await db.orm.public.Student.all();
  return (
    students.find(
      (student) =>
        student.schoolId === schoolId &&
        student.userId === userId &&
        (studentId === undefined || student.id === studentId),
    ) ?? null
  );
}

export async function getParentPortalRecord(userId: number) {
  const schoolId = await getSchoolId();
  if (!schoolId) return null;

  const parents = await db.orm.public.Parent.all();
  return (
    parents.find(
      (parent) =>
        parent.schoolId === schoolId &&
        parent.userId === userId &&
        parent.status === "ACTIVE",
    ) ?? null
  );
}

export async function getParentPortalStudents(userId: number) {
  const parent = await getParentPortalRecord(userId);
  if (!parent) return [];

  const links = await db.orm.public.StudentParent.all();
  const students = await db.orm.public.Student.all();
  const studentIds = links
    .filter((link) => link.parentId === parent.id)
    .map((link) => link.studentId);

  return students.filter(
    (student) =>
      student.schoolId === parent.schoolId &&
      studentIds.includes(student.id),
  );
}

export async function parentCanAccessStudent(
  userId: number,
  studentId: number,
) {
  const students = await getParentPortalStudents(userId);
  return students.some((student) => student.id === studentId);
}

export async function getTeacherPortalRecord(userId: number) {
  const schoolId = await getSchoolId();
  if (!schoolId) return null;

  const teachers = await db.orm.public.Teacher.all();
  return (
    teachers.find(
      (teacher) =>
        teacher.schoolId === schoolId &&
        teacher.userId === userId &&
        teacher.status === "ACTIVE",
    ) ?? null
  );
}

export async function getTeacherPortalStudents(userId: number) {
  const teacher = await getTeacherPortalRecord(userId);
  if (!teacher) return [];

  const classes = await db.orm.public.SchoolClass.all();
  const classSubjects = await db.orm.public.ClassSubject.all();
  const students = await db.orm.public.Student.all();

  const assignedClassIds = new Set<number>(
    classes
      .filter(
        (item) =>
          item.schoolId === teacher.schoolId &&
          item.classTeacherId === teacher.id,
      )
      .map((item) => item.id),
  );

  for (const assignment of classSubjects) {
    if (assignment.teacherId === teacher.id) {
      const schoolClass = classes.find(
        (item) => item.id === assignment.classId,
      );
      if (schoolClass?.schoolId === teacher.schoolId) {
        assignedClassIds.add(schoolClass.id);
      }
    }
  }

  return students.filter(
    (student) =>
      student.schoolId === teacher.schoolId &&
      student.currentClassId !== null &&
      assignedClassIds.has(student.currentClassId),
  );
}

export async function teacherCanAccessStudent(
  userId: number,
  studentId: number,
) {
  const students = await getTeacherPortalStudents(userId);
  return students.some((student) => student.id === studentId);
}

export async function canUsePortalPermission(
  userId: number,
  permissionCode: string,
) {
  return hasPermission(userId, permissionCode);
}
