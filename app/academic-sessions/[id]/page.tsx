import Link from "next/link";
import { redirect } from "next/navigation";

import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import {
  getAcademicSessionById,
  getTermsForSession,
} from "../../../src/lib/academic-sessions";

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

function statusClasses(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";

    case "COMPLETED":
      return "bg-blue-100 text-blue-700";

    case "ARCHIVED":
      return "bg-slate-200 text-slate-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

function termStatusClasses(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-100 text-slate-600";
}

function termLabel(term: string) {
  switch (term) {
    case "FIRST":
      return "First Term";

    case "SECOND":
      return "Second Term";

    case "THIRD":
      return "Third Term";

    default:
      return term;
  }
}

export default async function AcademicSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);

  if (!Number.isInteger(sessionId)) {
    redirect("/academic-sessions");
  }

  const actor = await requirePermission("academics.view");

  const school = await getSchool();

  const session = await getAcademicSessionById(
    sessionId,
    actor.schoolId,
  );

  if (!session) {
    redirect("/academic-sessions");
  }

  const terms = await getTermsForSession(
    sessionId,
    actor.schoolId,
  );

  let canCreateTerm = false;

  try {
    await requirePermission("academics.create");
    canCreateTerm = true;
  } catch {
    canCreateTerm = false;
  }

  const activeTerm = terms.find(
    (term) => term.isActive === true,
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/academic-sessions"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Academic Sessions
          </Link>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  {session.name}
                </h1>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                    session.status,
                  )}`}
                >
                  {session.status}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                Academic Session
              </p>
            </div>

            {canCreateTerm && (
              <Link
                href={`/academic-sessions/${sessionId}/terms/new`}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                + Add Term
              </Link>
            )}
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Session Name
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-900">
              {session.name}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Start Date
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-900">
              {formatDate(session.startDate)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              End Date
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-900">
              {formatDate(session.endDate)}
            </p>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Terms
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {terms.length} term
                {terms.length === 1 ? "" : "s"} configured for this
                academic session.
              </p>
            </div>

            {activeTerm && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Active Term
                </p>

                <p className="mt-1 font-semibold text-emerald-900">
                  {activeTerm.name}
                </p>
              </div>
            )}
          </div>

          {terms.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <h3 className="font-semibold text-slate-900">
                No terms created yet
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Add First Term, Second Term, or Third Term to start
                configuring this academic session.
              </p>

              {canCreateTerm && (
                <Link
                  href={`/academic-sessions/${sessionId}/terms/new`}
                  className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Create First Term
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">
                      Term
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Name
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Start
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      End
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {terms.map((term) => (
                    <tr
                      key={term.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {termLabel(term.term)}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {term.name}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(term.startDate)}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(term.endDate)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${termStatusClasses(
                            term.isActive,
                          )}`}
                        >
                          {term.isActive
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Classes
            </p>

            <h3 className="mt-2 font-semibold text-slate-900">
              Classes connected later
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Classes will be created and connected to this academic
              session.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Students
            </p>

            <h3 className="mt-2 font-semibold text-slate-900">
              Class history
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Student class history will use this session for
              promotion and historical records.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              School
            </p>

            <h3 className="mt-2 font-semibold text-slate-900">
              {school?.name ?? "School"}
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              This academic session belongs to the current school.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}