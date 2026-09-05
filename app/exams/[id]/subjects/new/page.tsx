import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../../src/lib/authorization";
import { getSchool } from "../../../../../src/lib/school";
import { getExam } from "../../../../../src/lib/exams";
import {
  addExamSubject,
  getExamSubjects,
} from "../../../../../src/lib/exam-subjects";
import { db } from "../../../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AddExamSubjectPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requirePermission("exams.edit");
  const school = await getSchool();

  const routeParams = await params;
  const query = await searchParams;

  const examId = Number(routeParams.id);

  if (!Number.isInteger(examId) || examId <= 0) {
    notFound();
  }

  const exam = await getExam(examId, school.id);

  if (!exam) {
    notFound();
  }

  const [subjects, examSubjects] = await Promise.all([
    db.orm.public.Subject.all(),
    getExamSubjects(exam.id),
  ]);

  const assignedSubjectIds = new Set(
    examSubjects.map((item) => item.subjectId),
  );

  const availableSubjects = subjects
    .filter(
      (subject) =>
        subject.schoolId === school.id &&
        subject.status === "ACTIVE" &&
        !assignedSubjectIds.has(subject.id),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = async (formData: FormData) => {
    "use server";

    const actor = await requirePermission("exams.edit");
    const currentSchool = await getSchool();

    const currentExam = await getExam(exam.id, currentSchool.id);

    if (!currentExam) {
      redirect(`/exams/${exam.id}/subjects/new?error=Examination not found.`);
    }

    const subjectId = Number(formData.get("subjectId"));
    const maxMark = Number(formData.get("maxMark"));

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      redirect(
        `/exams/${exam.id}/subjects/new?error=Please select a subject.`,
      );
    }

    if (!Number.isInteger(maxMark) || maxMark <= 0) {
      redirect(
        `/exams/${exam.id}/subjects/new?error=Maximum mark must be a positive whole number.`,
      );
    }

    try {
      await addExamSubject(actor.id, {
        examId: exam.id,
        subjectId,
        maxMark,
      });

      redirect(`/exams/${exam.id}?success=Subject added to examination.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to add subject.";

      redirect(
        `/exams/${exam.id}/subjects/new?error=${encodeURIComponent(message)}`,
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/exams/${exam.id}`}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to Examination
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-200 pb-5">
            <p className="text-sm font-semibold text-slate-500">
              Exam #{exam.id}
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Add Subject
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {exam.name}
            </p>
          </div>

          {query.error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {query.error}
            </div>
          )}

          {availableSubjects.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-semibold text-slate-900">
                No subjects available.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                All active school subjects may already be assigned to this
                examination.
              </p>

              <Link
                href={`/exams/${exam.id}`}
                className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Back to Examination
              </Link>
            </div>
          ) : (
            <form action={handleSubmit} className="mt-6 space-y-6">
              <div>
                <label
                  htmlFor="subjectId"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Subject
                </label>

                <select
                  id="subjectId"
                  name="subjectId"
                  required
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="" disabled>
                    Select a subject
                  </option>

                  {availableSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code
                        ? `${subject.name} (${subject.code})`
                        : subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="maxMark"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Subject Maximum Mark
                </label>

                <input
                  id="maxMark"
                  name="maxMark"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue="100"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  This is the maximum total mark students can receive for
                  this subject.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Add Subject
                </button>

                <Link
                  href={`/exams/${exam.id}`}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}