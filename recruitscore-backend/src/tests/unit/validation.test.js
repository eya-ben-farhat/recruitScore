import { describe, it, expect } from "@jest/globals";

// Fonctions de validation extraites de la logique métier
const validateTestResult = (answers, testQuestions) => {
  for (const answer of answers) {
    const question = testQuestions.find(
      (q) => q.questionId.toString() === answer.questionId,
    );
    if (question && answer.pointsObtained > question.points) {
      return {
        valid: false,
        message: `Points (${answer.pointsObtained}) dépassent le max (${question.points})`,
      };
    }
  }
  return { valid: true };
};

const validateWeights = (kpiWeight, testWeight) => {
  return Math.abs(kpiWeight + testWeight - 1) <= 0.01;
};

const validateGenerationCriteria = (criteria) => {
  if (!criteria.totalQuestions || criteria.totalQuestions < 1) return false;
  if (criteria.totalQuestions > 100) return false;
  const validDifficulties = ["easy", "medium", "hard", "mixed"];
  if (criteria.difficulty && !validDifficulties.includes(criteria.difficulty))
    return false;
  const validThemes = ["algorithmique", "web", "DB", "réseau"];
  if (criteria.themes?.length > 0) {
    if (!criteria.themes.every((t) => validThemes.includes(t))) return false;
  }
  return true;
};

describe("Validation des résultats de test", () => {
  const questions = [
    { questionId: "q1", points: 10 },
    { questionId: "q2", points: 5 },
  ];

  it("accepte des points dans les limites", () => {
    const answers = [
      { questionId: "q1", pointsObtained: 8 },
      { questionId: "q2", pointsObtained: 5 },
    ];
    expect(validateTestResult(answers, questions).valid).toBe(true);
  });

  it("refuse des points dépassant le maximum", () => {
    const answers = [{ questionId: "q1", pointsObtained: 15 }];
    expect(validateTestResult(answers, questions).valid).toBe(false);
  });

  it("accepte 0 comme points obtenus", () => {
    const answers = [{ questionId: "q1", pointsObtained: 0 }];
    expect(validateTestResult(answers, questions).valid).toBe(true);
  });

  it("accepte des points exactement égaux au maximum", () => {
    const answers = [{ questionId: "q1", pointsObtained: 10 }];
    expect(validateTestResult(answers, questions).valid).toBe(true);
  });
});

describe("Validation des pondérations", () => {
  it("accepte 0.7 + 0.3 = 1", () => {
    expect(validateWeights(0.7, 0.3)).toBe(true);
  });
  it("accepte 0.5 + 0.5 = 1", () => {
    expect(validateWeights(0.5, 0.5)).toBe(true);
  });
  it("accepte 1.0 + 0.0 = 1", () => {
    expect(validateWeights(1.0, 0.0)).toBe(true);
  });
  it("refuse 0.6 + 0.6 = 1.2", () => {
    expect(validateWeights(0.6, 0.6)).toBe(false);
  });
  it("refuse 0.3 + 0.3 = 0.6", () => {
    expect(validateWeights(0.3, 0.3)).toBe(false);
  });
});

describe("Validation des critères de génération", () => {
  it("accepte des critères valides", () => {
    expect(
      validateGenerationCriteria({
        totalQuestions: 10,
        difficulty: "mixed",
        themes: ["web", "algorithmique"],
      }),
    ).toBe(true);
  });
  it("refuse totalQuestions = 0", () => {
    expect(validateGenerationCriteria({ totalQuestions: 0 })).toBe(false);
  });
  it("refuse totalQuestions > 100", () => {
    expect(validateGenerationCriteria({ totalQuestions: 101 })).toBe(false);
  });
  it("refuse une difficulté invalide", () => {
    expect(
      validateGenerationCriteria({
        totalQuestions: 10,
        difficulty: "extreme",
      }),
    ).toBe(false);
  });
  it("refuse un thème invalide", () => {
    expect(
      validateGenerationCriteria({
        totalQuestions: 10,
        themes: ["python"],
      }),
    ).toBe(false);
  });
  it("accepte sans themes (tous les thèmes)", () => {
    expect(validateGenerationCriteria({ totalQuestions: 10 })).toBe(true);
  });
});
