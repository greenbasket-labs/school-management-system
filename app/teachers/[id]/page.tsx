import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { getTeacherById } from "../../../src/lib/teachers";
import { db } from "../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const formatStatus = (status: string) =>
  status === "ACTIVE" ? "Active" : "Inactive";

export default async function TeacherProfilePage({
  params,
}: PageProps) {
  const user = await requirePermission("teachers.view");
  const school = await getSchool();

  const { id } = await params;
  const teacherId = Number(id);

  if (!Number.isInteger(teacherId)) {
    notFound();
  }

  const teacher = await getTeacherById(
    teacherId,
    user.schoolId,
  );

  if (!teacher) {
    notFound();
  }

  const classes = await db.orm.public.SchoolClass.all();
  const subjects = await db.orm.public.Subject.all();
  const classSubjects =
    await db.orm.public.ClassSubject.all();

  const teacherClasses = classes
    .filter(
      (schoolClass) =>
        schoolClass.schoolId === user.schoolId &&
        schoolClass.classTeacherId === teacher.id,
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const teacherClassIds = new Set(
    teacherClasses.map((schoolClass) => schoolClass.id),
  );

  const teacherSubjectIds = new Set(
    classSubjects
      .filter(
        (classSubject) =>
          teacherClassIds.has(classSubject.classId) ||
          classSubject.teacherId === teacher.id,
      )
      .map((classSubject) => classSubject.subjectId),
  );

  const teacherSubjects = subjects
    .filter(
      (subject) =>
        subject.schoolId === user.schoolId &&
        teacherSubjectIds.has(subject.id),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  let linkedUser = undefined;

  if (teacher.userId) {
    const users = await db.orm.public.User.all();

    linkedUser = users.find(
      (item) =>
        item.id === teacher.userId &&
        item.schoolId === user.schoolId,
    );
  }

  let canEdit = false;

  try {
    await requirePermission("teachers.edit");
    canEdit = true;
  } catch {
    canEdit = false;
  }

  const fullName = [
    teacher.firstName,
    teacher.middleName,
    teacher.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <Link
              href="/teachers"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Teachers
            </Link>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {fullName}
              </h1>

              <span
                className={
                  teacher.status === "ACTIVE"
                    ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                    : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                }
              >
                {formatStatus(teacher.status)}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-600">
              Teacher profile for {school?.name}.
            </p>
          </div>

          {canEdit && (
            <Link
              href={`/teachers/${teacher.id}/edit`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
            >
              Edit Teacher
            </Link>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Permanent ID
            </p>

            <p className="mt-2 font-mono text-lg font-bold text-slate-900">
              {teacher.permanentId}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Classes
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {teacherClasses.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Subjects
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {teacherSubjects.length}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Personal Information
            </h2>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                First Name
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {teacher.firstName}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Middle Name
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {teacher.middleName || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Last Name
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {teacher.lastName}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Phone
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {teacher.phone || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </p>

              <p className="mt-1 break-all text-sm text-slate-900">
                {teacher.email || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {formatStatus(teacher.status)}
              </p>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Address
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {teacher.address || "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Portal Account
            </h2>
          </div>

          <div className="p-5">
            {linkedUser ? (
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Username
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {linkedUser.username || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-900">
                    {linkedUser.email || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Account Status
                  </p>

                  <p className="mt-1 text-sm text-slate-900">
                    {linkedUser.status}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-600">
                  No portal login account is currently linked
                  to this teacher.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Teacher login and portal access can be linked
                  later through the user management system.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Assigned Classes
            </h2>
          </div>

          {teacherClasses.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-600">
                No classes are currently assigned to this
                teacher as class teacher.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      Class
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Section
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {teacherClasses.map((schoolClass) => (
                    <tr key={schoolClass.id}>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {schoolClass.name}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {schoolClass.section || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            schoolClass.status === "ACTIVE"
                              ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                          }
                        >
                          {schoolClass.status === "ACTIVE"
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/classes/${schoolClass.id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          View Class
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Assigned Subjects
            </h2>
          </div>

          {teacherSubjects.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-600">
                No subjects are currently assigned to this
                teacher.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-3">
              {teacherSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    {subject.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Code: {subject.code || "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-start">
          <Link
            href="/teachers"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to Teachers
          </Link>
        </div>
      </div>
    </main>
  );
}