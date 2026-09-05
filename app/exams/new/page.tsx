import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { createExam } from "../../../src/lib/exams";
import { db } from "../../../src/prisma/db";

export default async function NewExamPage() {
  const user = await requirePermission("exams.create");
  const school = await getSchool();

  if (!school) {
    redirect("/dashboard");
  }

  const sessions = (await db.orm.public.AcademicSession.all()).filter(
    (session) => session.schoolId === school.id,
  );

  const terms = await db.orm.public.Term.all();

  const classes = (
    await db.orm.public.SchoolClass.all()
  ).filter(
    (schoolClass) =>
      schoolClass.schoolId === school.id &&
      schoolClass.status === "ACTIVE",
  );

  async function handleCreateExam(formData: FormData) {
    "use server";

    const sessionId = Number(formData.get("sessionId"));
    const termId = Number(formData.get("termId"));
    const classId = Number(formData.get("classId"));
    const name = String(formData.get("name") ?? "");
    const startDate = String(formData.get("startDate") ?? "");
    const endDate = String(formData.get("endDate") ?? "");

    const currentUser = await requirePermission("exams.create");
    const currentSchool = await getSchool();

    if (!currentSchool) {
      throw new Error("School not found.");
    }

    await createExam(currentUser.id, {
      schoolId: currentSchool.id,
      sessionId,
      termId,
      classId,
      name,
      startDate,
      endDate,
      status: "DRAFT",
      isActive: true,
    });

    redirect("/exams");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/exams"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to Examinations
        </Link>

        <div className="mt-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Create Examination
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Set up an examination for a class, academic session and term.
          </p>
        </div>

        <form
          action={handleCreateExam}
          className="space-y-6"
        >
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Examination Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Basic information about this examination.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Exam Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. First Term Examination"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label
                  htmlFor="sessionId"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Academic Session
                </label>

                <select
                  id="sessionId"
                  name="sessionId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="" disabled>
                    Select session
                  </option>

                  {sessions.map((session) => (
                    <option
                      key={session.id}
                      value={session.id}
                    >
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="termId"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Term
                </label>

                <select
                  id="termId"
                  name="termId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="" disabled>
                    Select term
                  </option>

                  {terms.map((term) => {
                    const session = sessions.find(
                      (item) => item.id === term.sessionId,
                    );

                    if (!session) {
                      return null;
                    }

                    return (
                      <option
                        key={term.id}
                        value={term.id}
                      >
                        {term.name} — {session.name}
                      </option>
                    );
                  })}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  The selected term must belong to the selected session.
                </p>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="classId"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Class
                </label>

                <select
                  id="classId"
                  name="classId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="" disabled>
                    Select class
                  </option>

                  {classes.map((schoolClass) => (
                    <option
                      key={schoolClass.id}
                      value={schoolClass.id}
                    >
                      {schoolClass.section
                        ? `${schoolClass.name} ${schoolClass.section}`
                        : schoolClass.name}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  Only active classes belonging to this school are shown.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Examination Period
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Define when the examination starts and ends.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Start Date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  End Date
                </label>

                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-xs font-bold text-yellow-700">
                !
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Initial Status
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  New examinations are created as{" "}
                  <span className="font-semibold">Draft</span> and{" "}
                  <span className="font-semibold">Active</span>.
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  You can publish the examination after confirming the setup.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/exams"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Create Examination
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}