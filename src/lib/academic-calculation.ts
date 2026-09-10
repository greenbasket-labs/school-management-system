export type AssessmentRule = {
  name: string;
  maxMark: number;
  weightPercent: number;
  required?: boolean;
};

export type GradeRule = {
  minScore: number;
  maxScore: number;
  grade: string;
  point?: number;
  remark?: string;
  pass?: boolean;
};

export type RankedResult = {
  studentId: number;
  score: number;
  position: number;
};

export type MissingScoreMode = "ZERO" | "PENDING" | "NOT_APPLICABLE";
export type AbsentScoreMode = "ABSENT" | "EXCLUDED" | "ZERO";
export type TieMode = "COMPETITION" | "DENSE" | "ORDINAL";

export type ResultCalculationOptions = {
  missingScoreMode?: MissingScoreMode;
  absentScoreMode?: AbsentScoreMode;
  rounding?: number;
};

export function validateAssessmentRules(rules: AssessmentRule[]) {
  if (rules.length === 0) {
    throw new Error("At least one assessment component is required.");
  }

  for (const rule of rules) {
    if (!rule.name.trim()) throw new Error("Assessment component name is required.");
    if (!Number.isFinite(rule.maxMark) || rule.maxMark <= 0) {
      throw new Error(`Invalid maximum mark for ${rule.name}.`);
    }
    if (!Number.isFinite(rule.weightPercent) || rule.weightPercent < 0) {
      throw new Error(`Invalid weight for ${rule.name}.`);
    }
  }

  const weight = rules.reduce((sum, rule) => sum + rule.weightPercent, 0);
  if (Math.abs(weight - 100) > 0.001) {
    throw new Error(`Assessment weights must total 100%. Current total: ${weight}%.`);
  }
}

function roundScore(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateWeightedScore(
  marks: Record<string, number | null | undefined>,
  rules: AssessmentRule[],
  options: ResultCalculationOptions = {},
) {
  validateAssessmentRules(rules);

  const missingMode = options.missingScoreMode ?? "PENDING";
  const decimals = options.rounding ?? 2;
  let total = 0;

  for (const rule of rules) {
    const rawMark = marks[rule.name];
    const missing = rawMark === undefined || rawMark === null;

    if (missing) {
      if (rule.required && missingMode === "PENDING") {
        throw new Error(`${rule.name} is required.`);
      }
      if (missingMode === "ZERO") continue;
      if (missingMode === "NOT_APPLICABLE") continue;
      continue;
    }

    const mark = Number(rawMark);
    if (!Number.isFinite(mark) || mark < 0 || mark > rule.maxMark) {
      throw new Error(`Invalid mark for ${rule.name}.`);
    }

    total += (mark / rule.maxMark) * rule.weightPercent;
  }

  return roundScore(total, decimals);
}

export function resolveAbsentScore(
  mode: AbsentScoreMode,
  calculatedScore = 0,
) {
  if (mode === "ZERO") return 0;
  if (mode === "EXCLUDED") return null;
  return { status: "ABSENT" as const, score: calculatedScore };
}

export function getGrade(score: number, rules: GradeRule[]) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("Score must be between 0 and 100.");
  }

  validateGradeRules(rules);
  const match = rules.find(
    (rule) => score >= rule.minScore && score <= rule.maxScore,
  );

  return match ?? null;
}

export function rankScores(
  scores: Array<{ studentId: number; score: number }>,
  tieMode: TieMode = "COMPETITION",
): RankedResult[] {
  const ordered = [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.studentId - b.studentId;
  });

  let previousScore: number | null = null;
  let previousPosition = 0;
  let densePosition = 0;

  return ordered.map((item, index) => {
    const sameScore = previousScore !== null && item.score === previousScore;
    let position: number;

    if (sameScore) {
      position = previousPosition;
    } else if (tieMode === "DENSE") {
      densePosition += 1;
      position = densePosition;
    } else if (tieMode === "ORDINAL") {
      position = index + 1;
    } else {
      position = index + 1;
    }

    previousScore = item.score;
    previousPosition = position;

    return { studentId: item.studentId, score: item.score, position };
  });
}

export function validateGradeRules(rules: GradeRule[]) {
  if (rules.length === 0) {
    throw new Error("At least one grading rule is required.");
  }

  for (const rule of rules) {
    if (
      !Number.isFinite(rule.minScore) ||
      !Number.isFinite(rule.maxScore) ||
      rule.minScore < 0 ||
      rule.maxScore > 100 ||
      rule.minScore > rule.maxScore ||
      !rule.grade.trim()
    ) {
      throw new Error(`Invalid score range for grade ${rule.grade || "unknown"}.`);
    }
  }

  const ordered = [...rules].sort((a, b) => a.minScore - b.minScore);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].minScore <= ordered[index - 1].maxScore) {
      throw new Error("Grading score ranges must not overlap.");
    }
  }
}

export function validateManualResultOverride(input: {
  score?: number;
  grade?: string;
  position?: number;
  reason: string;
}) {
  if (!input.reason.trim()) {
    throw new Error("A reason is required for a manual result override.");
  }
  if (input.score !== undefined && (!Number.isFinite(input.score) || input.score < 0 || input.score > 100)) {
    throw new Error("Override score must be between 0 and 100.");
  }
  if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 1)) {
    throw new Error("Override position must be a positive integer.");
  }
  if (input.grade !== undefined && !input.grade.trim()) {
    throw new Error("Override grade cannot be empty.");
  }
}
