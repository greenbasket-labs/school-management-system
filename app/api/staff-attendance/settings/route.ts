import { NextResponse } from "next/server";
import { requireAuth } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getStaffAttendanceSettings, updateStaffAttendanceSettings } from "../../../../src/lib/staff-attendance-settings";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const actor = await requireAuth();
    const school = await getSchool();
    if (!school || school.id !== actor.schoolId) return json({ error: "School access denied." }, 403);
    return json({ success: true, settings: await getStaffAttendanceSettings(school.id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load staff attendance settings.";
    return json({ error: message }, message.startsWith("Permission denied") ? 403 : 400);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();
    if (!school || school.id !== actor.schoolId) return json({ error: "School access denied." }, 403);
    const body = await request.json();
    const settings = body.settings ?? body;
    const updated = await updateStaffAttendanceSettings({ schoolId: school.id, userId: actor.id, settings });
    return json({ success: true, settings: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update staff attendance settings.";
    return json({ error: message }, message.startsWith("Permission denied") ? 403 : 400);
  }
}
