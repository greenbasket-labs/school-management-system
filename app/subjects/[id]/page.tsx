import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { getSubjectById } from "../../../src/lib/subjects";
import { db } from "../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SubjectProfilePage({
  params,
}: PageProps) {
  const actor = await requirePermission("subjects.view");
  const school = await getSchool();

  if (actor.schoolId !== school.id) {
    notFound();
  }

  const { id } = await params;
  const subjectId = Number(id);

  if (!Number.isInteger(subjectId)) {
    notFound();
  }

  const subject = await getSubjectById(
    subjectId,
    school.id,
  );

  if (!subject) {
    notFound();
  }

  const classes = await db.orm.public.SchoolClass.all();
  const sessions = await db.orm.public.AcademicSession.all();
  const classSubjects = await db.orm.public.ClassSubject.all();
  const teachers = await db.orm.public.Teacher.all();

  const schoolClasses = classes.filter(
    (item) => item.schoolId === school.id,
  );

  const schoolSessions = sessions.filter(
    (item) => item.schoolId === school.id,
  );

  const assignments = classSubjects.filter(
    (item) => item.subjectId === subject.id,
  );

  const assignedClasses = assignments
    .map((assignment) => {
      const schoolClass = schoolClasses.find(
        (item) => item.id === assignment.classId,
      );

      if (!schoolClass) {
        return null;
      }

      const session = schoolSessions.find(
        (item) => item.id === schoolClass.sessionId,
      );

      const teacher = assignment.teacherId
        ? teachers.find(
            (item) => item.id === assignment.teacherId,
          )
        : undefined;

      return {
        assignment,
        schoolClass,
        session,
        teacher,
      };
    })
    .filter(Boolean);

  let canEdit = false;

  try {
    await requirePermission("subjects.edit");
    canEdit = true;
  } catch {
    canEdit = false;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/subjects"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Subjects
            </Link>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {subject.name}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {school.name}
            </p>
          </div>

          {canEdit && (
            <Link
              href={`/subjects/${subject.id}/edit`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Edit Subject
            </Link>
          )}
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Subject Code
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {subject.code || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Status
            </p>
            <p className="mt-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                  subject.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {subject.status}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Class Assignments
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {assignedClasses.length}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Subject Information
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">
                Subject Name
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {subject.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Subject Code
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {subject.code || "—"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Status
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {subject.status}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                School
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {school.name}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Assigned Classes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Classes where this subject is currently assigned.
            </p>
          </div>

          {assignedClasses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              This subject has not been assigned to any class yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Class
                    </th>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Session
                    </th>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Teacher
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assignedClasses.map((item) => {
                    if (!item) return null;

                    const {
                      assignment,
                      schoolClass,
                      session,
                      teacher,
                    } = item;

                    return (
                      <tr
                        key={assignment.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {schoolClass.name}
                          {schoolClass.section
                            ? ` ${schoolClass.section}`
                            : ""}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {session?.name || "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {teacher
                            ? `${teacher.firstName} ${
                                teacher.middleName
                                  ? `${teacher.middleName} `
                                  : ""
                              }${teacher.lastName}`
                            : "Not assigned"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Assignment Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Class and teacher assignment will be managed from
            the academic structure workflow.
          </p>

          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            No assignment controls yet. We will add class,
            subject, and teacher assignment after the core
            Subject CRUD is complete.
          </div>
        </section>
      </div>
    </main>
  );
}