import { db } from "../prisma/db";
import { writeAuditLog } from "./audit";

export async function getStudents(schoolId: number) {
  const students = await db.orm.public.Student.all();

  return students
    .filter((student) => student.schoolId === schoolId)
    .sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);

      if (lastNameCompare !== 0) return lastNameCompare;

      return a.firstName.localeCompare(b.firstName);
    });
}

export async function getStudentById(
  studentId: number,
  schoolId?: number,
) {
  const students = await db.orm.public.Student.all();

  return students.find(
    (student) =>
      student.id === studentId &&
      (schoolId == null || student.schoolId === schoolId),
  );
}

export async function getStudentByPermanentId(
  permanentId: string,
  schoolId: number,
) {
  const students = await db.orm.public.Student.all();

  return students.find(
    (student) =>
      student.permanentId === permanentId &&
      student.schoolId === schoolId,
  );
}

export async function searchStudents(
  schoolId: number,
  search: string,
) {
  const students = await getStudents(schoolId);

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
  schoolId: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  phone?: string;
  address?: string;
}) {
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

  const schools = await db.orm.public.School.all();
  const school = schools.find((item) => item.id === input.schoolId);

  if (!school) {
    throw new Error("School not found");
  }

  const students = await db.orm.public.Student.all();

  const year = new Date().getFullYear();
  const pattern = new RegExp(`^STU-${year}-(\\d+)$`);

  let highestNumber = 0;

  for (const student of students) {
    if (student.schoolId !== input.schoolId) continue;

    const match = student.permanentId.match(pattern);

    if (match) {
      highestNumber = Math.max(
        highestNumber,
        Number(match[1]),
      );
    }
  }

  let sequence = highestNumber + 1;
  let permanentId = `STU-${year}-${String(sequence).padStart(5, "0")}`;

  while (students.some((student) => student.permanentId === permanentId)) {
    sequence += 1;
    permanentId = `STU-${year}-${String(sequence).padStart(5, "0")}`;
  }

  const student =
    await db.orm.public.Student.create({
      schoolId: input.schoolId,
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

  await writeAuditLog({
    schoolId: input.schoolId,
    action: "CREATE",
    entity: "Student",
    entityId: student.id,
    newValue: {
      permanentId: student.permanentId,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      phone: student.phone,
      address: student.address,
      status: student.status,
    },
  });

  return student;
}
