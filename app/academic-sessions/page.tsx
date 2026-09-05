import Link from "next/link";
import { requirePermission } from "../../src/lib/authorization";
import { getSchool } from "../../src/lib/school";
import { getAcademicSessions } from "../../src/lib/academic-sessions";

function formatDate(value: unknown): string {
  if (!value) return "—";

  const dateText = String(value);
  const datePart = dateText.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthNumber = Number(month);

    if (monthNumber >= 1 && monthNumber <= 12) {
      return `${day} ${monthNames[monthNumber - 1]} ${year}`;
    }
  }

  return dateText;
}

function statusClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "COMPLETED":
      return "bg-blue-100 text-blue-700";
    case "DRAFT":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function AcademicSessionsPage() {
  const user = await requirePermission("academics.view");
  const school = await getSchool();
  const sessions = await getAcademicSessions(user.schoolId);

  const canCreate = await (async () => {
    try {
      await requirePermission("academics.create");
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold text-gray-900">
              Academic Sessions
            </h1>

            <p className="mt-1 text-gray-600">
              {school.name}
            </p>
          </div>

          {canCreate && (
            <Link
              href="/academic-sessions/new"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + New Academic Session
            </Link>
          )}
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Sessions</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {sessions.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Active Sessions</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {sessions.filter((session) => session.status === "ACTIVE").length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Draft Sessions</p>
            <p className="mt-2 text-3xl font-bold text-gray-600">
              {sessions.filter((session) => session.status === "DRAFT").length}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Academic Sessions
            </h2>
          </div>

          {sessions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">
                No academic sessions have been created yet.
              </p>

              {canCreate && (
                <Link
                  href="/academic-sessions/new"
                  className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
                >
                  Create the first academic session
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Session
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Start Date
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      End Date
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {session.name}
                        </div>

                        <div className="text-xs text-gray-500">
                          Session #{session.id}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {formatDate(session.startDate)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {formatDate(session.endDate)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            session.status,
                          )}`}
                        >
                          {session.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Link
                          href={`/academic-sessions/${session.id}`}
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}