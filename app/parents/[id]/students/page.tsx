import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getParentById } from "../../../../src/lib/parents";
import { db } from "../../../../src/prisma/db";
import { linkParentToStudent } from "../../../../src/lib/student-parent";

const RELATIONSHIP_OPTIONS = [
  "Father",
  "Mother",
  "Guardian",
  "Stepfather",
  "Stepmother",
  "Grandfather",
  "Grandmother",
  "Uncle",
  "Aunt",
  "Other",
] as const;

export default async function ParentStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("parents.edit");
  const school = await getSchool();

  const { id } = await params;
  const parentId = Number(id);

  if (!Number.isInteger(parentId)) {
    notFound();
  }

  const parent = await getParentById(
    parentId,
    actor.schoolId,
  );

  if (!parent) {
    notFound();
  }

  const students = await db.orm.public.Student.all();

  const schoolStudents = students
    .filter(
      (student) =>
        student.schoolId === actor.schoolId,
    )
    .sort((a, b) => {
      const lastNameCompare =
        a.lastName.localeCompare(b.lastName);

      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }

      return a.firstName.localeCompare(
        b.firstName,
      );
    });

  const links =
    await db.orm.public.StudentParent.all();

  const linkedStudentIds = links
    .filter(
      (link) => link.parentId === parent.id,
    )
    .map((link) => link.studentId);

  const availableStudents =
    schoolStudents.filter(
      (student) =>
        !linkedStudentIds.includes(student.id),
    );

  async function addStudent(formData: FormData) {
    "use server";

    const currentActor =
      await requirePermission("parents.edit");

    const submittedParentId = Number(
      formData.get("parentId"),
    );

    const studentId = Number(
      formData.get("studentId"),
    );

    const relationship = String(
      formData.get("relationship") ?? "",
    ).trim();

    const isPrimary =
      formData.get("isPrimary") === "on";

    if (!Number.isInteger(submittedParentId)) {
      throw new Error("Invalid parent.");
    }

    if (!Number.isInteger(studentId)) {
      throw new Error("Invalid student.");
    }

    const parents =
      await db.orm.public.Parent.all();

    const currentParent = parents.find(
      (item) =>
        item.id === submittedParentId &&
        item.schoolId === currentActor.schoolId,
    );

    if (!currentParent) {
      throw new Error("Parent not found.");
    }

    const students =
      await db.orm.public.Student.all();

    const currentStudent = students.find(
      (item) =>
        item.id === studentId &&
        item.schoolId === currentActor.schoolId,
    );

    if (!currentStudent) {
      throw new Error("Student not found.");
    }

    const allowedRelationship =
      RELATIONSHIP_OPTIONS.includes(
        relationship as (typeof RELATIONSHIP_OPTIONS)[number],
      );

    if (!allowedRelationship) {
      throw new Error(
        "Please select a valid relationship.",
      );
    }

    await linkParentToStudent(
      currentStudent.id,
      currentParent.id,
      relationship,
      isPrimary,
    );

    redirect(
      `/parents/${currentParent.id}/students`,
    );
  }

  const parentName = [
    parent.firstName,
    parent.middleName,
    parent.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href={`/parents/${parent.id}`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Parent Profile
          </Link>

          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">
              {school.name}
            </p>

            <h1 className="text-3xl font-bold text-slate-900">
              Manage Linked Students
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              {parentName} · {parent.permanentId}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Link Student
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Connect a student to this parent or guardian.
          </p>

          {availableStudents.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="font-medium text-slate-900">
                No available students.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                All students are already linked to this parent,
                or there are no students in the school yet.
              </p>
            </div>
          ) : (
            <form
              action={addStudent}
              className="mt-5 space-y-5"
            >
              <input
                type="hidden"
                name="parentId"
                value={parent.id}
              />

              <div>
                <label
                  htmlFor="studentId"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Student
                </label>

                <select
                  id="studentId"
                  name="studentId"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">
                    Select student
                  </option>

                  {availableStudents.map(
                    (student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {[
                          student.firstName,
                          student.middleName,
                          student.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ")}{" "}
                        — {student.permanentId}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="relationship"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Relationship
                </label>

                <select
                  id="relationship"
                  name="relationship"
                  required
                  defaultValue=""
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">
                    Select relationship
                  </option>

                  {RELATIONSHIP_OPTIONS.map(
                    (relationship) => (
                      <option
                        key={relationship}
                        value={relationship}
                      >
                        {relationship}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isPrimary"
                  className="h-4 w-4 rounded border-slate-300"
                />

                <span className="text-sm font-medium text-slate-700">
                  Primary parent / guardian
                </span>
              </label>

              <div className="flex justify-end border-t border-slate-200 pt-5">
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Link Student
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Current Linked Students
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Students currently connected to this parent.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {linkedStudentIds.length}
            </span>
          </div>

          <div className="mt-5">
            {linkedStudentIds.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No students linked yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {links
                  .filter(
                    (link) =>
                      link.parentId === parent.id,
                  )
                  .map((link) => {
                    const student =
                      schoolStudents.find(
                        (item) =>
                          item.id ===
                          link.studentId,
                      );

                    if (!student) {
                      return null;
                    }

                    const studentName = [
                      student.firstName,
                      student.middleName,
                      student.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <div
                        key={link.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {studentName}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {student.permanentId}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {link.relationship}
                            {link.isPrimary
                              ? " · Primary"
                              : ""}
                          </p>
                        </div>

                        <Link
                          href={`/students/${student.id}`}
                          className="text-sm font-semibold text-slate-900 hover:underline"
                        >
                          View Student
                        </Link>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}