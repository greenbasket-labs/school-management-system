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

export async function createStudent(input: {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  phone?: string;
  address?: string;
}) {
  const schools = await db.orm.public.School.all();

  if (schools.length === 0) {
    throw new Error("School not found");
  }

  const school = schools[0];

  const firstName = input.firstName.trim();
  const middleName = input.middleName?.trim() || null;
  const lastName = input.lastName.trim();

  const gender = input.gender.trim().toUpperCase() as
    | "MALE"
    | "FEMALE"
    | "OTHER";

  if (!firstName) {
    throw new Error("First name is required");
  }

  if (!lastName) {
    throw new Error("Last name is required");
  }

  if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
    throw new Error("Invalid gender");
  }

  const students = await db.orm.public.Student.all();

  const year = new Date().getFullYear();
  const pattern = new RegExp(`^STU-${year}-(\\d+)$`);

  let highestNumber = 0;

  for (const student of students) {
    const match = student.permanentId.match(pattern);

    if (match) {
      highestNumber = Math.max(
        highestNumber,
        Number(match[1]),
      );
    }
  }

  const permanentId = `STU-${year}-${String(
    highestNumber + 1,
  ).padStart(5, "0")}`;

  return db.orm.public.Student.create({
    schoolId: school.id,
    permanentId,
    firstName,
    middleName,
    lastName,
    gender,
    dateOfBirth: input.dateOfBirth
      ? new Date(input.dateOfBirth)
      : null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    status: "ACTIVE",
  });
}