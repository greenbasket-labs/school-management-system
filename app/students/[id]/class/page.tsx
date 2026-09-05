import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Temporal } from "@js-temporal/polyfill";

import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getStudentById } from "../../../../src/lib/students";
import { getClassesForSession } from "../../../../src/lib/classes";
import { assignStudentToClass } from "../../../../src/lib/student-class";
import { db } from "../../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentClassPage({
  params,
}: PageProps) {
  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    notFound();
  }

  const actor = await requirePermission("students.edit");
  const school = await getSchool();

  if (actor.schoolId !== school.id) {
    throw new Error("School access denied.");
  }

  const student = await getStudentById(studentId);

  if (!student || student.schoolId !== school.id) {
    notFound();
  }

  const sessions =
    await db.orm.public.AcademicSession.all();

  const schoolSessions = sessions
    .filter(
      (session) => session.schoolId === school.id,
    )
    .sort((a, b) =>
      String(b.startDate).localeCompare(
        String(a.startDate),
      ),
    );

  const activeSession = schoolSessions.find(
    (session) => session.status === "ACTIVE",
  );

  const allClasses =
    await db.orm.public.SchoolClass.all();

  const currentClass = student.currentClassId
    ? allClasses.find(
        (schoolClass) =>
          schoolClass.id === student.currentClassId &&
          schoolClass.schoolId === school.id,
      )
    : undefined;

  const currentSession = currentClass
    ? schoolSessions.find(
        (session) =>
          session.id === currentClass.sessionId,
      )
    : undefined;

  const classes = activeSession
    ? await getClassesForSession(
        school.id,
        activeSession.id,
      )
    : [];

  async function assignClassAction(
    formData: FormData,
  ) {
    "use server";

    const currentActor =
      await requirePermission("students.edit");

    const currentSchool = await getSchool();

    if (
      currentActor.schoolId !== currentSchool.id
    ) {
      throw new Error("School access denied.");
    }

    const submittedStudentId = Number(
      formData.get("studentId"),
    );

    const classId = Number(
      formData.get("classId"),
    );

    const sessionId = Number(
      formData.get("sessionId"),
    );

    if (
      !Number.isInteger(submittedStudentId) ||
      submittedStudentId <= 0
    ) {
      throw new Error("Invalid student.");
    }

    if (
      !Number.isInteger(classId) ||
      classId <= 0
    ) {
      throw new Error("Please select a class.");
    }

    if (
      !Number.isInteger(sessionId) ||
      sessionId <= 0
    ) {
      throw new Error(
        "Please select an academic session.",
      );
    }

    const students =
      await db.orm.public.Student.all();

    const submittedStudent = students.find(
      (item) =>
        item.id === submittedStudentId &&
        item.schoolId === currentSchool.id,
    );

    if (!submittedStudent) {
      throw new Error("Student not found.");
    }

    const selectedClasses =
      await db.orm.public.SchoolClass.all();

    const selectedClass = selectedClasses.find(
      (item) =>
        item.id === classId &&
        item.schoolId === currentSchool.id &&
        item.sessionId === sessionId,
    );

    if (!selectedClass) {
      throw new Error(
        "Selected class is invalid.",
      );
    }

    if (selectedClass.status !== "ACTIVE") {
      throw new Error(
        "Only active classes can receive students.",
      );
    }

    const selectedSessions =
      await db.orm.public.AcademicSession.all();

    const selectedSession =
      selectedSessions.find(
        (item) =>
          item.id === sessionId &&
          item.schoolId === currentSchool.id,
      );

    if (!selectedSession) {
      throw new Error(
        "Academic session not found.",
      );
    }

    await assignStudentToClass(
      submittedStudentId,
      classId,
      sessionId,
      Temporal.Now.instant(),
    );

    redirect(
      `/students/${submittedStudentId}`,
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/students/${student.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Student
            </Link>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Assign Student to Class
            </h1>

            <p className="text-sm text-slate-500">
              {student.firstName}{" "}
              {student.middleName
                ? `${student.middleName} `
                : ""}
              {student.lastName}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Permanent ID
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {student.permanentId}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Current Class
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {currentClass
                  ? `${currentClass.name}${
                      currentClass.section
                        ? ` ${currentClass.section}`
                        : ""
                    }`
                  : "Not assigned"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Academic Session
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {currentSession?.name ?? "—"}
              </p>
            </div>
          </div>
        </section>

        {!activeSession ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-900">
              No active academic session
            </h2>

            <p className="mt-2 text-sm text-amber-800">
              Create or activate an academic session
              before assigning students to classes.
            </p>

            <Link
              href="/academic-sessions"
              className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Academic Sessions
            </Link>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Assign to {activeSession.name}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select the student's current class.
            </p>

            {classes.length === 0 ? (
              <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                No active classes exist for this
                academic session.
              </div>
            ) : (
              <form
                action={assignClassAction}
                className="mt-6 space-y-5"
              >
                <input
                  type="hidden"
                  name="studentId"
                  value={student.id}
                />

                <input
                  type="hidden"
                  name="sessionId"
                  value={activeSession.id}
                />

                <div>
                  <label
                    htmlFor="classId"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Class
                  </label>

                  <select
                    id="classId"
                    name="classId"
                    required
                    defaultValue={
                      currentClass?.sessionId ===
                      activeSession.id
                        ? String(currentClass.id)
                        : ""
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Select class
                    </option>

                    {classes.map((schoolClass) => (
                      <option
                        key={schoolClass.id}
                        value={schoolClass.id}
                      >
                        {schoolClass.name}
                        {schoolClass.section
                          ? ` ${schoolClass.section}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                  <strong>
                    Automatic history:
                  </strong>{" "}
                  assigning this student will update
                  the current class and create a class
                  history record for{" "}
                  {activeSession.name}.
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Assign Student
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}