import { db } from "../prisma/db";

export async function getStudents() {
  return db.orm.public.Student.all();
}

export async function getStudentById(studentId: number) {
  const students = await db.orm.public.Student.all();

  return students.find(
    (student) => student.id === studentId,
  );
}

export async function getStudentByPermanentId(
  permanentId: string,
) {
  const students = await db.orm.public.Student.all();

  return students.find(
    (student) => student.permanentId === permanentId,
  );
}

export async function searchStudents(
  search: string,
) {
  const students = await db.orm.public.Student.all();

  const normalizedSearch = search
    .trim()
    .toLowerCase();

  if (!normalizedSearch) {
    return students;
  }

  return students.filter((student) => {
    const fullName = [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      fullName.includes(normalizedSearch) ||
      student.permanentId
        .toLowerCase()
        .includes(normalizedSearch) ||
      student.phone
        ?.toLowerCase()
        .includes(normalizedSearch)
    );
  });
}