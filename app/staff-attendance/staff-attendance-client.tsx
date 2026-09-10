"use client";

import { useState } from "react";

type RecordShape = {
  id: number;
  attendanceDate: unknown;
  checkInAt: unknown;
  checkOutAt: unknown;
  status: string;
  lateMinutes: number;
  missedCheckout: boolean;
} | null;

function displayTime(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function StaffAttendanceClient({
  initialRecord,
  staffName,
}: {
  initialRecord: RecordShape;
  staffName: string;
}) {
  const [record, setRecord] = useState<RecordShape>(initialRecord);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (action: "CHECK_IN" | "CHECK_OUT") => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save attendance.");

      setRecord(data.record);
      setMessage(action === "CHECK_IN" ? "Check-in recorded successfully." : "Check-out recorded successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save attendance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Today</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Welcome, {staffName}</h2>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => submit("CHECK_IN")}
              disabled={loading || Boolean(record?.checkInAt)}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {record?.checkInAt ? "Checked In" : "Check In"}
            </button>
            <button
              type="button"
              onClick={() => submit("CHECK_OUT")}
              disabled={loading || !record?.checkInAt || Boolean(record?.checkOutAt)}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {record?.checkOutAt ? "Checked Out" : "Check Out"}
            </button>
          </div>
        </div>
      </section>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {error || message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{record?.status ?? "NOT MARKED"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-in</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{displayTime(record?.checkInAt)}</p>
          {record?.lateMinutes ? <p className="mt-1 text-xs text-amber-600">{record.lateMinutes} minutes late</p> : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-out</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{displayTime(record?.checkOutAt)}</p>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Attendance is tied to your authenticated account. Another staff member cannot check in or out on your behalf.
      </p>
    </div>
  );
}
