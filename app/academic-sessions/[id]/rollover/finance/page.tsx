import Link from "next/link";
import { redirect } from "next/navigation";

import { requirePermission } from "../../../../../../../src/lib/authorization";
import { getAcademicSessionById } from "../../../../../../../src/lib/academic-sessions";
import { getFeeRolloverSummary } from "../../../../../../../src/lib/fee-rollover";

function money(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function RolloverFinancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const targetSessionId = Number(id);

  if (!Number.isInteger(targetSessionId)) redirect("/academic-sessions");

  const actor = await requirePermission("fees.view");
  const targetSession = await getAcademicSessionById(targetSessionId, actor.schoolId);

  if (!targetSession || targetSession.status !== "DRAFT") {
    redirect(`/academic-sessions/${targetSessionId}`);
  }

  const sessions = await import("../../../../../../../src/prisma/db").then(({ db }) =>
    db.orm.public.AcademicSession.all(),
  );

  const sourceSession = sessions
    .filter(
      (session) =>
        session.schoolId === actor.schoolId &&
        session.status === "COMPLETED" &&
        String(session.endDate) < String(targetSession.startDate),
    )
    .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))[0];

  if (!sourceSession) redirect(`/academic-sessions/${targetSessionId}`);

  const summary = await getFeeRolloverSummary(sourceSession.id, targetSessionId);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/academic-sessions/${targetSessionId}`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to Session
        </Link>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Financial Rollover Review
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {sourceSession.name} → {targetSession.name}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review outstanding balances from the completed session before opening the new one.
            No old charge or payment is copied into the new session automatically.
          </p>
        </div>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Previous Charges</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{money(summary.totals.charges)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Previous Payments</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{money(summary.totals.payments)}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Outstanding</p>
            <p className="mt-2 text-2xl font-bold text-amber-950">{money(summary.totals.outstanding)}</p>
          </div>
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Student balances</h2>
            <p className="mt-1 text-xs text-slate-500">
              {summary.students.length} student{summary.students.length === 1 ? "" : "s"} with financial activity.
            </p>
          </div>

          {summary.students.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No financial activity was found in the completed session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4 text-right">Charges</th>
                    <th className="px-6 py-4 text-right">Payments</th>
                    <th className="px-6 py-4 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.students.map((row) => (
                    <tr key={row.student.id} className="border-t border-slate-100">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {row.student.firstName} {row.student.middleName ?? ""} {row.student.lastName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{row.student.permanentId}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700">{money(row.previousCharges)}</td>
                      <td className="px-6 py-4 text-right text-slate-700">{money(row.previousPayments)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">{money(row.previousBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
          <strong>Important:</strong> the current finance model records payments against students, not individual fee assignments.
          Because of that, the system reports the previous-session balance for review instead of blindly carrying it into the new session.
          This prevents duplicate charges during rollover.
        </div>
      </div>
    </main>
  );
}
