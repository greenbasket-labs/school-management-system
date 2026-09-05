import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { getClassById } from "../../../src/lib/classes";
import { db } from "../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatTeacherName(
  firstName: string,
  middleName: string | null,
  lastName: string,
) {
  return [firstName, middleName, lastName]
    .filter(Boolean)
    .join(" ");
}

function statusClass(status: string) {
  if (status === "ACTIVE") {
    return "bg-green-100 text-green-700";
  }

  return "bg-gray-100 text-gray-700";
}

export default async function ClassDetailPage({
  params,
}: PageProps) {
  const user = await requirePermission("classes.view");
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
  const students = await db.orm.public.Student.all();
  const subjects = await db.orm.public.ClassSubject.all();
  const allSubjects = await db.orm.public.Subject.all();

  const session = sessions.find(
    (item) =>
      item.id === schoolClass.sessionId &&
      item.schoolId === school.id,
  );

  const classTeacher = schoolClass.classTeacherId
    ? teachers.find(
        (teacher) =>
          teacher.id === schoolClass.classTeacherId &&
          teacher.schoolId === school.id,
      )
    : undefined;

  const classStudents = students
    .filter(
      (student) =>
        student.schoolId === school.id &&
        student.currentClassId === schoolClass.id,
    )
    .sort((a, b) =>
      a.lastName.localeCompare(b.lastName),
    );

  const classSubjects = subjects.filter(
    (item) => item.classId === schoolClass.id,
  );

  const linkedSubjects = classSubjects
    .map((classSubject) => {
      const subject = allSubjects.find(
        (item) =>
          item.id === classSubject.subjectId &&
          item.schoolId === school.id,
      );

      return {
        classSubject,
        subject,
      };
    })
    .filter((item) => item.subject);

  let canEdit = false;

  try {
    await requirePermission("classes.edit");
    canEdit = true;
  } catch {
    canEdit = false;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/classes"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Classes
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {schoolClass.name}
                {schoolClass.section
                  ? ` ${schoolClass.section}`
                  : ""}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                  schoolClass.status,
                )}`}
              >
                {schoolClass.status}
              </span>
            </div>

            <p className="mt-2 text-gray-600">
              Class details, students, subjects, and class
              teacher.
            </p>
          </div>

          {canEdit && (
            <Link
              href={`/classes/${schoolClass.id}/edit`}
              className="rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
            >
              Edit Class
            </Link>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Class Name
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {schoolClass.name}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Section
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {schoolClass.section || "—"}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Academic Session
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {session?.name ?? `Session #${schoolClass.sessionId}`}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Class Teacher
            </p>

            <p className="mt-2 font-semibold text-gray-900">
              {classTeacher
                ? formatTeacherName(
                    classTeacher.firstName,
                    classTeacher.middleName,
                    classTeacher.lastName,
                  )
                : "Not assigned"}
            </p>

            {classTeacher && (
              <p className="mt-1 text-sm text-gray-500">
                {classTeacher.permanentId}
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Students
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {classStudents.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Subjects
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {linkedSubjects.length}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900">
                Students
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Students currently assigned to this class.
              </p>
            </div>

            {classStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No students assigned to this class yet.
              </div>
            ) : (
              <div className="divide-y">
                {classStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {[
                          student.firstName,
                          student.middleName,
                          student.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>

                      <p className="text-sm text-gray-500">
                        {student.permanentId}
                      </p>
                    </div>

                    <Link
                      href={`/students/${student.id}`}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900">
                Subjects
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Subjects currently connected to this class.
              </p>
            </div>

            {linkedSubjects.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No subjects assigned to this class yet.
              </div>
            ) : (
              <div className="divide-y">
                {linkedSubjects.map(
                  ({ classSubject, subject }) => (
                    <div
                      key={classSubject.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {subject!.name}
                        </p>

                        <p className="text-sm text-gray-500">
                          {subject!.code || "No code"}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Class Management
          </h2>

          <p className="mt-2 text-gray-600">
            Student assignment, subject assignment, and
            teacher assignment will be connected as the
            academic structure modules are completed.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">
                Students
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Assign students to this class.
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">
                Subjects
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Connect subjects to this class.
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">
                Teacher
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Assign the class teacher.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}