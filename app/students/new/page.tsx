import { Temporal } from "@js-temporal/polyfill";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { db } from "../../../src/prisma/db";
import { assignStudentToClass } from "../../../src/lib/student-class";

function getNextStudentPermanentId(
  permanentIds: string[],
) {
  const year = new Date().getFullYear();
  const prefix = `STU-${year}-`;

  let highestNumber = 0;

  for (const permanentId of permanentIds) {
    if (!permanentId.startsWith(prefix)) {
      continue;
    }

    const numberPart = permanentId.slice(prefix.length);
    const number = Number(numberPart);

    if (
      Number.isInteger(number) &&
      number > highestNumber
    ) {
      highestNumber = number;
    }
  }

  const nextNumber = highestNumber + 1;

  return `${prefix}${String(nextNumber).padStart(5, "0")}`;
}

function toTemporalInstant(
  value: string,
  fieldName: string,
) {
  try {
    return Temporal.Instant.from(`${value}T00:00:00Z`);
  } catch {
    throw new Error(`Invalid ${fieldName}.`);
  }
}

export default async function NewStudentPage() {
  const actor = await requirePermission("students.create");

  const school = await getSchool();
  const [classes, sessions] = await Promise.all([
    db.orm.public.SchoolClass.all(),
    db.orm.public.AcademicSession.all(),
  ]);

  const activeSessionIds = new Set(
    sessions
      .filter(
        (session) =>
          session.schoolId === actor.schoolId &&
          session.status === "ACTIVE",
      )
      .map((session) => session.id),
  );

  const availableClasses = classes.filter(
    (schoolClass) =>
      schoolClass.schoolId === actor.schoolId &&
      schoolClass.status === "ACTIVE" &&
      activeSessionIds.has(schoolClass.sessionId),
  );

  async function createStudent(formData: FormData) {
    "use server";

    const user = await requirePermission("students.create");

    const firstName = String(
      formData.get("firstName") ?? "",
    ).trim();

    const middleName = String(
      formData.get("middleName") ?? "",
    ).trim();

    const lastName = String(
      formData.get("lastName") ?? "",
    ).trim();

    const genderValue = String(
      formData.get("gender") ?? "",
    ).trim();

    const phone = String(
      formData.get("phone") ?? "",
    ).trim();

    const address = String(
      formData.get("address") ?? "",
    ).trim();

    const dateOfBirthValue = String(
      formData.get("dateOfBirth") ?? "",
    ).trim();

    const admissionDateValue = String(
      formData.get("admissionDate") ?? "",
    ).trim();

    const currentClassIdValue = String(
      formData.get("currentClassId") ?? "",
    ).trim();

    if (!firstName || !lastName) {
      throw new Error(
        "First name and last name are required.",
      );
    }

    const gender = genderValue.toUpperCase();

    if (
      gender &&
      gender !== "MALE" &&
      gender !== "FEMALE" &&
      gender !== "OTHER"
    ) {
      throw new Error("Invalid gender.");
    }

    let dateOfBirth = null;

    if (dateOfBirthValue) {
      dateOfBirth = toTemporalInstant(
        dateOfBirthValue,
        "date of birth",
      );
    }

    let admissionDate = null;

    if (admissionDateValue) {
      admissionDate = toTemporalInstant(
        admissionDateValue,
        "admission date",
      );
    }

    let currentClassId: number | null = null;

    if (currentClassIdValue) {
      const parsedClassId = Number(
        currentClassIdValue,
      );

      if (
        !Number.isInteger(parsedClassId) ||
        parsedClassId <= 0
      ) {
        throw new Error("Invalid class.");
      }

      const classesForSchool =
        await db.orm.public.SchoolClass.all();
      const sessionsForSchool =
        await db.orm.public.AcademicSession.all();

      const selectedClass = classesForSchool.find(
        (item) =>
          item.id === parsedClassId &&
          item.schoolId === user.schoolId &&
          item.status === "ACTIVE",
      );

      if (!selectedClass) {
        throw new Error("The selected class is not available.");
      }

      const selectedSession = sessionsForSchool.find(
        (item) =>
          item.id === selectedClass.sessionId &&
          item.schoolId === user.schoolId &&
          item.status === "ACTIVE",
      );

      if (!selectedSession) {
        throw new Error(
          "Students can only be registered into a class in the active academic session.",
        );
      }

      currentClassId = parsedClassId;
    }

    const students =
      await db.orm.public.Student.all();

    const permanentId =
      getNextStudentPermanentId(
        students.map(
          (student) => student.permanentId,
        ),
      );

    const student =
      await db.orm.public.Student.create({
        schoolId: user.schoolId,
        permanentId,
        firstName,
        middleName: middleName || null,
        lastName,
        dateOfBirth,
        gender: gender
          ? (gender as
              | "MALE"
              | "FEMALE"
              | "OTHER")
          : null,
        phone: phone || null,
        address: address || null,
        admissionDate,
        status: "ACTIVE",
        currentClassId: null,
      });

    if (currentClassId) {
      const sessionsForSchool =
        await db.orm.public.AcademicSession.all();
      const selectedClass = (
        await db.orm.public.SchoolClass.all()
      ).find(
        (item) =>
          item.id === currentClassId &&
          item.schoolId === user.schoolId,
      );

      if (!selectedClass) {
        throw new Error("Selected class was not found.");
      }

      const selectedSession = sessionsForSchool.find(
        (item) =>
          item.id === selectedClass.sessionId &&
          item.schoolId === user.schoolId &&
          item.status === "ACTIVE",
      );

      if (!selectedSession) {
        throw new Error("Active academic session not found.");
      }

      const startDate = admissionDate ?? selectedSession.startDate;

      await assignStudentToClass(
        student.id,
        currentClassId,
        selectedSession.id,
        startDate,
      );
    }

    redirect(`/students/${student.id}`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school?.name ??
                "School Management System"}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Register Student
            </h1>
          </div>

          <a
            href="/students"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Students
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <form
          action={createStudent}
          className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
        >
          <div className="border-b border-slate-100 pb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Student Information
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Register a student and create their
              permanent school ID.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-slate-700"
              >
                First Name *
              </label>

              <input
                id="firstName"
                name="firstName"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="middleName"
                className="block text-sm font-medium text-slate-700"
              >
                Middle Name
              </label>

              <input
                id="middleName"
                name="middleName"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-slate-700"
              >
                Last Name *
              </label>

              <input
                id="lastName"
                name="lastName"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-slate-700"
              >
                Gender
              </label>

              <select
                id="gender"
                name="gender"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">
                  Select gender
                </option>

                <option value="MALE">
                  Male
                </option>

                <option value="FEMALE">
                  Female
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-slate-700"
              >
                Date of Birth
              </label>

              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="admissionDate"
                className="block text-sm font-medium text-slate-700"
              >
                Admission Date
              </label>

              <input
                id="admissionDate"
                name="admissionDate"
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-700"
              >
                Phone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="currentClassId"
                className="block text-sm font-medium text-slate-700"
              >
                Current Class
              </label>

              <select
                id="currentClassId"
                name="currentClassId"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">
                  Select class
                </option>

                {availableClasses.map((schoolClass) => (
                  <option
                    key={schoolClass.id}
                    value={schoolClass.id}
                  >
                    {schoolClass.name}
                    {schoolClass.section
                      ? ` - ${schoolClass.section}`
                      : ""}
                  </option>
                ))}
              </select>

              {availableClasses.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  No active classes are available in the active academic session yet.
                  You can register the student without a class and assign one later.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-slate-700"
              >
                Address
              </label>

              <textarea
                id="address"
                name="address"
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <a
              href="/students"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </a>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Register Student
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
