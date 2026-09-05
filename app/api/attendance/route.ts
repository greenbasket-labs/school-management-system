import { NextResponse } from "next/server";
import {
  requireAuth,
} from "../../../src/lib/authorization";
import {
  saveClassAttendance,
} from "../../../src/lib/attendance";
import {
  getSchool,
} from "../../../src/lib/school";

const ATTENDANCE_PERIODS = [
  "FIRST_PERIOD",
  "SECOND_PERIOD",
] as const;

export async function POST(
  request: Request,
) {
  try {
    const actor =
      await requireAuth();

    const school =
      await getSchool();

    if (
      !school ||
      school.id !== actor.schoolId
    ) {
      return NextResponse.json(
        {
          error:
            "School access denied.",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      await request.json();

    const classId =
      Number(body.classId);

    const attendanceDate =
      String(
        body.attendanceDate ?? "",
      );

    const period =
      String(
        body.period ?? "",
      );

    const rawStudentIds =
      Array.isArray(
        body.studentIds,
      )
        ? body.studentIds
        : [];

    const studentIds =
      rawStudentIds.map(
        (value: unknown) =>
          Number(value),
      );

    if (
      !Number.isInteger(
        classId,
      ) ||
      classId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid class.",
        },
        {
          status: 400,
        },
      );
    }

    if (!attendanceDate) {
      return NextResponse.json(
        {
          error:
            "Attendance date is required.",
        },
        {
          status: 400,
        },
      );
    }

    const parsedDate =
      new Date(
        `${attendanceDate}T12:00:00`,
      );

    if (
      Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid attendance date.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !ATTENDANCE_PERIODS.includes(
        period as
          | "FIRST_PERIOD"
          | "SECOND_PERIOD",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid attendance period.",
        },
        {
          status: 400,
        },
      );
    }

    for (
      const studentId of studentIds
    ) {
      if (
        !Number.isInteger(
          studentId,
        ) ||
        studentId <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid student selection.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const result =
      await saveClassAttendance({
        schoolId:
          school.id,
        classId,
        studentIds,
        attendanceDate:
          parsedDate,
        period:
          period as
            | "FIRST_PERIOD"
            | "SECOND_PERIOD",
        markedByUserId:
          actor.id,
      });

    return NextResponse.json(
      {
        success: true,
        classId:
          result.classId,
        attendanceDate:
          attendanceDate,
        period:
          result.period,
        totalStudents:
          result.totalStudents,
        present:
          result.present,
        absent:
          result.absent,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to save attendance.";

    const status =
      message.startsWith(
        "Permission denied",
      )
        ? 403
        : 400;

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    );
  }
}