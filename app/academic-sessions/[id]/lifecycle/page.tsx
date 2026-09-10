import Link from "next/link";
import { redirect } from "next/navigation";

import { requirePermission } from "../../../../src/lib/authorization";
import { getAcademicSessionById } from "../../../../src/lib/academic-sessions";
import {
  archiveAcademicSession,
  completeAcademicSession,
  activateAcademicSession,
} from "../../../../src/lib/academic-session-lifecycle";

export default async function AcademicSessionLifecyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("academics.edit");
  const { id } = await params;
  const sessionId = Number(id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) redirect("/academic-sessions");

  const session = await getAcademicSessionById(sessionId, actor.schoolId);
  if (!session) redirect("/academic-sessions");

  async function runLifecycle(formData: FormData) {
    "use server";

    const action = String(formData.get("action") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();
    if (!reason) throw new Error("A reason is required.");

    const user = await requirePermission("academics.edit");
    const input = { sessionId, actorUserId: user.id, reason };

    if (action === "ACTIVATE") {
      await activateAcademicSession(input);
    } else if (action === "COMPLETE") {
      await completeAcademicSession(input);
    } else if (action === "ARCHIVE") {
      await archiveAcademicSession(input);
    } else {
      throw new Error("Invalid lifecycle action.");
    }

    redirect(`/academic-sessions/${sessionId}`);
  }

  const action =
    session.status === "DRAFT"
      ? "ACTIVATE"
      : session.status === "ACTIVE"
        ? "COMPLETE"
        : session.status === "COMPLETED"
          ? "ARCHIVE"
          : null;

  const actionLabel =
    action === "ACTIVATE"
      ? "Activate Session"
      : action === "COMPLETE"
        ? "Complete Session"
        : action === "ARCHIVE"
          ? "Archive Session"
          : "No Lifecycle Action Available";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href={`/academic-sessions/${sessionId}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Back to Academic Session
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-700">Academic Session</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{session.name}</h1>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{session.status}</span>
          </div>

          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-slate-900">Controlled lifecycle action</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Changing an academic session's lifecycle affects how the school operates against that session. Use a clear reason so the change remains auditable.
            </p>
          </div>

          {action ? (
            <form action={runLifecycle} className="mt-7 space-y-5">
              <input type="hidden" name="action" value={action} />
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Reason *</span>
                <textarea
                  name="reason"
                  required
                  rows={4}
                  placeholder={`Why are you changing this session to ${action === "ACTIVATE" ? "active" : action === "COMPLETE" ? "completed" : "archived"}?`}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <div className="flex justify-end gap-3">
                <Link href={`/academic-sessions/${sessionId}`} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</Link>
                <button type="submit" className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">{actionLabel}</button>
              </div>
            </form>
          ) : (
            <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              This session is <strong>{session.status}</strong>. There is no further lifecycle action available from this workflow.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
