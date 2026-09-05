import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getExam, updateExam } from "../../../../src/lib/exams";
import { db } from "../../../../src/prisma/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditExamPage({ params }: PageProps) {
  const user = await requirePermission("exams.edit");
  const school = await getSchool();

  const { id } = await params;
  const examId = Number(id);

  if (!Number.isInteger(examId) || examId <= 0) {
    redirect("/exams");
  }

  const exam = await getExam(examId, school.id);

  if (!exam) {
    redirect("/exams");
  }

  const handleUpdate = async (formData: FormData) => {
    "use server";

    const actor = await requirePermission("exams.edit");
    const currentSchool = await getSchool();

    const name = String(formData.get("name") ?? "").trim();
    const startDate = String(formData.get("startDate") ?? "");
    const endDate = String(formData.get("endDate") ?? "");
    const isActive = formData.get("isActive") === "on";

    try {
      await updateExam(actor.id, examId, currentSchool.id, {
        name,
        startDate,
        endDate,
        isActive,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update examination.";

      redirect(
        `/exams/${examId}/edit?error=${encodeURIComponent(message)}`,
      );
    }

    redirect("/exams");
  };

  const sessions = await db.orm.public.AcademicSession.all();
  const terms = await db.orm.public.Term.all();
  const classes = await db.orm.public.SchoolClass.all();

  const session = sessions.find((item) => item.id === exam.sessionId);
  const term = terms.find((item) => item.id === exam.termId);
  const schoolClass = classes.find((item) => item.id === exam.classId);

  const formatDateForInput = (value: unknown) => {
    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/exams"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back to Examinations
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            Edit Examination
          </h1>

          <p className="mt-2 text-slate-600">
            Update examination details and active status.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={handleUpdate} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Exam Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={exam.name}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Start Date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={formatDateForInput(exam.startDate)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  End Date
                </label>

                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  defaultValue={formatDateForInput(exam.endDate)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="grid gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Session
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {session?.name ?? "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Term
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {term?.name ?? "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Class
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {schoolClass
                    ? `${schoolClass.name}${
                        schoolClass.section ? ` ${schoolClass.section}` : ""
                      }`
                    : "Unknown"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={exam.isActive}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <span>
                  <span className="block font-semibold text-slate-900">
                    Active Examination
                  </span>

                  <span className="mt-1 block text-sm text-slate-600">
                    Active examinations can participate in the examination
                    workflow. Inactive examinations remain in history but are
                    disabled.
                  </span>
                </span>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">
                Current Status
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {exam.status}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Publication and closing are handled separately from editing.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Save Changes
              </button>

              <Link
                href="/exams"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}