import { Temporal } from "@js-temporal/polyfill";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../../src/lib/authorization";
import {
  applyStudentLifecycleAction,
  type StudentLifecycleAction,
} from "../../../../../src/lib/student-lifecycle";
import { getSchool } from "../../../../../src/lib/school";
import { db } from "../../../../../src/prisma/db";

function toTemporalInstant(value: string) {
  try {
    return Temporal.Instant.from(`${value}T00:00:00Z`);
  } catch {
    throw new Error("Invalid effective date.");
  }
}

export default async function StudentLifecyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("students.edit");
  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    notFound();
  }

  const students = await db.orm.public.Student.all();
  const student = students.find(
    (item) => item.id === studentId && item.schoolId === user.schoolId,
  );

  if (!student) {
    notFound();
  }

  if (student.status !== "ACTIVE") {
    throw new Error("Only active students can undergo a lifecycle action.");
  }

  const school = await getSchool();
  const classes = (await db.orm.public.SchoolClass.all()).filter(
    (item) => item.schoolId === user.schoolId && item.status === "ACTIVE",
  );
  const sessions = (await db.orm.public.AcademicSession.all()).filter(
    (item) => item.schoolId === user.schoolId && item.status === "ACTIVE",
  );

  async function submitLifecycleAction(formData: FormData) {
    "use server";

    const actor = await requirePermission("students.edit");
    const action = String(formData.get("action") ?? "").trim() as StudentLifecycleAction;
    const reason = String(formData.get("reason") ?? "").trim();
    const effectiveDateValue = String(formData.get("effectiveDate") ?? "").trim();
    const targetClassValue = String(formData.get("targetClassId") ?? "").trim();
    const sessionValue = String(formData.get("sessionId") ?? "").trim();

    const allowedActions: StudentLifecycleAction[] = [
      "PROMOTE",
      "REPEAT",
      "TRANSFER",
      "WITHDRAW",
      "GRADUATE",
    ];

    if (!allowedActions.includes(action)) {
      throw new Error("Invalid lifecycle action.");
    }

    if (!reason) {
      throw new Error("A reason is required.");
    }

    const actorStudents = await db.orm.public.Student.all();
    const existingStudent = actorStudents.find(
      (item) => item.id === studentId && item.schoolId === actor.schoolId,
    );

    if (!existingStudent) {
      throw new Error("Student not found.");
    }

    let effectiveDate: Temporal.Instant | undefined;

    if (effectiveDateValue) {
      effectiveDate = toTemporalInstant(effectiveDateValue);
    }

    let targetClassId: number | undefined;
    let sessionId: number | undefined;

    if (action === "PROMOTE" || action === "REPEAT") {
      targetClassId = Number(targetClassValue);
      sessionId = Number(sessionValue);

      if (!Number.isInteger(targetClassId) || targetClassId <= 0) {
        throw new Error("A target class is required.");
      }

      if (!Number.isInteger(sessionId) || sessionId <= 0) {
        throw new Error("An academic session is required.");
      }
    }

    await applyStudentLifecycleAction({
      studentId,
      action,
      actorUserId: actor.id,
      targetClassId,
      sessionId,
      effectiveDate,
      reason,
    });

    redirect(`/students/${studentId}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">{school.name}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Student Lifecycle
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {student.permanentId} · {student.firstName} {student.middleName ?? ""} {student.lastName}
            </p>
          </div>

          <a
            href={`/students/${student.id}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Student
          </a>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Lifecycle actions change the student's academic or enrollment state and are recorded in the audit log. Personal information should continue to be edited from the normal student edit page.
          </div>

          <form action={submitLifecycleAction} className="space-y-6">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Action *</span>
              <select
                name="action"
                required
                defaultValue=""
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="" disabled>Select lifecycle action</option>
                <option value="PROMOTE">Promote</option>
                <option value="REPEAT">Repeat</option>
                <option value="TRANSFER">Transfer</option>
                <option value="WITHDRAW">Withdraw</option>
                <option value="GRADUATE">Graduate</option>
              </select>
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Target Class</span>
                <select
                  name="targetClassId"
                  defaultValue={student.currentClassId?.toString() ?? ""}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Select target class</option>
                  {classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}{schoolClass.section ? ` - ${schoolClass.section}` : ""}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-500">Required for Promote and Repeat.</span>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Academic Session</span>
                <select
                  name="sessionId"
                  defaultValue={sessions[0]?.id?.toString() ?? ""}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Select session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-500">Required for Promote and Repeat.</span>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Effective Date</span>
              <input
                name="effectiveDate"
                type="date"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Reason *</span>
              <textarea
                name="reason"
                required
                rows={4}
                placeholder="Explain why this lifecycle action is being applied."
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
              <a
                href={`/students/${student.id}`}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </a>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Apply Lifecycle Action
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
