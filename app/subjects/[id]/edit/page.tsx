import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getSubjectById } from "../../../../src/lib/subjects";
import { db } from "../../../../src/prisma/db";

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE"] as const;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSubjectPage({
  params,
}: PageProps) {
  const actor = await requirePermission("subjects.edit");
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

  async function updateSubject(formData: FormData) {
    "use server";

    const currentActor =
      await requirePermission("subjects.edit");

    const currentSchool = await getSchool();

    if (currentActor.schoolId !== currentSchool.id) {
      throw new Error("Unauthorized school access.");
    }

    const currentSubject = await getSubjectById(
      subjectId,
      currentSchool.id,
    );

    if (!currentSubject) {
      throw new Error("Subject not found.");
    }

    const name = String(
      formData.get("name") ?? "",
    ).trim();

    const code = String(
      formData.get("code") ?? "",
    ).trim();

    const statusValue = String(
      formData.get("status") ?? "",
    ).trim();

    if (!name) {
      throw new Error("Subject name is required.");
    }

    if (
      !STATUS_OPTIONS.includes(
        statusValue as (typeof STATUS_OPTIONS)[number],
      )
    ) {
      throw new Error("Invalid subject status.");
    }

    const status =
      statusValue as (typeof STATUS_OPTIONS)[number];

    const subjects =
      await db.orm.public.Subject.all();

    const duplicateName = subjects.find(
      (item) =>
        item.schoolId === currentSchool.id &&
        item.id !== currentSubject.id &&
        item.name.trim().toLowerCase() ===
          name.toLowerCase(),
    );

    if (duplicateName) {
      throw new Error(
        "Another subject with this name already exists.",
      );
    }

    if (code) {
      const duplicateCode = subjects.find(
        (item) =>
          item.schoolId === currentSchool.id &&
          item.id !== currentSubject.id &&
          item.code?.trim().toLowerCase() ===
            code.toLowerCase(),
      );

      if (duplicateCode) {
        throw new Error(
          "Another subject with this code already exists.",
        );
      }
    }

    await db.orm.public.Subject.where({
      id: currentSubject.id,
    }).update({
      name,
      code: code || null,
      status,
    });

    redirect(`/subjects/${currentSubject.id}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href={`/subjects/${subject.id}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Subject
          </Link>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Edit Subject
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Update subject information for {school.name}.
          </p>
        </div>

        <form
          action={updateSubject}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Subject Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={subject.name}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Subject Code
            </label>

            <input
              id="code"
              name="code"
              type="text"
              defaultValue={subject.code ?? ""}
              placeholder="e.g. MATH"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-xs text-slate-500">
              Optional. The code must be unique within the
              school.
            </p>
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={subject.status}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map((statusOption) => (
                <option
                  key={statusOption}
                  value={statusOption}
                >
                  {statusOption === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              Subject ID
            </p>

            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {subject.id}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              The subject record ID cannot be changed.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/subjects/${subject.id}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}