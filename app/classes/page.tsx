import Link from "next/link";
import { requirePermission } from "../../src/lib/authorization";
import { getSchool } from "../../src/lib/school";
import { getClasses } from "../../src/lib/classes";
import { db } from "../../src/prisma/db";

function statusClass(status: string) {
  if (status === "ACTIVE") {
    return "bg-green-100 text-green-700";
  }

  return "bg-gray-100 text-gray-700";
}

export default async function ClassesPage() {
  const user = await requirePermission("classes.view");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    throw new Error("School not found.");
  }

  const classes = await getClasses(school.id);

  const sessions = await db.orm.public.AcademicSession.all();
  const teachers = await db.orm.public.Teacher.all();
  const students = await db.orm.public.Student.all();

  const schoolSessions = sessions.filter(
    (session) => session.schoolId === school.id,
  );

  const schoolTeachers = teachers.filter(
    (teacher) => teacher.schoolId === school.id,
  );

  const schoolStudents = students.filter(
    (student) => student.schoolId === school.id,
  );

  let canCreate = false;

  try {
    await requirePermission("classes.create");
    canCreate = true;
  } catch {
    canCreate = false;
  }

  const activeClasses = classes.filter(
    (item) => item.status === "ACTIVE",
  );

  const inactiveClasses = classes.filter(
    (item) => item.status !== "ACTIVE",
  );

  function getSessionName(sessionId: number) {
    return (
      schoolSessions.find((session) => session.id === sessionId)
        ?.name ?? `Session #${sessionId}`
    );
  }

  function getTeacherName(teacherId: number | null) {
    if (!teacherId) {
      return "Not assigned";
    }

    const teacher = schoolTeachers.find(
      (item) => item.id === teacherId,
    );

    if (!teacher) {
      return "Not assigned";
    }

    return [teacher.firstName, teacher.middleName, teacher.lastName]
      .filter(Boolean)
      .join(" ");
  }

  function getStudentCount(classId: number) {
    return schoolStudents.filter(
      (student) => student.currentClassId === classId,
    ).length;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Classes
            </h1>

            <p className="mt-1 text-gray-600">
              Manage school classes, sections, class teachers,
              and students.
            </p>
          </div>

          {canCreate && (
            <Link
              href="/classes/new"
              className="rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
            >
              + New Class
            </Link>
          )}
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Classes</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {classes.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Active Classes</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {activeClasses.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Inactive Classes</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {inactiveClasses.length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {classes.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                No classes yet
              </h2>

              <p className="mt-2 text-gray-600">
                Create your first class for an academic session.
              </p>

              {canCreate && (
                <Link
                  href="/classes/new"
                  className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Create First Class
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Class
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Section
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Academic Session
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Class Teacher
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Students
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {classes.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {item.name}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {item.section || "—"}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {getSessionName(item.sessionId)}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {getTeacherName(item.classTeacherId)}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {getStudentCount(item.id)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/classes/${item.id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}