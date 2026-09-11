import { redirect } from "next/navigation";

import { requirePermission } from "../../../../src/lib/authorization";
import { getAcademicSessionById } from "../../../../src/lib/academic-sessions";
import { createNextAcademicSession } from "../../../../src/lib/academic-session-rollover";

export default async function AcademicSessionRolloverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sourceSessionId = Number(id);

  if (!Number.isInteger(sourceSessionId)) {
    redirect("/academic-sessions");
  }

  const actor = await requirePermission("academics.create");
  const sourceSession = await getAcademicSessionById(
    sourceSessionId,
    actor.schoolId,
  );

  if (!sourceSession) {
    redirect("/academic-sessions");
  }

  if (sourceSession.status !== "COMPLETED") {
    redirect(`/academic-sessions/${sourceSessionId}`);
  }

  async function createNextSession(formData: FormData) {
    "use server";

    const currentActor = await requirePermission("academics.create");

    const name = String(formData.get("name") ?? "");
    const startDate = String(formData.get("startDate") ?? "");
    const endDate = String(formData.get("endDate") ?? "");
    const reason = String(formData.get("reason") ?? "");

    const nextSession = await createNextAcademicSession({
      sourceSessionId,
      name,
      startDate,
      endDate,
      actorUserId: currentActor.userId,
      reason,
    });

    redirect(`/academic-sessions/${nextSession.id}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <a
          href={`/academic-sessions/${sourceSessionId}`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to Academic Session
        </a>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Academic Session Rollover
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Create the next session
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This creates the next academic session as DRAFT. Students,
              classes, fees, and other records are not copied automatically.
              You will review and configure the new session before activation.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Completed session
            </p>
            <p className="mt-1 font-semibold text-blue-950">
              {sourceSession.name}
            </p>
            <p className="mt-1 text-sm text-blue-800">
              The completed session remains unchanged and keeps its historical
              records.
            </p>
          </div>

          <form action={createNextSession} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-slate-800"
              >
                New session name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="2026/2027 Academic Session"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Start date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm font-semibold text-slate-800"
                >
                  End date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-semibold text-slate-800"
              >
                Reason
              </label>
              <textarea
                id="reason"
                name="reason"
                required
                rows={4}
                placeholder="Opening the next academic session for the new school year."
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <a
                href={`/academic-sessions/${sourceSessionId}`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </a>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Create Draft Session
              </button>
            </div>
          </form>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-950">What happens next?</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-amber-900">
            <li>Configure the new session terms.</li>
            <li>Create and configure its classes and subjects.</li>
            <li>Review each active student for promotion, repeat, or exit.</li>
            <li>Assign continuing students to their new classes.</li>
            <li>Review the new session before activating it.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
