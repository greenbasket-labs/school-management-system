import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getFeeTypes } from "../../../src/lib/fees";
import { getSchool } from "../../../src/lib/school";

export default async function FeeTypesPage() {
  const user = await requirePermission("fees.view");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    redirect("/dashboard");
  }

  const feeTypes = await getFeeTypes(school.id);
  const canCreate = await import("../../../src/lib/permissions").then(
    ({ hasPermission }) =>
      hasPermission(user.id, "fees.create"),
  );
  const canEdit = await import("../../../src/lib/permissions").then(
    ({ hasPermission }) =>
      hasPermission(user.id, "fees.edit"),
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Fee Types
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Configure the types of fees your school collects.
            </p>
          </div>

          {canCreate && (
            <Link
              href="/fees/types/new"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              + Add Fee Type
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Configured Fees
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {feeTypes.length} fee type
                  {feeTypes.length === 1 ? "" : "s"} configured
                </p>
              </div>
            </div>
          </div>

          {feeTypes.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto max-w-md">
                <h3 className="text-lg font-semibold text-slate-900">
                  No fee types yet
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Create your first fee type, such as Tuition,
                  Registration, Examination, or Transport.
                </p>

                {canCreate && (
                  <Link
                    href="/fees/types/new"
                    className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Create Fee Type
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fee Type
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {feeTypes.map((feeType) => (
                    <tr key={feeType.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {feeType.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          ID #{feeType.id}
                        </div>
                      </td>

                      <td className="max-w-md px-6 py-4 text-sm text-slate-600">
                        {feeType.description || "—"}
                      </td>

                      <td className="px-6 py-4">
                        {feeType.status === "ACTIVE" ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {canEdit ? (
                          <Link
                            href={`/fees/types/${feeType.id}/edit`}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                          >
                            Edit
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">
                            View only
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}