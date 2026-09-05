import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../../../../src/lib/authorization";
import { getSchool } from "../../../../../../../src/lib/school";
import {
  addAssessmentComponent,
  getAssessmentComponents,
} from "../../../../../../../src/lib/exam-subjects";
import { db } from "../../../../../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
    examSubjectId: string;
  }>;
};

export default async function NewAssessmentComponentPage({
  params,
}: PageProps) {
  const user = await requirePermission("exams.edit");
  const school = await getSchool();

  const { id, examSubjectId } = await params;

  const examId = Number(id);
  const examSubjectIdNumber = Number(examSubjectId);

  if (
    !Number.isInteger(examId) ||
    examId <= 0 ||
    !Number.isInteger(examSubjectIdNumber) ||
    examSubjectIdNumber <= 0
  ) {
    notFound();
  }

  const exams = await db.orm.public.Exam.all();

  const exam = exams.find(
    (item) =>
      item.id === examId &&
      item.schoolId === school.id,
  );

  if (!exam) {
    notFound();
  }

  const examSubjects = await db.orm.public.ExamSubject.all();
  const subjects = await db.orm.public.Subject.all();

  const examSubject = examSubjects.find(
    (item) =>
      item.id === examSubjectIdNumber &&
      item.examId === exam.id,
  );

  if (!examSubject) {
    notFound();
  }

  const subject = subjects.find(
    (item) =>
      item.id === examSubject.subjectId &&
      item.schoolId === school.id,
  );

  if (!subject) {
    notFound();
  }

  const components = await getAssessmentComponents(
    examSubjectIdNumber,
  );

  const handleCreate = async (formData: FormData) => {
    "use server";

    const actor = await requirePermission("exams.edit");
    const currentSchool = await getSchool();

    const currentExams = await db.orm.public.Exam.all();

    const currentExam = currentExams.find(
      (item) =>
        item.id === examId &&
        item.schoolId === currentSchool.id,
    );

    if (!currentExam) {
      redirect(
        `/exams/${examId}?error=${encodeURIComponent(
          "Examination not found.",
        )}`,
      );
    }

    const currentExamSubjects =
      await db.orm.public.ExamSubject.all();

    const currentExamSubject = currentExamSubjects.find(
      (item) =>
        item.id === examSubjectIdNumber &&
        item.examId === currentExam.id,
    );

    if (!currentExamSubject) {
      redirect(
        `/exams/${examId}?error=${encodeURIComponent(
          "Examination subject not found.",
        )}`,
      );
    }

    const name = String(
      formData.get("name") ?? "",
    ).trim();

    const maxMark = Number(
      formData.get("maxMark") ?? 0,
    );

    const sortOrder = Number(
      formData.get("sortOrder") ?? 0,
    );

    if (!name) {
      redirect(
        `/exams/${examId}/subjects/${examSubjectIdNumber}/components/new?error=${encodeURIComponent(
          "Component name is required.",
        )}`,
      );
    }

    if (
      !Number.isInteger(maxMark) ||
      maxMark <= 0
    ) {
      redirect(
        `/exams/${examId}/subjects/${examSubjectIdNumber}/components/new?error=${encodeURIComponent(
          "Maximum mark must be a positive whole number.",
        )}`,
      );
    }

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      redirect(
        `/exams/${examId}/subjects/${examSubjectIdNumber}/components/new?error=${encodeURIComponent(
          "Sort order must be zero or a positive whole number.",
        )}`,
      );
    }

    try {
      await addAssessmentComponent(actor.id, {
        examSubjectId: examSubjectIdNumber,
        name,
        maxMark,
        sortOrder,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to add assessment component.";

      redirect(
        `/exams/${examId}/subjects/${examSubjectIdNumber}/components/new?error=${encodeURIComponent(
          message,
        )}`,
      );
    }

    redirect(
      `/exams/${examId}?success=${encodeURIComponent(
        "Assessment component added successfully.",
      )}`,
    );
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
          <div className="mb-6">
            <p className="text-sm font-semibold text-emerald-700">
              {exam.name}
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Add Assessment Component
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Add a CA, Test, Examination or other assessment
              component for this subject.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">
              Subject
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900">
              {subject.name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Code: {subject.code ?? "—"}
            </p>

            <p className="mt-3 text-sm text-slate-600">
              Subject Maximum Mark:{" "}
              <span className="font-semibold text-slate-900">
                {examSubject.maxMark}
              </span>
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-900">
              Existing Components
            </h2>

            {components.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No assessment components have been added yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {components.map((component) => (
                  <div
                    key={component.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {component.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        Maximum Mark: {component.maxMark}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      #{component.sortOrder}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            action={handleCreate}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-slate-700"
              >
                Component Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. CA, Test, Examination"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                Examples: CA, Test, Examination, Assignment.
              </p>
            </div>

            <div>
              <label
                htmlFor="maxMark"
                className="block text-sm font-semibold text-slate-700"
              >
                Maximum Mark
              </label>

              <input
                id="maxMark"
                name="maxMark"
                type="number"
                min="1"
                step="1"
                defaultValue="30"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                Example: CA = 30 marks, Examination = 70 marks.
              </p>
            </div>

            <div>
              <label
                htmlFor="sortOrder"
                className="block text-sm font-semibold text-slate-700"
              >
                Sort Order
              </label>

              <input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min="0"
                step="1"
                defaultValue={components.length}
                required
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                Lower numbers appear first.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Add Component
              </button>

              <Link
                href={`/exams/${exam.id}`}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}