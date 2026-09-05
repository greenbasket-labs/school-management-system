import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../../../src/lib/authorization";
import { getSchool } from "../../../../../../src/lib/school";
import { db } from "../../../../../../src/prisma/db";
import {
  updateStudentParentLink,
  unlinkParentFromStudent,
} from "../../../../../../src/lib/student-parent";

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

export default async function EditStudentParentLinkPage({
  params,
}: {
  params: Promise<{ id: string; linkId: string }>;
}) {
  const actor = await requirePermission("parents.edit");
  const school = await getSchool();

  const { id, linkId } = await params;

  const parentId = Number(id);
  const relationshipId = Number(linkId);

  if (
    !Number.isInteger(parentId) ||
    !Number.isInteger(relationshipId)
  ) {
    notFound();
  }

  const parents = await db.orm.public.Parent.all();

  const parent = parents.find(
    (item) =>
      item.id === parentId &&
      item.schoolId === actor.schoolId,
  );

  if (!parent) {
    notFound();
  }

  const links = await db.orm.public.StudentParent.all();

  const link = links.find(
    (item) =>
      item.id === relationshipId &&
      item.parentId === parent.id,
  );

  if (!link) {
    notFound();
  }

  const students = await db.orm.public.Student.all();

  const student = students.find(
    (item) =>
      item.id === link.studentId &&
      item.schoolId === actor.schoolId,
  );

  if (!student) {
    notFound();
  }

  const studentName = [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const parentName = [
    parent.firstName,
    parent.middleName,
    parent.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  async function updateRelationship(formData: FormData) {
    "use server";

    const currentActor =
      await requirePermission("parents.edit");

    const submittedParentId = Number(
      formData.get("parentId"),
    );

    const submittedLinkId = Number(
      formData.get("linkId"),
    );

    const relationship = String(
      formData.get("relationship") ?? "",
    ).trim();

    const isPrimary =
      formData.get("isPrimary") === "on";

    if (!Number.isInteger(submittedParentId)) {
      throw new Error("Invalid parent.");
    }

    if (!Number.isInteger(submittedLinkId)) {
      throw new Error("Invalid relationship.");
    }

    const currentParents =
      await db.orm.public.Parent.all();

    const currentParent = currentParents.find(
      (item) =>
        item.id === submittedParentId &&
        item.schoolId === currentActor.schoolId,
    );

    if (!currentParent) {
      throw new Error("Parent not found.");
    }

    const currentLinks =
      await db.orm.public.StudentParent.all();

    const currentLink = currentLinks.find(
      (item) =>
        item.id === submittedLinkId &&
        item.parentId === currentParent.id,
    );

    if (!currentLink) {
      throw new Error(
        "Parent-student relationship not found.",
      );
    }

    const currentStudents =
      await db.orm.public.Student.all();

    const currentStudent = currentStudents.find(
      (item) =>
        item.id === currentLink.studentId &&
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

    await updateStudentParentLink(
      currentLink.id,
      relationship,
      isPrimary,
    );

    redirect(
      `/parents/${currentParent.id}/students`,
    );
  }

  async function unlinkRelationship() {
    "use server";

    const currentActor =
      await requirePermission("parents.edit");

    const currentParents =
      await db.orm.public.Parent.all();

    const currentParent = currentParents.find(
      (item) =>
        item.id === parentId &&
        item.schoolId === currentActor.schoolId,
    );

    if (!currentParent) {
      throw new Error("Parent not found.");
    }

    const currentLinks =
      await db.orm.public.StudentParent.all();

    const currentLink = currentLinks.find(
      (item) =>
        item.id === relationshipId &&
        item.parentId === currentParent.id,
    );

    if (!currentLink) {
      throw new Error(
        "Parent-student relationship not found.",
      );
    }

    const currentStudents =
      await db.orm.public.Student.all();

    const currentStudent = currentStudents.find(
      (item) =>
        item.id === currentLink.studentId &&
        item.schoolId === currentActor.schoolId,
    );

    if (!currentStudent) {
      throw new Error("Student not found.");
    }

    await unlinkParentFromStudent(
      currentLink.id,
    );

    redirect(
      `/parents/${currentParent.id}/students`,
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href={`/parents/${parent.id}/students`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Linked Students
          </Link>

          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">
              {school.name}
            </p>

            <h1 className="text-3xl font-bold text-slate-900">
              Edit Student Relationship
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              {parentName} · {parent.permanentId}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Linked Student
            </h2>

            <p className="mt-1 font-medium text-slate-900">
              {studentName}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {student.permanentId}
            </p>
          </div>

          <form
            action={updateRelationship}
            className="mt-6 space-y-5"
          >
            <input
              type="hidden"
              name="parentId"
              value={parent.id}
            />

            <input
              type="hidden"
              name="linkId"
              value={link.id}
            />

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
                defaultValue={link.relationship}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              >
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
                defaultChecked={link.isPrimary}
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
                Save Changes
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-700">
            Remove Student Link
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            This removes the relationship between this
            parent and student. It does not delete either
            record.
          </p>

          <form
            action={unlinkRelationship}
            className="mt-5"
          >
            <button
              type="submit"
              className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Unlink Student
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}