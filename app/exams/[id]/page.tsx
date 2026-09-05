import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { getExam } from "../../../src/lib/exams";
import {
  getExamSubjects,
  getAssessmentComponents,
  removeExamSubject,
  removeAssessmentComponent,
  updateExamSubject,
  updateAssessmentComponent,
} from "../../../src/lib/exam-subjects";
import { db } from "../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ExamDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requirePermission("exams.view");
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

  const [sessions, terms, classes, examSubjects] = await Promise.all([
    db.orm.public.AcademicSession.all(),
    db.orm.public.Term.all(),
    db.orm.public.SchoolClass.all(),
    getExamSubjects(exam.id),
  ]);

  const session = sessions.find((item) => item.id === exam.sessionId);
  const term = terms.find((item) => item.id === exam.termId);
  const schoolClass = classes.find((item) => item.id === exam.classId);

  const canEdit = await canUser(user.id, "exams.edit");
  const canDelete = await canUser(user.id, "exams.delete");

  /*
   * Load all assessment components once.
   *
   * This lets the page:
   * - show the correct total component count
   * - avoid one database request per subject
   * - calculate each subject's configured component total
   */
  const allComponents = await db.orm.public.AssessmentComponent.all();

  const componentsByExamSubject = new Map<
    number,
    typeof allComponents
  >();

  for (const component of allComponents) {
    const existing =
      componentsByExamSubject.get(component.examSubjectId) ?? [];

    existing.push(component);
    componentsByExamSubject.set(component.examSubjectId, existing);
  }

  for (const components of componentsByExamSubject.values()) {
    components.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.name.localeCompare(b.name);
    });
  }

  const assessmentComponentCount = examSubjects.reduce(
    (total, examSubject) =>
      total +
      (componentsByExamSubject.get(examSubject.id)?.length ?? 0),
    0,
  );

  const handleRemoveSubject = async (formData: FormData) => {
    "use server";

    const actor = await requirePermission("exams.delete");
    const currentSchool = await getSchool();

    const examSubjectId = Number(formData.get("examSubjectId"));

    if (!Number.isInteger(examSubjectId) || examSubjectId <= 0) {
      redirect(`/exams/${exam.id}?error=Invalid exam subject.`);
    }

    try {
      const subjectItems = await db.orm.public.ExamSubject.all();
      const item = subjectItems.find((row) => row.id === examSubjectId);

      if (!item || item.examId !== exam.id) {
        throw new Error("Exam subject does not belong to this exam.");
      }

      const currentExam = await getExam(exam.id, currentSchool.id);

      if (!currentExam) {
        throw new Error("Examination not found.");
      }

      await removeExamSubject(actor.id, examSubjectId);

      redirect(`/exams/${exam.id}?success=Subject removed.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to remove subject.";

      redirect(`/exams/${exam.id}?error=${encodeURIComponent(message)}`);
    }
  };

  const handleUpdateSubject = async (formData: FormData) => {
    "use server";

    const actor = await requirePermission("exams.edit");

    const examSubjectId = Number(formData.get("examSubjectId"));
    const maxMark = Number(formData.get("maxMark"));
    const isActive = formData.get("isActive") === "true";

    if (!Number.isInteger(examSubjectId) || examSubjectId <= 0) {
      redirect(`/exams/${exam.id}?error=Invalid exam subject.`);
    }

    if (!Number.isInteger(maxMark) || maxMark <= 0) {
      redirect(
        `/exams/${exam.id}?error=Maximum mark must be a positive whole number.`,
      );
    }

    try {
      await updateExamSubject(actor.id, examSubjectId, {
        maxMark,
        isActive,
      });

      redirect(`/exams/${exam.id}?success=Subject updated.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update subject.";

      redirect(`/exams/${exam.id}?error=${encodeURIComponent(message)}`);
    }
  };

  const handleRemoveComponent = async (formData: FormData) => {
    "use server";

    const actor = await requirePermission("exams.delete");

    const componentId = Number(formData.get("componentId"));

    if (!Number.isInteger(componentId) || componentId <= 0) {
      redirect(`/exams/${exam.id}?error=Invalid assessment component.`);
    }

    try {
      const components = await db.orm.public.AssessmentComponent.all();
      const component = components.find((item) => item.id === componentId);

      if (!component) {
        throw new Error("Assessment component not found.");
      }

      const examSubjectItems = await db.orm.public.ExamSubject.all();
      const examSubject = examSubjectItems.find(
        (item) => item.id === component.examSubjectId,
      );

      if (!examSubject || examSubject.examId !== exam.id) {
        throw new Error(
          "Assessment component does not belong to this exam.",
        );
      }

      await removeAssessmentComponent(actor.id, componentId);

      redirect(
        `/exams/${exam.id}?success=Assessment component removed.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to remove assessment component.";

      redirect(`/exams/${exam.id}?error=${encodeURIComponent(message)}`);
    }
  };

  const handleUpdateComponent = async (formData: FormData) => {
    "use server";

    const actor = await requirePermission("exams.edit");

    const componentId = Number(formData.get("componentId"));
    const name = String(formData.get("name") ?? "");
    const maxMark = Number(formData.get("maxMark"));
    const sortOrder = Number(formData.get("sortOrder") ?? 0);
    const isActive = formData.get("isActive") === "true";

    if (!Number.isInteger(componentId) || componentId <= 0) {
      redirect(`/exams/${exam.id}?error=Invalid assessment component.`);
    }

    if (!Number.isInteger(maxMark) || maxMark <= 0) {
      redirect(
        `/exams/${exam.id}?error=Component maximum mark must be positive.`,
      );
    }

    try {
      await updateAssessmentComponent(actor.id, componentId, {
        name,
        maxMark,
        sortOrder,
        isActive,
      });

      redirect(
        `/exams/${exam.id}?success=Assessment component updated.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update assessment component.";

      redirect(`/exams/${exam.id}?error=${encodeURIComponent(message)}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/exams"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back to Examinations
          </Link>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-500">
                Exam #{exam.id}
              </div>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                {exam.name}
              </h1>

              <p className="mt-2 text-slate-600">
                {session?.name ?? "Unknown session"} •{" "}
                {term?.name ?? "Unknown term"} •{" "}
                {schoolClass
                  ? `${schoolClass.name}${
                      schoolClass.section
                        ? ` ${schoolClass.section}`
                        : ""
                    }`
                  : "Unknown class"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
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
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  exam.isActive
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {exam.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {query.error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {query.error}
          </div>
        )}

        {query.success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {query.success}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Subjects
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {examSubjects.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active Subjects
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {examSubjects.filter((item) => item.isActive).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Assessment Components
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {assessmentComponentCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Examination Dates
            </p>

            <p className="mt-2 text-sm font-bold text-slate-900">
              {new Date(
                String(exam.startDate),
              ).toLocaleDateString("en-GB")}
              {" → "}
              {new Date(
                String(exam.endDate),
              ).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Exam Subjects
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Configure the subjects and assessment components for this
                examination.
              </p>
            </div>

            {canEdit && (
              <Link
                href={`/exams/${exam.id}/subjects/new`}
                className="inline-flex w-fit rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                + Add Subject
              </Link>
            )}
          </div>

          {examSubjects.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-semibold text-slate-900">
                No subjects assigned yet.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Add the subjects students will write for this examination.
              </p>

              {canEdit && (
                <Link
                  href={`/exams/${exam.id}/subjects/new`}
                  className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  + Add First Subject
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {examSubjects.map((examSubject) => {
                const components =
                  componentsByExamSubject.get(examSubject.id) ?? [];

                const activeComponents = components.filter(
                  (component) => component.isActive,
                );

                const componentTotal = activeComponents.reduce(
                  (total, component) => total + component.maxMark,
                  0,
                );

                const remainingMark =
                  examSubject.maxMark - componentTotal;

                const componentTotalStatus =
                  componentTotal === examSubject.maxMark
                    ? "Complete"
                    : componentTotal < examSubject.maxMark
                      ? `${remainingMark} mark${
                          remainingMark === 1 ? "" : "s"
                        } remaining`
                      : `${componentTotal - examSubject.maxMark} mark${
                          componentTotal - examSubject.maxMark === 1
                            ? ""
                            : "s"
                        } over`;

                return (
                  <div key={examSubject.id} className="p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            {examSubject.subject?.name ??
                              "Unknown Subject"}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              examSubject.isActive
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {examSubject.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          Subject maximum:{" "}
                          <span className="font-semibold text-slate-700">
                            {examSubject.maxMark}
                          </span>
                        </p>
                      </div>

                      {canEdit && (
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/exams/${exam.id}/subjects/${examSubject.id}/components/new`}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            + Component
                          </Link>

                          {canDelete && (
                            <form action={handleRemoveSubject}>
                              <input
                                type="hidden"
                                name="examSubjectId"
                                value={examSubject.id}
                              />

                              <button
                                type="submit"
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-200">
                      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <h4 className="text-sm font-bold text-slate-800">
                          Assessment Components
                        </h4>

                        <div className="text-xs font-semibold text-slate-600">
                          Component total: {componentTotal}/
                          {examSubject.maxMark} •{" "}
                          {componentTotalStatus}
                        </div>
                      </div>

                      {components.length === 0 ? (
                        <div className="px-4 py-5 text-sm text-slate-500">
                          No assessment components configured.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {components.map((component) => (
                            <div
                              key={component.id}
                              className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <div className="font-semibold text-slate-800">
                                  {component.name}
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  Maximum mark: {component.maxMark} • Order:{" "}
                                  {component.sortOrder} •{" "}
                                  {component.isActive
                                    ? "Active"
                                    : "Inactive"}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {canEdit && (
                                  <Link
                                    href={`/exams/${exam.id}/subjects/${examSubject.id}/components/${component.id}/edit`}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    Edit
                                  </Link>
                                )}

                                {canDelete && (
                                  <form action={handleRemoveComponent}>
                                    <input
                                      type="hidden"
                                      name="componentId"
                                      value={component.id}
                                    />

                                    <button
                                      type="submit"
                                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                    >
                                      Remove
                                    </button>
                                  </form>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <form
                        action={handleUpdateSubject}
                        className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto_auto]"
                      >
                        <input
                          type="hidden"
                          name="examSubjectId"
                          value={examSubject.id}
                        />

                        <div>
                          <label className="block text-xs font-semibold text-slate-600">
                            Maximum Mark
                          </label>

                          <input
                            type="number"
                            name="maxMark"
                            min="1"
                            defaultValue={examSubject.maxMark}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                            required
                          />
                        </div>

                        <input
                          type="hidden"
                          name="isActive"
                          value={
                            examSubject.isActive ? "true" : "false"
                          }
                        />

                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Save Subject
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-6">
          <Link
            href={`/exams/${exam.id}/edit`}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Edit examination details →
          </Link>
        </div>
      </div>
    </main>
  );
}

async function canUser(
  userId: number,
  permissionCode: string,
): Promise<boolean> {
  const { hasPermission } = await import(
    "../../../src/lib/permissions"
  );

  return hasPermission(userId, permissionCode);
}