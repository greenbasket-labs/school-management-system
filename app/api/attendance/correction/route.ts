import { NextResponse } from "next/server";
import { requireAuth } from "../../../../src/lib/authorization";
import { correctAttendance } from "../../../../src/lib/attendance-correction";
import { getSchool } from "../../../../src/lib/school";

export async function POST(request: Request) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();

    if (!school || school.id !== actor.schoolId) {
      return NextResponse.json({ error: "School access denied." }, { status: 403 });
    }

    const body = await request.json();
    const attendanceId = Number(body.attendanceId);
    const newStatus = String(body.newStatus ?? "");
    const reason = String(body.reason ?? "");
    const windowMinutes = body.windowMinutes == null ? undefined : Number(body.windowMinutes);

    if (!Number.isInteger(attendanceId) || attendanceId <= 0) {
      return NextResponse.json({ error: "Invalid attendance record." }, { status: 400 });
    }

    if (newStatus !== "PRESENT" && newStatus !== "ABSENT") {
      return NextResponse.json({ error: "Invalid attendance status." }, { status: 400 });
    }

    if (!reason.trim()) {
      return NextResponse.json({ error: "Correction reason is required." }, { status: 400 });
    }

    const result = await correctAttendance({
      schoolId: school.id,
      attendanceId,
      newStatus: newStatus as "PRESENT" | "ABSENT",
      reason,
      correctedByUserId: actor.id,
      windowMinutes,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to correct attendance.";
    const status = message.startsWith("Permission denied") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
