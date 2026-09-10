import { Temporal } from "@js-temporal/polyfill";

import { db } from "../prisma/db";

export async function getStudentClassHistory(
  studentId: number,
) {
  const history = await db.orm.public.StudentClassHistory.all();

  return history
    .filter((item) => item.studentId === studentId)
    .sort((a, b) =>
      String(b.startDate).localeCompare(String(a.startDate)),
    );
}

export async function getCurrentStudentClass(studentId: number) {
  const history = await getStudentClassHistory(studentId);

  return history.find((item) => item.isCurrent === true);
}

export async function getClassStudents(classId: number) {
  const students = await db.orm.public.Student.all();

  return students.filter((student) => student.currentClassId === classId);
}

export async function assignStudentToClass(
  studentId: number,
  classId: number,
  sessionId: number,
  startDate: Temporal.Instant,
  options?: { allowDraftSession?: boolean },
) {
  const students = await db.orm.public.Student.all();
  const student = students.find((item) => item.id === studentId);

  if (!student) throw new Error("Student not found.");
  if (student.status !== "ACTIVE") {
    throw new Error("Only active students can be assigned to a class.");
  }

  const classes = await db.orm.public.SchoolClass.all();
  const schoolClass = classes.find((item) => item.id === classId);

  if (!schoolClass) throw new Error("Class not found.");
  if (schoolClass.status !== "ACTIVE") {
    throw new Error("Only active classes can receive students.");
  }
  if (schoolClass.sessionId !== sessionId) {
    throw new Error("Class does not belong to the selected academic session.");
  }
  if (student.schoolId !== schoolClass.schoolId) {
    throw new Error("Student and class belong to different schools.");
  }

  const sessions = await db.orm.public.AcademicSession.all();
  const session = sessions.find(
    (item) => item.id === sessionId && item.schoolId === schoolClass.schoolId,
  );

  if (!session) throw new Error("Academic session not found.");

  const allowDraft = options?.allowDraftSession === true;
  if (session.status !== "ACTIVE" && !(allowDraft && session.status === "DRAFT")) {
    throw new Error(
      "Students can only be assigned within an active academic session unless this is approved rollover preparation.",
    );
  }

  const history = await db.orm.public.StudentClassHistory.all();
  const existingCurrent = history.find(
    (item) => item.studentId === studentId && item.isCurrent === true,
  );

  if (existingCurrent) {
    if (existingCurrent.classId === classId && existingCurrent.sessionId === sessionId) {
      throw new Error("Student is already assigned to this class.");
    }

    await db.orm.public.StudentClassHistory.where({ id: existingCurrent.id }).update({
      endDate: startDate,
      isCurrent: false,
    });
  }

  const newHistory = await db.orm.public.StudentClassHistory.create({
    studentId,
    classId,
    sessionId,
    startDate,
    endDate: null,
    isCurrent: true,
  });

  await db.orm.public.Student.where({ id: studentId }).update({
    currentClassId: classId,
  });

  return newHistory;
}

export async function removeStudentFromClass(
  studentId: number,
  endDate: Temporal.Instant,
) {
  const students = await db.orm.public.Student.all();
  const student = students.find((item) => item.id === studentId);

  if (!student) throw new Error("Student not found.");

  const history = await db.orm.public.StudentClassHistory.all();
  const currentHistory = history.find(
    (item) => item.studentId === studentId && item.isCurrent === true,
  );

  if (currentHistory) {
    await db.orm.public.StudentClassHistory.where({ id: currentHistory.id }).update({
      endDate,
      isCurrent: false,
    });
  }

  await db.orm.public.Student.where({ id: studentId }).update({
    currentClassId: null,
  });

  return true;
}
