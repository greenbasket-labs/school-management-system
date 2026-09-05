import Link from "next/link";
import { requirePermission } from "../../src/lib/authorization";
import { getSchool } from "../../src/lib/school";
import { getParents } from "../../src/lib/parents";

export default async function ParentsPage() {
  const actor = await requirePermission("parents.view");
  const school = await getSchool();

  const parents = await getParents(actor.schoolId);

  let canCreate = false;

  try {
    await requirePermission("parents.create");
    canCreate = true;
  } catch {
    canCreate = false;
  }

  const activeCount = parents.filter(
    (parent) => parent.status === "ACTIVE",
  ).length;

  const inactiveCount = parents.length - activeCount;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to Dashboard
            </Link>

            <div className="mt-3">
              <p className="text-sm font-medium text-slate-500">
                {school.name}
              </p>

              <h1 className="text-3xl font-bold text-slate-900">
                Parents & Guardians
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Manage parents, guardians, and their linked students.
              </p>
            </div>
          </div>

          {canCreate ? (
            <Link
              href="/parents/new"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Add Parent
            </Link>
          ) : null}
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Parents
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {parents.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {activeCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Inactive
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-600">
              {inactiveCount}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Parent / Guardian Directory
            </h2>
          </div>

          {parents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-medium text-slate-900">
                No parents or guardians yet.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add the first parent or guardian to begin linking students.
              </p>

              {canCreate ? (
                <Link
                  href="/parents/new"
                  className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Add Parent
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      Permanent ID
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Name
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Phone
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Email
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {parents.map((parent) => {
                    const fullName = [
                      parent.firstName,
                      parent.middleName,
                      parent.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <tr
                        key={parent.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                          {parent.permanentId}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {fullName}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {parent.phone ?? "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {parent.email ?? "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={
                              parent.status === "ACTIVE"
                                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                            }
                          >
                            {parent.status}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <Link
                            href={`/parents/${parent.id}`}
                            className="font-semibold text-slate-900 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}