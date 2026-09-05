import { db } from "../prisma/db";

export async function getClassSubjects(
  classId: number,
) {
  const assignments =
    await db.orm.public.ClassSubject.all();

  return assignments.filter(
    (item) => item.classId === classId,
  );
}

export async function getSubjectClasses(
  subjectId: number,
) {
  const assignments =
    await db.orm.public.ClassSubject.all();

  return assignments.filter(
    (item) => item.subjectId === subjectId,
  );
}

export async function getTeacherAssignments(
  teacherId: number,
) {
  const assignments =
    await db.orm.public.ClassSubject.all();

  return assignments.filter(
    (item) => item.teacherId === teacherId,
  );
}

export async function getClassSubjectAssignment(
  classId: number,
  subjectId: number,
) {
  const assignments =
    await db.orm.public.ClassSubject.all();

  return assignments.find(
    (item) =>
      item.classId === classId &&
      item.subjectId === subjectId,
  );
}

export async function assignSubjectToClass(
  classId: number,
  subjectId: number,
  teacherId?: number | null,
) {
  const assignments =
    await db.orm.public.ClassSubject.all();

  const existing = assignments.find(
    (item) =>
      item.classId === classId &&
      item.subjectId === subjectId,
  );

  if (existing) {
    throw new Error(
      "This subject is already assigned to this class.",
    );
  }

  return db.orm.public.ClassSubject.create({
    classId,
    subjectId,
    teacherId: teacherId ?? null,
  });
}

export async function updateClassSubjectTeacher(
  assignmentId: number,
  teacherId?: number | null,
) {
  return db.orm.public.ClassSubject.where({
    id: assignmentId,
  }).update({
    teacherId: teacherId ?? null,
  });
}

export async function removeSubjectFromClass(
  assignmentId: number,
) {
  const assignments =
    await db.orm.public.ClassSubject.all();

  const existing = assignments.find(
    (item) => item.id === assignmentId,
  );

  if (!existing) {
    return false;
  }

  await db.orm.public.ClassSubject.where({
    id: assignmentId,
  }).delete();

  return true;
}