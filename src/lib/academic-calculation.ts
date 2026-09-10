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

export function calculateWeightedScore(
  marks: Record<string, number>,
  rules: AssessmentRule[],
) {
  validateAssessmentRules(rules);

  let total = 0;
  for (const rule of rules) {
    const mark = marks[rule.name];
    if (mark === undefined) {
      if (rule.required) {
        throw new Error(`${rule.name} is required.`);
      }
      continue;
    }
    if (!Number.isFinite(mark) || mark < 0 || mark > rule.maxMark) {
      throw new Error(`Invalid mark for ${rule.name}.`);
    }
    total += (mark / rule.maxMark) * rule.weightPercent;
  }

  return Number(total.toFixed(2));
}

export function getGrade(score: number, rules: GradeRule[]) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("Score must be between 0 and 100.");
  }

  const match = rules.find(
    (rule) => score >= rule.minScore && score <= rule.maxScore,
  );

  return match ?? null;
}

export function rankScores(
  scores: Array<{ studentId: number; score: number }>,
  tieMode: "COMPETITION" | "DENSE" | "ORDINAL" = "COMPETITION",
): RankedResult[] {
  const ordered = [...scores].sort((a, b) => b.score - a.score);
  let previousScore: number | null = null;
  let previousPosition = 0;

  return ordered.map((item, index) => {
    const sameScore = previousScore !== null && item.score === previousScore;
    let position: number;

    if (sameScore) {
      position = previousPosition;
    } else if (tieMode === "DENSE") {
      position = index === 0 ? 1 : previousPosition + 1;
    } else if (tieMode === "ORDINAL") {
      position = index + 1;
    } else {
      position = index + 1;
    }

    previousScore = item.score;
    previousPosition = position;

    return {
      studentId: item.studentId,
      score: item.score,
      position,
    };
  });
}

export function validateGradeRules(rules: GradeRule[]) {
  if (rules.length === 0) {
    throw new Error("At least one grading rule is required.");
  }

  for (const rule of rules) {
    if (rule.minScore < 0 || rule.maxScore > 100 || rule.minScore > rule.maxScore) {
      throw new Error(`Invalid score range for grade ${rule.grade}.`);
    }
  }

  const ordered = [...rules].sort((a, b) => a.minScore - b.minScore);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].minScore <= ordered[index - 1].maxScore) {
      throw new Error("Grading score ranges must not overlap.");
    }
  }
}
