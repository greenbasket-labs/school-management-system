import { NextResponse } from "next/server";
import { requireAuth } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { correctStaffAttendance, listStaffAttendance } from "../../../../src/lib/staff-attendance-admin";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();
    if (!school || school.id !== actor.schoolId) return json({ error: "School access denied." }, 403);

    const url = new URL(request.url);
    const dateText = url.searchParams.get("attendanceDate");
    const attendanceDate = dateText ? new Date(`${dateText}T12:00:00`) : undefined;
    if (attendanceDate && Number.isNaN(attendanceDate.getTime())) return json({ error: "Invalid attendance date." }, 400);

    const records = await listStaffAttendance(school.id, actor.id, attendanceDate);
    return json({ success: true, records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load staff attendance.";
    return json({ error: message }, message.startsWith("Permission denied") ? 403 : 400);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();
    if (!school || school.id !== actor.schoolId) return json({ error: "School access denied." }, 403);

    const body = await request.json();
    const attendanceId = Number(body.attendanceId);
    if (!Number.isInteger(attendanceId) || attendanceId <= 0) return json({ error: "Invalid attendanceId." }, 400);

    const updated = await correctStaffAttendance({
      schoolId: school.id,
      actorId: actor.id,
      attendanceId,
      status: body.status === undefined ? undefined : String(body.status),
      missedCheckout: body.missedCheckout === undefined ? undefined : Boolean(body.missedCheckout),
      reason: String(body.reason ?? ""),
    });

    return json({ success: true, record: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to correct staff attendance.";
    return json({ error: message }, message.startsWith("Permission denied") ? 403 : 400);
  }
}
