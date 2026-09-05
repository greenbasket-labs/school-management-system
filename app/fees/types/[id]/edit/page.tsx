import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../../src/lib/authorization";
import {
  getFeeTypeById,
  updateFeeType,
  setFeeTypeStatus,
} from "../../../../../src/lib/fees";
import { getSchool } from "../../../../../src/lib/school";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditFeeTypePage({
  params,
  searchParams,
}: PageProps) {
  const user = await requirePermission("fees.edit");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const { error } = await searchParams;

  const feeTypeId = Number(id);

  if (!Number.isInteger(feeTypeId) || feeTypeId <= 0) {
    notFound();
  }

  const feeType = await getFeeTypeById(
    school.id,
    feeTypeId,
  );

  if (!feeType) {
    notFound();
  }

  async function updateFeeTypeAction(formData: FormData) {
    "use server";

    const actor = await requirePermission("fees.edit");
    const currentSchool = await getSchool();

    if (
      !currentSchool ||
      currentSchool.id !== actor.schoolId
    ) {
      redirect("/dashboard");
    }

    const name = String(formData.get("name") ?? "");
    const description = String(
      formData.get("description") ?? "",
    );

    try {
      await updateFeeType(
        currentSchool.id,
        feeTypeId,
        name,
        description,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update fee type.";

      redirect(
        `/fees/types/${feeTypeId}/edit?error=${encodeURIComponent(
          message,
        )}`,
      );
    }

    redirect("/fees/types");
  }

  async function toggleStatusAction() {
    "use server";

    const actor = await requirePermission("fees.edit");
    const currentSchool = await getSchool();

    if (
      !currentSchool ||
      currentSchool.id !== actor.schoolId
    ) {
      redirect("/dashboard");
    }

    const currentFeeType = await getFeeTypeById(
      currentSchool.id,
      feeTypeId,
    );

    if (!currentFeeType) {
      notFound();
    }

    const newStatus =
      currentFeeType.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    try {
      await setFeeTypeStatus(
        currentSchool.id,
        feeTypeId,
        newStatus,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to change fee type status.";

      redirect(
        `/fees/types/${feeTypeId}/edit?error=${encodeURIComponent(
          message,
        )}`,
      );
    }

    redirect(`/fees/types/${feeTypeId}/edit`);
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Edit Fee Type
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Update the fee configuration.
              </p>
            </div>

            {feeType.status === "ACTIVE" ? (
              <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Active
              </span>
            ) : (
              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                Inactive
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <form
              action={updateFeeTypeAction}
              className="space-y-6"
            >
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
                  defaultValue={feeType.name}
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
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
                  defaultValue={feeType.description ?? ""}
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Fee Type Status
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {feeType.status === "ACTIVE"
                    ? "This fee type can currently be assigned to students."
                    : "This fee type is inactive and cannot be assigned to new students."}
                </p>
              </div>

              <form action={toggleStatusAction}>
                {feeType.status === "ACTIVE" ? (
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Activate
                  </button>
                )}
              </form>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fee Type Information
            </div>

            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">
                  Internal ID
                </dt>

                <dd className="mt-1 font-medium text-slate-900">
                  #{feeType.id}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">
                  Status
                </dt>

                <dd className="mt-1 font-medium text-slate-900">
                  {feeType.status === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </main>
  );
}