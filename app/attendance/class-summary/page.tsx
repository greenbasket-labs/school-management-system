import Link from "next/link";
import { requirePermission } from "../../../src/lib/authorization";
import {
  getAttendanceCallsPerDay,
  getClassAttendanceSummary,
  type AttendancePeriod,
} from "../../../src/lib/attendance";
import { db } from "../../../src/prisma/db";

type SearchParams = {
  classId?: string;
  date?: string;
  period?: string;
};

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AttendanceClassSummaryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requirePermission("attendance.view");

  const params = await searchParams;

  const classes =
    await db.orm.public.SchoolClass.all();

  const schoolClasses = classes
    .filter(
      (schoolClass) =>
        schoolClass.schoolId === user.schoolId &&
        schoolClass.status === "ACTIVE",
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name),
    );

  const selectedClassId =
    params.classId
      ? Number(params.classId)
      : schoolClasses[0]?.id;

  const selectedClass =
    schoolClasses.find(
      (schoolClass) =>
        schoolClass.id === selectedClassId,
    );

  const today = new Date();

  const defaultDate =
    `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;

  const selectedDate =
    params.date ?? defaultDate;

  const callsPerDay =
    await getAttendanceCallsPerDay(
      user.schoolId,
    );

  const selectedPeriod: AttendancePeriod =
    params.period === "SECOND_PERIOD"
      ? "SECOND_PERIOD"
      : "FIRST_PERIOD";

  const summary = selectedClass
    ? await getClassAttendanceSummary(
        user.schoolId,
        selectedClass.id,
        new Date(`${selectedDate}T00:00:00`),
        selectedPeriod,
      )
    : {
        totalStudents: 0,
        present: 0,
        absent: 0,
        taken: false,
      };

  const attendanceRate =
    summary.totalStudents > 0
      ? (summary.present /
          summary.totalStudents) *
        100
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Attendance
            </p>

            <h1 className="text-3xl font-bold text-slate-900">
              Class Attendance Summary
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Review attendance performance for a class,
              date, and attendance period.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/attendance/summary"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Student Summary
            </Link>

            <Link
              href="/attendance"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Attendance
            </Link>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <form
            method="GET"
            className="grid gap-4 md:grid-cols-4"
          >
            <div>
              <label
                htmlFor="classId"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Class
              </label>

              <select
                id="classId"
                name="classId"
                defaultValue={
                  selectedClass?.id ?? ""
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {schoolClasses.map(
                  (schoolClass) => (
                    <option
                      key={schoolClass.id}
                      value={schoolClass.id}
                    >
                      {schoolClass.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="date"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Date
              </label>

              <input
                id="date"
                name="date"
                type="date"
                defaultValue={selectedDate}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="period"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Attendance Period
              </label>

              <select
                id="period"
                name="period"
                defaultValue={selectedPeriod}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="FIRST_PERIOD">
                  First Period
                </option>

                {callsPerDay === 2 && (
                  <option value="SECOND_PERIOD">
                    Second Period
                  </option>
                )}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                View Summary
              </button>
            </div>
          </form>
        </section>

        {selectedClass ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Class
                  </p>

                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedClass.name}
                  </h2>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium text-slate-500">
                    Attendance Period
                  </p>

                  <p className="font-semibold text-slate-900">
                    {selectedPeriod ===
                    "FIRST_PERIOD"
                      ? "First Period"
                      : "Second Period"}
                  </p>

                  <p className="text-sm text-slate-500">
                    {formatDate(selectedDate)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Total Students
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {summary.totalStudents}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Present
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {summary.present}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Absent
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {summary.absent}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Attendance Rate
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {attendanceRate.toFixed(2)}%
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Attendance Status
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    {selectedClass.name} •{" "}
                    {selectedPeriod ===
                    "FIRST_PERIOD"
                      ? "First Period"
                      : "Second Period"}
                  </p>
                </div>

                {summary.taken ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                    Attendance Submitted
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-500">
                    Not Taken Yet
                  </span>
                )}
              </div>

              {!summary.taken && (
                <p className="mt-4 text-sm text-slate-600">
                  Attendance has not been submitted for this
                  class, date, and period yet.
                </p>
              )}
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              No active classes found
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Create an active class before viewing class
              attendance summaries.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}