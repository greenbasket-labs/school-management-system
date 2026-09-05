"use client";

import Link from "next/link";
import { useState } from "react";

type StudentOption = {
  id: number;
  permanentId: string;
  name: string;
  balance: number;
};

type NewPaymentFormProps = {
  students: StudentOption[];
  today: string;
  selectedStudentId: number | null;
};

const PAYMENT_METHODS = [
  {
    value: "CASH",
    label: "Cash",
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
  },
  {
    value: "POS",
    label: "POS",
  },
  {
    value: "ONLINE",
    label: "Online",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

export default function PaymentForm({
  students,
  today,
  selectedStudentId,
}: NewPaymentFormProps) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setPending(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);

      const response = await fetch(
        "/api/payments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: Number(
              formData.get("studentId"),
            ),
            amount: Number(
              formData.get("amount"),
            ),
            method: String(
              formData.get("method") ?? "",
            ),
            paymentDate: String(
              formData.get("paymentDate") ?? "",
            ),
            reference: String(
              formData.get("reference") ?? "",
            ),
            description: String(
              formData.get("description") ?? "",
            ),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            "Unable to record payment.",
        );
        return;
      }

      window.location.href = "/payments";
    } catch {
      setError(
        "Unable to connect to the payment service. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-red-600">
              ⚠
            </div>

            <div>
              <h2 className="font-semibold text-red-900">
                Payment could not be recorded
              </h2>

              <p className="mt-1 text-sm text-red-800">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Student
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Select the student making the payment.
        </p>

        <div className="mt-5">
          <label
            htmlFor="studentId"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Student
          </label>

          {students.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No active students are available
              for payment.
            </div>
          ) : (
            <>
              <select
                id="studentId"
                name="studentId"
                required
                defaultValue={
                  selectedStudentId !== null
                    ? String(selectedStudentId)
                    : ""
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">
                  Select student
                </option>

                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {student.name} —{" "}
                    {student.permanentId} — Balance ₦
                    {student.balance.toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </option>
                ))}
              </select>

              {selectedStudentId !== null &&
                students.some(
                  (student) =>
                    student.id ===
                    selectedStudentId,
                ) && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                      Selected from Cashier
                    </p>

                    <p className="mt-1 text-sm font-semibold text-blue-900">
                      {
                        students.find(
                          (student) =>
                            student.id ===
                            selectedStudentId,
                        )?.name
                      }
                    </p>

                    <p className="mt-1 text-xs text-blue-700">
                      {
                        students.find(
                          (student) =>
                            student.id ===
                            selectedStudentId,
                        )?.permanentId
                      }
                    </p>

                    <p className="mt-2 text-sm text-blue-800">
                      Outstanding balance:{" "}
                      <span className="font-semibold">
                        ₦
                        {students
                          .find(
                            (student) =>
                              student.id ===
                              selectedStudentId,
                          )
                          ?.balance.toLocaleString(
                            "en-NG",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                      </span>
                    </p>
                  </div>
                )}
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Payment Details
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Amount
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                ₦
              </span>

              <input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Cannot exceed the student's
              outstanding balance.
            </p>
          </div>

          <div>
            <label
              htmlFor="paymentDate"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Payment Date
            </label>

            <input
              id="paymentDate"
              name="paymentDate"
              type="date"
              defaultValue={today}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="method"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Payment Method
            </label>

            <select
              id="method"
              name="method"
              required
              defaultValue="CASH"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              {PAYMENT_METHODS.map(
                (paymentMethod) => (
                  <option
                    key={paymentMethod.value}
                    value={paymentMethod.value}
                  >
                    {paymentMethod.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="reference"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Reference
            </label>

            <input
              id="reference"
              name="reference"
              type="text"
              placeholder="Transaction/reference number"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Optional payment note"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="font-semibold text-blue-900">
          Automatic Processing
        </h2>

        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li>
            ✓ Payment will be recorded against
            the selected student.
          </li>

          <li>
            ✓ A unique receipt number will be
            generated automatically.
          </li>

          <li>
            ✓ The student's paid amount will
            increase automatically.
          </li>

          <li>
            ✓ The outstanding balance will be
            recalculated automatically.
          </li>

          <li>
            ✓ Overpayment will be rejected safely.
          </li>
        </ul>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/cashier"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            pending || students.length === 0
          }
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Recording..."
            : "Record Payment"}
        </button>
      </div>
    </form>
  );
}