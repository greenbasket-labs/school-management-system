import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { db } from "../../../src/prisma/db";
import PaymentCorrectionActions from "./payment-correction-actions";
import PrintReceiptButton from "./print-receipt-button";

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: unknown) {
  if (!value) return "Unknown date";
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleDateString("en-NG");
}

function formatMethod(method: string) {
  switch (method) {
    case "BANK_TRANSFER": return "Bank Transfer";
    case "POS": return "POS";
    case "ONLINE": return "Online";
    case "OTHER": return "Other";
    case "CASH": return "Cash";
    default: return method;
  }
}

export default async function PaymentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("payments.view");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) redirect("/dashboard");

  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isInteger(paymentId) || paymentId <= 0) notFound();

  const [payments, students, users, receipts, allocations, assignments, feeTypes] = await Promise.all([
    db.orm.public.Payment.all(),
    db.orm.public.Student.all(),
    db.orm.public.User.all(),
    db.orm.public.Receipt.all(),
    db.orm.public.PaymentAllocation.all(),
    db.orm.public.FeeAssignment.all(),
    db.orm.public.FeeType.all(),
  ]);

  const payment = payments.find((item) => item.id === paymentId && item.schoolId === school.id);
  if (!payment) notFound();

  const student = students.find((item) => item.id === payment.studentId && item.schoolId === school.id);
  const cashier = users.find((item) => item.id === payment.cashierUserId && item.schoolId === school.id);
  const receipt = receipts.find((item) => item.paymentId === payment.id && item.schoolId === school.id);
  const paymentAllocations = allocations.filter((item) => item.paymentId === payment.id && item.schoolId === school.id);
  const isCompleted = payment.status === "COMPLETED";
  const completedPaymentIds = new Set(
    payments
      .filter((item) => item.schoolId === school.id && item.studentId === payment.studentId && item.status === "COMPLETED")
      .map((item) => item.id),
  );

  const studentAssignments = assignments.filter((item) => item.studentId === payment.studentId && item.schoolId === school.id && item.status === "ACTIVE");
  const studentAllocationTotals = allocations
    .filter((item) => item.studentId === payment.studentId && item.schoolId === school.id && completedPaymentIds.has(item.paymentId))
    .reduce((map, item) => {
      map.set(item.feeAssignmentId, (map.get(item.feeAssignmentId) ?? 0) + Number(item.amount));
      return map;
    }, new Map<number, number>());

  const totalDue = studentAssignments.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalAllocated = studentAssignments.reduce((sum, item) => sum + Math.min(Number(item.amount), studentAllocationTotals.get(item.id) ?? 0), 0);
  const balance = Math.max(0, totalDue - totalAllocated);
  const recordedAllocation = paymentAllocations.reduce((sum, item) => sum + Number(item.amount), 0);
  const paymentAllocated = isCompleted ? recordedAllocation : 0;
  const unallocated = isCompleted ? Math.max(0, Number(payment.amount) - recordedAllocation) : 0;
  const canCorrect = payment.status === "COMPLETED" && (user.userType === "OWNER" || user.userType === "ADMIN");

  function feeName(feeAssignmentId: number) {
    const assignment = assignments.find((item) => item.id === feeAssignmentId);
    if (!assignment) return "Fee assignment";
    const fee = feeTypes.find((item) => item.id === assignment.feeTypeId);
    return fee?.name ?? `Fee #${assignment.feeTypeId}`;
  }

  const studentName = student
    ? `${student.firstName} ${student.middleName ? `${student.middleName} ` : ""}${student.lastName}`
    : "Unknown Student";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 print-page">
      <div className="mx-auto max-w-5xl print-screen-content">
        <div className="print-toolbar">
          <Link href="/payments" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Payment History</Link>
          {receipt && <PrintReceiptButton />}
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payment Details</h1>
            <p className="mt-1 text-sm text-slate-600">A clear record of the payment and exactly what it covered.</p>
          </div>
          {receipt && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Receipt</div>
              <div className="mt-1 font-bold text-slate-900">{receipt.receiptNumber}</div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment</div><div className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(payment.amount)}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Allocated</div><div className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(paymentAllocated)}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unallocated</div><div className="mt-2 text-2xl font-bold text-slate-900">{isCompleted ? formatMoney(unallocated) : "—"}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Balance After</div><div className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(balance)}</div></div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Payment Information</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Student</dt><dd className="font-medium text-slate-900">{studentName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Date</dt><dd className="font-medium text-slate-900">{formatDate(payment.paymentDate)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Method</dt><dd className="font-medium text-slate-900">{formatMethod(payment.method)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Reference</dt><dd className="font-medium text-slate-900">{payment.reference ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Cashier</dt><dd className="font-medium text-slate-900">{cashier?.username ?? cashier?.email ?? cashier?.phone ?? "Unknown User"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="font-medium text-slate-900">{payment.status}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">What This Payment Covered</h2>
            <p className="mt-1 text-sm text-slate-500">Recorded allocations are retained for history. Only completed payments affect the current financial position.</p>

            {paymentAllocations.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No fee allocation was recorded for this payment.</div>
            ) : (
              <div className="mt-5 divide-y divide-slate-100">
                {paymentAllocations.map((allocation) => (
                  <div key={allocation.id} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <div className="font-medium text-slate-900">{feeName(allocation.feeAssignmentId)}</div>
                      <div className="mt-1 text-xs text-slate-500">Fee assignment #{allocation.feeAssignmentId}</div>
                    </div>
                    <div className="font-semibold text-slate-900">{formatMoney(allocation.amount)}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Payment</span><span className="font-semibold">{formatMoney(payment.amount)}</span></div>
              <div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Financial allocation</span><span className="font-semibold">{formatMoney(paymentAllocated)}</span></div>
              <div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Unallocated credit</span><span className="font-semibold">{isCompleted ? formatMoney(unallocated) : "Not active"}</span></div>
              {!isCompleted && recordedAllocation > 0 && (
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Historical allocation retained: {formatMoney(recordedAllocation)}. Because this payment is {payment.status.toLowerCase()}, it does not reduce the student's current balance.</div>
              )}
            </div>
          </section>
        </div>

        <PaymentCorrectionActions paymentId={payment.id} canCorrect={canCorrect} />

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Student Fee Position</h2>
          <p className="mt-1 text-sm text-slate-500">Current active fee assignments after recorded completed payments.</p>
          {studentAssignments.length === 0 ? (
            <div className="mt-5 text-sm text-slate-500">No active fee assignments found.</div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-semibold text-slate-500">Fee</th><th className="px-4 py-3 text-right font-semibold text-slate-500">Charge</th><th className="px-4 py-3 text-right font-semibold text-slate-500">Paid</th><th className="px-4 py-3 text-right font-semibold text-slate-500">Outstanding</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {studentAssignments.map((assignment) => {
                    const charge = Number(assignment.amount);
                    const paid = Math.min(charge, studentAllocationTotals.get(assignment.id) ?? 0);
                    return <tr key={assignment.id}><td className="px-4 py-3 font-medium text-slate-900">{feeName(assignment.id)}</td><td className="px-4 py-3 text-right">{formatMoney(charge)}</td><td className="px-4 py-3 text-right">{formatMoney(paid)}</td><td className="px-4 py-3 text-right font-semibold">{formatMoney(Math.max(0, charge - paid))}</td></tr>;
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50"><tr><td className="px-4 py-3 font-semibold">Total</td><td className="px-4 py-3 text-right font-semibold">{formatMoney(totalDue)}</td><td className="px-4 py-3 text-right font-semibold">{formatMoney(totalAllocated)}</td><td className="px-4 py-3 text-right font-bold">{formatMoney(balance)}</td></tr></tfoot>
              </table>
            </div>
          )}
        </section>
      </div>

      {receipt && (
        <section className="print-receipt mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-slate-900">
          <header className="border-b border-slate-300 pb-5 text-center">
            <h1 className="text-2xl font-bold">{school.name}</h1>
            {school.address && <p className="mt-1 text-sm">{school.address}</p>}
            {(school.phone || school.email) && <p className="mt-1 text-sm">{[school.phone, school.email].filter(Boolean).join(" • ")}</p>}
            <h2 className="mt-5 text-xl font-bold uppercase tracking-wide">Payment Receipt</h2>
            <p className="mt-1 text-sm font-semibold">{receipt.receiptNumber}</p>
          </header>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-slate-500">Student:</span> <strong>{studentName}</strong></div>
            <div><span className="text-slate-500">Date:</span> <strong>{formatDate(payment.paymentDate)}</strong></div>
            <div><span className="text-slate-500">Payment method:</span> <strong>{formatMethod(payment.method)}</strong></div>
            <div><span className="text-slate-500">Reference:</span> <strong>{payment.reference ?? "—"}</strong></div>
          </div>

          <table className="mt-7 w-full text-sm">
            <thead><tr className="border-b border-slate-300"><th className="py-3 text-left">Fee</th><th className="py-3 text-right">Amount</th></tr></thead>
            <tbody>
              {paymentAllocations.map((allocation) => (
                <tr key={allocation.id} className="border-b border-slate-100"><td className="py-3">{feeName(allocation.feeAssignmentId)}</td><td className="py-3 text-right">{formatMoney(allocation.amount)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td className="pt-4 text-lg font-bold">Total Paid</td><td className="pt-4 text-right text-lg font-bold">{formatMoney(payment.amount)}</td></tr></tfoot>
          </table>

          <div className="mt-8 flex justify-between border-t border-slate-300 pt-5 text-sm">
            <span>Received by: <strong>{cashier?.username ?? cashier?.email ?? cashier?.phone ?? "Unknown User"}</strong></span>
            <span>Status: <strong>{payment.status}</strong></span>
          </div>
          <p className="mt-8 text-center text-xs text-slate-500">Keep this receipt for your records.</p>
        </section>
      )}
    </main>
  );
}
