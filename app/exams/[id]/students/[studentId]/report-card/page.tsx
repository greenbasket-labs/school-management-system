import { Temporal } from "@js-temporal/polyfill";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../../../../src/lib/authorization";
import { getStudentReportCard } from "../../../../../../src/lib/results";
import PrintButton from "./print-button";

type ReportCardPageProps = {
  params: Promise<{
    id: string;
    studentId: string;
  }>;
};

function formatDate(value: unknown) {
  let date: Date;

  if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  } else if (
    value &&
    typeof value === "object" &&
    "epochMilliseconds" in value
  ) {
    date = new Date(
      Number(
        (value as { epochMilliseconds: number }).epochMilliseconds,
      ),
    );
  } else {
    return "—";
  }

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatNumber(
  value: number | null | undefined,
  digits = 2,
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toFixed(digits);
}

function ordinal(value: number | null | undefined) {
  if (!value) {
    return "—";
  }

  const mod100 = value % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function gradeLabel(grade: string | null | undefined) {
  return grade?.trim() || "—";
}

export default async function ReportCardPage({
  params,
}: ReportCardPageProps) {
  const user = await requirePermission("report_cards.view");

  const route = await params;

  const examId = Number(route.id);
  const studentId = Number(route.studentId);

  if (
    !Number.isInteger(examId) ||
    examId <= 0 ||
    !Number.isInteger(studentId) ||
    studentId <= 0
  ) {
    redirect("/exams");
  }

  const report = await getStudentReportCard(
    user.schoolId,
    examId,
    studentId,
  );

  const publishedComplete =
    report.summary.publishedSubjects ===
    report.summary.totalSubjects;

  const studentName = [
    report.student.firstName,
    report.student.middleName,
    report.student.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/exams/${examId}`}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back to Examination
          </Link>

          <PrintButton />
        </div>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          {/* SCHOOL HEADER */}
          <header className="border-b-4 border-slate-900 px-6 py-7 sm:px-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                {report.school.logoUrl ? (
                  <img
                    src={report.school.logoUrl}
                    alt={`${report.school.name} logo`}
                    className="h-20 w-20 rounded-2xl border border-slate-200 object-contain p-2"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl font-black text-slate-400">
                    {report.school.name
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {report.school.name}
                  </h1>

                  {report.school.motto && (
                    <p className="mt-1 text-sm font-medium italic text-slate-500">
                      {report.school.motto}
                    </p>
                  )}

                  <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                    {report.school.address && (
                      <div>{report.school.address}</div>
                    )}

                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {report.school.phone && (
                        <span>{report.school.phone}</span>
                      )}

                      {report.school.email && (
                        <span>{report.school.email}</span>
                      )}

                      {report.school.website && (
                        <span>{report.school.website}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Academic Report
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {report.exam.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(report.exam.startDate)} —{" "}
                  {formatDate(report.exam.endDate)}
                </p>
              </div>
            </div>
          </header>

          {/* STUDENT SUMMARY */}
          <section className="grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
            <div className="bg-white px-6 py-4 sm:px-8">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Student
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {studentName}
              </p>
            </div>

            <div className="bg-white px-6 py-4 sm:px-8">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Permanent ID
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {report.student.permanentId}
              </p>
            </div>

            <div className="bg-white px-6 py-4 sm:px-8">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Class
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {report.classLabel}
              </p>
            </div>

            <div className="bg-white px-6 py-4 sm:px-8">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Status
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {report.exam.status}
              </p>
            </div>
          </section>

          {/* INCOMPLETE WARNING */}
          {!publishedComplete && (
            <div className="mx-6 mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-10">
              This report is currently incomplete. Only published
              subject results are displayed.
            </div>
          )}

          {/* SUBJECT RESULTS */}
          <section className="px-6 py-7 sm:px-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Academic Performance
                </p>

                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Subject Results
                </h3>
              </div>

              <p className="text-xs text-slate-500">
                Published:{" "}
                {report.summary.publishedSubjects}/
                {report.summary.totalSubjects}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950 text-left text-xs uppercase tracking-wider text-white">
                    <th className="px-4 py-3">
                      Subject
                    </th>

                    <th className="px-4 py-3">
                      Assessment
                    </th>

                    <th className="px-4 py-3 text-right">
                      Total
                    </th>

                    <th className="px-4 py-3 text-right">
                      Max
                    </th>

                    <th className="px-4 py-3 text-center">
                      Grade
                    </th>

                    <th className="px-4 py-3 text-center">
                      Position
                    </th>

                    <th className="px-4 py-3 text-center">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.subjects.map((subject) => (
                    <tr
                      key={subject.examSubjectId}
                      className="border-t border-slate-200 align-top"
                    >
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">
                          {subject.subjectName}
                        </div>

                        {subject.subjectCode && (
                          <div className="mt-0.5 text-xs text-slate-400">
                            {subject.subjectCode}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {subject.components.length ? (
                          <div className="space-y-1.5">
                            {subject.components.map(
                              (component) => (
                                <div
                                  key={component.componentId}
                                  className="flex justify-between gap-4 text-xs text-slate-600"
                                >
                                  <span>
                                    {component.componentName}
                                  </span>

                                  <span className="font-semibold">
                                    {component.mark === null
                                      ? "—"
                                      : `${formatNumber(
                                          component.mark,
                                        )} / ${component.maxMark}`}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No components
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-slate-900">
                        {subject.totalMark === null
                          ? "—"
                          : formatNumber(subject.totalMark)}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-600">
                        {subject.maxMark}
                      </td>

                      <td className="px-4 py-4 text-center font-black text-slate-900">
                        {gradeLabel(subject.grade)}
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-slate-900">
                        {ordinal(subject.position)}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          {subject.status ?? "Not Published"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* PERFORMANCE SUMMARY */}
          <section className="grid gap-4 border-y border-slate-200 bg-slate-50 px-6 py-6 sm:grid-cols-4 sm:px-10">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Overall Average
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatNumber(report.summary.average)}%
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Class Position
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {ordinal(report.classRanking.position)}
              </p>

              <p className="text-xs text-slate-500">
                of {report.classRanking.totalStudents} ranked
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                School Position
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {ordinal(report.schoolRanking.position)}
              </p>

              <p className="text-xs text-slate-500">
                of {report.schoolRanking.totalStudents} ranked
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Mark
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatNumber(report.summary.totalMark)}
              </p>

              <p className="text-xs text-slate-500">
                out of {formatNumber(report.summary.maximumMark)}
              </p>
            </div>
          </section>

          {/* ATTENDANCE + ACADEMIC SUMMARY */}
          <section className="grid gap-5 px-6 py-7 sm:grid-cols-2 sm:px-10">
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Attendance
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-500">
                    Present
                  </p>

                  <p className="text-xl font-black text-slate-900">
                    {report.attendance.present}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Absent
                  </p>

                  <p className="text-xl font-black text-slate-900">
                    {report.attendance.absent}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Rate
                  </p>

                  <p className="text-xl font-black text-slate-900">
                    {formatNumber(report.attendance.rate)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Academic Summary
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Results and positions are calculated automatically
                from published academic records. Students with
                incomplete school-wide results are not included in
                the official school ranking.
              </p>
            </div>
          </section>

          {/* SIGNATURES */}
          <footer className="border-t border-slate-200 px-6 py-7 sm:px-10">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <div className="h-10 border-b border-slate-300" />

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Class Teacher
                </p>
              </div>

              <div>
                <div className="h-10 border-b border-slate-300" />

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Principal / Head
                </p>
              </div>

              <div>
                <div className="h-10 border-b border-slate-300" />

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Parent / Guardian
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Generated from published school records.
              </span>

              {report.school.principalName && (
                <span>
                  Head: {report.school.principalName}
                </span>
              )}
            </div>
          </footer>
        </article>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          button {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}