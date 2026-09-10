import Link from "next/link";
import { redirect } from "next/navigation";

import { requirePermission } from "../../../../../src/lib/authorization";
import { getAcademicSessionById } from "../../../../../src/lib/academic-sessions";
import { getAcademicSessionReadiness } from "../../../../../src/lib/academic-session-readiness";

export default async function AcademicSessionReadinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) redirect("/academic-sessions");

  const actor = await requirePermission("academics.view");
  const session = await getAcademicSessionById(sessionId, actor.schoolId);

  if (!session) redirect("/academic-sessions");

  const readiness = await getAcademicSessionReadiness(sessionId);

  const checks = [
    {
      label: "At least one term configured",
      passed: readiness.checks.hasTerms,
      detail: `${readiness.counts.terms} term${readiness.counts.terms === 1 ? "" : "s"}`,
    },
    {
      label: "At least one active class configured",
      passed: readiness.checks.hasClasses,
      detail: `${readiness.counts.classes} active class${readiness.counts.classes === 1 ? "" : "es"}`,
    },
    {
      label: "Student rollover is complete",
      passed: readiness.checks.rolloverComplete,
      detail: `${readiness.counts.studentsPendingRollover} pending, ${readiness.counts.studentsAssignedToTargetSession} assigned`,
    },
    {
      label: "No duplicate target-session assignments",
      passed: readiness.checks.noDuplicateTargetAssignments,
      detail: `${readiness.counts.duplicateTargetAssignments} duplicate student assignment${readiness.counts.duplicateTargetAssignments === 1 ? "" : "s"}`,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/academic-sessions/${sessionId}`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to Academic Session
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Activation Readiness
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {session.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                The session must pass these checks before it can become ACTIVE.
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                readiness.ready
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {readiness.ready ? "READY TO ACTIVATE" : "NOT READY"}
            </span>
          </div>

          <div className="mt-8 space-y-3">
            {checks.map((check) => (
              <div
                key={check.label}
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                  check.passed
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-900">{check.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{check.detail}</p>
                </div>
                <span className="text-sm font-bold">
                  {check.passed ? "PASS" : "BLOCKED"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            {readiness.sourceSessionId && !readiness.checks.rolloverComplete && (
              <Link
                href={`/academic-sessions/${sessionId}/rollover/review`}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Review Students
              </Link>
            )}
            <Link
              href={`/academic-sessions/${sessionId}/lifecycle`}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Session Lifecycle
            </Link>
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
          Activation is protected at the engine level as well as in this screen. Even if someone bypasses this page, a session that fails these checks cannot be activated.
        </div>
      </div>
    </main>
  );
}
