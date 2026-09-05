import { db } from "../prisma/db";
import { requirePermission } from "./permissions";

export type CreateExamSubjectInput = {
  examId: number;
  subjectId: number;
  maxMark: number;
};

export type UpdateExamSubjectInput = {
  maxMark?: number;
  isActive?: boolean;
};

export type CreateAssessmentComponentInput = {
  examSubjectId: number;
  name: string;
  maxMark: number;
  sortOrder?: number;
};

export type UpdateAssessmentComponentInput = {
  name?: string;
  maxMark?: number;
  sortOrder?: number;
  isActive?: boolean;
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function validateMaxMark(maxMark: number) {
  if (!Number.isInteger(maxMark) || maxMark <= 0) {
    throw new Error("Maximum mark must be a positive whole number.");
  }

  return maxMark;
}

async function getExam(examId: number) {
  const exams = await db.orm.public.Exam.all();
  return exams.find((exam) => exam.id === examId) ?? null;
}

async function getSubject(subjectId: number) {
  const subjects = await db.orm.public.Subject.all();
  return subjects.find((subject) => subject.id === subjectId) ?? null;
}

async function getExamSubject(examSubjectId: number) {
  const items = await db.orm.public.ExamSubject.all();
  return items.find((item) => item.id === examSubjectId) ?? null;
}

async function getAssessmentComponent(componentId: number) {
  const items = await db.orm.public.AssessmentComponent.all();
  return items.find((item) => item.id === componentId) ?? null;
}

export async function getExamSubjects(examId: number) {
  const examSubjects = await db.orm.public.ExamSubject.all();
  const subjects = await db.orm.public.Subject.all();

  return examSubjects
    .filter((item) => item.examId === examId)
    .map((item) => ({
      ...item,
      subject: subjects.find((subject) => subject.id === item.subjectId) ?? null,
    }))
    .sort((a, b) => {
      const first = a.subject?.name ?? "";
      const second = b.subject?.name ?? "";
      return first.localeCompare(second);
    });
}

export async function getAssessmentComponents(examSubjectId: number) {
  const components = await db.orm.public.AssessmentComponent.all();

  return components
    .filter((item) => item.examSubjectId === examSubjectId)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.name.localeCompare(b.name);
    });
}

export async function addExamSubject(
  userId: number,
  input: CreateExamSubjectInput,
) {
  await requirePermission(userId, "exams.edit");

  const exam = await getExam(input.examId);

  if (!exam) {
    throw new Error("Exam not found.");
  }

  const subject = await getSubject(input.subjectId);

  if (!subject) {
    throw new Error("Subject not found.");
  }

  if (subject.schoolId !== exam.schoolId) {
    throw new Error("Subject does not belong to this school.");
  }

  const maxMark = validateMaxMark(input.maxMark);

  const existing = await db.orm.public.ExamSubject.all();

  if (
    existing.some(
      (item) =>
        item.examId === input.examId && item.subjectId === input.subjectId,
    )
  ) {
    throw new Error("This subject is already assigned to the exam.");
  }

  return db.orm.public.ExamSubject.create({
    examId: input.examId,
    subjectId: input.subjectId,
    maxMark,
    isActive: true,
  });
}

export async function updateExamSubject(
  userId: number,
  examSubjectId: number,
  input: UpdateExamSubjectInput,
) {
  await requirePermission(userId, "exams.edit");

  const existing = await getExamSubject(examSubjectId);

  if (!existing) {
    throw new Error("Exam subject not found.");
  }

  const data: {
    maxMark?: number;
    isActive?: boolean;
  } = {};

  if (input.maxMark !== undefined) {
    data.maxMark = validateMaxMark(input.maxMark);
  }

  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  return db.orm.public.ExamSubject.where({ id: examSubjectId }).update(data);
}

export async function removeExamSubject(
  userId: number,
  examSubjectId: number,
) {
  await requirePermission(userId, "exams.delete");

  const existing = await getExamSubject(examSubjectId);

  if (!existing) {
    throw new Error("Exam subject not found.");
  }

  const components = await getAssessmentComponents(examSubjectId);

  for (const component of components) {
    await db.orm.public.AssessmentComponent.where({
      id: component.id,
    }).delete();
  }

  await db.orm.public.ExamSubject.where({ id: examSubjectId }).delete();

  return true;
}

export async function addAssessmentComponent(
  userId: number,
  input: CreateAssessmentComponentInput,
) {
  await requirePermission(userId, "exams.edit");

  const examSubject = await getExamSubject(input.examSubjectId);

  if (!examSubject) {
    throw new Error("Exam subject not found.");
  }

  const name = normalizeName(input.name);

  if (!name) {
    throw new Error("Assessment component name is required.");
  }

  const maxMark = validateMaxMark(input.maxMark);

  const existing = await db.orm.public.AssessmentComponent.all();

  if (
    existing.some(
      (item) =>
        item.examSubjectId === input.examSubjectId &&
        item.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    throw new Error("This assessment component already exists.");
  }

  return db.orm.public.AssessmentComponent.create({
    examSubjectId: input.examSubjectId,
    name,
    maxMark,
    sortOrder: input.sortOrder ?? 0,
    isActive: true,
  });
}

export async function updateAssessmentComponent(
  userId: number,
  componentId: number,
  input: UpdateAssessmentComponentInput,
) {
  await requirePermission(userId, "exams.edit");

  const existing = await getAssessmentComponent(componentId);

  if (!existing) {
    throw new Error("Assessment component not found.");
  }

  const data: {
    name?: string;
    maxMark?: number;
    sortOrder?: number;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) {
    const name = normalizeName(input.name);

    if (!name) {
      throw new Error("Assessment component name is required.");
    }

    const components = await db.orm.public.AssessmentComponent.all();

    const duplicate = components.some(
      (item) =>
        item.id !== componentId &&
        item.examSubjectId === existing.examSubjectId &&
        item.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      throw new Error("This assessment component already exists.");
    }

    data.name = name;
  }

  if (input.maxMark !== undefined) {
    data.maxMark = validateMaxMark(input.maxMark);
  }

  if (input.sortOrder !== undefined) {
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
      throw new Error("Sort order must be zero or greater.");
    }

    data.sortOrder = input.sortOrder;
  }

  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  return db.orm.public.AssessmentComponent.where({
    id: componentId,
  }).update(data);
}

export async function removeAssessmentComponent(
  userId: number,
  componentId: number,
) {
  await requirePermission(userId, "exams.delete");

  const existing = await getAssessmentComponent(componentId);

  if (!existing) {
    throw new Error("Assessment component not found.");
  }

  await db.orm.public.AssessmentComponent.where({
    id: componentId,
  }).delete();

  return true;
}