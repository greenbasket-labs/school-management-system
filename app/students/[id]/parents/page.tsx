import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getStudentById } from "../../../../src/lib/students";
import { db } from "../../../../src/prisma/db";

const RELATIONSHIPS = [
  "FATHER",
  "MOTHER",
  "GUARDIAN",
  "UNCLE",
  "AUNT",
  "GRANDFATHER",
  "GRANDMOTHER",
  "OTHER",
] as const;

function formatRelationship(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function StudentParentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("students.view");
  const school = await getSchool();

  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isInteger(studentId)) {
    notFound();
  }

  const student = await getStudentById(studentId);

  if (!student || student.schoolId !== actor.schoolId) {
    notFound();
  }

  const parents = await db.orm.public.Parent.all();
  const studentParents =
    await db.orm.public.StudentParent.all();

  const linkedRecords = studentParents.filter(
    (item) => item.studentId === student.id,
  );

  const linkedParentIds = linkedRecords.map(
    (item) => item.parentId,
  );

  const linkedParents = parents.filter(
    (parent) =>
      parent.schoolId === actor.schoolId &&
      linkedParentIds.includes(parent.id),
  );

  const availableParents = parents
    .filter(
      (parent) =>
        parent.schoolId === actor.schoolId &&
        !linkedParentIds.includes(parent.id) &&
        parent.status === "ACTIVE",
    )
    .sort((a, b) => {
      const aName = `${a.firstName} ${a.lastName}`;
      const bName = `${b.firstName} ${b.lastName}`;

      return aName.localeCompare(bName);
    });

  let canManage = false;

  try {
    await requirePermission("students.edit");
    canManage = true;
  } catch {
    canManage = false;
  }

  async function linkParent(formData: FormData) {
    "use server";

    const currentActor =
      await requirePermission("students.edit");

    const submittedStudentId = Number(
      formData.get("studentId"),
    );

    const parentId = Number(
      formData.get("parentId"),
    );

    const relationship = String(
      formData.get("relationship") ?? "",
    )
      .trim()
      .toUpperCase();

    const isPrimary =
      formData.get("isPrimary") === "true";

    if (!Number.isInteger(submittedStudentId)) {
      throw new Error("Invalid student.");
    }

    if (!Number.isInteger(parentId)) {
      throw new Error("Please select a parent.");
    }

    if (
      !RELATIONSHIPS.includes(
        relationship as (typeof RELATIONSHIPS)[number],
      )
    ) {
      throw new Error("Invalid relationship.");
    }

    const students =
      await db.orm.public.Student.all();

    const currentStudent = students.find(
      (item) =>
        item.id === submittedStudentId &&
        item.schoolId === currentActor.schoolId,
    );

    if (!currentStudent) {
      throw new Error("Student not found.");
    }

    const parents =
      await db.orm.public.Parent.all();

    const currentParent = parents.find(
      (item) =>
        item.id === parentId &&
        item.schoolId === currentActor.schoolId,
    );

    if (!currentParent) {
      throw new Error("Parent not found.");
    }

    const links =
      await db.orm.public.StudentParent.all();

    const existingLink = links.find(
      (item) =>
        item.studentId === currentStudent.id &&
        item.parentId === currentParent.id,
    );

    if (existingLink) {
      throw new Error(
        "This parent is already linked to the student.",
      );
    }

    if (isPrimary) {
      const currentPrimaryLinks = links.filter(
        (item) =>
          item.studentId === currentStudent.id &&
          item.isPrimary,
      );

      for (const link of currentPrimaryLinks) {
        await db.orm.public.StudentParent
          .where({ id: link.id })
          .update({
            isPrimary: false,
          });
      }
    }

    await db.orm.public.StudentParent.create({
      studentId: currentStudent.id,
      parentId: currentParent.id,
      relationship,
      isPrimary,
    });

    redirect(
      `/students/${currentStudent.id}/parents`,
    );
  }

  async function removeParent(formData: FormData) {
    "use server";

    const currentActor =
      await requirePermission("students.edit");

    const submittedStudentId = Number(
      formData.get("studentId"),
    );

    const parentId = Number(
      formData.get("parentId"),
    );

    if (!Number.isInteger(submittedStudentId)) {
      throw new Error("Invalid student.");
    }

    if (!Number.isInteger(parentId)) {
      throw new Error("Invalid parent.");
    }

    const students =
      await db.orm.public.Student.all();

    const currentStudent = students.find(
      (item) =>
        item.id === submittedStudentId &&
        item.schoolId === currentActor.schoolId,
    );

    if (!currentStudent) {
      throw new Error("Student not found.");
    }

    const parents =
      await db.orm.public.Parent.all();

    const currentParent = parents.find(
      (item) =>
        item.id === parentId &&
        item.schoolId === currentActor.schoolId,
    );

    if (!currentParent) {
      throw new Error("Parent not found.");
    }

    const links =
      await db.orm.public.StudentParent.all();

    const link = links.find(
      (item) =>
        item.studentId === currentStudent.id &&
        item.parentId === currentParent.id,
    );

    if (!link) {
      throw new Error(
        "Parent is not linked to this student.",
      );
    }

    await db.orm.public.StudentParent
      .where({ id: link.id })
      .delete();

    redirect(
      `/students/${currentStudent.id}/parents`,
    );
  }

  const studentName = [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={`/students/${student.id}`}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to Student Profile
            </Link>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">
                {school.name}
              </p>

              <h1 className="text-3xl font-bold text-slate-900">
                Parents & Guardians
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                {studentName} · {student.permanentId}
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Linked Parents / Guardians
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Parents and guardians currently connected to
                this student.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {linkedParents.length}
            </span>
          </div>

          <div className="mt-5">
            {linkedParents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="font-medium text-slate-900">
                  No parents or guardians linked yet.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Use the form below to link an existing parent.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">
                        Parent
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Permanent ID
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Relationship
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Primary
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {linkedRecords.map((record) => {
                      const parent = linkedParents.find(
                        (item) =>
                          item.id === record.parentId,
                      );

                      if (!parent) {
                        return null;
                      }

                      const parentName = [
                        parent.firstName,
                        parent.middleName,
                        parent.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <tr key={record.id}>
                          <td className="px-4 py-4">
                            <Link
                              href={`/parents/${parent.id}`}
                              className="font-semibold text-slate-900 hover:underline"
                            >
                              {parentName}
                            </Link>

                            <p className="mt-1 text-xs text-slate-500">
                              {parent.phone ?? "No phone"}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {parent.permanentId}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {formatRelationship(
                              record.relationship,
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {record.isPrimary ? (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                Primary
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {canManage ? (
                              <form action={removeParent}>
                                <input
                                  type="hidden"
                                  name="studentId"
                                  value={student.id}
                                />

                                <input
                                  type="hidden"
                                  name="parentId"
                                  value={parent.id}
                                />

                                <button
                                  type="submit"
                                  className="font-semibold text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </form>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {canManage ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Link Parent / Guardian
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select an existing parent and define their
              relationship to this student.
            </p>

            {availableParents.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="font-medium text-slate-900">
                  No available parents.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Create a parent record first, or all active
                  parents are already linked.
                </p>

                <Link
                  href="/parents/new"
                  className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Add Parent
                </Link>
              </div>
            ) : (
              <form
                action={linkParent}
                className="mt-5 space-y-5"
              >
                <input
                  type="hidden"
                  name="studentId"
                  value={student.id}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="parentId"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Parent / Guardian *
                    </label>

                    <select
                      id="parentId"
                      name="parentId"
                      required
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">
                        Select parent / guardian
                      </option>

                      {availableParents.map((parent) => (
                        <option
                          key={parent.id}
                          value={parent.id}
                        >
                          {[
                            parent.firstName,
                            parent.middleName,
                            parent.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ")}{" "}
                          — {parent.permanentId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="relationship"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Relationship *
                    </label>

                    <select
                      id="relationship"
                      name="relationship"
                      required
                      defaultValue=""
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">
                        Select relationship
                      </option>

                      {RELATIONSHIPS.map(
                        (relationship) => (
                          <option
                            key={relationship}
                            value={relationship}
                          >
                            {formatRelationship(
                              relationship,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    name="isPrimary"
                    value="true"
                    className="h-4 w-4"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Primary Guardian
                    </span>

                    <span className="block text-xs text-slate-500">
                      This will make this parent the student's
                      primary guardian.
                    </span>
                  </span>
                </label>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Link Parent
                  </button>
                </div>
              </form>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}