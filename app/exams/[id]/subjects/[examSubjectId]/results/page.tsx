import { redirect } from "next/navigation";
import Link from "next/link";

import { requirePermission } from "../../../../../../src/lib/authorization";
import { getSchool } from "../../../../../../src/lib/school";
import {
  canEditResults,
  canEnterResults,
  canApproveResults,
  getStudentsForResultEntry,
  publishResult,
  saveStudentResult,
} from "../../../../../../src/lib/results";
import { db } from "../../../../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
    examSubjectId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatMark(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return number.toFixed(2);
}

export default async function ResultEntryPage({
  params,
  searchParams,
}: PageProps) {
  const { id, examSubjectId } = await params;
  const { error, success } = await searchParams;

  const examIdNumber = Number(id);
  const examSubjectIdNumber = Number(examSubjectId);

  if (
    !Number.isInteger(examIdNumber) ||
    !Number.isInteger(examSubjectIdNumber)
  ) {
    throw new Error("Invalid exam or exam subject.");
  }

  const user = await requirePermission("results.view");

  const school = await getSchool();

  if (!school) {
    throw new Error("School configuration not found.");
  }

  const exams = await db.orm.public.Exam.all();
  const examSubjects = await db.orm.public.ExamSubject.all();
  const subjects = await db.orm.public.Subject.all();
  const classes = await db.orm.public.SchoolClass.all();
  const components = await db.orm.public.AssessmentComponent.all();

  const examSubject = examSubjects.find(
    (item) => item.id === examSubjectIdNumber,
  );

  if (!examSubject) {
    throw new Error("Exam subject not found.");
  }

  const exam = exams.find(
    (item) => item.id === examSubject.examId,
  );

  if (!exam || exam.id !== examIdNumber) {
    throw new Error(
      "Exam subject does not belong to this exam.",
    );
  }

  if (exam.schoolId !== school.id) {
    throw new Error(
      "Exam does not belong to this school.",
    );
  }

  const subject = subjects.find(
    (item) => item.id === examSubject.subjectId,
  );

  if (!subject) {
    throw new Error("Subject not found.");
  }

  const schoolClass = classes.find(
    (item) => item.id === exam.classId,
  );

  if (!schoolClass) {
    throw new Error("Exam class not found.");
  }

  const examComponents = components
    .filter(
      (item) =>
        item.examSubjectId === examSubject.id &&
        item.isActive === true,
    )
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.name.localeCompare(b.name);
    });

  const students = await getStudentsForResultEntry(
    school.id,
    examSubject.id,
  );

  const canEnter = await canEnterResults(user.id);
  const canEdit = await canEditResults(user.id);
  const canApprove = await canApproveResults(user.id);

  /*
   * Stable values used inside Server Actions.
   * This also prevents TypeScript from losing the narrowing
   * of exam / examSubject inside the nested functions.
   */
  const currentExamId = exam.id;
  const currentExamSubjectId = examSubject.id;

  async function saveResult(formData: FormData) {
    "use server";

    const actor = await requirePermission("results.enter");

    const schoolRecord = await getSchool();

    if (!schoolRecord) {
      redirect(
        `/exams/${currentExamId}/subjects/${currentExamSubjectId}/results?error=School+configuration+not+found`,
      );
    }

    const studentId = Number(formData.get("studentId"));

    if (!Number.isInteger(studentId)) {
      redirect(
        `/exams/${currentExamId}/subjects/${currentExamSubjectId}/results?error=Invalid+student`,
      );
    }

    const currentComponents =
      await db.orm.public.AssessmentComponent.all();

    const activeComponents = currentComponents
      .filter(
        (component) =>
          component.examSubjectId ===
            currentExamSubjectId &&
          component.isActive === true,
      )
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        return a.name.localeCompare(b.name);
      });

    const marks = activeComponents.map((component) => {
      const value = formData.get(
        `component_${component.id}`,
      );

      return {
        assessmentComponentId: component.id,
        mark:
          typeof value === "string"
            ? value
            : value === null
              ? null
              : value.name,
      };
    });

    try {
      await saveStudentResult(
        actor.id,
        schoolRecord.id,
        {
          examSubjectId: currentExamSubjectId,
          studentId,
          marks,
        },
      );

      redirect(
        `/exams/${currentExamId}/subjects/${currentExamSubjectId}/results?success=Result+saved+successfully`,
      );
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save result.";

      redirect(
        `/exams/${currentExamId}/subjects/${currentExamSubjectId}/results?error=${encodeURIComponent(message)}`,
      );
    }
  }

  async function publishStudentResult(formData: FormData) {
    "use server";

    const actor =
      await requirePermission("results.publish");

    const schoolRecord = await getSchool();

    if (!schoolRecord) {
      redirect(
        `/exams/${currentExamId}/subjects/${currentExamSubjectId}/results?error=School+configuration+not+found`,
      );
    }

    const resultId = Number(
      formData.get("resultId"),
    );

    if (!Number.isInteger(resultId)) {
      redirect(
        `/exams/${currentExamId}/subjects/${currentExamSubjectId}/results?error=Invalid+result`,
      );
    }

    try {
      await publishResult(
        actor.id,
        schoolRecord.id,
        resultId,
      );

      redirect(
        `/exams/${currentExamId}/subjects/${currentExamSubjectId}/results?success=Result+published+successfully`,
      );
    } catch (publishError) {
      const message =
        publishError instanceof Error
          ? publishError.message
          : "Failed to publish result.";

      redirect(
        `/exams/${currentExamId}/subjects/${currentExamSubjectId}/results?error=${encodeURIComponent(message)}`,
      );
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <Link
          href={`/exams/${exam.id}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Exam
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Result Entry
        </h1>

        <p className="mt-2 text-gray-600">
          {exam.name} • {subject.name} •{" "}
          {schoolClass.name}
        </p>

        <div className="mt-3 inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
          {exam.status}
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Subject maximum:{" "}
          <span className="font-semibold">
            {examSubject.maxMark}
          </span>
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-xl font-semibold">
            Assessment Components
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Enter marks for each component. The total is
            calculated automatically when the result is
            saved.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm">
                <th className="px-5 py-4 font-semibold">
                  Student
                </th>

                {examComponents.map((component) => (
                  <th
                    key={component.id}
                    className="px-5 py-4 font-semibold"
                  >
                    {component.name}

                    <div className="text-xs font-normal text-gray-500">
                      Max: {component.maxMark}
                    </div>
                  </th>
                ))}

                <th className="px-5 py-4 font-semibold">
                  Current Total
                </th>

                <th className="px-5 py-4 font-semibold">
                  Status
                </th>

                <th className="px-5 py-4 font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {students.map((item) => {
                const result = item.result;

                const isDraft =
                  result?.status === "DRAFT";

                const isFinal =
                  result?.status === "FINAL";

                const isPublished =
                  result?.status === "PUBLISHED";

                const locked =
                  isFinal || isPublished;

                return (
                  <tr
                    key={item.student.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="font-semibold">
                        {item.student.firstName}{" "}
                        {item.student.middleName
                          ? `${item.student.middleName} `
                          : ""}
                        {item.student.lastName}
                      </div>

                      <div className="text-sm text-gray-500">
                        {item.student.permanentId}
                      </div>
                    </td>

                    {examComponents.map(
                      (component) => {
                        const existingMark =
                          item.marks.find(
                            (mark) =>
                              mark.assessmentComponentId ===
                              component.id,
                          );

                        return (
                          <td
                            key={component.id}
                            className="px-5 py-4 align-top"
                          >
                            <input
                              form={`result-form-${item.student.id}`}
                              type="number"
                              name={`component_${component.id}`}
                              min="0"
                              max={component.maxMark}
                              step="0.01"
                              defaultValue={
                                existingMark?.mark !==
                                null &&
                                existingMark?.mark !==
                                  undefined
                                  ? formatMark(
                                      existingMark.mark,
                                    )
                                  : ""
                              }
                              disabled={
                                locked ||
                                !canEnter ||
                                !canEdit
                              }
                              className="w-28 rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                            />
                          </td>
                        );
                      },
                    )}

                    <td className="px-5 py-4 align-top">
                      <div className="font-semibold">
                        {result
                          ? `${formatMark(result.totalMark)} / ${examSubject.maxMark}`
                          : "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4 align-top">
                      {result?.status ? (
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            result.status ===
                            "PUBLISHED"
                              ? "bg-green-100 text-green-700"
                              : result.status ===
                                  "FINAL"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {result.status}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Not Entered
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        {!locked &&
                          canEnter &&
                          canEdit && (
                            <form
                              id={`result-form-${item.student.id}`}
                              action={saveResult}
                            >
                              <input
                                type="hidden"
                                name="studentId"
                                value={item.student.id}
                              />

                              <button
                                type="submit"
                                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                              >
                                Save Draft
                              </button>
                            </form>
                          )}

                        {isDraft &&
                          canApprove &&
                          result && (
                            <span className="text-sm text-gray-500">
                              Finalize from the previous
                              workflow step.
                            </span>
                          )}

                        {isFinal && result && (
                          <form
                            action={
                              publishStudentResult
                            }
                          >
                            <input
                              type="hidden"
                              name="resultId"
                              value={result.id}
                            />

                            <button
                              type="submit"
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                            >
                              Publish
                            </button>
                          </form>
                        )}

                        {isPublished && (
                          <span className="text-sm font-semibold text-green-700">
                            Published
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {students.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      examComponents.length + 4
                    }
                    className="px-5 py-10 text-center text-sm text-gray-500"
                  >
                    No students are available for
                    result entry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-gray-50 p-5">
        <h2 className="font-semibold">
          Result Workflow
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-gray-500">
              Step 1
            </div>

            <div className="mt-1 font-semibold">
              Enter Marks
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-gray-500">
              Step 2
            </div>

            <div className="mt-1 font-semibold">
              Save Draft
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-gray-500">
              Step 3
            </div>

            <div className="mt-1 font-semibold">
              Finalize
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-gray-500">
              Step 4
            </div>

            <div className="mt-1 font-semibold">
              Publish
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}