import { db } from "../prisma/db";
import { getStudentAttendanceSummary } from "./attendance";

export type AttendanceThresholdConfig = {
  minimumAttendancePercent: number | null;
  warningAttendancePercent: number | null;
};

export type AttendanceStudentReport = {
  studentId: number;
  permanentId: string;
  name: string;
  total: number;
  present: number;
  absent: number;
  attendanceRate: number;
  belowMinimum: boolean;
  belowWarning: boolean;
};

function validatePercent(value: number | null, field: string) {
  if (value === null) return;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${field} must be between 0 and 100.`);
  }
}

function normalizeThresholds(config?: Partial<AttendanceThresholdConfig>) {
  const minimumAttendancePercent =
    config?.minimumAttendancePercent ?? null;
  const warningAttendancePercent =
    config?.warningAttendancePercent ?? null;

  validatePercent(
    minimumAttendancePercent,
    "Minimum attendance percentage",
  );
  validatePercent(
    warningAttendancePercent,
    "Warning attendance percentage",
  );

  if (
    minimumAttendancePercent !== null &&
    warningAttendancePercent !== null &&
    warningAttendancePercent < minimumAttendancePercent
  ) {
    throw new Error(
      "Warning attendance percentage cannot be lower than the minimum attendance percentage.",
    );
  }

  return {
    minimumAttendancePercent,
    warningAttendancePercent,
  };
}

function inRange(
  value: Date,
  startDate?: Date,
  endDate?: Date,
) {
  const time = value.getTime();

  if (startDate && time < startDate.getTime()) return false;
  if (endDate && time > endDate.getTime()) return false;

  return true;
}

export async function getAttendanceStudentReport(
  schoolId: number,
  studentId: number,
  options?: {
    startDate?: Date;
    endDate?: Date;
    thresholds?: Partial<AttendanceThresholdConfig>;
  },
): Promise<AttendanceStudentReport> {
  const students = await db.orm.public.Student.all();
  const student = students.find(
    (item) => item.id === studentId && item.schoolId === schoolId,
  );

  if (!student) {
    throw new Error("Student not found in this school.");
  }

  const summary = await getStudentAttendanceSummary(
    schoolId,
    studentId,
    options?.startDate,
    options?.endDate,
  );

  const thresholds = normalizeThresholds(options?.thresholds);

  return {
    studentId: student.id,
    permanentId: student.permanentId,
    name: [student.firstName, student.middleName, student.lastName]
      .filter(Boolean)
      .join(" "),
    total: summary.total,
    present: summary.present,
    absent: summary.absent,
    attendanceRate: summary.attendanceRate,
    belowMinimum:
      thresholds.minimumAttendancePercent !== null &&
      summary.total > 0 &&
      summary.attendanceRate < thresholds.minimumAttendancePercent,
    belowWarning:
      thresholds.warningAttendancePercent !== null &&
      summary.total > 0 &&
      summary.attendanceRate < thresholds.warningAttendancePercent,
  };
}

export async function getClassAttendanceReport(
  schoolId: number,
  classId: number,
  options?: {
    startDate?: Date;
    endDate?: Date;
    thresholds?: Partial<AttendanceThresholdConfig>;
  },
) {
  const classes = await db.orm.public.SchoolClass.all();
  const schoolClass = classes.find(
    (item) => item.id === classId && item.schoolId === schoolId,
  );

  if (!schoolClass) {
    throw new Error("Class not found in this school.");
  }

  const students = (await db.orm.public.Student.all()).filter(
    (student) =>
      student.schoolId === schoolId &&
      student.currentClassId === classId &&
      student.status === "ACTIVE",
  );

  const thresholds = normalizeThresholds(options?.thresholds);
  const records = (await db.orm.public.AttendanceRecord.all()).filter(
    (record) =>
      record.schoolId === schoolId &&
      record.classId === classId &&
      inRange(record.attendanceDate, options?.startDate, options?.endDate),
  );

  const report = students.map((student) => {
    const studentRecords = records.filter(
      (record) => record.studentId === student.id,
    );
    const present = studentRecords.filter(
      (record) => record.status === "PRESENT",
    ).length;
    const absent = studentRecords.filter(
      (record) => record.status === "ABSENT",
    ).length;
    const total = present + absent;
    const attendanceRate = total > 0 ? (present / total) * 100 : 0;

    return {
      studentId: student.id,
      permanentId: student.permanentId,
      name: [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" "),
      total,
      present,
      absent,
      attendanceRate,
      belowMinimum:
        thresholds.minimumAttendancePercent !== null &&
        total > 0 &&
        attendanceRate < thresholds.minimumAttendancePercent,
      belowWarning:
        thresholds.warningAttendancePercent !== null &&
        total > 0 &&
        attendanceRate < thresholds.warningAttendancePercent,
    } satisfies AttendanceStudentReport;
  });

  return {
    schoolId,
    classId,
    className: schoolClass.name,
    section: schoolClass.section,
    startDate: options?.startDate ?? null,
    endDate: options?.endDate ?? null,
    thresholds,
    students: report.sort((a, b) => a.name.localeCompare(b.name)),
    totals: {
      students: report.length,
      present: report.reduce((sum, item) => sum + item.present, 0),
      absent: report.reduce((sum, item) => sum + item.absent, 0),
      averageAttendanceRate:
        report.length > 0
          ? report.reduce((sum, item) => sum + item.attendanceRate, 0) /
            report.length
          : 0,
    },
  };
}

export async function getSchoolAttendanceReport(
  schoolId: number,
  options?: {
    startDate?: Date;
    endDate?: Date;
    thresholds?: Partial<AttendanceThresholdConfig>;
  },
) {
  const classes = (await db.orm.public.SchoolClass.all()).filter(
    (item) => item.schoolId === schoolId && item.status === "ACTIVE",
  );

  const reports = [];
  for (const schoolClass of classes) {
    reports.push(
      await getClassAttendanceReport(schoolId, schoolClass.id, options),
    );
  }

  return {
    schoolId,
    startDate: options?.startDate ?? null,
    endDate: options?.endDate ?? null,
    classes: reports,
    totals: {
      classes: reports.length,
      students: reports.reduce((sum, item) => sum + item.totals.students, 0),
      present: reports.reduce((sum, item) => sum + item.totals.present, 0),
      absent: reports.reduce((sum, item) => sum + item.totals.absent, 0),
    },
  };
}
