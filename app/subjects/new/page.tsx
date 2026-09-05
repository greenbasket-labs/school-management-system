import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { db } from "../../../src/prisma/db";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default async function NewSubjectPage() {
  const user = await requirePermission("subjects.create");
  const school = await getSchool();

  async function createSubject(formData: FormData) {
    "use server";

    const actor = await requirePermission("subjects.create");
    const schoolRecord = await getSchool();

    if (!schoolRecord || schoolRecord.id !== actor.schoolId) {
      throw new Error("School not found.");
    }

    const name = String(
      formData.get("name") ?? "",
    ).trim();

    const code = String(
      formData.get("code") ?? "",
    ).trim();

    const statusValue = String(
      formData.get("status") ?? "ACTIVE",
    ).trim();

    if (!name) {
      throw new Error("Subject name is required.");
    }

    if (
      statusValue !== "ACTIVE" &&
      statusValue !== "INACTIVE"
    ) {
      throw new Error("Invalid subject status.");
    }

    const subjects = await db.orm.public.Subject.all();

    const schoolSubjects = subjects.filter(
      (subject) => subject.schoolId === actor.schoolId,
    );

    const duplicateName = schoolSubjects.some(
      (subject) =>
        subject.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicateName) {
      throw new Error(
        "A subject with this name already exists.",
      );
    }

    if (code) {
      const duplicateCode = schoolSubjects.some(
        (subject) =>
          subject.code?.toLowerCase() ===
          code.toLowerCase(),
      );

      if (duplicateCode) {
        throw new Error(
          "A subject with this code already exists.",
        );
      }
    }

    const subject =
      await db.orm.public.Subject.create({
        schoolId: actor.schoolId,
        name,
        code: code || null,
        status: statusValue,
      });

    redirect(`/subjects/${subject.id}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/subjects"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Subjects
          </Link>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Add Subject
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Add a subject offered by {school?.name}.
          </p>
        </div>

        <form
          action={createSubject}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-slate-700"
            >
              Subject Name *
            </label>

            <input
              id="name"
              name="name"
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. Mathematics"
            />

            <p className="mt-1 text-xs text-slate-500">
              The subject name must be unique within the school.
            </p>
          </div>

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-semibold text-slate-700"
            >
              Subject Code
            </label>

            <input
              id="code"
              name="code"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. MATH"
            />

            <p className="mt-1 text-xs text-slate-500">
              Optional. If provided, the code must also be unique
              within the school.
            </p>
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-semibold text-slate-700"
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue="ACTIVE"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              Assignment comes later
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              After creating subjects, we will assign them to
              classes and teachers as part of the academic
              structure.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/subjects"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create Subject
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}