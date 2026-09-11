import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../src/lib/authorization";
import { getSchool } from "../../src/lib/school";
import { db } from "../../src/prisma/db";

export default async function PaymentsPage() {
  const user = await requirePermission("payments.view");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    redirect("/dashboard");
  }

  const [payments, students, users, receipts] =
    await Promise.all([
      db.orm.public.Payment.all(),
      db.orm.public.Student.all(),
      db.orm.public.User.all(),
      db.orm.public.Receipt.all(),
    ]);

  const schoolPayments = payments
    .filter(
      (payment) => payment.schoolId === school.id,
    )
    .sort((a, b) => b.id - a.id);

  const schoolStudents = students.filter(
    (student) => student.schoolId === school.id,
  );

  const schoolUsers = users.filter(
    (item) => item.schoolId === school.id,
  );

  const schoolReceipts = receipts.filter(
    (receipt) => receipt.schoolId === school.id,
  );

  const canCreate = await (
    await import("../../src/lib/permissions")
  ).hasPermission(
    user.id,
    "payments.create",
  );

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

  function getStudentPermanentId(
    studentId: number,
  ) {
    const student = schoolStudents.find(
      (item) => item.id === studentId,
    );

    return student?.permanentId ?? "Unknown ID";
  }

  function getCashierName(userId: number) {
    const cashier = schoolUsers.find(
      (item) => item.id === userId,
    );

    if (!cashier) {
      return "Unknown User";
    }

    return (
      cashier.username ||
      cashier.email ||
      cashier.phone ||
      "Unknown User"
    );
  }

  function getReceiptNumber(paymentId: number) {
    const receipt = schoolReceipts.find(
      (item) => item.paymentId === paymentId,
    );

    return receipt?.receiptNumber ?? "No receipt";
  }

  function formatPaymentDate(
    paymentDate: unknown,
  ) {
    if (!paymentDate) {
      return "Unknown date";
    }

    if (
      typeof paymentDate === "object" &&
      paymentDate !== null &&
      "epochMilliseconds" in paymentDate
    ) {
      const epochMilliseconds = (
        paymentDate as {
          epochMilliseconds: bigint | number;
        }
      ).epochMilliseconds;

      const date = new Date(
        Number(epochMilliseconds),
      );

      if (Number.isNaN(date.getTime())) {
        return "Invalid date";
      }

      return date.toLocaleDateString("en-NG");
    }

    if (
      typeof paymentDate === "string" ||
      typeof paymentDate === "number"
    ) {
      const date = new Date(paymentDate);

      if (Number.isNaN(date.getTime())) {
        return "Invalid date";
      }

      return date.toLocaleDateString("en-NG");
    }

    return "Invalid date";
  }

  function formatMethod(method: string) {
    switch (method) {
      case "BANK_TRANSFER":
        return "Bank Transfer";
      case "POS":
        return "POS";
      case "ONLINE":
        return "Online";
      case "OTHER":
        return "Other";
      case "CASH":
        return "Cash";
      default:
        return method;
    }
  }

  const completedPayments =
    schoolPayments.filter(
      (payment) => payment.status === "COMPLETED",
    );

  const refundedPayments =
    schoolPayments.filter(
      (payment) => payment.status === "REFUNDED",
    );

  const cancelledPayments =
    schoolPayments.filter(
      (payment) => payment.status === "CANCELLED",
    );

  const totalCollected =
    completedPayments.reduce(
      (total, payment) =>
        total + Number(payment.amount),
      0,
    );

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
              Payments
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Record and review student fee payments,
              receipts, and payment history.
            </p>
          </div>

          {canCreate && (
            <Link
              href="/payments/new"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              + Record Payment
            </Link>
          )}
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Collected
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₦
              {totalCollected.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Completed
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {completedPayments.length}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Refunded
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {refundedPayments.length}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cancelled
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-900">
              {cancelledPayments.length}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              Payment History
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {schoolPayments.length} payment
              {schoolPayments.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          {schoolPayments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto max-w-md">
                <h3 className="text-lg font-semibold text-slate-900">
                  No payments yet
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Record a student payment to begin
                  building the school's payment history.
                </p>

                {canCreate && (
                  <Link
                    href="/payments/new"
                    className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Record First Payment
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
                      Amount
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Method
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Receipt
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cashier
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {schoolPayments.map(
                    (payment) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {getStudentName(
                              payment.studentId,
                            )}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {
                              getStudentPermanentId(
                                payment.studentId,
                              )
                            }
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-900">
                            ₦
                            {Number(
                              payment.amount,
                            ).toLocaleString(
                              "en-NG",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatMethod(
                            payment.method,
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatPaymentDate(
                            payment.paymentDate,
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900">
                            {getReceiptNumber(
                              payment.id,
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {getCashierName(
                            payment.cashierUserId,
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {payment.status ===
                          "COMPLETED" ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Completed
                            </span>
                          ) : payment.status ===
                            "REFUNDED" ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Refunded
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Cancelled
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/payments/${payment.id}`}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                          >
                            View
                          </Link>
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
