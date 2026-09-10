import { NextResponse } from "next/server";
import { requireAuth } from "../../../src/lib/authorization";
import {
  getClassAttendance,
  getClassAttendanceSummary,
  saveClassAttendance,
} from "../../../src/lib/attendance";
import { getSchool } from "../../../src/lib/school";

const ATTENDANCE_PERIODS = [
  "FIRST_PERIOD",
  "SECOND_PERIOD",
] as const;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validPeriod(value: unknown): value is (typeof ATTENDANCE_PERIODS)[number] {
  return ATTENDANCE_PERIODS.includes(value as (typeof ATTENDANCE_PERIODS)[number]);
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();

    if (!school || school.id !== actor.schoolId) {
      return json({ error: "School access denied." }, 403);
    }

    const url = new URL(request.url);
    const classId = Number(url.searchParams.get("classId"));
    const dateText = url.searchParams.get("attendanceDate") ?? "";
    const period = url.searchParams.get("period") ?? "FIRST_PERIOD";

    if (!Number.isInteger(classId) || classId <= 0) {
      return json({ error: "Invalid class." }, 400);
    }

    if (!dateText) {
      return json({ error: "Attendance date is required." }, 400);
    }

    const attendanceDate = new Date(`${dateText}T12:00:00`);
    if (Number.isNaN(attendanceDate.getTime())) {
      return json({ error: "Invalid attendance date." }, 400);
    }

    if (!validPeriod(period)) {
      return json({ error: "Invalid attendance period." }, 400);
    }

    const [records, summary] = await Promise.all([
      getClassAttendance(school.id, classId, attendanceDate, period),
      getClassAttendanceSummary(school.id, classId, attendanceDate, period),
    ]);

    return json({
      success: true,
      classId,
      attendanceDate: dateText,
      period,
      summary,
      records,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load attendance.";
    return json({ error: message }, message.startsWith("Permission denied") ? 403 : 400);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();

    if (!school || school.id !== actor.schoolId) {
      return json({ error: "School access denied." }, 403);
    }

    const body = await request.json();
    const classId = Number(body.classId);
    const attendanceDate = String(body.attendanceDate ?? "");
    const period = String(body.period ?? "");
    const rawStudentIds = Array.isArray(body.studentIds) ? body.studentIds : [];
    const studentIds = rawStudentIds.map((value: unknown) => Number(value));

    if (!Number.isInteger(classId) || classId <= 0) {
      return json({ error: "Invalid class." }, 400);
    }

    if (!attendanceDate) {
      return json({ error: "Attendance date is required." }, 400);
    }

    const parsedDate = new Date(`${attendanceDate}T12:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      return json({ error: "Invalid attendance date." }, 400);
    }

    if (!validPeriod(period)) {
      return json({ error: "Invalid attendance period." }, 400);
    }

    for (const studentId of studentIds) {
      if (!Number.isInteger(studentId) || studentId <= 0) {
        return json({ error: "Invalid student selection." }, 400);
      }
    }

    const result = await saveClassAttendance({
      schoolId: school.id,
      classId,
      studentIds,
      attendanceDate: parsedDate,
      period,
      markedByUserId: actor.id,
    });

    return json({
      success: true,
      classId: result.classId,
      attendanceDate,
      period: result.period,
      totalStudents: result.totalStudents,
      present: result.present,
      absent: result.absent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save attendance.";
    const status = message.startsWith("Permission denied") ? 403 : 400;
    return json({ error: message }, status);
  }
}
