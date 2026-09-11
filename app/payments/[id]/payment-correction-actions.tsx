"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentCorrectionActions({
  paymentId,
  canCorrect,
}: {
  paymentId: number;
  canCorrect: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!canCorrect) return null;

  async function correct(action: "REFUND" | "CANCEL") {
    const label = action === "REFUND" ? "refund" : "cancel";
    if (!reason.trim()) {
      setError("Enter a reason before continuing.");
      return;
    }
    if (!window.confirm(`Are you sure you want to ${label} this payment? This cannot be undone.`)) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/payments/${paymentId}/correction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to correct payment.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to correct payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="font-semibold text-slate-900">Payment Correction</h2>
      <p className="mt-1 text-sm text-slate-600">
        Use this only when the payment was entered incorrectly or the money was returned. The original record stays in history.
      </p>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Reason
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={500}
          disabled={busy}
          placeholder="Explain why this payment needs correction"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
        />
      </label>
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => correct("REFUND")}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
        >
          Refund Payment
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => correct("CANCEL")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Cancel Payment
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Refund means the payment is marked refunded; the actual money return is handled outside the system.
      </p>
    </section>
  );
}
