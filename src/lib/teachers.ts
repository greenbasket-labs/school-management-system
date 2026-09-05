import { db } from "../prisma/db";

export async function getTeachers(schoolId: number) {
  const teachers = await db.orm.public.Teacher.all();

  return teachers
    .filter((teacher) => teacher.schoolId === schoolId)
    .sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);

      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }

      return a.firstName.localeCompare(b.firstName);
    });
}

export async function getTeacherById(
  teacherId: number,
  schoolId: number,
) {
  const teachers = await db.orm.public.Teacher.all();

  return teachers.find(
    (teacher) =>
      teacher.id === teacherId &&
      teacher.schoolId === schoolId,
  );
}

export async function getTeacherByPermanentId(
  permanentId: string,
  schoolId: number,
) {
  const teachers = await db.orm.public.Teacher.all();

  return teachers.find(
    (teacher) =>
      teacher.permanentId === permanentId &&
      teacher.schoolId === schoolId,
  );
}

export async function searchTeachers(
  schoolId: number,
  search: string,
) {
  const teachers = await getTeachers(schoolId);

  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return teachers;
  }

  return teachers.filter((teacher) => {
    const fullName = [
      teacher.firstName,
      teacher.middleName,
      teacher.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      fullName.includes(normalizedSearch) ||
      teacher.permanentId
        .toLowerCase()
        .includes(normalizedSearch) ||
      teacher.phone
        ?.toLowerCase()
        .includes(normalizedSearch) ||
      teacher.email
        ?.toLowerCase()
        .includes(normalizedSearch)
    );
  });
}

export async function getActiveTeachers(schoolId: number) {
  const teachers = await getTeachers(schoolId);

  return teachers.filter(
    (teacher) => teacher.status === "ACTIVE",
  );
}