import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import {
  createFeeAssignment,
  getActiveFeeTypes,
  getAcademicSessionsForFees,
  getClassesForSession,
  getStudentsForFeeAssignment,
  getTermsForSession,
} from "../../../../src/lib/fees";
import { getSchool } from "../../../../src/lib/school";

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function BulkFeeAssignmentPage({ searchParams }: PageProps) {
  const user = await requirePermission("fees.create");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) redirect("/dashboard");

  const { error, success } = await searchParams;
  const [students, feeTypes, sessions] = await Promise.all([
    getStudentsForFeeAssignment(school.id),
    getActiveFeeTypes(school.id),
    getAcademicSessionsForFees(school.id),
  ]);

  const sessionOptions = await Promise.all(
    sessions.map(async (session) => ({
      session,
      terms: await getTermsForSession(session.id),
      classes: await getClassesForSession(school.id, session.id),
    })),
  );

  async function bulkAssignAction(formData: FormData) {
    "use server";

    const actor = await requirePermission("fees.create");
    const currentSchool = await getSchool();
    if (!currentSchool || currentSchool.id !== actor.schoolId) redirect("/dashboard");

    const sessionId = Number(formData.get("sessionId"));
    const classId = Number(formData.get("classId"));
    const feeTypeId = Number(formData.get("feeTypeId"));
    const amount = Number(formData.get("amount"));
    const termValue = String(formData.get("termId") ?? "");
    const dueDateValue = String(formData.get("dueDate") ?? "");
    const description = String(formData.get("description") ?? "");

    const termId = termValue ? Number(termValue) : undefined;
    const dueDate = dueDateValue ? new Date(`${dueDateValue}T00:00:00`) : undefined;

    const allStudents = await getStudentsForFeeAssignment(currentSchool.id);
    const studentsInClass = allStudents.filter((student) => student.currentClassId === classId);

    if (studentsInClass.length === 0) {
      redirect(`/fees/assignments/bulk?error=${encodeURIComponent("No active students are currently assigned to this class.")}`);
    }

    let assigned = 0;
    const skipped: string[] = [];

    for (const student of studentsInClass) {
      try {
        await createFeeAssignment({
          schoolId: currentSchool.id,
          studentId: student.id,
          feeTypeId,
          sessionId,
          termId,
          classId,
          amount,
          dueDate,
          description,
        });
        assigned += 1;
      } catch (assignmentError) {
        const name = `${student.firstName} ${student.lastName}`.trim();
        skipped.push(
          assignmentError instanceof Error
            ? `${name}: ${assignmentError.message}`
            : `${name}: Unable to assign fee.`,
        );
      }
    }

    const message = `Assigned to ${assigned} student${assigned === 1 ? "" : "s"}.${skipped.length ? ` Skipped ${skipped.length} student${skipped.length === 1 ? "" : "s"}.` : ""}`;
    const details = skipped.length ? ` ${skipped.slice(0, 3).join(" | ")}` : "";
    redirect(`/fees/assignments/bulk?success=${encodeURIComponent(message + details)}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/fees/assignments" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          ← Fee Assignments
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Assign Fee to Class</h1>
          <p className="mt-1 text-sm text-slate-600">Apply the same fee to every active student currently in a class.</p>
        </div>

        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
        {success && <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>}

        {feeTypes.length === 0 ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-900">No active fee types</h2>
            <p className="mt-2 text-sm text-amber-800">Create a fee type before assigning fees.</p>
            <Link href="/fees/types/new" className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Create Fee Type</Link>
          </div>
        ) : sessions.length === 0 ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-900">No academic session</h2>
            <p className="mt-2 text-sm text-amber-800">Create an academic session before assigning fees.</p>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <form action={bulkAssignAction} className="space-y-6">
              <div>
                <label htmlFor="sessionId" className="block text-sm font-semibold text-slate-900">Academic Session</label>
                <select id="sessionId" name="sessionId" required defaultValue="" className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  <option value="" disabled>Select academic session</option>
                  {sessionOptions.map(({ session }) => <option key={session.id} value={session.id}>{session.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="classId" className="block text-sm font-semibold text-slate-900">Class</label>
                <select id="classId" name="classId" required defaultValue="" className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  <option value="" disabled>Select class</option>
                  {sessionOptions.flatMap(({ session, classes }) => classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>{session.name} — {schoolClass.name}{schoolClass.section ? ` (${schoolClass.section})` : ""}</option>
                  )))}
                </select>
                <p className="mt-1 text-xs text-slate-500">Every active student currently assigned to this class will receive the fee.</p>
              </div>

              <div>
                <label htmlFor="feeTypeId" className="block text-sm font-semibold text-slate-900">Fee Type</label>
                <select id="feeTypeId" name="feeTypeId" required defaultValue="" className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  <option value="" disabled>Select fee type</option>
                  {feeTypes.map((feeType) => <option key={feeType.id} value={feeType.id}>{feeType.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="termId" className="block text-sm font-semibold text-slate-900">Term</label>
                <select id="termId" name="termId" defaultValue="" className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  <option value="">All Terms / Not specified</option>
                  {sessionOptions.flatMap(({ session, terms }) => terms.map((term) => <option key={term.id} value={term.id}>{session.name} — {term.name}</option>))}
                </select>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="amount" className="block text-sm font-semibold text-slate-900">Amount (₦)</label>
                  <input id="amount" name="amount" type="number" min="0.01" step="0.01" required className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="50000" />
                </div>
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-semibold text-slate-900">Due Date</label>
                  <input id="dueDate" name="dueDate" type="date" className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900">Description <span className="font-normal text-slate-500">(optional)</span></label>
                <textarea id="description" name="description" rows={3} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="e.g. First term tuition" />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                <Link href="/fees/assignments/new" className="text-sm font-medium text-slate-600 hover:text-slate-900">Assign one student instead</Link>
                <button type="submit" className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Assign to Class</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
