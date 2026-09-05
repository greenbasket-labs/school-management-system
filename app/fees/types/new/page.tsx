import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import { createFeeType } from "../../../../src/lib/fees";
import { getSchool } from "../../../../src/lib/school";

export default async function NewFeeTypePage() {
  const user = await requirePermission("fees.create");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    redirect("/dashboard");
  }

  async function createFeeTypeAction(formData: FormData) {
    "use server";

    const actor = await requirePermission("fees.create");
    const currentSchool = await getSchool();

    if (!currentSchool || currentSchool.id !== actor.schoolId) {
      redirect("/dashboard");
    }

    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");

    try {
      await createFeeType(
        currentSchool.id,
        name,
        description,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create fee type.";

      redirect(
        `/fees/types/new?error=${encodeURIComponent(message)}`,
      );
    }

    redirect("/fees/types");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/fees/types"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Fee Types
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Add Fee Type
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Create a fee category that can later be assigned to
            students.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={createFeeTypeAction} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-slate-900"
              >
                Fee Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                maxLength={150}
                placeholder="e.g. Tuition Fee"
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <p className="mt-1.5 text-xs text-slate-500">
                Examples: Tuition Fee, Registration Fee,
                Examination Fee, Transport Fee.
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-slate-900"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={500}
                placeholder="Optional description..."
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <p className="mt-1.5 text-xs text-slate-500">
                Optional. This helps staff understand what the fee
                covers.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/fees/types"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Create Fee Type
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}