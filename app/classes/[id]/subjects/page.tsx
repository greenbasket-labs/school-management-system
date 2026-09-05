import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getClassById } from "../../../../src/lib/classes";
import { getSubjects } from "../../../../src/lib/subjects";
import { getTeachers } from "../../../../src/lib/teachers";
import {
  assignSubjectToClass,
  getClassSubjects,
  removeSubjectFromClass,
  updateClassSubjectTeacher,
} from "../../../../src/lib/class-subjects";
import { db } from "../../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClassSubjectsPage({
  params,
}: PageProps) {
  const actor = await requirePermission("classes.view");
  const school = await getSchool();

  if (actor.schoolId !== school.id) {
    notFound();
  }

  const { id } = await params;
  const classId = Number(id);

  if (!Number.isInteger(classId)) {
    notFound();
  }

  const schoolClass = await getClassById(
    classId,
    school.id,
  );

  if (!schoolClass) {
    notFound();
  }

  const [subjects, teachers, assignments] =
    await Promise.all([
      getSubjects(school.id),
      getTeachers(school.id),
      getClassSubjects(schoolClass.id),
    ]);

  const sessions = await db.orm.public.AcademicSession.all();

  const session = sessions.find(
    (item) => item.id === schoolClass.sessionId,
  );

  const assignedSubjectIds = new Set(
    assignments.map((item) => item.subjectId),
  );

  const availableSubjects = subjects.filter(
    (subject) =>
      !assignedSubjectIds.has(subject.id) &&
      subject.status === "ACTIVE",
  );

  let canCreate = false;
  let canEdit = false;
  let canDelete = false;

  try {
    await requirePermission("classes.assign_subjects");
    canCreate = true;
  } catch {
    canCreate = false;
  }

  try {
    await requirePermission("subjects.assign_teachers");
    canEdit = true;
  } catch {
    canEdit = false;
  }

  try {
    await requirePermission("classes.edit");
    canDelete = true;
  } catch {
    canDelete = false;
  }

  async function assignSubject(
    formData: FormData,
  ) {
    "use server";

    const currentActor =
      await requirePermission("classes.assign_subjects");

    const currentSchool = await getSchool();

    if (currentActor.schoolId !== currentSchool.id) {
      throw new Error("Unauthorized school access.");
    }

    const subjectId = Number(
      formData.get("subjectId"),
    );

    if (!Number.isInteger(subjectId)) {
      throw new Error("Please select a subject.");
    }

    const currentClass = await getClassById(
      classId,
      currentSchool.id,
    );

    if (!currentClass) {
      throw new Error("Class not found.");
    }

    const schoolSubjects =
      await getSubjects(currentSchool.id);

    const subject = schoolSubjects.find(
      (item) => item.id === subjectId,
    );

    if (!subject) {
      throw new Error("Subject not found.");
    }

    if (subject.status !== "ACTIVE") {
      throw new Error(
        "Only active subjects can be assigned.",
      );
    }

    await assignSubjectToClass(
      currentClass.id,
      subject.id,
      null,
    );

    redirect(
      `/classes/${currentClass.id}/subjects`,
    );
  }

  async function assignTeacher(
    formData: FormData,
  ) {
    "use server";

    const currentActor =
      await requirePermission("subjects.assign_teachers");

    const currentSchool = await getSchool();

    if (currentActor.schoolId !== currentSchool.id) {
      throw new Error("Unauthorized school access.");
    }

    const assignmentId = Number(
      formData.get("assignmentId"),
    );

    const teacherValue = String(
      formData.get("teacherId") ?? "",
    ).trim();

    if (!Number.isInteger(assignmentId)) {
      throw new Error("Invalid assignment.");
    }

    const teacherId = teacherValue
      ? Number(teacherValue)
      : null;

    if (
      teacherId !== null &&
      !Number.isInteger(teacherId)
    ) {
      throw new Error("Invalid teacher.");
    }

    const currentClass = await getClassById(
      classId,
      currentSchool.id,
    );

    if (!currentClass) {
      throw new Error("Class not found.");
    }

    const assignments =
      await getClassSubjects(currentClass.id);

    const assignment = assignments.find(
      (item) => item.id === assignmentId,
    );

    if (!assignment) {
      throw new Error(
        "Subject assignment not found.",
      );
    }

    if (teacherId !== null) {
      const schoolTeachers =
        await getTeachers(currentSchool.id);

      const teacher = schoolTeachers.find(
        (item) => item.id === teacherId,
      );

      if (!teacher) {
        throw new Error("Teacher not found.");
      }

      if (teacher.status !== "ACTIVE") {
        throw new Error(
          "Only active teachers can be assigned.",
        );
      }
    }

    await updateClassSubjectTeacher(
      assignment.id,
      teacherId,
    );

    redirect(
      `/classes/${currentClass.id}/subjects`,
    );
  }

  async function removeSubject(
    formData: FormData,
  ) {
    "use server";

    const currentActor =
      await requirePermission("classes.edit");

    const currentSchool = await getSchool();

    if (currentActor.schoolId !== currentSchool.id) {
      throw new Error("Unauthorized school access.");
    }

    const assignmentId = Number(
      formData.get("assignmentId"),
    );

    if (!Number.isInteger(assignmentId)) {
      throw new Error("Invalid assignment.");
    }

    const currentClass = await getClassById(
      classId,
      currentSchool.id,
    );

    if (!currentClass) {
      throw new Error("Class not found.");
    }

    const assignments =
      await getClassSubjects(currentClass.id);

    const assignment = assignments.find(
      (item) => item.id === assignmentId,
    );

    if (!assignment) {
      throw new Error(
        "Subject assignment not found.",
      );
    }

    await removeSubjectFromClass(
      assignment.id,
    );

    redirect(
      `/classes/${currentClass.id}/subjects`,
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href={`/classes/${schoolClass.id}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Class
            </Link>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Class Subjects
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {schoolClass.name}
              {schoolClass.section
                ? ` ${schoolClass.section}`
                : ""}{" "}
              · {session?.name ?? "Unknown session"}
            </p>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Class
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {schoolClass.name}
              {schoolClass.section
                ? ` ${schoolClass.section}`
                : ""}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Academic Session
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {session?.name ?? "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Assigned Subjects
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {assignments.length}
            </p>
          </div>
        </section>

        {canCreate && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Assign Subject
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add an active subject to this class.
            </p>

            {availableSubjects.length === 0 ? (
              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                No additional active subjects are
                available to assign.
              </div>
            ) : (
              <form
                action={assignSubject}
                className="mt-4 flex flex-col gap-3 sm:flex-row"
              >
                <select
                  name="subjectId"
                  required
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select a subject
                  </option>

                  {availableSubjects.map(
                    (subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.name}
                        {subject.code
                          ? ` (${subject.code})`
                          : ""}
                      </option>
                    ),
                  )}
                </select>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Assign Subject
                </button>
              </form>
            )}
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Assigned Subjects
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Subjects assigned to this class and their
              teachers.
            </p>
          </div>

          {assignments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No subjects have been assigned to this
              class yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Subject
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Code
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Teacher
                    </th>

                    {(canEdit || canDelete) && (
                      <th className="px-5 py-3 font-semibold text-slate-700">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {assignments.map(
                    (assignment) => {
                      const subject =
                        subjects.find(
                          (item) =>
                            item.id ===
                            assignment.subjectId,
                        );

                      const teacher =
                        assignment.teacherId
                          ? teachers.find(
                              (item) =>
                                item.id ===
                                assignment.teacherId,
                            )
                          : undefined;

                      return (
                        <tr
                          key={assignment.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-5 py-4 font-medium text-slate-900">
                            {subject?.name ?? "Unknown"}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {subject?.code ?? "—"}
                          </td>

                          <td className="px-5 py-4">
                            {canEdit ? (
                              <form
                                action={
                                  assignTeacher
                                }
                                className="flex flex-col gap-2 sm:flex-row"
                              >
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={
                                    assignment.id
                                  }
                                />

                                <select
                                  name="teacherId"
                                  defaultValue={
                                    assignment.teacherId ??
                                    ""
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                  <option value="">
                                    Not assigned
                                  </option>

                                  {teachers
                                    .filter(
                                      (item) =>
                                        item.status ===
                                        "ACTIVE",
                                    )
                                    .map(
                                      (item) => (
                                        <option
                                          key={
                                            item.id
                                          }
                                          value={
                                            item.id
                                          }
                                        >
                                          {
                                            item.firstName
                                          }{" "}
                                          {item.middleName
                                            ? `${item.middleName} `
                                            : ""}
                                          {
                                            item.lastName
                                          }
                                        </option>
                                      ),
                                    )}
                                </select>

                                <button
                                  type="submit"
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                  Save Teacher
                                </button>
                              </form>
                            ) : (
                              <span className="text-slate-600">
                                {teacher
                                  ? `${teacher.firstName} ${
                                      teacher.middleName
                                        ? `${teacher.middleName} `
                                        : ""
                                    }${teacher.lastName}`
                                  : "Not assigned"}
                              </span>
                            )}
                          </td>

                          {(canEdit ||
                            canDelete) && (
                            <td className="px-5 py-4">
                              {canDelete && (
                                <form
                                  action={
                                    removeSubject
                                  }
                                >
                                  <input
                                    type="hidden"
                                    name="assignmentId"
                                    value={
                                      assignment.id
                                    }
                                  />

                                  <button
                                    type="submit"
                                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Remove
                                  </button>
                                </form>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}