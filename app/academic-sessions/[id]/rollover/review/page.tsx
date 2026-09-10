import Link from "next/link";
import { redirect } from "next/navigation";
import { Temporal } from "@js-temporal/polyfill";

import { requirePermission } from "../../../../../../src/lib/authorization";
import { getAcademicSessionById } from "../../../../../../src/lib/academic-sessions";
import { getActiveClassesForSession } from "../../../../../../src/lib/classes";
import { applyStudentLifecycleAction } from "../../../../../../src/lib/student-lifecycle";
import { getStudentRolloverCandidates } from "../../../../../../src/lib/student-rollover";

export default async function StudentRolloverReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const targetSessionId = Number(id);

  if (!Number.isInteger(targetSessionId)) redirect("/academic-sessions");

  const actor = await requirePermission("academics.edit");
  const targetSession = await getAcademicSessionById(targetSessionId, actor.schoolId);

  if (!targetSession || targetSession.status !== "DRAFT") {
    redirect(`/academic-sessions/${targetSessionId}`);
  }

  const sessions = await import("../../../../../../src/prisma/db").then(({ db }) =>
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

  const [candidates, targetClasses] = await Promise.all([
    getStudentRolloverCandidates(sourceSession.id, targetSessionId),
    getActiveClassesForSession(actor.schoolId, targetSessionId),
  ]);

  async function saveDecision(formData: FormData) {
    "use server";

    const currentActor = await requirePermission("academics.edit");
    const studentId = Number(formData.get("studentId"));
    const decision = String(formData.get("decision") ?? "");
    const targetClassIdValue = String(formData.get("targetClassId") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();

    if (!Number.isInteger(studentId)) throw new Error("Invalid student.");
    if (!["PROMOTE", "REPEAT", "WITHDRAW", "TRANSFER", "GRADUATE"].includes(decision)) {
      throw new Error("Invalid rollover decision.");
    }
    if (!reason) throw new Error("A reason is required.");

    const needsClass = decision === "PROMOTE" || decision === "REPEAT";
    const targetClassId = targetClassIdValue ? Number(targetClassIdValue) : undefined;

    if (needsClass && !targetClassId) {
      throw new Error("Select a target class for promotion or repeat.");
    }

    await applyStudentLifecycleAction({
      studentId,
      action: decision as "PROMOTE" | "REPEAT" | "WITHDRAW" | "TRANSFER" | "GRADUATE",
      targetClassId,
      sessionId: targetSessionId,
      actorUserId: currentActor.userId,
      effectiveDate: Temporal.Now.instant(),
      reason,
      allowDraftSession: true,
    });

    redirect(`/academic-sessions/${targetSessionId}/rollover/review`);
  }

  const pending = candidates.filter((candidate) => !candidate.alreadyRolledOver).length;
  const completed = candidates.length - pending;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <Link href={`/academic-sessions/${targetSessionId}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Back to Session
        </Link>

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student Rollover Review</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {sourceSession.name} → {targetSession.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600">Review students individually. Nothing is promoted automatically.</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-900">
            <strong>{completed}</strong> reviewed / <strong>{candidates.length}</strong> total
          </div>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Current Class</th>
                  <th className="px-5 py-4">Decision</th>
                  <th className="px-5 py-4">Target Class</th>
                  <th className="px-5 py-4">Reason</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(({ student, currentClass, alreadyRolledOver }) => (
                  <tr key={student.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{student.firstName} {student.middleName ?? ""} {student.lastName}</p>
                      <p className="mt-1 text-xs text-slate-500">{student.permanentId}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {currentClass?.name ?? "Unassigned"}{currentClass?.section ? ` — ${currentClass.section}` : ""}
                    </td>
                    <td className="px-5 py-4">
                      {alreadyRolledOver ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Completed</span>
                      ) : (
                        <form id={`rollover-${student.id}`} action={saveDecision}>
                          <input type="hidden" name="studentId" value={student.id} />
                          <select name="decision" required defaultValue="PROMOTE" className="rounded-lg border border-slate-300 px-3 py-2">
                            <option value="PROMOTE">Promote</option>
                            <option value="REPEAT">Repeat</option>
                            <option value="WITHDRAW">Withdraw</option>
                            <option value="TRANSFER">Transfer</option>
                            <option value="GRADUATE">Graduate</option>
                          </select>
                        </form>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {!alreadyRolledOver && (
                        <select name="targetClassId" form={`rollover-${student.id}`} defaultValue="" className="rounded-lg border border-slate-300 px-3 py-2">
                          <option value="">Select class</option>
                          {targetClasses.map((schoolClass) => (
                            <option key={schoolClass.id} value={schoolClass.id}>
                              {schoolClass.name}{schoolClass.section ? ` — ${schoolClass.section}` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {!alreadyRolledOver && (
                        <textarea name="reason" form={`rollover-${student.id}`} required rows={2} placeholder="Reason" className="w-48 rounded-lg border border-slate-300 px-3 py-2" />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {!alreadyRolledOver && (
                        <button form={`rollover-${student.id}`} type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                          Save
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          The new session remains <strong>DRAFT</strong> while students are reviewed. The previous session's historical records remain unchanged.
        </div>
      </div>
    </main>
  );
}
