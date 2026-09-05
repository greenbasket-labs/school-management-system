import Link from "next/link";
import { requirePermission } from "../../../src/lib/authorization";
import { getStudentAttendanceSummary } from "../../../src/lib/attendance";
import { db } from "../../../src/prisma/db";

type SearchParams = {
  studentId?: string;
  startDate?: string;
  endDate?: string;
};

export default async function AttendanceSummaryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requirePermission("attendance.view");

  const params = await searchParams;

  const students =
    await db.orm.public.Student.all();

  const schoolStudents = students
    .filter(
      (student) =>
        student.schoolId === user.schoolId &&
        student.status === "ACTIVE",
    )
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
      ),
    );

  const selectedStudentId =
    params.studentId
      ? Number(params.studentId)
      : schoolStudents[0]?.id;

  const selectedStudent =
    schoolStudents.find(
      (student) =>
        student.id === selectedStudentId,
    );

  const startDate =
    params.startDate
      ? new Date(`${params.startDate}T00:00:00`)
      : new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        );

  const endDate =
    params.endDate
      ? new Date(`${params.endDate}T23:59:59.999`)
      : new Date();

  const summary = selectedStudent
    ? await getStudentAttendanceSummary(
        user.schoolId,
        selectedStudent.id,
        startDate,
        endDate,
      )
    : {
        total: 0,
        present: 0,
        absent: 0,
        attendanceRate: 0,
      };

  const startValue =
    params.startDate ??
    `${startDate.getFullYear()}-${String(
      startDate.getMonth() + 1,
    ).padStart(2, "0")}-01`;

  const endValue =
    params.endDate ??
    `${endDate.getFullYear()}-${String(
      endDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(
      endDate.getDate(),
    ).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Attendance
            </p>

            <h1 className="text-3xl font-bold text-slate-900">
              Attendance Summary
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Review student attendance over a selected date range.
            </p>
          </div>

          <Link
            href="/attendance"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Attendance
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <form
            method="GET"
            className="grid gap-4 md:grid-cols-4"
          >
            <div>
              <label
                htmlFor="studentId"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Student
              </label>

              <select
                id="studentId"
                name="studentId"
                defaultValue={
                  selectedStudent?.id ?? ""
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {schoolStudents.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {student.firstName}{" "}
                    {student.middleName
                      ? `${student.middleName} `
                      : ""}
                    {student.lastName} —{" "}
                    {student.permanentId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="startDate"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Start Date
              </label>

              <input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={startValue}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                End Date
              </label>

              <input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={endValue}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
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

        {selectedStudent ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedStudent.firstName}{" "}
                    {selectedStudent.middleName
                      ? `${selectedStudent.middleName} `
                      : ""}
                    {selectedStudent.lastName}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {selectedStudent.permanentId}
                  </p>
                </div>

                <div className="text-sm text-slate-500">
                  {startValue} → {endValue}
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Total Records
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {summary.total}
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
                  {summary.attendanceRate.toFixed(2)}%
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Attendance Interpretation
              </h2>

              {summary.total === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  No attendance records were found for this student
                  in the selected date range.
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  {summary.present} of{" "}
                  {summary.total} attendance records were marked
                  Present.
                </p>
              )}
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              No active students found
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Add an active student before viewing attendance
              summaries.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}