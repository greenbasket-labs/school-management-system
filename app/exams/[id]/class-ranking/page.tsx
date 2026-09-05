import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "../../../../src/prisma/db";
import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getClassOverallRanking } from "../../../../src/lib/results";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClassRankingPage({
  params,
}: PageProps) {
  const { id } = await params;

  const examId = Number(id);

  if (!Number.isInteger(examId) || examId <= 0) {
    notFound();
  }

  await requirePermission("results.view");

  const school = await getSchool();

  if (!school) {
    notFound();
  }

  const rankingData = await getClassOverallRanking(
    school.id,
    examId,
  );

  const { exam, schoolClass, subjects, ranking } = rankingData;

  const classLabel = schoolClass.section
    ? `${schoolClass.name} ${schoolClass.section}`
    : schoolClass.name;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {school.name}
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Class Overall Ranking
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {exam.name} • {classLabel}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/exams/${exam.id}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Back to Exam
            </Link>

            <Link
              href={`/exams/${exam.id}/subjects/${subjects[0]?.id}/ranking`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Subject Ranking
            </Link>
          </div>
        </div>

        {/* Automatic ranking information */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            Automatic Class Ranking
          </p>

          <p className="mt-1 text-sm text-blue-800">
            Positions are calculated automatically from published subject
            results. No manual position entry is required.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Published Subjects
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {subjects.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Ranked Students
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {ranking.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Ranking Basis
            </p>

            <p className="mt-2 text-lg font-bold text-slate-900">
              Overall Average
            </p>
          </div>
        </div>

        {/* Ranking table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {classLabel} Overall Results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Students are ordered automatically by overall average.
            </p>
          </div>

          {ranking.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium text-slate-700">
                No published results available for this class yet.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Publish subject results to generate the class ranking.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3">
                      Position
                    </th>

                    <th className="px-6 py-3">
                      Student
                    </th>

                    <th className="px-6 py-3">
                      Permanent ID
                    </th>

                    <th className="px-6 py-3 text-center">
                      Subjects
                    </th>

                    <th className="px-6 py-3 text-right">
                      Total Mark
                    </th>

                    <th className="px-6 py-3 text-right">
                      Average
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {ranking.map((item) => (
                    <tr
                      key={item.studentId}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-900">
                          {item.position}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {item.studentName}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {item.permanentId}
                      </td>

                      <td className="px-6 py-4 text-center text-slate-700">
                        {item.subjectsTaken}
                      </td>

                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {item.totalMark.toFixed(2)}
                        {" / "}
                        {item.maximumMark.toFixed(2)}
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {item.average.toFixed(2)}%
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