import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getClassById } from "../../../../src/lib/classes";
import { db } from "../../../../src/prisma/db";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
] as const;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditClassPage({
  params,
}: PageProps) {
  const user = await requirePermission("classes.edit");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    throw new Error("School not found.");
  }

  const { id } = await params;
  const classId = Number(id);

  if (!Number.isInteger(classId) || classId <= 0) {
    notFound();
  }

  const schoolClass = await getClassById(
    classId,
    school.id,
  );

  if (!schoolClass) {
    notFound();
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
      const nameA = [
        a.firstName,
        a.middleName,
        a.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      const nameB = [
        b.firstName,
        b.middleName,
        b.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      return nameA.localeCompare(nameB);
    });

  async function updateClass(formData: FormData) {
    "use server";

    const actor = await requirePermission("classes.edit");
    const actorSchool = await getSchool();

    if (!actorSchool || actorSchool.id !== actor.schoolId) {
      throw new Error("School not found.");
    }

    const currentClass = await getClassById(
      classId,
      actor.schoolId,
    );

    if (!currentClass) {
      throw new Error("Class not found.");
    }

    const name = String(
      formData.get("name") ?? "",
    ).trim();

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
      formData.get("status") ?? "",
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

    const allSessions =
      await db.orm.public.AcademicSession.all();

    const session = allSessions.find(
      (item) =>
        item.id === sessionId &&
        item.schoolId === actor.schoolId,
    );

    if (!session) {
      throw new Error(
        "The selected academic session does not belong to this school.",
      );
    }

    let classTeacherId: number | null = null;

    if (classTeacherIdValue) {
      const parsedTeacherId = Number(
        classTeacherIdValue,
      );

      if (
        !Number.isInteger(parsedTeacherId) ||
        parsedTeacherId <= 0
      ) {
        throw new Error("Invalid class teacher.");
      }

      const allTeachers =
        await db.orm.public.Teacher.all();

      const teacher = allTeachers.find(
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

    const allClasses =
      await db.orm.public.SchoolClass.all();

    const duplicate = allClasses.some(
      (item) =>
        item.id !== currentClass.id &&
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

    await db.orm.public.SchoolClass
      .where({
        id: currentClass.id,
      })
      .update({
        name,
        section: sectionValue || null,
        sessionId,
        classTeacherId,
        status: statusValue,
      });

    redirect(`/classes/${currentClass.id}`);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/classes/${schoolClass.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Class
        </Link>

        <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Edit Class
            </h1>

            <p className="mt-2 text-gray-600">
              Update class information, session, teacher,
              or status.
            </p>
          </div>

          <form
            action={updateClass}
            className="space-y-6"
          >
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
                defaultValue={String(
                  schoolClass.sessionId,
                )}
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              >
                {schoolSessions.map((session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {session.name} ({session.status})
                  </option>
                ))}
              </select>
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
                  defaultValue={schoolClass.name}
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
                  defaultValue={
                    schoolClass.section ?? ""
                  }
                  placeholder="e.g. A"
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
                />
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
                defaultValue={
                  schoolClass.classTeacherId
                    ? String(
                        schoolClass.classTeacherId,
                      )
                    : ""
                }
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
                      {teacherName} —{" "}
                      {teacher.permanentId}
                    </option>
                  );
                })}
              </select>
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
                defaultValue={schoolClass.status}
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
                href={`/classes/${schoolClass.id}`}
                className="rounded-lg border px-5 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}