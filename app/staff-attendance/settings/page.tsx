import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { getStaffAttendanceSettings } from "../../../src/lib/staff-attendance-settings";
import StaffAttendanceSettingsForm from "./settings-form";

export default async function StaffAttendanceSettingsPage() {
  const user = await requirePermission("attendance.staff.settings");
  const school = await getSchool();
  if (!school || school.id !== user.schoolId) redirect("/dashboard");

  const settings = await getStaffAttendanceSettings(school.id);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{school.name}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Staff Attendance Settings</h1>
            <p className="mt-2 text-sm text-slate-500">Configure how staff and teacher check-in and check-out are handled.</p>
          </div>
          <Link href="/staff-attendance" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Attendance</Link>
        </div>
        <StaffAttendanceSettingsForm initialSettings={settings} />
      </div>
    </main>
  );
}
