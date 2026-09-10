import { NextResponse } from "next/server";
import { requireAuth } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { getStaffAttendance, staffCheckIn, staffCheckOut } from "../../../src/lib/staff-attendance";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();
    if (!school || school.id !== actor.schoolId) return json({ error: "School access denied." }, 403);

    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get("userId");
    const dateText = url.searchParams.get("attendanceDate");
    const userId = requestedUserId ? Number(requestedUserId) : undefined;

    if (userId !== undefined && (!Number.isInteger(userId) || userId <= 0)) {
      return json({ error: "Invalid userId." }, 400);
    }

    const attendanceDate = dateText ? new Date(`${dateText}T12:00:00`) : undefined;
    if (attendanceDate && Number.isNaN(attendanceDate.getTime())) return json({ error: "Invalid attendance date." }, 400);

    const records = await getStaffAttendance({ schoolId: school.id, userId, attendanceDate });
    return json({ success: true, records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load staff attendance.";
    return json({ error: message }, message.startsWith("Permission denied") ? 403 : 400);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();
    if (!school || school.id !== actor.schoolId) return json({ error: "School access denied." }, 403);

    const body = await request.json();
    const action = String(body.action ?? "");
    const targetUserId = body.userId === undefined ? actor.id : Number(body.userId);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) return json({ error: "Invalid userId." }, 400);

    if (targetUserId !== actor.id) {
      return json({ error: "Staff attendance must be recorded by the authenticated staff member." }, 403);
    }

    const dateText = body.attendanceDate ? String(body.attendanceDate) : "";
    const attendanceDate = dateText ? new Date(`${dateText}T12:00:00`) : undefined;
    if (attendanceDate && Number.isNaN(attendanceDate.getTime())) return json({ error: "Invalid attendance date." }, 400);

    let record;
    if (action === "CHECK_IN") {
      record = await staffCheckIn({
        schoolId: school.id,
        userId: actor.id,
        attendanceDate,
        startHour: body.startHour === undefined ? undefined : Number(body.startHour),
        startMinute: body.startMinute === undefined ? undefined : Number(body.startMinute),
        graceMinutes: body.graceMinutes === undefined ? undefined : Number(body.graceMinutes),
      });
    } else if (action === "CHECK_OUT") {
      record = await staffCheckOut({ schoolId: school.id, userId: actor.id, attendanceDate });
    } else {
      return json({ error: "Action must be CHECK_IN or CHECK_OUT." }, 400);
    }

    return json({ success: true, action, record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save staff attendance.";
    return json({ error: message }, message.startsWith("Permission denied") ? 403 : 400);
  }
}
