import { redirect } from "next/navigation";
import { requireAuth } from "../../src/lib/authorization";
import { getSchool } from "../../src/lib/school";
import { getStaffAttendance } from "../../src/lib/staff-attendance";
import StaffAttendanceClient from "./staff-attendance-client";

export default async function StaffAttendancePage() {
  const actor = await requireAuth();
  const school = await getSchool();

  if (!school || school.id !== actor.schoolId) {
    redirect("/dashboard");
  }

  const records = await getStaffAttendance({
    schoolId: school.id,
    userId: actor.id,
    attendanceDate: new Date(),
  });

  const today = records[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">{school.name}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Staff Attendance
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Record your daily check-in and check-out. Your actual times are stored automatically.
          </p>
        </div>

        <StaffAttendanceClient
          initialRecord={today}
          staffName={actor.name}
        />
      </div>
    </main>
  );
}
