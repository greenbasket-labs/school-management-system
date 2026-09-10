import { db } from "../prisma/db";

export type ReportFormat = "JSON" | "CSV" | "PRINT" | "PDF" | "EXCEL";

export type ReportFilters = {
  sessionId?: number;
  termId?: number;
  classId?: number;
  studentId?: number;
  subjectId?: number;
  status?: string;
  from?: Date;
  to?: Date;
};

export type ReportRow = Record<string, string | number | boolean | null>;

function matchesDate(value: unknown, from?: Date, to?: Date) {
  if (!from && !to) return true;
  if (!value) return false;
  const date = new Date(String(value)).getTime();
  if (Number.isNaN(date)) return false;
  if (from && date < from.getTime()) return false;
  if (to && date > to.getTime()) return false;
  return true;
}

export async function getSchoolReportData(
  schoolId: number,
  filters: ReportFilters = {},
) {
  const students = (await db.orm.public.Student.all()).filter(
    (student) =>
      student.schoolId === schoolId &&
      (!filters.studentId || student.id === filters.studentId) &&
      (!filters.classId || student.currentClassId === filters.classId) &&
      (!filters.status || student.status === filters.status),
  );

  const classes = (await db.orm.public.SchoolClass.all()).filter(
    (item) =>
      item.schoolId === schoolId &&
      (!filters.classId || item.id === filters.classId) &&
      (!filters.sessionId || item.sessionId === filters.sessionId),
  );

  const subjects = (await db.orm.public.Subject.all()).filter(
    (item) =>
      item.schoolId === schoolId &&
      (!filters.subjectId || item.id === filters.subjectId),
  );

  const sessions = (await db.orm.public.AcademicSession.all()).filter(
    (item) => item.schoolId === schoolId && (!filters.sessionId || item.id === filters.sessionId),
  );

  const terms = (await db.orm.public.Term.all()).filter((item) => {
    const session = sessions.find((session) => session.id === item.sessionId);
    return !!session && (!filters.termId || item.id === filters.termId);
  });

  const payments = (await db.orm.public.Payment.all()).filter(
    (payment) =>
      payment.schoolId === schoolId &&
      (!filters.studentId || payment.studentId === filters.studentId) &&
      matchesDate(payment.paymentDate, filters.from, filters.to),
  );

  const fees = (await db.orm.public.FeeAssignment.all()).filter(
    (fee) =>
      fee.schoolId === schoolId &&
      (!filters.studentId || fee.studentId === filters.studentId) &&
      (!filters.sessionId || fee.sessionId === filters.sessionId) &&
      (!filters.termId || fee.termId === filters.termId),
  );

  const attendance = (await db.orm.public.AttendanceRecord.all()).filter(
    (record) =>
      record.schoolId === schoolId &&
      (!filters.studentId || record.studentId === filters.studentId) &&
      (!filters.classId || record.classId === filters.classId) &&
      matchesDate(record.attendanceDate, filters.from, filters.to),
  );

  const exams = (await db.orm.public.Exam.all()).filter(
    (exam) =>
      exam.schoolId === schoolId &&
      (!filters.sessionId || exam.sessionId === filters.sessionId) &&
      (!filters.termId || exam.termId === filters.termId) &&
      (!filters.classId || exam.classId === filters.classId),
  );

  const examIds = new Set(exams.map((exam) => exam.id));
  const examSubjects = (await db.orm.public.ExamSubject.all()).filter(
    (item) =>
      examIds.has(item.examId) &&
      (!filters.subjectId || item.subjectId === filters.subjectId),
  );

  const examSubjectIds = new Set(examSubjects.map((item) => item.id));
  const results = (await db.orm.public.Result.all()).filter(
    (result) =>
      result.schoolId === schoolId &&
      examSubjectIds.has(result.examSubjectId) &&
      (!filters.studentId || result.studentId === filters.studentId),
  );

  return {
    students,
    classes,
    subjects,
    sessions,
    terms,
    payments,
    fees,
    attendance,
    exams,
    examSubjects,
    results,
  };
}

export async function buildStudentReport(
  schoolId: number,
  filters: ReportFilters = {},
): Promise<ReportRow[]> {
  const data = await getSchoolReportData(schoolId, filters);

  return data.students.map((student) => {
    const studentFees = data.fees.filter((fee) => fee.studentId === student.id);
    const studentPayments = data.payments.filter((payment) => payment.studentId === student.id);
    const studentAttendance = data.attendance.filter((record) => record.studentId === student.id);
    const studentResults = data.results.filter((result) => result.studentId === student.id);
    const totalFees = studentFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
    const totalPayments = studentPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const attendancePresent = studentAttendance.filter((item) => item.status === "PRESENT").length;

    return {
      studentId: student.id,
      permanentId: student.permanentId,
      name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
      classId: student.currentClassId,
      status: student.status,
      totalFees,
      totalPayments,
      balance: totalFees - totalPayments,
      attendanceRecords: studentAttendance.length,
      attendancePresent,
      attendancePercentage:
        studentAttendance.length > 0
          ? Number(((attendancePresent / studentAttendance.length) * 100).toFixed(2))
          : 0,
      resultsCount: studentResults.length,
    };
  });
}

export async function buildClassReport(
  schoolId: number,
  filters: ReportFilters = {},
): Promise<ReportRow[]> {
  const data = await getSchoolReportData(schoolId, filters);

  return data.classes.map((schoolClass) => {
    const students = data.students.filter((student) => student.currentClassId === schoolClass.id);
    const attendance = data.attendance.filter((item) => item.classId === schoolClass.id);
    const present = attendance.filter((item) => item.status === "PRESENT").length;

    return {
      classId: schoolClass.id,
      name: schoolClass.name,
      section: schoolClass.section,
      sessionId: schoolClass.sessionId,
      studentCount: students.length,
      attendanceRecords: attendance.length,
      presentRecords: present,
      attendancePercentage:
        attendance.length > 0 ? Number(((present / attendance.length) * 100).toFixed(2)) : 0,
    };
  });
}

export async function buildFinancialReport(
  schoolId: number,
  filters: ReportFilters = {},
): Promise<ReportRow[]> {
  const data = await getSchoolReportData(schoolId, filters);
  const studentIds = new Set(data.students.map((student) => student.id));

  const grouped = new Map<number, { fees: number; payments: number }>();
  for (const id of studentIds) grouped.set(id, { fees: 0, payments: 0 });

  for (const fee of data.fees) {
    const row = grouped.get(fee.studentId);
    if (row) row.fees += Number(fee.amount);
  }
  for (const payment of data.payments) {
    const row = grouped.get(payment.studentId);
    if (row) row.payments += Number(payment.amount);
  }

  return data.students.map((student) => {
    const row = grouped.get(student.id) ?? { fees: 0, payments: 0 };
    return {
      studentId: student.id,
      permanentId: student.permanentId,
      name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
      fees: row.fees,
      payments: row.payments,
      balance: row.fees - row.payments,
    };
  });
}

export function filterReportRows(
  rows: ReportRow[],
  search?: string,
) {
  const term = search?.trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((row) =>
    Object.values(row).some((value) =>
      String(value ?? "").toLowerCase().includes(term),
    ),
  );
}

export function reportRowsToCsv(rows: ReportRow[]) {
  if (rows.length === 0) return "";

  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  );

  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    columns.map(escape).join(","),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
  ].join("\n");
}

export function getReportFormats(): ReportFormat[] {
  return ["JSON", "CSV", "PRINT", "PDF", "EXCEL"];
}
