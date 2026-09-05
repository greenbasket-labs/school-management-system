import { db } from "../prisma/db";

export async function getClasses(schoolId: number) {
  const classes = await db.orm.public.SchoolClass.all();

  return classes
    .filter((item) => item.schoolId === schoolId)
    .sort((a, b) => {
      const sessionCompare = String(a.sessionId).localeCompare(
        String(b.sessionId),
      );

      if (sessionCompare !== 0) {
        return sessionCompare;
      }

      const nameCompare = a.name.localeCompare(b.name);

      if (nameCompare !== 0) {
        return nameCompare;
      }

      return String(a.section ?? "").localeCompare(
        String(b.section ?? ""),
      );
    });
}

export async function getClassById(
  classId: number,
  schoolId: number,
) {
  const classes = await db.orm.public.SchoolClass.all();

  return classes.find(
    (item) =>
      item.id === classId &&
      item.schoolId === schoolId,
  );
}

export async function getClassesForSession(
  schoolId: number,
  sessionId: number,
) {
  const classes = await db.orm.public.SchoolClass.all();

  return classes
    .filter(
      (item) =>
        item.schoolId === schoolId &&
        item.sessionId === sessionId,
    )
    .sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);

      if (nameCompare !== 0) {
        return nameCompare;
      }

      return String(a.section ?? "").localeCompare(
        String(b.section ?? ""),
      );
    });
}

export async function getActiveClassesForSession(
  schoolId: number,
  sessionId: number,
) {
  const classes = await getClassesForSession(
    schoolId,
    sessionId,
  );

  return classes.filter(
    (item) => item.status === "ACTIVE",
  );
}