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

export async function createTeacher(input: {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: "ACTIVE" | "INACTIVE";
}) {
  const schools = await db.orm.public.School.all();

  if (schools.length === 0) {
    throw new Error("School not found");
  }

  const school = schools[0];

  const firstName = input.firstName.trim();
  const middleName = input.middleName?.trim() || null;
  const lastName = input.lastName.trim();
  const phone = input.phone?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;
  const address = input.address?.trim() || null;
  const status = input.status ?? "ACTIVE";

  if (!firstName) {
    throw new Error("First name is required");
  }

  if (!lastName) {
    throw new Error("Last name is required");
  }

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    throw new Error("Invalid teacher status");
  }

  const teachers = await db.orm.public.Teacher.all();

  const year = new Date().getFullYear();
  const pattern = new RegExp(`^TEA-${year}-(\\d+)$`);

  let highestNumber = 0;

  for (const teacher of teachers) {
    const match = teacher.permanentId.match(pattern);

    if (match) {
      highestNumber = Math.max(
        highestNumber,
        Number(match[1]),
      );
    }
  }

  const permanentId = `TEA-${year}-${String(
    highestNumber + 1,
  ).padStart(5, "0")}`;

  return db.orm.public.Teacher.create({
    schoolId: school.id,
    permanentId,
    firstName,
    middleName,
    lastName,
    phone,
    email,
    address,
    status,
  });
}