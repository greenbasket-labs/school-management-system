import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../src/lib/authorization";
import { getSchool } from "../../src/lib/school";
import {
  closeExam,
  getExams,
  publishExam,
} from "../../src/lib/exams";
import { db } from "../../src/prisma/db";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function ExamsPage({ searchParams }: PageProps) {
  const user = await requirePermission("exams.view");
  const school = await getSchool();

  const params = await searchParams;

  const exams = await getExams(school.id);
  const sessions = await db.orm.public.AcademicSession.all();
  const terms = await db.orm.public.Term.all();
  const classes = await db.orm.public.SchoolClass.all();

  const canCreate = await canUser(user.id, "exams.create");
  const canEdit = await canUser(user.id, "exams.edit");
  const canPublish = await canUser(user.id, "exams.publish");
  const canClose = await canUser(user.id, "exams.close");

  const sessionMap = new Map(
    sessions.map((session) => [session.id, session.name]),
  );

  const termMap = new Map(
    terms.map((term) => [term.id, term.name]),
  );

  const classMap = new Map(
    classes.map((schoolClass) => [
      schoolClass.id,
      `${schoolClass.name}${
        schoolClass.section ? ` ${schoolClass.section}` : ""
      }`,
    ]),
  );

  const activeCount = exams.filter((exam) => exam.isActive).length;

  const publishedCount = exams.filter(
    (exam) => exam.status === "PUBLISHED",
  ).length;

  const handlePublish = async (formData: FormData) => {
    "use server";

    const actor = await requirePermission("exams.publish");
    const currentSchool = await getSchool();

    const examId = Number(formData.get("examId"));

    if (!Number.isInteger(examId) || examId <= 0) {
      redirect("/exams?error=Invalid examination.");
    }

    try {
      await publishExam(actor.id, examId, currentSchool.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to publish examination.";

      redirect(`/exams?error=${encodeURIComponent(message)}`);
    }

    redirect("/exams");
  };

  const handleClose = async (formData: FormData) => {
    "use server";

    const actor = await requirePermission("exams.close");
    const currentSchool = await getSchool();

    const examId = Number(formData.get("examId"));

    if (!Number.isInteger(examId) || examId <= 0) {
      redirect("/exams?error=Invalid examination.");
    }

    try {
      await closeExam(actor.id, examId, currentSchool.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to close examination.";

      redirect(`/exams?error=${encodeURIComponent(message)}`);
    }

    redirect("/exams");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              Examinations
            </h1>

            <p className="mt-2 text-slate-600">
              Manage examinations, dates, classes and publication status.
            </p>
          </div>

          {canCreate && (
            <Link
              href="/exams/new"
              className="inline-flex w-fit items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              + Create Exam
            </Link>
          )}
        </div>

        {params.error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {params.error}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Exams
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {exams.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active Exams
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Published
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {publishedCount}
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              Exam List
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              All examinations configured for this school.
            </p>
          </div>

          {exams.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold text-slate-900">
                No examinations yet.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Create the first examination to begin the examination
                workflow.
              </p>

              {canCreate && (
                <Link
                  href="/exams/new"
                  className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  + Create Exam
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Exam
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Session
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Term
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Class
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Dates
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Status
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {exams.map((exam) => {
                    const start = new Date(
                      String(exam.startDate),
                    ).toLocaleDateString("en-GB");

                    const end = new Date(
                      String(exam.endDate),
                    ).toLocaleDateString("en-GB");

                    return (
                      <tr
                        key={exam.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-5">
                          <Link
                            href={`/exams/${exam.id}`}
                            className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                          >
                            {exam.name}
                          </Link>

                          <div className="mt-1 text-xs text-slate-500">
                            Exam #{exam.id}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-slate-700">
                          {sessionMap.get(exam.sessionId) ?? "Unknown"}
                        </td>

                        <td className="px-6 py-5 text-slate-700">
                          {termMap.get(exam.termId) ?? "Unknown"}
                        </td>

                        <td className="px-6 py-5 text-slate-700">
                          {classMap.get(exam.classId) ?? "Unknown"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-5 text-slate-700">
                          {start} → {end}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                exam.status === "DRAFT"
                                  ? "bg-amber-100 text-amber-800"
                                  : exam.status === "PUBLISHED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {exam.status}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                exam.isActive
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {exam.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-wrap items-center gap-2">
                            {canEdit && (
                              <Link
                                href={`/exams/${exam.id}/edit`}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </Link>
                            )}

                            {canPublish &&
                              exam.status === "DRAFT" &&
                              exam.isActive && (
                                <form action={handlePublish}>
                                  <input
                                    type="hidden"
                                    name="examId"
                                    value={exam.id}
                                  />

                                  <button
                                    type="submit"
                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                                  >
                                    Publish
                                  </button>
                                </form>
                              )}

                            {canClose &&
                              exam.status === "PUBLISHED" && (
                                <form action={handleClose}>
                                  <input
                                    type="hidden"
                                    name="examId"
                                    value={exam.id}
                                  />

                                  <button
                                    type="submit"
                                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                  >
                                    Close
                                  </button>
                                </form>
                              )}

                            {exam.status === "CLOSED" && (
                              <span className="text-xs font-semibold text-slate-500">
                                Closed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

async function canUser(
  userId: number,
  permissionCode: string,
): Promise<boolean> {
  const { hasPermission } = await import("../../src/lib/permissions");

  return hasPermission(userId, permissionCode);
}