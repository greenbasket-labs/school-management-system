"use client";

import { useMemo, useState } from "react";

type Student = {
  id: number;
  permanentId: string;
  name: string;
};

type ExistingAttendance = {
  studentId: number;
  status: "PRESENT" | "ABSENT";
};

type AttendanceFormProps = {
  schoolName: string;
  className: string;
  classId: number;
  date: string;
  period:
    | "FIRST_PERIOD"
    | "SECOND_PERIOD";
  students: Student[];
  existingAttendance: ExistingAttendance[];
  canMark: boolean;
  canEdit: boolean;
};

function formatDate(date: string) {
  const value = new Date(
    `${date}T12:00:00`,
  );

  return value.toLocaleDateString(
    "en-NG",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}

export default function AttendanceForm({
  className,
  classId,
  date,
  period,
  students,
  existingAttendance,
  canMark,
  canEdit,
}: AttendanceFormProps) {
  const existingMap = useMemo(
    () =>
      new Map(
        existingAttendance.map(
          (record) => [
            record.studentId,
            record.status,
          ],
        ),
      ),
    [existingAttendance],
  );

  const [presentIds, setPresentIds] =
    useState<number[]>(
      existingAttendance
        .filter(
          (record) =>
            record.status === "PRESENT",
        )
        .map(
          (record) => record.studentId,
        ),
    );

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [pending, setPending] =
    useState(false);

  const attendanceTaken =
    existingAttendance.length > 0;

  const editable =
    !attendanceTaken || canEdit;

  function isPresent(
    studentId: number,
  ) {
    return presentIds.includes(
      studentId,
    );
  }

  function toggleStudent(
    studentId: number,
  ) {
    if (!editable) {
      return;
    }

    setPresentIds((current) => {
      if (
        current.includes(studentId)
      ) {
        return current.filter(
          (id) =>
            id !== studentId,
        );
      }

      return [
        ...current,
        studentId,
      ];
    });
  }

  function markAllPresent() {
    if (!editable) {
      return;
    }

    setPresentIds(
      students.map(
        (student) => student.id,
      ),
    );
  }

  function markAllAbsent() {
    if (!editable) {
      return;
    }

    setPresentIds([]);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canMark) {
      setError(
        "You do not have permission to mark attendance.",
      );
      return;
    }

    if (!editable) {
      setError(
        "Attendance has already been submitted and you do not have permission to edit it.",
      );
      return;
    }

    if (students.length === 0) {
      setError(
        "There are no active students in this class.",
      );
      return;
    }

    setError("");
    setSuccess("");
    setPending(true);

    try {
      const response =
        await fetch(
          "/api/attendance",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              classId,
              attendanceDate: date,
              period,
              studentIds:
                presentIds,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            "Unable to save attendance.",
        );
        return;
      }

      setSuccess(
        `Attendance saved successfully. ${data.present} present, ${data.absent} absent.`,
      );

      window.setTimeout(() => {
        window.location.href =
          `/attendance?classId=${classId}&date=${date}&period=${period}`;
      }, 700);
    } catch {
      setError(
        "Unable to connect to the attendance service. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  const presentCount =
    presentIds.length;

  const absentCount =
    Math.max(
      students.length -
        presentCount,
      0,
    );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Attendance
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {className}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {formatDate(date)} •{" "}
              {period ===
              "FIRST_PERIOD"
                ? "First Period"
                : "Second Period"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">
                Students
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {students.length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">
                Present
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {presentCount}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">
                Absent
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {absentCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {attendanceTaken && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-sm font-semibold text-amber-900">
              Attendance already submitted
            </p>

            <p className="mt-1 text-sm text-amber-800">
              This class already has attendance for
              this date and period.
              {canEdit
                ? " You have permission to edit it."
                : " You can view it but cannot edit it."}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {!canMark && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            You have view access to attendance but
            do not have permission to mark attendance.
          </div>
        )}

        {students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
            <p className="font-semibold text-slate-900">
              No active students
            </p>

            <p className="mt-1 text-sm text-slate-500">
              This class currently has no active
              students assigned to it.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Mark attendance
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Tick a student to mark them Present.
                  Unticked students will be marked Absent
                  when you submit.
                </p>
              </div>

              {editable && canMark && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={markAllPresent}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    All Present
                  </button>

                  <button
                    type="button"
                    onClick={markAllAbsent}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    All Absent
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden grid-cols-[60px_1fr_180px_120px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                <div>No.</div>
                <div>Student</div>
                <div>Permanent ID</div>
                <div className="text-center">
                  Present
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {students.map(
                  (
                    student,
                    index,
                  ) => {
                    const present =
                      isPresent(
                        student.id,
                      );

                    const existingStatus =
                      existingMap.get(
                        student.id,
                      );

                    return (
                      <button
                        key={
                          student.id
                        }
                        type="button"
                        disabled={
                          !editable ||
                          !canMark
                        }
                        onClick={() =>
                          toggleStudent(
                            student.id,
                          )
                        }
                        className={`grid w-full grid-cols-[48px_1fr_auto] gap-3 px-4 py-4 text-left transition sm:grid-cols-[60px_1fr_180px_120px] sm:items-center ${
                          !editable ||
                          !canMark
                            ? "cursor-default"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-sm font-medium text-slate-500">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {
                              student.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500 sm:hidden">
                            {
                              student.permanentId
                            }
                          </p>

                          {existingStatus && (
                            <p className="mt-1 text-xs text-slate-400 sm:hidden">
                              Previously:
                              {" "}
                              {
                                existingStatus ===
                                "PRESENT"
                                  ? "Present"
                                  : "Absent"
                              }
                            </p>
                          )}
                        </div>

                        <div className="hidden text-sm text-slate-600 sm:block">
                          {
                            student.permanentId
                          }
                        </div>

                        <div className="flex justify-end sm:justify-center">
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 text-lg font-bold ${
                              present
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {presentCount} Present
                  {" • "}
                  {absentCount} Absent
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Review the list before submitting.
                </p>
              </div>

              {canMark && editable && (
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending
                    ? "Saving Attendance..."
                    : attendanceTaken
                      ? "Update Attendance"
                      : "Submit Attendance"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}