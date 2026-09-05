import { db } from "../prisma/db";

export async function getSubjects(schoolId: number) {
  const subjects = await db.orm.public.Subject.all();

  return subjects
    .filter((subject) => subject.schoolId === schoolId)
    .sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);

      if (nameCompare !== 0) {
        return nameCompare;
      }

      return String(a.code ?? "").localeCompare(
        String(b.code ?? ""),
      );
    });
}

export async function getSubjectById(
  subjectId: number,
  schoolId: number,
) {
  const subjects = await db.orm.public.Subject.all();

  return subjects.find(
    (subject) =>
      subject.id === subjectId &&
      subject.schoolId === schoolId,
  );
}

export async function getSubjectByCode(
  code: string,
  schoolId: number,
) {
  const subjects = await db.orm.public.Subject.all();

  const normalizedCode = code.trim().toLowerCase();

  if (!normalizedCode) {
    return undefined;
  }

  return subjects.find(
    (subject) =>
      subject.schoolId === schoolId &&
      subject.code?.toLowerCase() === normalizedCode,
  );
}

export async function searchSubjects(
  schoolId: number,
  search: string,
) {
  const subjects = await getSubjects(schoolId);

  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return subjects;
  }

  return subjects.filter((subject) => {
    return (
      subject.name
        .toLowerCase()
        .includes(normalizedSearch) ||
      subject.code
        ?.toLowerCase()
        .includes(normalizedSearch)
    );
  });
}

export async function getActiveSubjects(
  schoolId: number,
) {
  const subjects = await getSubjects(schoolId);

  return subjects.filter(
    (subject) => subject.status === "ACTIVE",
  );
}