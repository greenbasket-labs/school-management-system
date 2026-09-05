import { Temporal } from "@js-temporal/polyfill";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { db } from "../../../../src/prisma/db";

function toDateInputValue(value: unknown): string {
  if (!value) return "";

  const text = String(value);
  const datePart = text.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  return "";
}

function toTemporalInstant(value: string, fieldName: string) {
  try {
    return Temporal.Instant.from(`${value}T00:00:00Z`);
  } catch {
    throw new Error(`Invalid ${fieldName}.`);
  }
}

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("students.edit");

  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    notFound();
  }

  const students = await db.orm.public.Student.all();
  const student = students.find((item) => item.id === studentId);

  if (!student || student.schoolId !== user.schoolId) {
    notFound();
  }

  const school = await getSchool();
  const classes = await db.orm.public.SchoolClass.all();

  async function updateStudent(formData: FormData) {
    "use server";

    const actor = await requirePermission("students.edit");

    const students = await db.orm.public.Student.all();

    const existingStudent = students.find(
      (item) => item.id === studentId,
    );

    if (
      !existingStudent ||
      existingStudent.schoolId !== actor.schoolId
    ) {
      throw new Error("Student not found.");
    }

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

    const statusValue = String(
      formData.get("status") ?? "",
    ).trim();

    if (!firstName || !lastName) {
      throw new Error(
        "First name and last name are required.",
      );
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

      const schoolClasses =
        await db.orm.public.SchoolClass.all();

      const selectedClass = schoolClasses.find(
        (item) =>
          item.id === parsedClassId &&
          item.schoolId === actor.schoolId,
      );

      if (!selectedClass) {
        throw new Error(
          "Selected class does not belong to this school.",
        );
      }

      currentClassId = parsedClassId;
    }

    const validGenders = [
      "MALE",
      "FEMALE",
      "OTHER",
    ] as const;

    let gender:
      | "MALE"
      | "FEMALE"
      | "OTHER"
      | null = null;

    if (genderValue) {
      if (
        !validGenders.includes(
          genderValue as (typeof validGenders)[number],
        )
      ) {
        throw new Error("Invalid gender.");
      }

      gender =
        genderValue as
          | "MALE"
          | "FEMALE"
          | "OTHER";
    }

    const validStatuses = [
      "ACTIVE",
      "GRADUATED",
      "TRANSFERRED",
      "WITHDRAWN",
      "SUSPENDED",
      "INACTIVE",
    ] as const;

    if (
      !validStatuses.includes(
        statusValue as (typeof validStatuses)[number],
      )
    ) {
      throw new Error("Invalid student status.");
    }

    const oldClassId =
      existingStudent.currentClassId;

    await db.orm.public.Student.where({
      id: studentId,
    }).update({
      firstName,
      middleName: middleName || null,
      lastName,
      dateOfBirth,
      gender,
      phone: phone || null,
      address: address || null,
      admissionDate,
      status:
        statusValue as
          | "ACTIVE"
          | "GRADUATED"
          | "TRANSFERRED"
          | "WITHDRAWN"
          | "SUSPENDED"
          | "INACTIVE",
      currentClassId,
    });

    /*
     * Class history handling.
     *
     * When the student's class changes:
     *
     * 1. Close the previous current history record.
     * 2. Create a new current history record.
     * 3. Attach the new history record to the school's
     *    currently ACTIVE academic session.
     */

    if (oldClassId !== currentClassId) {
      const histories =
        await db.orm.public.StudentClassHistory.all();

      const currentHistory = histories.find(
        (item) =>
          item.studentId === studentId &&
          item.isCurrent === true,
      );

      const today = Temporal.Now.instant();

      if (currentHistory) {
        await db.orm.public.StudentClassHistory.where({
          id: currentHistory.id,
        }).update({
          endDate: today,
          isCurrent: false,
        });
      }

      if (currentClassId !== null) {
        const sessions =
          await db.orm.public.AcademicSession.all();

        const activeSession = sessions.find(
          (item) =>
            item.schoolId === actor.schoolId &&
            item.status === "ACTIVE",
        );

        if (activeSession) {
          await db.orm.public.StudentClassHistory.create({
            studentId,
            classId: currentClassId,
            sessionId: activeSession.id,
            startDate: today,
            endDate: null,
            isCurrent: true,
          });
        }
      }
    }

    redirect(`/students/${studentId}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-700">
            {school.name}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Edit Student
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                {student.permanentId} ·{" "}
                {student.firstName}{" "}
                {student.middleName ?? ""}{" "}
                {student.lastName}
              </p>
            </div>

            <a
              href={`/students/${student.id}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </a>
          </div>
        </div>

        <form
          action={updateStudent}
          className="space-y-6"
        >
          {/* PERSONAL INFORMATION */}

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Personal Information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  First Name *
                </span>

                <input
                  name="firstName"
                  type="text"
                  required
                  defaultValue={student.firstName}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Middle Name
                </span>

                <input
                  name="middleName"
                  type="text"
                  defaultValue={
                    student.middleName ?? ""
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Last Name *
                </span>

                <input
                  name="lastName"
                  type="text"
                  required
                  defaultValue={student.lastName}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Gender
                </span>

                <select
                  name="gender"
                  defaultValue={
                    student.gender ?? ""
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Date of Birth
                </span>

                <input
                  name="dateOfBirth"
                  type="date"
                  defaultValue={toDateInputValue(
                    student.dateOfBirth,
                  )}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Admission Date
                </span>

                <input
                  name="admissionDate"
                  type="date"
                  defaultValue={toDateInputValue(
                    student.admissionDate,
                  )}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
          </section>

          {/* CONTACT INFORMATION */}

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Contact Information
            </h2>

            <div className="mt-5 grid gap-5">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Phone
                </span>

                <input
                  name="phone"
                  type="tel"
                  defaultValue={
                    student.phone ?? ""
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Address
                </span>

                <textarea
                  name="address"
                  rows={3}
                  defaultValue={
                    student.address ?? ""
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
          </section>

          {/* SCHOOL INFORMATION */}

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              School Information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Current Class
                </span>

                <select
                  name="currentClassId"
                  defaultValue={
                    student.currentClassId?.toString() ??
                    ""
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">
                    Not assigned
                  </option>

                  {classes
                    .filter(
                      (schoolClass) =>
                        schoolClass.schoolId ===
                        user.schoolId,
                    )
                    .map((schoolClass) => (
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
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue={student.status}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="GRADUATED">
                    Graduated
                  </option>

                  <option value="TRANSFERRED">
                    Transferred
                  </option>

                  <option value="WITHDRAWN">
                    Withdrawn
                  </option>

                  <option value="SUSPENDED">
                    Suspended
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>
                </select>
              </label>
            </div>
          </section>

          {/* ACTIONS */}

          <div className="flex justify-end gap-3">
            <a
              href={`/students/${student.id}`}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </a>

            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}