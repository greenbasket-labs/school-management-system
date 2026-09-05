import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { db } from "../../../src/prisma/db";

export default async function FeeAssignmentsPage() {
  const user = await requirePermission("fees.view");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    redirect("/dashboard");
  }

  const [
    assignments,
    students,
    feeTypes,
    sessions,
    terms,
    classes,
  ] = await Promise.all([
    db.orm.public.FeeAssignment.all(),
    db.orm.public.Student.all(),
    db.orm.public.FeeType.all(),
    db.orm.public.AcademicSession.all(),
    db.orm.public.Term.all(),
    db.orm.public.SchoolClass.all(),
  ]);

  const schoolAssignments = assignments
    .filter(
      (assignment) => assignment.schoolId === school.id,
    )
    .sort((a, b) => b.id - a.id);

  const schoolStudents = students.filter(
    (student) => student.schoolId === school.id,
  );

  const schoolFeeTypes = feeTypes.filter(
    (feeType) => feeType.schoolId === school.id,
  );

  const schoolSessions = sessions.filter(
    (session) => session.schoolId === school.id,
  );

  const schoolClasses = classes.filter(
    (schoolClass) => schoolClass.schoolId === school.id,
  );

  const canCreate = user
    ? (
        await import("../../../src/lib/permissions")
      ).hasPermission(user.id, "fees.create")
    : false;

  function getStudentName(studentId: number) {
    const student = schoolStudents.find(
      (item) => item.id === studentId,
    );

    if (!student) {
      return "Unknown Student";
    }

    return `${student.firstName} ${
      student.middleName
        ? `${student.middleName} `
        : ""
    }${student.lastName}`;
  }

  function getFeeTypeName(feeTypeId: number) {
    const feeType = schoolFeeTypes.find(
      (item) => item.id === feeTypeId,
    );

    return feeType?.name ?? "Unknown Fee";
  }

  function getSessionName(sessionId: number) {
    const session = schoolSessions.find(
      (item) => item.id === sessionId,
    );

    return session?.name ?? "Unknown Session";
  }

  function getTermName(termId: number | null) {
    if (!termId) {
      return "All Terms";
    }

    const term = terms.find(
      (item) => item.id === termId,
    );

    return term?.name ?? "Unknown Term";
  }

  function getClassName(classId: number | null) {
    if (!classId) {
      return "All Classes";
    }

    const schoolClass = schoolClasses.find(
      (item) => item.id === classId,
    );

    if (!schoolClass) {
      return "Unknown Class";
    }

    return `${schoolClass.name}${
      schoolClass.section
        ? ` ${schoolClass.section}`
        : ""
    }`;
  }

  function formatDueDate(dueDate: unknown) {
    if (!dueDate) {
      return "No due date";
    }

    /*
     * Prisma 8 returns DateTime values as Temporal.Instant.
     * Do not pass a Temporal object directly into new Date().
     */
    if (
      typeof dueDate === "object" &&
      dueDate !== null &&
      "epochMilliseconds" in dueDate
    ) {
      const epochMilliseconds = (
        dueDate as {
          epochMilliseconds: bigint | number;
        }
      ).epochMilliseconds;

      const date = new Date(
        Number(epochMilliseconds),
      );

      if (Number.isNaN(date.getTime())) {
        return "Invalid due date";
      }

      return date.toLocaleDateString("en-NG");
    }

    if (
      typeof dueDate === "string" ||
      typeof dueDate === "number"
    ) {
      const date = new Date(dueDate);

      if (Number.isNaN(date.getTime())) {
        return "Invalid due date";
      }

      return date.toLocaleDateString("en-NG");
    }

    return "Invalid due date";
  }

  const totalActive = schoolAssignments.filter(
    (assignment) => assignment.status === "ACTIVE",
  ).length;

  const totalWaived = schoolAssignments.filter(
    (assignment) => assignment.status === "WAIVED",
  ).length;

  const totalCancelled = schoolAssignments.filter(
    (assignment) => assignment.status === "CANCELLED",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Fee Assignments
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Assign school fees to individual students
              for an academic session or term.
            </p>
          </div>

          {canCreate && (
            <Link
              href="/fees/assignments/new"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              + Assign Fee
            </Link>
          )}
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Active
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {totalActive}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Waived
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {totalWaived}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cancelled
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {totalCancelled}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              Assigned Fees
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {schoolAssignments.length} assignment
              {schoolAssignments.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          {schoolAssignments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto max-w-md">
                <h3 className="text-lg font-semibold text-slate-900">
                  No fee assignments yet
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Assign a fee to a student to start
                  building their school balance.
                </p>

                {canCreate && (
                  <Link
                    href="/fees/assignments/new"
                    className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Assign First Fee
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fee
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Session / Term
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Class
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {schoolAssignments.map(
                    (assignment) => (
                      <tr
                        key={assignment.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {getStudentName(
                              assignment.studentId,
                            )}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            Assignment #
                            {assignment.id}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {getFeeTypeName(
                              assignment.feeTypeId,
                            )}
                          </div>

                          {assignment.description && (
                            <div className="mt-1 max-w-xs text-xs text-slate-500">
                              {assignment.description}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">
                            {getSessionName(
                              assignment.sessionId,
                            )}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {getTermName(
                              assignment.termId,
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {getClassName(
                            assignment.classId,
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-slate-900">
                            ₦
                            {Number(
                              assignment.amount,
                            ).toLocaleString(
                              "en-NG",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>

                          <div className="mt-1 text-xs text-slate-500">
                            Due{" "}
                            {formatDueDate(
                              assignment.dueDate,
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {assignment.status ===
                          "ACTIVE" ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Active
                            </span>
                          ) : assignment.status ===
                            "WAIVED" ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Waived
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Cancelled
                            </span>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}