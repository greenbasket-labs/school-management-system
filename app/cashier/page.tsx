import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../src/lib/authorization";
import { hasPermission } from "../../src/lib/permissions";
import { getSchool } from "../../src/lib/school";
import { db } from "../../src/prisma/db";
import StudentSearch from "./student-search";

function formatMoney(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: unknown) {
  try {
    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function studentName(student: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return `${student.firstName} ${
    student.middleName ? `${student.middleName} ` : ""
  }${student.lastName}`;
}

export default async function CashierPage() {
  const user = await requirePermission("payments.view");

  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    redirect("/dashboard");
  }

  const [
    students,
    assignments,
    payments,
    receipts,
    classes,
  ] = await Promise.all([
    db.orm.public.Student.all(),
    db.orm.public.FeeAssignment.all(),
    db.orm.public.Payment.all(),
    db.orm.public.Receipt.all(),
    db.orm.public.SchoolClass.all(),
  ]);

  const schoolStudents = students
    .filter(
      (student) =>
        student.schoolId === school.id &&
        student.status === "ACTIVE",
    )
    .sort((a, b) =>
      a.lastName.localeCompare(b.lastName),
    );

  const schoolAssignments = assignments.filter(
    (assignment) =>
      assignment.schoolId === school.id &&
      assignment.status === "ACTIVE",
  );

  const schoolPayments = payments.filter(
    (payment) =>
      payment.schoolId === school.id,
  );

  const completedPayments =
    schoolPayments.filter(
      (payment) =>
        payment.status === "COMPLETED",
    );

  const today = new Date();

  const todayPayments =
    completedPayments.filter((payment) => {
      const paymentDate = new Date(
        String(payment.paymentDate),
      );

      return (
        paymentDate.getFullYear() ===
          today.getFullYear() &&
        paymentDate.getMonth() ===
          today.getMonth() &&
        paymentDate.getDate() ===
          today.getDate()
      );
    });

  const todayTotal = todayPayments.reduce(
    (total, payment) =>
      total + Number(payment.amount),
    0,
  );

  const cashTotal = todayPayments
    .filter(
      (payment) =>
        payment.method === "CASH",
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount),
      0,
    );

  const bankTransferTotal =
    todayPayments
      .filter(
        (payment) =>
          payment.method === "BANK_TRANSFER",
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.amount),
        0,
      );

  const posTotal = todayPayments
    .filter(
      (payment) =>
        payment.method === "POS",
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount),
      0,
    );

  const onlineTotal = todayPayments
    .filter(
      (payment) =>
        payment.method === "ONLINE",
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount),
      0,
    );

  const otherTotal = todayPayments
    .filter(
      (payment) =>
        payment.method === "OTHER",
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount),
      0,
    );

  const recentPayments =
    completedPayments
      .slice()
      .sort((a, b) => b.id - a.id)
      .slice(0, 8);

  const studentSearchData =
    schoolStudents.map((student) => {
      const totalFees =
        schoolAssignments
          .filter(
            (assignment) =>
              assignment.studentId ===
              student.id,
          )
          .reduce(
            (total, assignment) =>
              total +
              Number(assignment.amount),
            0,
          );

      const totalPaid =
        completedPayments
          .filter(
            (payment) =>
              payment.studentId ===
              student.id,
          )
          .reduce(
            (total, payment) =>
              total +
              Number(payment.amount),
            0,
          );

      const currentClass =
        classes.find(
          (schoolClass) =>
            schoolClass.id ===
            student.currentClassId,
        );

      return {
        id: student.id,
        permanentId: student.permanentId,
        name: studentName(student),
        phone: student.phone,
        className:
          currentClass?.name ?? "No class",
        totalFees,
        totalPaid,
        balance:
          totalFees - totalPaid,
      };
    });

  const outstandingStudents =
    studentSearchData
      .filter(
        (student) =>
          student.balance > 0,
      )
      .sort(
        (a, b) =>
          b.balance - a.balance,
      )
      .slice(0, 8);

  const receiptForPayment = (
    paymentId: number,
  ) =>
    receipts.find(
      (receipt) =>
        receipt.paymentId === paymentId &&
        receipt.schoolId === school.id,
    ) ?? null;

  const studentForPayment = (
    studentId: number,
  ) =>
    schoolStudents.find(
      (student) =>
        student.id === studentId,
    ) ?? null;

  const canCreatePayment =
    await hasPermission(
      user.id,
      "payments.create",
    );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Cashier
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Collect payments, check balances,
              and monitor today's collections.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canCreatePayment && (
              <Link
                href="/payments/new"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                + Record Payment
              </Link>
            )}

            <Link
              href="/payments"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Payment History
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Today's Collection
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatMoney(todayTotal)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {todayPayments.length} completed payment
              {todayPayments.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active Students
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {schoolStudents.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Available for payment search
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Outstanding Students
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {
                studentSearchData.filter(
                  (student) =>
                    student.balance > 0,
                ).length
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Students with unpaid balances
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              All Completed Payments
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {completedPayments.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Recorded in this school
            </p>
          </div>

        </section>

        <div className="mt-8">
          <StudentSearch
            students={studentSearchData}
            canCreatePayment={
              canCreatePayment
            }
          />
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Today's Collections
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Collection totals grouped by payment method.
              </p>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Cash
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(cashTotal)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Bank Transfer
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(
                    bankTransferTotal,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  POS
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(posTotal)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Online
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(
                    onlineTotal,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-sm text-slate-500">
                  Other
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(otherTotal)}
                </p>
              </div>

            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Students With Outstanding Balance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Students with the highest current balances.
                </p>
              </div>

              <Link
                href="/students"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Students →
              </Link>
            </div>

            {outstandingStudents.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                No outstanding student balances.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {outstandingStudents.map(
                  (student) => (
                    <Link
                      key={student.id}
                      href={`/students/${student.id}`}
                      className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {student.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {student.permanentId}
                        </p>
                      </div>

                      <p className="shrink-0 font-semibold text-slate-900">
                        {formatMoney(
                          student.balance,
                        )}
                      </p>
                    </Link>
                  ),
                )}
              </div>
            )}
          </div>

        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Payments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest completed payments recorded by the school.
              </p>
            </div>

            <Link
              href="/payments"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              View all →
            </Link>
          </div>

          {recentPayments.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No completed payments yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">

                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Method
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Receipt
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {recentPayments.map(
                    (payment) => {
                      const student =
                        studentForPayment(
                          payment.studentId,
                        );

                      const receipt =
                        receiptForPayment(
                          payment.id,
                        );

                      return (
                        <tr
                          key={payment.id}
                          className="border-b border-slate-100 last:border-0"
                        >

                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">
                              {student
                                ? studentName(
                                    student,
                                  )
                                : "Unknown student"}
                            </p>

                            <p className="text-xs text-slate-500">
                              {student?.permanentId ??
                                "—"}
                            </p>
                          </td>

                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {formatMoney(
                              Number(
                                payment.amount,
                              ),
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-700">
                            {payment.method.replaceAll(
                              "_",
                              " ",
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-700">
                            {formatDate(
                              payment.paymentDate,
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-mono text-sm text-slate-700">
                              {receipt?.receiptNumber ??
                                "—"}
                            </span>
                          </td>

                        </tr>
                      );
                    },
                  )}
                </tbody>

              </table>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}