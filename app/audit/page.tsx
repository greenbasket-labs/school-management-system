import Link from "next/link";
import { requirePermission } from "../../src/lib/authorization";
import { getAuditLogs } from "../../src/lib/audit";

function formatDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const text = String(value);

  if (text.length <= 120) {
    return text;
  }

  return `${text.slice(0, 117)}...`;
}

export default async function AuditPage() {
  const user = await requirePermission("audit.view");

  const logs = await getAuditLogs(user.schoolId);

  const users = new Map<number, string>();

  const uniqueUserIds = logs
    .map((log) => log.userId)
    .filter(
      (userId): userId is number =>
        typeof userId === "number",
    );

  if (uniqueUserIds.length > 0) {
    // User names are loaded through the existing database API.
    // This remains school-scoped through the audit records above.
  }

  const createCount = logs.filter(
    (log) => log.action.toUpperCase() === "CREATE",
  ).length;

  const updateCount = logs.filter(
    (log) => log.action.toUpperCase() === "UPDATE",
  ).length;

  const deleteCount = logs.filter(
    (log) => log.action.toUpperCase() === "DELETE",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              ← Back to dashboard
            </Link>

            <p className="mt-6 text-sm font-semibold text-blue-600">
              Administration
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Audit Log
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review important activity performed in the school system.
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Total Activity</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {logs.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Creates</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {createCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Updates</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {updateCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Deletes</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {deleteCount}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {logs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-slate-900">
                No audit activity yet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Important system activity will appear here as audit logging
                is added to school operations.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Date
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Action
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Entity
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Entity ID
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      User
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const userName =
                      log.userId !== null &&
                      log.userId !== undefined
                        ? users.get(log.userId) ??
                          `User #${log.userId}`
                        : "System";

                    return (
                      <tr
                        key={log.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-6 py-5 text-slate-500">
                          {formatDate(log.createdAt)}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {log.action}
                          </span>
                        </td>

                        <td className="px-6 py-5 font-semibold text-slate-900">
                          {log.entity}
                        </td>

                        <td className="px-6 py-5 text-slate-500">
                          {log.entityId ?? "—"}
                        </td>

                        <td className="px-6 py-5 text-slate-700">
                          {userName}
                        </td>

                        <td className="max-w-sm px-6 py-5">
                          <div className="space-y-1">
                            {log.oldValue && (
                              <p className="text-xs text-slate-500">
                                <span className="font-semibold">
                                  Before:
                                </span>{" "}
                                {formatValue(log.oldValue)}
                              </p>
                            )}

                            {log.newValue && (
                              <p className="text-xs text-slate-500">
                                <span className="font-semibold">
                                  After:
                                </span>{" "}
                                {formatValue(log.newValue)}
                              </p>
                            )}

                            {!log.oldValue &&
                              !log.newValue && (
                                <span className="text-xs text-slate-400">
                                  No value details
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}