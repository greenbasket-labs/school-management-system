import { Temporal } from "@js-temporal/polyfill";
import { db } from "../prisma/db";
import { getSchool } from "./school";
import { hasPermission, requirePermission } from "./permissions";

export type ResultStatus = "DRAFT" | "FINAL" | "PUBLISHED";

export type ResultMarkInput = {
  assessmentComponentId: number;
  mark: number | string | null;
};

export type SaveResultInput = {
  examSubjectId: number;
  studentId: number;
  marks: ResultMarkInput[];
};

type ExamSubjectContext = {
  examSubject: any;
  exam: any;
  subject: any;
  schoolClass: any;
  components: any[];
};

function toNumber(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid numeric value.");
  }

  return parsed;
}

function normalizeMark(
  value: number | string | null,
): number | null {
  if (value === null || value === "") {
    return null;
  }

  const mark = toNumber(value);

  if (mark < 0) {
    throw new Error("Mark cannot be negative.");
  }

  return mark;
}

function now(): string {
  return Temporal.Now.instant().toString();
}

async function getExamSubjectContext(
  schoolId: number,
  examSubjectId: number,
): Promise<ExamSubjectContext> {
  const examSubjects =
    await db.orm.public.ExamSubject.all();

  const exams = await db.orm.public.Exam.all();
  const subjects = await db.orm.public.Subject.all();
  const classes = await db.orm.public.SchoolClass.all();

  const components =
    await db.orm.public.AssessmentComponent.all();

  const examSubject = examSubjects.find(
    (item) => item.id === examSubjectId,
  );

  if (!examSubject) {
    throw new Error("Exam subject not found.");
  }

  const exam = exams.find(
    (item) => item.id === examSubject.examId,
  );

  if (!exam) {
    throw new Error("Exam not found.");
  }

  if (exam.schoolId !== schoolId) {
    throw new Error(
      "Exam does not belong to this school.",
    );
  }

  const subject = subjects.find(
    (item) => item.id === examSubject.subjectId,
  );

  if (!subject) {
    throw new Error("Subject not found.");
  }

  const schoolClass = classes.find(
    (item) => item.id === exam.classId,
  );

  if (!schoolClass) {
    throw new Error("Exam class not found.");
  }

  const examComponents = components
    .filter(
      (item) =>
        item.examSubjectId === examSubject.id &&
        item.isActive === true,
    )
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.name.localeCompare(b.name);
    });

  return {
    examSubject,
    exam,
    subject,
    schoolClass,
    components: examComponents,
  };
}

async function getStudentForExam(
  schoolId: number,
  studentId: number,
  classId: number,
) {
  const students = await db.orm.public.Student.all();

  const student = students.find(
    (item) => item.id === studentId,
  );

  if (!student) {
    throw new Error("Student not found.");
  }

  if (student.schoolId !== schoolId) {
    throw new Error(
      "Student does not belong to this school.",
    );
  }

  if (student.currentClassId !== classId) {
    throw new Error(
      "Student is not currently assigned to this exam class.",
    );
  }

  if (student.status !== "ACTIVE") {
    throw new Error(
      "Only active students can receive results.",
    );
  }

  return student;
}

export async function getResultById(
  schoolId: number,
  resultId: number,
) {
  const results = await db.orm.public.Result.all();

  const result = results.find(
    (item) => item.id === resultId,
  );

  if (!result) {
    return null;
  }

  if (result.schoolId !== schoolId) {
    throw new Error(
      "Result does not belong to this school.",
    );
  }

  return result;
}

export async function getResultMarks(
  resultId: number,
) {
  const marks = await db.orm.public.ResultMark.all();

  return marks
    .filter(
      (item) => item.resultId === resultId,
    )
    .sort(
      (a, b) =>
        a.assessmentComponentId -
        b.assessmentComponentId,
    );
}

export async function getResultsForExamSubject(
  schoolId: number,
  examSubjectId: number,
) {
  await getExamSubjectContext(
    schoolId,
    examSubjectId,
  );

  const results =
    await db.orm.public.Result.all();

  const students =
    await db.orm.public.Student.all();

  const resultMarks =
    await db.orm.public.ResultMark.all();

  return results
    .filter(
      (result) =>
        result.schoolId === schoolId &&
        result.examSubjectId === examSubjectId,
    )
    .map((result) => ({
      result,
      student:
        students.find(
          (student) =>
            student.id === result.studentId,
        ) ?? null,
      marks: resultMarks.filter(
        (mark) =>
          mark.resultId === result.id,
      ),
    }))
    .sort((a, b) => {
      const aName = `${a.student?.lastName ?? ""} ${
        a.student?.firstName ?? ""
      }`;

      const bName = `${b.student?.lastName ?? ""} ${
        b.student?.firstName ?? ""
      }`;

      return aName.localeCompare(bName);
    });
}

export async function getStudentsForResultEntry(
  schoolId: number,
  examSubjectId: number,
) {
  const context = await getExamSubjectContext(
    schoolId,
    examSubjectId,
  );

  const students =
    await db.orm.public.Student.all();

  const results =
    await db.orm.public.Result.all();

  const resultMarks =
    await db.orm.public.ResultMark.all();

  return students
    .filter(
      (student) =>
        student.schoolId === schoolId &&
        student.currentClassId === context.exam.classId &&
        student.status === "ACTIVE",
    )
    .map((student) => {
      const result =
        results.find(
          (item) =>
            item.schoolId === schoolId &&
            item.examSubjectId === examSubjectId &&
            item.studentId === student.id,
        ) ?? null;

      return {
        student,
        result,
        marks: result
          ? resultMarks.filter(
              (mark) =>
                mark.resultId === result.id,
            )
          : [],
      };
    })
    .sort((a, b) => {
      const aName = `${a.student.lastName} ${a.student.firstName}`;
      const bName = `${b.student.lastName} ${b.student.firstName}`;

      return aName.localeCompare(bName);
    });
}

export async function calculateResultTotal(
  schoolId: number,
  examSubjectId: number,
  marks: ResultMarkInput[],
): Promise<number> {
  const context = await getExamSubjectContext(
    schoolId,
    examSubjectId,
  );

  const componentMap = new Map(
    context.components.map((component) => [
      component.id,
      component,
    ]),
  );

  let total = 0;

  for (const input of marks) {
    const component = componentMap.get(
      input.assessmentComponentId,
    );

    if (!component) {
      throw new Error(
        `Assessment component ${input.assessmentComponentId} does not belong to this exam subject.`,
      );
    }

    const mark = normalizeMark(input.mark);

    if (mark === null) {
      continue;
    }

    if (mark > component.maxMark) {
      throw new Error(
        `${component.name}: mark cannot exceed ${component.maxMark}.`,
      );
    }

    total += mark;
  }

  if (total > context.examSubject.maxMark) {
    throw new Error(
      `Total mark cannot exceed ${context.examSubject.maxMark}.`,
    );
  }

  return total;
}

export async function saveStudentResult(
  userId: number,
  schoolId: number,
  input: SaveResultInput,
) {
  const context = await getExamSubjectContext(
    schoolId,
    input.examSubjectId,
  );

  const student = await getStudentForExam(
    schoolId,
    input.studentId,
    context.exam.classId,
  );

  const existingResults =
    await db.orm.public.Result.all();

  const existingResult =
    existingResults.find(
      (result) =>
        result.schoolId === schoolId &&
        result.examSubjectId === input.examSubjectId &&
        result.studentId === input.studentId,
    ) ?? null;

  if (existingResult) {
    await requirePermission(
      userId,
      "results.edit",
    );

    if (existingResult.status !== "DRAFT") {
      throw new Error(
        "Only DRAFT results can be edited.",
      );
    }
  } else {
    await requirePermission(
      userId,
      "results.enter",
    );
  }

  const componentMap = new Map(
    context.components.map((component) => [
      component.id,
      component,
    ]),
  );

  const cleanedMarks = new Map<number, number>();

  for (const inputMark of input.marks) {
    const component = componentMap.get(
      inputMark.assessmentComponentId,
    );

    if (!component) {
      throw new Error(
        "One or more assessment components do not belong to this exam subject.",
      );
    }

    const mark = normalizeMark(inputMark.mark);

    if (mark === null) {
      continue;
    }

    if (mark > component.maxMark) {
      throw new Error(
        `${component.name}: mark cannot exceed ${component.maxMark}.`,
      );
    }

    cleanedMarks.set(component.id, mark);
  }

  const totalMark =
    await calculateResultTotal(
      schoolId,
      input.examSubjectId,
      Array.from(
        cleanedMarks.entries(),
      ).map(
        ([assessmentComponentId, mark]) => ({
          assessmentComponentId,
          mark,
        }),
      ),
    );

  let result;

  if (!existingResult) {
    result =
      await db.orm.public.Result.create({
        schoolId,
        examSubjectId:
          input.examSubjectId,
        studentId: student.id,
        totalMark:
          totalMark.toFixed(2),
        grade: null,
        position: null,
        status: "DRAFT",
        enteredByUserId: userId,
        updatedByUserId: userId,
      });
  } else {
    result =
      await db.orm.public.Result.where({
        id: existingResult.id,
      }).update({
        totalMark:
          totalMark.toFixed(2),
        position: null,
        updatedByUserId: userId,
        updatedAt: now(),
      });
  }

  if (!result) {
    throw new Error(
      "Failed to save result.",
    );
  }

  const existingMarks =
    await db.orm.public.ResultMark.all();

  for (const component of context.components) {
    const newMark =
      cleanedMarks.get(component.id);

    const existingMark =
      existingMarks.find(
        (item) =>
          item.resultId === result.id &&
          item.assessmentComponentId ===
            component.id,
      ) ?? null;

    if (newMark === undefined) {
      if (existingMark) {
        await db.orm.public.ResultMark.where({
          id: existingMark.id,
        }).delete();
      }

      continue;
    }

    if (existingMark) {
      await db.orm.public.ResultMark.where({
        id: existingMark.id,
      }).update({
        mark: newMark.toFixed(2),
        updatedAt: now(),
      });
    } else {
      await db.orm.public.ResultMark.create({
        resultId: result.id,
        assessmentComponentId:
          component.id,
        mark: newMark.toFixed(2),
      });
    }
  }

  return {
    result,
    student,
    totalMark,
  };
}

/*
 * ---------------------------------------------------------
 * SUBJECT RANKING
 * ---------------------------------------------------------
 *
 * Internal calculation has NO permission check.
 *
 * Permission is checked by the public action below.
 * This allows automatic recalculation when results are
 * published without incorrectly requiring the publishing
 * user to separately invoke the ranking action.
 */

async function recalculateSubjectRanking(
  schoolId: number,
  examSubjectId: number,
  updatedByUserId: number,
) {
  const context = await getExamSubjectContext(
    schoolId,
    examSubjectId,
  );

  const results =
    await db.orm.public.Result.all();

  const students =
    await db.orm.public.Student.all();

  const publishedResults = results
    .filter(
      (result) =>
        result.schoolId === schoolId &&
        result.examSubjectId === examSubjectId &&
        result.status === "PUBLISHED",
    )
    .map((result) => ({
      result,
      student:
        students.find(
          (student) =>
            student.id === result.studentId,
        ) ?? null,
    }))
    .filter(
      (item) =>
        item.student !== null &&
        item.student.schoolId === schoolId &&
        item.student.currentClassId ===
          context.exam.classId &&
        item.student.status === "ACTIVE",
    )
    .sort((a, b) => {
      const aTotal = Number(
        a.result.totalMark,
      );

      const bTotal = Number(
        b.result.totalMark,
      );

      if (bTotal !== aTotal) {
        return bTotal - aTotal;
      }

      const aName =
        `${a.student?.lastName ?? ""} ${
          a.student?.firstName ?? ""
        }`;

      const bName =
        `${b.student?.lastName ?? ""} ${
          b.student?.firstName ?? ""
        }`;

      return aName.localeCompare(bName);
    });

  let previousMark: number | null = null;
  let previousPosition = 0;

  for (
    let index = 0;
    index < publishedResults.length;
    index += 1
  ) {
    const item = publishedResults[index];

    const total = Number(
      item.result.totalMark,
    );

    let position: number;

    if (
      previousMark !== null &&
      total === previousMark
    ) {
      position = previousPosition;
    } else {
      position = index + 1;
    }

    await db.orm.public.Result.where({
      id: item.result.id,
    }).update({
      position,
      updatedAt: now(),
      updatedByUserId,
    });

    previousMark = total;
    previousPosition = position;
  }

  return publishedResults.map(
    (item, index) => {
      const total = Number(
        item.result.totalMark,
      );

      const position =
        index === 0
          ? 1
          : total ===
              Number(
                publishedResults[index - 1]
                  .result.totalMark,
              )
            ? Number(
                publishedResults[index - 1]
                  .result.position,
              )
            : index + 1;

      return {
        resultId: item.result.id,
        studentId: item.result.studentId,
        studentName: item.student
          ? `${item.student.firstName} ${item.student.lastName}`
          : "Unknown Student",
        totalMark: total,
        position,
      };
    },
  );
}

export async function calculateSubjectRanking(
  userId: number,
  schoolId: number,
  examSubjectId: number,
) {
  await requirePermission(
    userId,
    "results.approve",
  );

  return recalculateSubjectRanking(
    schoolId,
    examSubjectId,
    userId,
  );
}

export async function getSubjectRanking(
  schoolId: number,
  examSubjectId: number,
) {
  const context = await getExamSubjectContext(
    schoolId,
    examSubjectId,
  );

  const results =
    await db.orm.public.Result.all();

  const students =
    await db.orm.public.Student.all();

  return results
    .filter(
      (result) =>
        result.schoolId === schoolId &&
        result.examSubjectId === examSubjectId &&
        result.status === "PUBLISHED" &&
        result.position !== null,
    )
    .map((result) => ({
      result,
      student:
        students.find(
          (student) =>
            student.id === result.studentId,
        ) ?? null,
    }))
    .filter(
      (item) =>
        item.student !== null &&
        item.student.currentClassId ===
          context.exam.classId,
    )
    .sort((a, b) => {
      const aPosition =
        Number(a.result.position);

      const bPosition =
        Number(b.result.position);

      if (aPosition !== bPosition) {
        return aPosition - bPosition;
      }

      return (
        Number(b.result.totalMark) -
        Number(a.result.totalMark)
      );
    });
}

/*
 * ---------------------------------------------------------
 * RESULT STATUS
 * ---------------------------------------------------------
 */

export async function updateResultStatus(
  userId: number,
  schoolId: number,
  resultId: number,
  status: ResultStatus,
) {
  const result = await getResultById(
    schoolId,
    resultId,
  );

  if (!result) {
    throw new Error(
      "Result not found.",
    );
  }

  if (status === "FINAL") {
    await requirePermission(
      userId,
      "results.approve",
    );

    if (result.status !== "DRAFT") {
      throw new Error(
        "Only DRAFT results can be finalized.",
      );
    }
  }

  if (status === "PUBLISHED") {
    await requirePermission(
      userId,
      "results.publish",
    );

    if (result.status !== "FINAL") {
      throw new Error(
        "Only FINAL results can be published.",
      );
    }
  }

  if (status === "DRAFT") {
    throw new Error(
      "Use result editing instead of manually changing a result back to DRAFT.",
    );
  }

  const updated =
    await db.orm.public.Result.where({
      id: result.id,
    }).update({
      status,
      updatedByUserId: userId,
      updatedAt: now(),
    });

  if (!updated) {
    throw new Error(
      "Failed to update result status.",
    );
  }

  /*
   * Publishing a result automatically recalculates
   * the complete subject ranking.
   */
  if (status === "PUBLISHED") {
    await recalculateSubjectRanking(
      schoolId,
      result.examSubjectId,
      userId,
    );
  }

  return updated;
}

export async function finalizeResult(
  userId: number,
  schoolId: number,
  resultId: number,
) {
  return updateResultStatus(
    userId,
    schoolId,
    resultId,
    "FINAL",
  );
}

export async function publishResult(
  userId: number,
  schoolId: number,
  resultId: number,
) {
  return updateResultStatus(
    userId,
    schoolId,
    resultId,
    "PUBLISHED",
  );
}

/*
 * ---------------------------------------------------------
 * PERMISSION HELPERS
 * ---------------------------------------------------------
 */

export async function canEnterResults(
  userId: number,
) {
  return hasPermission(
    userId,
    "results.enter",
  );
}

export async function canEditResults(
  userId: number,
) {
  return hasPermission(
    userId,
    "results.edit",
  );
}

export async function canApproveResults(
  userId: number,
) {
  return hasPermission(
    userId,
    "results.approve",
  );
}

export async function canPublishResults(
  userId: number,
) {
  return hasPermission(
    userId,
    "results.publish",
  );
}

/*
 * ---------------------------------------------------------
 * CLASS OVERALL RANKING
 * ---------------------------------------------------------
 *
 * Calculates the overall ranking of students within the
 * class for one examination.
 *
 * Only PUBLISHED results are included.
 *
 * No manual position is accepted.
 *
 * Example:
 *
 * Student A:
 *   Mathematics = 80
 *   English     = 70
 *   Science     = 90
 *
 *   Overall = 240 / 300
 *   Average = 80%
 *
 * Students are ranked automatically by average percentage.
 *
 * Ties use competition ranking:
 *
 * 90% -> 1
 * 85% -> 2
 * 85% -> 2
 * 70% -> 4
 */

export async function getClassOverallRanking(
  schoolId: number,
  examId: number,
) {
  const exams =
    await db.orm.public.Exam.all();

  const exam = exams.find(
    (item) =>
      item.id === examId &&
      item.schoolId === schoolId,
  );

  if (!exam) {
    throw new Error("Exam not found.");
  }

  const examSubjects =
    await db.orm.public.ExamSubject.all();

  const examSubjectsForExam =
    examSubjects.filter(
      (item) =>
        item.examId === examId &&
        item.isActive === true,
    );

  const results =
    await db.orm.public.Result.all();

  const students =
    await db.orm.public.Student.all();

  const classes =
    await db.orm.public.SchoolClass.all();

  const schoolClass = classes.find(
    (item) =>
      item.id === exam.classId &&
      item.schoolId === schoolId,
  );

  if (!schoolClass) {
    throw new Error("Exam class not found.");
  }

  const classStudents = students.filter(
    (student) =>
      student.schoolId === schoolId &&
      student.currentClassId === exam.classId &&
      student.status === "ACTIVE",
  );

  const ranking = classStudents
    .map((student) => {
      const studentResults =
        examSubjectsForExam
          .map((examSubject) => {
            const result =
              results.find(
                (item) =>
                  item.schoolId === schoolId &&
                  item.examSubjectId ===
                    examSubject.id &&
                  item.studentId === student.id &&
                  item.status === "PUBLISHED",
              );

            return {
              examSubject,
              result: result ?? null,
            };
          });

      const publishedResults =
        studentResults.filter(
          (item) => item.result !== null,
        );

      const totalMark =
        publishedResults.reduce(
          (sum, item) =>
            sum +
            Number(
              item.result!.totalMark,
            ),
          0,
        );

      const maximumMark =
        publishedResults.reduce(
          (sum, item) =>
            sum +
            Number(
              item.examSubject.maxMark,
            ),
          0,
        );

      const average =
        maximumMark > 0
          ? (totalMark / maximumMark) * 100
          : 0;

      return {
        studentId: student.id,
        studentName:
          `${student.firstName} ${student.lastName}`,
        permanentId:
          student.permanentId,
        classId: exam.classId,
        subjectsTaken:
          publishedResults.length,
        totalMark,
        maximumMark,
        average,
        position: null as number | null,
      };
    })
    .filter(
      (item) =>
        item.subjectsTaken > 0,
    )
    .sort((a, b) => {
      if (b.average !== a.average) {
        return b.average - a.average;
      }

      if (b.totalMark !== a.totalMark) {
        return b.totalMark - a.totalMark;
      }

      return a.studentName.localeCompare(
        b.studentName,
      );
    });

  let previousAverage: number | null =
    null;

  let previousPosition = 0;

  for (
    let index = 0;
    index < ranking.length;
    index += 1
  ) {
    const item = ranking[index];

    let position: number;

    if (
      previousAverage !== null &&
      item.average === previousAverage
    ) {
      position = previousPosition;
    } else {
      position = index + 1;
    }

    item.position = position;

    previousAverage = item.average;
    previousPosition = position;
  }

  return {
    exam,
    schoolClass,
    subjects: examSubjectsForExam,
    ranking,
  };
}

export async function getSchoolOverallRanking(
  schoolId: number,
  examId: number,
) {
  const exams = await db.orm.public.Exam.all();

  const exam = exams.find(
    (item) => item.id === examId && item.schoolId === schoolId,
  );

  if (!exam) {
    throw new Error("Exam not found.");
  }

  const examSubjects = await db.orm.public.ExamSubject.all();

  const examSubjectsForExam = examSubjects.filter(
    (item) =>
      item.examId === examId &&
      item.isActive === true,
  );

  const results = await db.orm.public.Result.all();
  const students = await db.orm.public.Student.all();
  const classes = await db.orm.public.SchoolClass.all();

  const classById = new Map(
    classes
      .filter((item) => item.schoolId === schoolId)
      .map((item) => [item.id, item]),
  );

  /*
   * School ranking is calculated only from published results.
   *
   * A student must have a published result for every active
   * subject in the exam before entering the overall ranking.
   *
   * This prevents a student with incomplete results from being
   * ranked against students with complete results.
   */
  const ranking = students
    .filter(
      (student) =>
        student.schoolId === schoolId &&
        student.status === "ACTIVE",
    )
    .map((student) => {
      const studentResults = examSubjectsForExam.map(
        (examSubject) => {
          const result = results.find(
            (item) =>
              item.schoolId === schoolId &&
              item.examSubjectId === examSubject.id &&
              item.studentId === student.id &&
              item.status === "PUBLISHED",
          );

          return {
            examSubject,
            result: result ?? null,
          };
        },
      );

      const complete = studentResults.every(
        (item) => item.result !== null,
      );

      if (!complete) {
        return null;
      }

      const totalMark = studentResults.reduce(
        (sum, item) =>
          sum + Number(item.result!.totalMark),
        0,
      );

      const maximumMark = studentResults.reduce(
        (sum, item) =>
          sum + Number(item.examSubject.maxMark),
        0,
      );

      const average =
        maximumMark > 0
          ? (totalMark / maximumMark) * 100
          : 0;

      const schoolClass = student.currentClassId
        ? classById.get(student.currentClassId)
        : undefined;

      const classLabel = schoolClass
        ? schoolClass.section
          ? `${schoolClass.name} ${schoolClass.section}`
          : schoolClass.name
        : "Unassigned";

      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        permanentId: student.permanentId,
        classId: student.currentClassId,
        className: classLabel,
        subjectsTaken: studentResults.length,
        totalMark,
        maximumMark,
        average,
        position: null as number | null,
      };
    })
    .filter(
      (
        item,
      ): item is NonNullable<typeof item> =>
        item !== null,
    )
    .sort((a, b) => {
      if (b.average !== a.average) {
        return b.average - a.average;
      }

      if (b.totalMark !== a.totalMark) {
        return b.totalMark - a.totalMark;
      }

      return a.studentName.localeCompare(
        b.studentName,
      );
    });

  /*
   * Automatic competition ranking:
   *
   * 1st
   * 2nd
   * 2nd
   * 4th
   *
   * Students with the same average receive the same
   * position.
   */
  let previousAverage: number | null = null;
  let previousPosition = 0;

  for (
    let index = 0;
    index < ranking.length;
    index += 1
  ) {
    const item = ranking[index];

    let position: number;

    if (
      previousAverage !== null &&
      item.average === previousAverage
    ) {
      position = previousPosition;
    } else {
      position = index + 1;
    }

    item.position = position;

    previousAverage = item.average;
    previousPosition = position;
  }

  return {
    exam,
    subjects: examSubjectsForExam,
    ranking,
  };
}

export async function getStudentReportCard(
  schoolId: number,
  examId: number,
  studentId: number,
) {
  const school = await getSchool();

  if (!school || school.id !== schoolId) {
    throw new Error("School not found.");
  }

  const exams = await db.orm.public.Exam.all();
  const exam = exams.find(
    (item) =>
      item.id === examId &&
      item.schoolId === schoolId,
  );

  if (!exam) {
    throw new Error("Exam not found.");
  }

  const students = await db.orm.public.Student.all();
  const student = students.find(
    (item) =>
      item.id === studentId &&
      item.schoolId === schoolId,
  );

  if (!student) {
    throw new Error("Student not found.");
  }

  if (student.currentClassId !== exam.classId) {
    throw new Error(
      "Student is not currently assigned to this exam class.",
    );
  }

  const classes = await db.orm.public.SchoolClass.all();

  const schoolClass = classes.find(
    (item) =>
      item.id === exam.classId &&
      item.schoolId === schoolId,
  );

  if (!schoolClass) {
    throw new Error("Student class not found.");
  }

  const classLabel = schoolClass.section
    ? `${schoolClass.name} ${schoolClass.section}`
    : schoolClass.name;

  const examSubjects =
    await db.orm.public.ExamSubject.all();

  const subjectsForExam = examSubjects
    .filter(
      (item) =>
        item.examId === examId &&
        item.isActive === true,
    )
    .sort((a, b) => a.id - b.id);

  const subjects =
    await db.orm.public.Subject.all();

  const components =
    await db.orm.public.AssessmentComponent.all();

  const results =
    await db.orm.public.Result.all();

  const resultMarks =
    await db.orm.public.ResultMark.all();

  /*
   * Only published results appear on an official report card.
   */
  const subjectResults = subjectsForExam.map(
    (examSubject) => {
      const subject = subjects.find(
        (item) => item.id === examSubject.subjectId,
      );

      const result = results.find(
        (item) =>
          item.schoolId === schoolId &&
          item.examSubjectId === examSubject.id &&
          item.studentId === studentId &&
          item.status === "PUBLISHED",
      );

      const subjectComponents = components
        .filter(
          (component) =>
            component.examSubjectId === examSubject.id &&
            component.isActive === true,
        )
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }

          return a.name.localeCompare(b.name);
        });

      const marks = subjectComponents.map(
        (component) => {
          const resultMark = result
            ? resultMarks.find(
                (item) =>
                  item.resultId === result.id &&
                  item.assessmentComponentId ===
                    component.id,
              )
            : null;

          return {
            componentId: component.id,
            componentName: component.name,
            maxMark: component.maxMark,
            mark: resultMark
              ? Number(resultMark.mark)
              : null,
          };
        },
      );

      return {
        examSubjectId: examSubject.id,
        subjectId: examSubject.subjectId,
        subjectName:
          subject?.name ?? "Unknown Subject",
        subjectCode:
          subject?.code ?? null,
        maxMark: examSubject.maxMark,
        resultId: result?.id ?? null,
        totalMark: result
          ? Number(result.totalMark)
          : null,
        grade: result?.grade ?? null,
        position: result?.position ?? null,
        status: result?.status ?? null,
        components: marks,
      };
    },
  );

  const publishedSubjects =
    subjectResults.filter(
      (item) => item.resultId !== null,
    );

  const totalMark = publishedSubjects.reduce(
    (sum, item) =>
      sum + (item.totalMark ?? 0),
    0,
  );

  const maximumMark = publishedSubjects.reduce(
    (sum, item) =>
      sum + item.maxMark,
    0,
  );

  const average =
    maximumMark > 0
      ? (totalMark / maximumMark) * 100
      : 0;

  /*
   * Get automatic class ranking.
   */
  const classRanking =
    await getClassOverallRanking(
      schoolId,
      examId,
    );

  const classRankedStudent =
    classRanking.ranking.find(
      (item) =>
        item.studentId === studentId,
    );

  /*
   * Get automatic school ranking.
   */
  const schoolRanking =
    await getSchoolOverallRanking(
      schoolId,
      examId,
    );

  const schoolRankedStudent =
    schoolRanking.ranking.find(
      (item) =>
        item.studentId === studentId,
    );

  /*
   * Attendance for the exam class/date range.
   */
  const attendanceRecords =
    await db.orm.public.AttendanceRecord.all();

  const examStart =
    Temporal.Instant.from(exam.startDate.toString()).epochMilliseconds;

  const examEnd =
    Temporal.Instant.from(exam.endDate.toString()).epochMilliseconds;

  const studentAttendance =
    attendanceRecords.filter((record) => {
      if (
        record.schoolId !== schoolId ||
        record.studentId !== studentId ||
        record.classId !== exam.classId
      ) {
        return false;
      }

      const recordDate =
        Temporal.Instant.from(
          record.attendanceDate.toString(),
        ).epochMilliseconds;

      return (
        recordDate >= examStart &&
        recordDate <= examEnd
      );
    });

  const attendancePresent =
    studentAttendance.filter(
      (record) =>
        record.status === "PRESENT",
    ).length;

  const attendanceAbsent =
    studentAttendance.filter(
      (record) =>
        record.status === "ABSENT",
    ).length;

  const attendanceTotal =
    attendancePresent + attendanceAbsent;

  const attendanceRate =
    attendanceTotal > 0
      ? (attendancePresent / attendanceTotal) * 100
      : 0;

  return {
    school,
    exam,
    student,
    schoolClass,
    classLabel,

    subjects: subjectResults,

    summary: {
      publishedSubjects:
        publishedSubjects.length,
      totalSubjects:
        subjectsForExam.length,
      totalMark,
      maximumMark,
      average,
    },

    classRanking: {
      position:
        classRankedStudent?.position ?? null,
      totalStudents:
        classRanking.ranking.length,
    },

    schoolRanking: {
      position:
        schoolRankedStudent?.position ?? null,
      totalStudents:
        schoolRanking.ranking.length,
    },

    attendance: {
      present: attendancePresent,
      absent: attendanceAbsent,
      total: attendanceTotal,
      rate: attendanceRate,
    },
  };
}