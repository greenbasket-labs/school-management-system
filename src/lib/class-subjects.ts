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
  const classes = await db.orm.public.SchoolClass.all();
  const subjects = await db.orm.public.Subject.all();

  const schoolClass = classes.find(
    (item) => item.id === classId,
  );

  if (!schoolClass) {
    throw new Error("Class not found.");
  }

  const subject = subjects.find(
    (item) => item.id === subjectId,
  );

  if (!subject) {
    throw new Error("Subject not found.");
  }

  if (subject.schoolId !== schoolClass.schoolId) {
    throw new Error(
      "The selected subject does not belong to this school.",
    );
  }

  if (teacherId != null) {
    const teachers = await db.orm.public.Teacher.all();
    const teacher = teachers.find(
      (item) => item.id === teacherId,
    );

    if (!teacher) {
      throw new Error("Teacher not found.");
    }

    if (teacher.schoolId !== schoolClass.schoolId) {
      throw new Error(
        "The selected teacher does not belong to this school.",
      );
    }

    if (teacher.status !== "ACTIVE") {
      throw new Error(
        "The selected teacher is not active.",
      );
    }
  }

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
  const assignments =
    await db.orm.public.ClassSubject.all();

  const assignment = assignments.find(
    (item) => item.id === assignmentId,
  );

  if (!assignment) {
    throw new Error("Class subject assignment not found.");
  }

  if (teacherId != null) {
    const classes = await db.orm.public.SchoolClass.all();
    const teachers = await db.orm.public.Teacher.all();

    const schoolClass = classes.find(
      (item) => item.id === assignment.classId,
    );

    const teacher = teachers.find(
      (item) => item.id === teacherId,
    );

    if (!schoolClass) {
      throw new Error("Class not found.");
    }

    if (!teacher) {
      throw new Error("Teacher not found.");
    }

    if (teacher.schoolId !== schoolClass.schoolId) {
      throw new Error(
        "The selected teacher does not belong to this school.",
      );
    }

    if (teacher.status !== "ACTIVE") {
      throw new Error(
        "The selected teacher is not active.",
      );
    }
  }

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
