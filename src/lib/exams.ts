import { Temporal } from "@js-temporal/polyfill";
import { db } from "../prisma/db";
import { hasPermission } from "./permissions";
import { writeAuditLog } from "./audit";

export type ExamStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type CreateExamInput = {
  schoolId: number;
  sessionId: number;
  termId: number;
  classId: number;
  name: string;
  startDate: string;
  endDate: string;
  status?: ExamStatus;
  isActive?: boolean;
};

export type UpdateExamInput = {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: ExamStatus;
  isActive?: boolean;
};

function toInstant(date: string): Temporal.Instant {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid date.");
  }

  return Temporal.Instant.fromEpochMilliseconds(value.getTime());
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function validateDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Start date and end date are required.");
  }

  if (end.getTime() < start.getTime()) {
    throw new Error("End date cannot be before start date.");
  }

  return { start, end };
}

async function getExamById(examId: number) {
  const exams = await db.orm.public.Exam.all();
  return exams.find((exam) => exam.id === examId) ?? null;
}

async function verifyAcademicContext(
  schoolId: number,
  sessionId: number,
  termId: number,
  classId: number,
) {
  const sessions = await db.orm.public.AcademicSession.all();
  const session = sessions.find(
    (item) => item.id === sessionId && item.schoolId === schoolId,
  );

  if (!session) {
    throw new Error("Academic session not found.");
  }

  const terms = await db.orm.public.Term.all();
  const term = terms.find(
    (item) => item.id === termId && item.sessionId === sessionId,
  );

  if (!term) {
    throw new Error("Selected term does not belong to the selected session.");
  }

  const classes = await db.orm.public.SchoolClass.all();
  const schoolClass = classes.find(
    (item) =>
      item.id === classId &&
      item.schoolId === schoolId &&
      item.sessionId === sessionId,
  );

  if (!schoolClass) {
    throw new Error(
      "Selected class does not belong to the selected academic session.",
    );
  }

  return {
    session,
    term,
    schoolClass,
  };
}

export async function getExams(schoolId: number) {
  const exams = await db.orm.public.Exam.all();

  return exams
    .filter((exam) => exam.schoolId === schoolId)
    .sort((a, b) => {
      const first = new Date(String(a.startDate)).getTime();
      const second = new Date(String(b.startDate)).getTime();

      if (first !== second) {
        return second - first;
      }

      return a.name.localeCompare(b.name);
    });
}

export async function getExam(examId: number, schoolId: number) {
  const exam = await getExamById(examId);

  if (!exam || exam.schoolId !== schoolId) {
    return null;
  }

  return exam;
}

export async function createExam(
  userId: number,
  input: CreateExamInput,
) {
  const allowed = await hasPermission(userId, "exams.create");

  if (!allowed) {
    throw new Error("Permission denied: exams.create");
  }

  const name = normalizeName(input.name);

  if (!name) {
    throw new Error("Exam name is required.");
  }

  const { start, end } = validateDateRange(
    input.startDate,
    input.endDate,
  );

  await verifyAcademicContext(
    input.schoolId,
    input.sessionId,
    input.termId,
    input.classId,
  );

  const existingExams = await db.orm.public.Exam.all();

  const duplicate = existingExams.find(
    (exam) =>
      exam.schoolId === input.schoolId &&
      exam.sessionId === input.sessionId &&
      exam.termId === input.termId &&
      exam.classId === input.classId &&
      exam.name.toLowerCase() === name.toLowerCase(),
  );

  if (duplicate) {
    throw new Error(
      "An exam with this name already exists for the selected class, session and term.",
    );
  }

  const exam = await db.orm.public.Exam.create({
    schoolId: input.schoolId,
    sessionId: input.sessionId,
    termId: input.termId,
    classId: input.classId,
    name,
    startDate: toInstant(start.toISOString()),
    endDate: toInstant(end.toISOString()),
    status: input.status ?? "DRAFT",
    isActive: input.isActive ?? true,
  });

  await writeAuditLog({
    schoolId: input.schoolId,
    userId,
    action: "CREATE",
    entity: "Exam",
    entityId: exam.id,
    newValue: {
      sessionId: input.sessionId,
      termId: input.termId,
      classId: input.classId,
      name,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? "DRAFT",
      isActive: input.isActive ?? true,
    },
  });

  return exam;
}

export async function updateExam(
  userId: number,
  examId: number,
  schoolId: number,
  input: UpdateExamInput,
) {
  const allowed = await hasPermission(userId, "exams.edit");

  if (!allowed) {
    throw new Error("Permission denied: exams.edit");
  }

  const existing = await getExam(examId, schoolId);

  if (!existing) {
    throw new Error("Exam not found.");
  }

  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = normalizeName(input.name);

    if (!name) {
      throw new Error("Exam name is required.");
    }

    const existingExams = await db.orm.public.Exam.all();

    const duplicate = existingExams.find(
      (exam) =>
        exam.id !== examId &&
        exam.schoolId === schoolId &&
        exam.sessionId === existing.sessionId &&
        exam.termId === existing.termId &&
        exam.classId === existing.classId &&
        exam.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      throw new Error(
        "An exam with this name already exists for the selected class, session and term.",
      );
    }

    data.name = name;
  }

  if (
    input.startDate !== undefined ||
    input.endDate !== undefined
  ) {
    const startDate =
      input.startDate ??
      new Date(String(existing.startDate)).toISOString();

    const endDate =
      input.endDate ??
      new Date(String(existing.endDate)).toISOString();

    const { start, end } = validateDateRange(startDate, endDate);

    data.startDate = toInstant(start.toISOString());
    data.endDate = toInstant(end.toISOString());
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  if (Object.keys(data).length === 0) {
    return existing;
  }

  data.updatedAt = Temporal.Now.instant().toString();

  const updated = await db.orm.public.Exam.where({
    id: examId,
  }).update(data as never);

  await writeAuditLog({
    schoolId,
    userId,
    action: "UPDATE",
    entity: "Exam",
    entityId: examId,
    oldValue: {
      name: existing.name,
      startDate: existing.startDate,
      endDate: existing.endDate,
      status: existing.status,
      isActive: existing.isActive,
    },
    newValue: data,
  });

  return updated;
}

export async function publishExam(
  userId: number,
  examId: number,
  schoolId: number,
) {
  const allowed = await hasPermission(userId, "exams.publish");

  if (!allowed) {
    throw new Error("Permission denied: exams.publish");
  }

  const existing = await getExam(examId, schoolId);

  if (!existing) {
    throw new Error("Exam not found.");
  }

  if (!existing.isActive) {
    throw new Error("Inactive exams cannot be published.");
  }

  const updated = await db.orm.public.Exam.where({
    id: examId,
  }).update({
    status: "PUBLISHED",
    updatedAt: Temporal.Now.instant().toString(),
  });

  await writeAuditLog({
    schoolId,
    userId,
    action: "PUBLISH",
    entity: "Exam",
    entityId: examId,
    oldValue: { status: existing.status },
    newValue: { status: "PUBLISHED" },
  });

  return updated;
}

export async function closeExam(
  userId: number,
  examId: number,
  schoolId: number,
) {
  const allowed = await hasPermission(userId, "exams.close");

  if (!allowed) {
    throw new Error("Permission denied: exams.close");
  }

  const existing = await getExam(examId, schoolId);

  if (!existing) {
    throw new Error("Exam not found.");
  }

  const updated = await db.orm.public.Exam.where({
    id: examId,
  }).update({
    status: "CLOSED",
    updatedAt: Temporal.Now.instant().toString(),
  });

  await writeAuditLog({
    schoolId,
    userId,
    action: "CLOSE",
    entity: "Exam",
    entityId: examId,
    oldValue: { status: existing.status },
    newValue: { status: "CLOSED" },
  });

  return updated;
}

export async function activateExam(
  userId: number,
  examId: number,
  schoolId: number,
) {
  const allowed = await hasPermission(userId, "exams.edit");

  if (!allowed) {
    throw new Error("Permission denied: exams.edit");
  }

  const existing = await getExam(examId, schoolId);

  if (!existing) {
    throw new Error("Exam not found.");
  }

  const updated = await db.orm.public.Exam.where({
    id: examId,
  }).update({
    isActive: true,
    updatedAt: Temporal.Now.instant().toString(),
  });

  await writeAuditLog({
    schoolId,
    userId,
    action: "ACTIVATE",
    entity: "Exam",
    entityId: examId,
    oldValue: { isActive: existing.isActive },
    newValue: { isActive: true },
  });

  return updated;
}

export async function deactivateExam(
  userId: number,
  examId: number,
  schoolId: number,
) {
  const allowed = await hasPermission(userId, "exams.edit");

  if (!allowed) {
    throw new Error("Permission denied: exams.edit");
  }

  const existing = await getExam(examId, schoolId);

  if (!existing) {
    throw new Error("Exam not found.");
  }

  const updated = await db.orm.public.Exam.where({
    id: examId,
  }).update({
    isActive: false,
    updatedAt: Temporal.Now.instant().toString(),
  });

  await writeAuditLog({
    schoolId,
    userId,
    action: "DEACTIVATE",
    entity: "Exam",
    entityId: examId,
    oldValue: { isActive: existing.isActive },
    newValue: { isActive: false },
  });

  return updated;
}