import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../src/lib/authorization";
import { getSchool } from "../../src/lib/school";
import {
  getAttendanceCallsPerDay,
  getClassAttendance,
} from "../../src/lib/attendance";
import { db } from "../../src/prisma/db";
import AttendanceForm from "./attendance-form";

type AttendancePageProps = {
  searchParams: Promise<{
    classId?: string;
    date?: string;
    period?: string;
  }>;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(value: string | undefined) {
  if (!value) {
    return new Date(`${getToday()}T12:00:00`);
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return new Date(`${getToday()}T12:00:00`);
  }

  return date;
}

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  const user = await requirePermission(
    "attendance.view",
  );

  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const classes =
    await db.orm.public.SchoolClass.all();

  const activeClasses = classes
    .filter(
      (item) =>
        item.schoolId === school.id &&
        item.status === "ACTIVE",
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name),
    );

  const requestedClassId = Number(
    params.classId,
  );

  const selectedClassId =
    Number.isInteger(requestedClassId) &&
    requestedClassId > 0 &&
    activeClasses.some(
      (item) => item.id === requestedClassId,
    )
      ? requestedClassId
      : null;

  const attendanceDate =
    parseDate(params.date);

  const dateValue =
    attendanceDate
      .toISOString()
      .slice(0, 10);

  const callsPerDay =
    await getAttendanceCallsPerDay(
      school.id,
    );

  const requestedPeriod =
    params.period === "SECOND_PERIOD"
      ? "SECOND_PERIOD"
      : "FIRST_PERIOD";

  const selectedPeriod =
    callsPerDay === 1
      ? "FIRST_PERIOD"
      : requestedPeriod;

  let students: {
    id: number;
    permanentId: string;
    name: string;
  }[] = [];

  let existingAttendance: {
    studentId: number;
    status: "PRESENT" | "ABSENT";
  }[] = [];

  if (selectedClassId !== null) {
    const allStudents =
      await db.orm.public.Student.all();

    students = allStudents
      .filter(
        (student) =>
          student.schoolId === school.id &&
          student.currentClassId ===
            selectedClassId &&
          student.status === "ACTIVE",
      )
      .map((student) => ({
        id: student.id,
        permanentId:
          student.permanentId,
        name: [
          student.firstName,
          student.middleName,
          student.lastName,
        ]
          .filter(Boolean)
          .join(" "),
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name),
      );

    const records =
      await getClassAttendance(
        school.id,
        selectedClassId,
        attendanceDate,
        selectedPeriod,
      );

    existingAttendance =
      records.map((record) => ({
        studentId:
          record.studentId,
        status:
          record.status as
            | "PRESENT"
            | "ABSENT",
      }));
  }

  const selectedClass =
    selectedClassId !== null
      ? activeClasses.find(
          (item) =>
            item.id === selectedClassId,
        ) ?? null
      : null;

  const canMark =
    await import(
      "../../src/lib/permissions"
    ).then(({ hasPermission }) =>
      hasPermission(
        user.id,
        "attendance.mark",
      ),
    );

  const canEdit =
    await import(
      "../../src/lib/permissions"
    ).then(({ hasPermission }) =>
      hasPermission(
        user.id,
        "attendance.edit",
      ),
    );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {school.name}
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Attendance
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Mark daily student attendance by class and
              attendance period.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            method="GET"
            className="grid gap-5 md:grid-cols-3"
          >
            <div>
              <label
                htmlFor="classId"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Class
              </label>

              <select
                id="classId"
                name="classId"
                defaultValue={
                  selectedClassId !== null
                    ? String(selectedClassId)
                    : ""
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">
                  Select class
                </option>

                {activeClasses.map((schoolClass) => (
                  <option
                    key={schoolClass.id}
                    value={schoolClass.id}
                  >
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="date"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Date
              </label>

              <input
                id="date"
                name="date"
                type="date"
                defaultValue={dateValue}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="period"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Attendance Period
              </label>

              <select
                id="period"
                name="period"
                defaultValue={selectedPeriod}
                disabled={callsPerDay === 1}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-500"
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

              {callsPerDay === 1 && (
                <p className="mt-2 text-xs text-slate-500">
                  This school is currently configured
                  for one attendance call per day.
                </p>
              )}
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Load Attendance
              </button>
            </div>
          </form>
        </section>

        {selectedClassId === null ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Select a class to begin
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Choose the class, date, and attendance
              period above. The student attendance list
              will appear here.
            </p>
          </section>
        ) : (
          <AttendanceForm
            schoolName={school.name}
            className={
              selectedClass?.name ?? "Class"
            }
            classId={selectedClassId}
            date={dateValue}
            period={selectedPeriod}
            students={students}
            existingAttendance={
              existingAttendance
            }
            canMark={canMark}
            canEdit={canEdit}
          />
        )}
      </div>
    </main>
  );
}