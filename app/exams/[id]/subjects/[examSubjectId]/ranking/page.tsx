import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "../../../../../../src/prisma/db";
import { requirePermission } from "../../../../../../src/lib/authorization";
import { getSchool } from "../../../../../../src/lib/school";
import {
  calculateSubjectRanking,
  getSubjectRanking,
} from "../../../../../../src/lib/results";

type PageProps = {
  params: Promise<{
    id: string;
    examSubjectId: string;
  }>;
};

function formatMark(value: unknown) {
  return Number(value).toFixed(2);
}

export default async function SubjectRankingPage({
  params,
}: PageProps) {
  const { id, examSubjectId } = await params;

  const examId = Number(id);
  const examSubjectIdNumber = Number(examSubjectId);

  if (
    !Number.isInteger(examId) ||
    !Number.isInteger(examSubjectIdNumber)
  ) {
    notFound();
  }

  const user = await requirePermission("results.view");

  const school = await getSchool();

  const examSubjects =
    await db.orm.public.ExamSubject.all();

  const examSubject = examSubjects.find(
    (item) =>
      item.id === examSubjectIdNumber &&
      item.examId === examId,
  );

  if (!examSubject) {
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

  const subjects = await db.orm.public.Subject.all();

  const subject = subjects.find(
    (item) => item.id === examSubject.subjectId,
  );

  if (!subject) {
    notFound();
  }

  const classes = await db.orm.public.SchoolClass.all();

  const schoolClass = classes.find(
    (item) => item.id === exam.classId,
  );

  if (!schoolClass) {
    notFound();
  }

  /*
   * Recalculate ranking so older published results
   * that were published before ranking existed also
   * receive their correct position.
   */
  await calculateSubjectRanking(
    user.id,
    school.id,
    examSubject.id,
  );

  const ranking = await getSubjectRanking(
    school.id,
    examSubject.id,
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm text-slate-500">
              {school.name}
            </div>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Subject Ranking
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {exam.name} • {subject.name} • {schoolClass.name}
            </p>
          </div>

          <Link
            href={`/exams/${exam.id}`}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to Exam
          </Link>
        </div>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Exam
            </div>

            <div className="mt-1 font-semibold text-slate-900">
              {exam.name}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Subject
            </div>

            <div className="mt-1 font-semibold text-slate-900">
              {subject.name}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Published Results
            </div>

            <div className="mt-1 text-2xl font-bold text-slate-900">
              {ranking.length}
            </div>
          </div>
        </section>

        {/* Ranking table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              Ranking
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Published results ranked by total mark.
            </p>
          </div>

          {ranking.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-lg font-semibold text-slate-900">
                No published results yet
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Students will appear here after their results
                are published.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Position
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Permanent ID
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {ranking.map((item) => (
                    <tr
                      key={item.result.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800">
                          {item.result.position}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {item.student
                            ? `${item.student.firstName} ${item.student.lastName}`
                            : "Unknown Student"}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.student?.permanentId ?? "—"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-slate-900">
                          {formatMark(item.result.totalMark)}
                        </span>

                        <span className="ml-1 text-sm text-slate-500">
                          / {examSubject.maxMark}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Published
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}