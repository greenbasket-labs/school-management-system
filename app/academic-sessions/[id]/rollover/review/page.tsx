import Link from "next/link";
import { redirect } from "next/navigation";

import { requirePermission } from "../../../../../../src/lib/authorization";
import { getAcademicSessionById } from "../../../../../../src/lib/academic-sessions";
import { getActiveClassesForSession } from "../../../../../../src/lib/classes";
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
  if (!targetSession) redirect("/academic-sessions");

  const sessions = await import("../../../../../../src/prisma/db").then(({ db }) => db.orm.public.AcademicSession.all());
  const sourceSession = sessions
    .filter((session) => session.schoolId === actor.schoolId && session.status === "COMPLETED")
    .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))
    .find((session) => String(session.endDate) < String(targetSession.startDate));

  if (!sourceSession || targetSession.status !== "DRAFT") redirect(`/academic-sessions/${targetSessionId}`);

  const [candidates, targetClasses] = await Promise.all([
    getStudentRolloverCandidates(sourceSession.id, targetSessionId),
    getActiveClassesForSession(actor.schoolId, targetSessionId),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <Link href={`/academic-sessions/${targetSessionId}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to Session</Link>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student Rollover Review</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{targetSession.name}</h1>
            <p className="mt-2 text-sm text-slate-600">Review every active student from {sourceSession.name}. No student is promoted automatically.</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{candidates.length} active student{candidates.length === 1 ? "" : "s"} to review</div>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Current Class</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Decision</th>
                  <th className="px-5 py-4">Target Class</th>
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
                    <td className="px-5 py-4 text-slate-700">{currentClass?.name ?? "Unassigned"}{currentClass?.section ? ` — ${currentClass.section}` : ""}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">ACTIVE</span></td>
                    <td className="px-5 py-4">
                      <select name={`decision-${student.id}`} defaultValue="PROMOTE" form={`rollover-${student.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                        <option value="PROMOTE">Promote</option><option value="REPEAT">Repeat</option><option value="WITHDRAW">Withdraw</option><option value="TRANSFER">Transfer</option><option value="GRADUATE">Graduate</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <select name={`targetClassId-${student.id}`} form={`rollover-${student.id}`} defaultValue="" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                        <option value="">Select class</option>
                        {targetClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}{schoolClass.section ? ` — ${schoolClass.section}` : ""}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      {alreadyRolledOver ? <span className="text-xs font-semibold text-emerald-700">Completed</span> : <Link href={`/students/${student.id}/lifecycle`} className="text-sm font-semibold text-slate-900 hover:underline">Open student</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
