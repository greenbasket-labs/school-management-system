"use client";

import { useState } from "react";

type Settings = {
  startHour: number;
  startMinute: number;
  graceMinutes: number;
  closingHour: number;
  closingMinute: number;
  requireCheckout: boolean;
  missedCheckoutAction: "FLAG" | "AUTO_MARK";
};

export default function StaffAttendanceSettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/staff-attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save settings.");
      setMessage("Staff attendance settings saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Working hours</h2>
        <p className="mt-1 text-sm text-slate-500">These times control automatic lateness and the expected end of the workday.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">School start time
            <input type="time" value={`${String(settings.startHour).padStart(2,"0")}:${String(settings.startMinute).padStart(2,"0")}`} onChange={(e) => { const [h,m] = e.target.value.split(":").map(Number); set("startHour",h); set("startMinute",m); }} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Closing time
            <input type="time" value={`${String(settings.closingHour).padStart(2,"0")}:${String(settings.closingMinute).padStart(2,"0")}`} onChange={(e) => { const [h,m] = e.target.value.split(":").map(Number); set("closingHour",h); set("closingMinute",m); }} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Late arrival</h2>
        <label className="mt-5 block text-sm font-semibold text-slate-700">Grace period (minutes)
          <input type="number" min="0" max="1440" value={settings.graceMinutes} onChange={(e) => set("graceMinutes", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Check-out rules</h2>
        <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={settings.requireCheckout} onChange={(e) => set("requireCheckout", e.target.checked)} className="h-4 w-4" />
          Require staff to check out
        </label>
        <label className="mt-5 block text-sm font-semibold text-slate-700">If checkout is missed
          <select value={settings.missedCheckoutAction} onChange={(e) => set("missedCheckoutAction", e.target.value as Settings["missedCheckoutAction"])} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal">
            <option value="FLAG">Flag as missed checkout</option>
            <option value="AUTO_MARK">Automatically mark as handled</option>
          </select>
        </label>
      </section>

      {message && <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{message}</p>}
      <button disabled={saving} type="submit" className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save Attendance Settings"}</button>
    </form>
  );
}
