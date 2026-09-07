import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { getStudentById } from "../../../src/lib/students";
import {
  getReceiptForPayment,
  getStudentBalance,
  getStudentPayments,
} from "../../../src/lib/payments";
import { db } from "../../../src/prisma/db";

type StudentProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentProfilePage({
  params,
}: StudentProfilePageProps) {
  const user = await requirePermission("students.view");

  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isInteger(studentId)) {
    notFound();
  }

  const student = await getStudentById(studentId);

  if (!student) {
    notFound();
  }

  if (student.schoolId !== user.schoolId) {
    notFound();
  }

  const school = await getSchool();

  const [
    classes,
    parents,
    parentRecords,
    history,
    sessions,
    balance,
    payments,
  ] = await Promise.all([
    db.orm.public.SchoolClass.all(),
    db.orm.public.StudentParent.all(),
    db.orm.public.Parent.all(),
    db.orm.public.StudentClassHistory.all(),
    db.orm.public.AcademicSession.all(),
    getStudentBalance(user.schoolId, student.id),
    getStudentPayments(user.schoolId, student.id),
  ]);

  const currentClass = classes.find(
    (item) => item.id === student.currentClassId,
  );

  const studentParents = parents.filter(
    (item) => item.studentId === student.id,
  );

  const studentHistory = history
    .filter((item) => item.studentId === student.id)
    .sort(
      (a, b) =>
        String(b.startDate).localeCompare(
          String(a.startDate),
        ),
    );

  const receipts = await Promise.all(
    payments.map((payment) =>
      getReceiptForPayment(
        user.schoolId,
        payment.id,
      ),
    ),
  );

  const formatDate = (
    value: unknown,
  ): string => {
    if (!value) {
      return "—";
    }

    const dateText = String(value);
    const datePart = dateText.slice(0, 10);

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(datePart)
    ) {
      const [year, month, day] =
        datePart.split("-");

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const monthNumber = Number(month);

      if (
        monthNumber >= 1 &&
        monthNumber <= 12
      ) {
        return `${day} ${monthNames[monthNumber - 1]} ${year}`;
      }
    }

    return dateText;
  };

  const formatMoney = (value: number) =>
    `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const paymentMethodLabel = (
    method: string,
  ) => {
    switch (method) {
      case "BANK_TRANSFER":
        return "Bank Transfer";
      case "POS":
        return "POS";
      case "ONLINE":
        return "Online";
      case "CASH":
        return "Cash";
      case "OTHER":
        return "Other";
      default:
        return method;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school?.name ??
                "School Management System"}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Student Profile
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/students/${student.id}/edit`}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Edit Student
            </a>

            <a
              href="/students"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Students
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                {student.permanentId}
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {[
                  student.firstName,
                  student.middleName,
                  student.lastName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Current Class:{" "}
                <span className="font-medium text-slate-700">
                  {currentClass?.name ??
                    "Not assigned"}
                  {currentClass?.section
                    ? ` - ${currentClass.section}`
                    : ""}
                </span>
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-green-100 px-4 py-2 text-xs font-bold text-green-700">
              {student.status}
            </span>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Permanent ID
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {student.permanentId}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Gender
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {student.gender ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Date of Birth
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {formatDate(student.dateOfBirth)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Admission Date
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {formatDate(student.admissionDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Phone
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {student.phone ?? "—"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Address
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {student.address ?? "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Fees & Payments
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Complete financial position for this
                student.
              </p>
            </div>

            <a
              href="/payments/new"
              className="inline-flex w-fit rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Record Payment
            </a>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Total Fees
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(balance.totalFees)}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <p className="text-sm font-medium text-green-700">
                Total Paid
              </p>

              <p className="mt-2 text-2xl font-bold text-green-800">
                {formatMoney(balance.totalPaid)}
              </p>
            </div>

            <div
              className={`rounded-xl border p-5 ${
                balance.balance > 0
                  ? "border-amber-200 bg-amber-50"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  balance.balance > 0
                    ? "text-amber-700"
                    : "text-green-700"
                }`}
              >
                Outstanding Balance
              </p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  balance.balance > 0
                    ? "text-amber-800"
                    : "text-green-800"
                }`}
              >
                {formatMoney(balance.balance)}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Payment History
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  All completed and historical
                  payments recorded for this student.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {payments.length} payment
                {payments.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-500">
                      Amount
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-500">
                      Method
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-500">
                      Reference
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-500">
                      Receipt
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment, index) => {
                    const receipt =
                      receipts[index];

                    return (
                      <tr
                        key={payment.id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(
                            payment.paymentDate,
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {formatMoney(
                            Number(payment.amount),
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {paymentMethodLabel(
                            payment.method,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {payment.reference ?? "—"}
                        </td>

                        <td className="px-5 py-4">
                          {receipt ? (
                            <span className="font-semibold text-blue-600">
                              {receipt.receiptNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              payment.status ===
                              "COMPLETED"
                                ? "bg-green-100 text-green-700"
                                : payment.status ===
                                    "REFUNDED"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {payments.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        No payments recorded for
                        this student yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Parents / Guardians */}
        <section className="mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Parents / Guardians
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Parents and guardians linked to this
                student.
              </p>
            </div>

            <Link
              href={`/students/${student.id}/parents`}
              className="inline-flex w-fit rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Manage Parents
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {studentParents.map((link) => {
              const parent = parentRecords.find(
                (item) => item.id === link.parentId,
              );

              if (!parent) {
                return null;
              }

              return (
                <div
                  key={link.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {[
                          parent.firstName,
                          parent.middleName,
                          parent.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {link.relationship}
                        {link.isPrimary
                          ? " • Primary Guardian"
                          : ""}
                      </p>
                    </div>

                    <div className="text-sm text-slate-600">
                      <p>
                        {parent.phone ??
                          "No phone"}
                      </p>

                      <p>
                        {parent.email ??
                          "No email"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {studentParents.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No parent or guardian linked yet.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Class History
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Historical class assignments for this
            student.
          </p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-semibold text-slate-500">
                    Class
                  </th>

                  <th className="px-5 py-4 font-semibold text-slate-500">
                    Session
                  </th>

                  <th className="px-5 py-4 font-semibold text-slate-500">
                    Start Date
                  </th>

                  <th className="px-5 py-4 font-semibold text-slate-500">
                    End Date
                  </th>

                  <th className="px-5 py-4 font-semibold text-slate-500">
                    Current
                  </th>
                </tr>
              </thead>

              <tbody>
                {studentHistory.map((record) => {
                  const classRecord =
                    classes.find(
                      (item) =>
                        item.id === record.classId,
                    );

                  const session =
                    sessions.find(
                      (item) =>
                        item.id ===
                        record.sessionId,
                    );

                  return (
                    <tr
                      key={record.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {classRecord?.name ??
                          `Class #${record.classId}`}
                        {classRecord?.section
                          ? ` - ${classRecord.section}`
                          : ""}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {session?.name ??
                          `Session #${record.sessionId}`}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(
                          record.startDate,
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(
                          record.endDate,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {record.isCurrent ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {studentHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      No class history recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}