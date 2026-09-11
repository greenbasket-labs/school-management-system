import Link from "next/link";
import { redirect } from "next/navigation";

import { requirePermission } from "../../../../../../../src/lib/authorization";
import { getAcademicSessionById } from "../../../../../../../src/lib/academic-sessions";
import { applyFeeRollover, getFeeRolloverSummary } from "../../../../../../../src/lib/fee-rollover";

function money(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function RolloverFinancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const targetSessionId = Number(id);
  if (!Number.isInteger(targetSessionId)) redirect("/academic-sessions");

  const actor = await requirePermission("fees.view");
  const targetSession = await getAcademicSessionById(targetSessionId, actor.schoolId);
  if (!targetSession || targetSession.status !== "DRAFT") redirect(`/academic-sessions/${targetSessionId}`);

  const sessions = await import("../../../../../../../src/prisma/db").then(({ db }) => db.orm.public.AcademicSession.all());
  const sourceSession = sessions
    .filter((session) => session.schoolId === actor.schoolId && session.status === "COMPLETED" && String(session.endDate) < String(targetSession.startDate))
    .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))[0];
  if (!sourceSession) redirect(`/academic-sessions/${targetSessionId}`);

  const summary = await getFeeRolloverSummary(sourceSession.id, targetSessionId);

  async function handleRollover(formData: FormData) {
    "use server";
    const currentActor = await requirePermission("fees.edit");
    const mode = String(formData.get("mode"));
    if (!["AUTO_CARRY_SESSION", "MANUAL_TRANSFER", "CLEAR_WAIVE", "HISTORICAL_OUTSTANDING"].includes(mode)) {
      throw new Error("Invalid rollover mode.");
    }
    const studentIds = formData.getAll("studentIds").map(Number).filter(Number.isInteger);
    await applyFeeRollover({
      sourceSessionId: sourceSession.id,
      targetSessionId,
      actorUserId: currentActor.userId,
      mode: mode as "AUTO_CARRY_SESSION" | "MANUAL_TRANSFER" | "CLEAR_WAIVE" | "HISTORICAL_OUTSTANDING",
      studentIds,
      reason: String(formData.get("reason") ?? ""),
    });
    redirect(`/academic-sessions/${targetSessionId}/rollover/finance`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <Link href={`/academic-sessions/${targetSessionId}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to Session</Link>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Financial Rollover</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{sourceSession.name} → {targetSession.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Outstanding balances are calculated from fee-level payment allocations. Original charges and payments remain in the completed session.</p>
        </div>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Previous Charges</p><p className="mt-2 text-2xl font-bold text-slate-900">{money(summary.totals.charges)}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Allocated Payments</p><p className="mt-2 text-2xl font-bold text-slate-900">{money(summary.totals.payments)}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Outstanding</p><p className="mt-2 text-2xl font-bold text-amber-950">{money(summary.totals.outstanding)}</p></div>
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Choose how outstanding balances should enter the new session</h2>
          <p className="mt-1 text-sm text-slate-500">This action does not delete or rewrite the completed session.</p>
          <form action={handleRollover} className="mt-5 space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="rounded-xl border border-slate-200 p-4"><input className="mr-2" type="radio" name="mode" value="AUTO_CARRY_SESSION" defaultChecked /> <strong>Auto-carry</strong><span className="mt-1 block text-xs text-slate-500">Carry every outstanding fee assignment into the new session.</span></label>
              <label className="rounded-xl border border-slate-200 p-4"><input className="mr-2" type="radio" name="mode" value="MANUAL_TRANSFER" /> <strong>Manual transfer</strong><span className="mt-1 block text-xs text-slate-500">Carry only the students selected below.</span></label>
              <label className="rounded-xl border border-slate-200 p-4"><input className="mr-2" type="radio" name="mode" value="HISTORICAL_OUTSTANDING" /> <strong>Historical outstanding</strong><span className="mt-1 block text-xs text-slate-500">Keep the balance as history only; create no new charge.</span></label>
              <label className="rounded-xl border border-slate-200 p-4"><input className="mr-2" type="radio" name="mode" value="CLEAR_WAIVE" /> <strong>Clear / waive</strong><span className="mt-1 block text-xs text-slate-500">Do not carry the balance into the new session; record the decision.</span></label>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Students for manual transfer</p>
              <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                {summary.students.filter((row) => row.previousBalance > 0).map((row) => (
                  <label key={row.student.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0">
                    <span><input className="mr-3" type="checkbox" name="studentIds" value={row.student.id} /> <span className="font-medium text-slate-900">{row.student.firstName} {row.student.middleName ?? ""} {row.student.lastName}</span><span className="ml-2 text-xs text-slate-500">{row.student.permanentId}</span></span>
                    <span className="font-semibold text-amber-700">{money(row.previousBalance)}</span>
                  </label>
                ))}
                {summary.students.filter((row) => row.previousBalance > 0).length === 0 && <p className="p-4 text-sm text-slate-500">No outstanding balances require transfer.</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900" htmlFor="reason">Reason</label>
              <textarea id="reason" name="reason" required rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" placeholder="Why is this rollover decision being made?" />
            </div>
            <button type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">Apply financial rollover decision</button>
          </form>
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4"><h2 className="font-semibold text-slate-900">Student balances</h2><p className="mt-1 text-xs text-slate-500">{summary.students.length} student{summary.students.length === 1 ? "" : "s"} with financial activity.</p></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-4">Student</th><th className="px-6 py-4 text-right">Charges</th><th className="px-6 py-4 text-right">Allocated</th><th className="px-6 py-4 text-right">Outstanding</th></tr></thead><tbody>
            {summary.students.map((row) => <tr key={row.student.id} className="border-t border-slate-100"><td className="px-6 py-4"><p className="font-semibold text-slate-900">{row.student.firstName} {row.student.middleName ?? ""} {row.student.lastName}</p><p className="mt-1 text-xs text-slate-500">{row.student.permanentId}</p></td><td className="px-6 py-4 text-right text-slate-700">{money(row.previousCharges)}</td><td className="px-6 py-4 text-right text-slate-700">{money(row.previousPayments)}</td><td className="px-6 py-4 text-right font-semibold text-slate-900">{money(row.previousBalance)}</td></tr>)}
          </tbody></table></div>
        </section>
      </div>
    </main>
  );
}
