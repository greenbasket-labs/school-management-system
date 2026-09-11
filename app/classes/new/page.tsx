import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { db } from "../../../src/prisma/db";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
] as const;

export default async function NewClassPage() {
  const user = await requirePermission("classes.create");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    throw new Error("School not found.");
  }

  const sessions = await db.orm.public.AcademicSession.all();
  const teachers = await db.orm.public.Teacher.all();

  const schoolSessions = sessions
    .filter((session) => session.schoolId === school.id)
    .sort((a, b) =>
      String(b.startDate).localeCompare(String(a.startDate)),
    );

  const schoolTeachers = teachers
    .filter(
      (teacher) =>
        teacher.schoolId === school.id &&
        teacher.status === "ACTIVE",
    )
    .sort((a, b) => {
      const nameA = [a.firstName, a.middleName, a.lastName]
        .filter(Boolean)
        .join(" ");

      const nameB = [b.firstName, b.middleName, b.lastName]
        .filter(Boolean)
        .join(" ");

      return nameA.localeCompare(nameB);
    });

  async function createClass(formData: FormData) {
    "use server";

    const actor = await requirePermission("classes.create");
    const actorSchool = await getSchool();

    if (!actorSchool || actorSchool.id !== actor.schoolId) {
      throw new Error("School not found.");
    }

    const name = String(formData.get("name") ?? "").trim();
    const sectionValue = String(
      formData.get("section") ?? "",
    ).trim();

    const sessionIdValue = String(
      formData.get("sessionId") ?? "",
    ).trim();

    const classTeacherIdValue = String(
      formData.get("classTeacherId") ?? "",
    ).trim();

    const statusValue = String(
      formData.get("status") ?? "ACTIVE",
    ).trim();

    if (!name) {
      throw new Error("Class name is required.");
    }

    if (!sessionIdValue) {
      throw new Error("Academic session is required.");
    }

    const sessionId = Number(sessionIdValue);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      throw new Error("Invalid academic session.");
    }

    if (
      statusValue !== "ACTIVE" &&
      statusValue !== "INACTIVE"
    ) {
      throw new Error("Invalid class status.");
    }

    const sessionsForSchool =
      await db.orm.public.AcademicSession.all();

    const session = sessionsForSchool.find(
      (item) =>
        item.id === sessionId &&
        item.schoolId === actor.schoolId,
    );

    if (!session) {
      throw new Error(
        "The selected academic session does not belong to this school.",
      );
    }

    if (
      session.status !== "DRAFT" &&
      session.status !== "ACTIVE"
    ) {
      throw new Error(
        "Classes can only be created for a draft or active academic session.",
      );
    }

    let classTeacherId: number | null = null;

    if (classTeacherIdValue) {
      const parsedTeacherId = Number(classTeacherIdValue);

      if (
        !Number.isInteger(parsedTeacherId) ||
        parsedTeacherId <= 0
      ) {
        throw new Error("Invalid class teacher.");
      }

      const teachersForSchool =
        await db.orm.public.Teacher.all();

      const teacher = teachersForSchool.find(
        (item) =>
          item.id === parsedTeacherId &&
          item.schoolId === actor.schoolId &&
          item.status === "ACTIVE",
      );

      if (!teacher) {
        throw new Error(
          "The selected class teacher does not belong to this school or is not active.",
        );
      }

      classTeacherId = parsedTeacherId;
    }

    const existingClasses =
      await db.orm.public.SchoolClass.all();

    const duplicate = existingClasses.some(
      (item) =>
        item.schoolId === actor.schoolId &&
        item.sessionId === sessionId &&
        item.name.toLowerCase() === name.toLowerCase() &&
        String(item.section ?? "").toLowerCase() ===
          sectionValue.toLowerCase(),
    );

    if (duplicate) {
      throw new Error(
        "A class with the same name and section already exists for this academic session.",
      );
    }

    await db.orm.public.SchoolClass.create({
      schoolId: actor.schoolId,
      sessionId,
      name,
      section: sectionValue || null,
      classTeacherId,
      status: statusValue,
    });

    redirect("/classes");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/classes"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Classes
        </Link>

        <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Create Class
            </h1>

            <p className="mt-2 text-gray-600">
              Create a class for an academic session and
              optionally assign a class teacher.
            </p>
          </div>

          <form action={createClass} className="space-y-6">
            <div>
              <label
                htmlFor="sessionId"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Academic Session
              </label>

              <select
                id="sessionId"
                name="sessionId"
                required
                defaultValue={
                  schoolSessions[0]?.id
                    ? String(schoolSessions[0].id)
                    : ""
                }
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">
                  Select academic session
                </option>

                {schoolSessions.map((session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {session.name} ({session.status})
                  </option>
                ))}
              </select>

              {schoolSessions.length === 0 && (
                <p className="mt-2 text-sm text-red-600">
                  No academic session exists yet. Create a
                  session first.
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Class Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. JSS 1"
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="section"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Section
                </label>

                <input
                  id="section"
                  name="section"
                  type="text"
                  placeholder="e.g. A"
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Optional. Examples: A, B, Gold, Science.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="classTeacherId"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Class Teacher
              </label>

              <select
                id="classTeacherId"
                name="classTeacherId"
                defaultValue=""
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">
                  Not assigned
                </option>

                {schoolTeachers.map((teacher) => {
                  const teacherName = [
                    teacher.firstName,
                    teacher.middleName,
                    teacher.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <option
                      key={teacher.id}
                      value={teacher.id}
                    >
                      {teacherName} — {teacher.permanentId}
                    </option>
                  );
                })}
              </select>

              {schoolTeachers.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  No active teachers are available yet.
                  You can create the class without assigning
                  a teacher.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue="ACTIVE"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/classes"
                className="rounded-lg border px-5 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={schoolSessions.length === 0}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Class
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}