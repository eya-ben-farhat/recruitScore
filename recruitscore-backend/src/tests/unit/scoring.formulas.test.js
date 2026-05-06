import { describe, it, expect } from "@jest/globals";

const applyFormula = (formula, value, config) => {
  switch (formula) {
    case "proportional":
      if (config.max === config.min) return 0;
      return Math.min(
        Math.max(((value - config.min) / (config.max - config.min)) * 100, 0),
        100,
      );
    case "binary": {
      const maxPts = Math.max(config.truePoints || 0, config.falsePoints || 0);
      if (maxPts === 0) return 0;
      return ((value ? config.truePoints : config.falsePoints) / maxPts) * 100;
    }
    case "threshold":
      return value >= (config.threshold || 0) ? 100 : 0;
    case "scale":
      if (config.choices?.length > 0) {
        const choice = config.choices.find((c) => c.label === value);
        if (!choice) return 0;
        const maxC = Math.max(...config.choices.map((c) => c.points));
        return maxC === 0 ? 0 : (choice.points / maxC) * 100;
      }
      if (config.ranges?.length > 0) {
        const range = config.ranges.find(
          (r) => value >= r.from && value < r.to,
        );
        if (!range) return 0;
        const maxR = Math.max(...config.ranges.map((r) => r.points));
        return maxR === 0 ? 0 : (range.points / maxR) * 100;
      }
      return 0;
    default:
      return 0;
  }
};

describe("Formule proportionnelle", () => {
  it("retourne 100 à la valeur maximale", () => {
    expect(applyFormula("proportional", 10, { min: 0, max: 10 })).toBe(100);
  });
  it("retourne 0 à la valeur minimale", () => {
    expect(applyFormula("proportional", 0, { min: 0, max: 10 })).toBe(0);
  });
  it("retourne 50 à la valeur médiane", () => {
    expect(applyFormula("proportional", 5, { min: 0, max: 10 })).toBe(50);
  });
  it("retourne 0 si min === max (division par zéro)", () => {
    expect(applyFormula("proportional", 5, { min: 5, max: 5 })).toBe(0);
  });
  it("est plafonné à 100 si valeur > max", () => {
    expect(applyFormula("proportional", 20, { min: 0, max: 10 })).toBe(100);
  });
  it("est planché à 0 si valeur < min", () => {
    expect(applyFormula("proportional", -5, { min: 0, max: 10 })).toBe(0);
  });
  it("gère les valeurs décimales", () => {
    expect(applyFormula("proportional", 7.5, { min: 0, max: 10 })).toBe(75);
  });
});

describe("Formule binaire", () => {
  it("retourne 100 si true et truePoints > falsePoints", () => {
    expect(
      applyFormula("binary", true, { truePoints: 10, falsePoints: 0 }),
    ).toBe(100);
  });
  it("retourne 0 si false et falsePoints = 0", () => {
    expect(
      applyFormula("binary", false, { truePoints: 10, falsePoints: 0 }),
    ).toBe(0);
  });
  it("retourne 0 si truePoints et falsePoints = 0", () => {
    expect(
      applyFormula("binary", true, { truePoints: 0, falsePoints: 0 }),
    ).toBe(0);
  });
  it("gère le cas où falsePoints > 0", () => {
    expect(
      applyFormula("binary", false, { truePoints: 10, falsePoints: 5 }),
    ).toBe(50);
  });
});

describe("Formule threshold", () => {
  it("retourne 100 si valeur >= seuil", () => {
    expect(applyFormula("threshold", 5, { threshold: 5 })).toBe(100);
  });
  it("retourne 0 si valeur < seuil", () => {
    expect(applyFormula("threshold", 4, { threshold: 5 })).toBe(0);
  });
  it("retourne 100 si valeur largement supérieure au seuil", () => {
    expect(applyFormula("threshold", 100, { threshold: 5 })).toBe(100);
  });
});

describe("Formule scale avec choices", () => {
  const config = {
    choices: [
      { label: "Débutant", points: 1 },
      { label: "Intermédiaire", points: 2 },
      { label: "Avancé", points: 3 },
    ],
  };
  it("retourne 100 pour le choix maximum", () => {
    expect(applyFormula("scale", "Avancé", config)).toBeCloseTo(100);
  });
  it("retourne 33.33 pour le choix minimum", () => {
    expect(applyFormula("scale", "Débutant", config)).toBeCloseTo(33.33, 1);
  });
  it("retourne 0 pour un choix inexistant", () => {
    expect(applyFormula("scale", "Expert", config)).toBe(0);
  });
});

describe("Formule scale avec ranges", () => {
  const config = {
    ranges: [
      { from: 0, to: 12, points: 1 },
      { from: 12, to: 36, points: 2 },
      { from: 36, to: 999, points: 3 },
    ],
  };
  it("retourne 100 pour la tranche maximale", () => {
    expect(applyFormula("scale", 48, config)).toBeCloseTo(100);
  });
  it("retourne 33.33 pour la tranche minimale", () => {
    expect(applyFormula("scale", 6, config)).toBeCloseTo(33.33, 1);
  });
  it("retourne 0 si aucune tranche ne correspond", () => {
    expect(applyFormula("scale", 1000, config)).toBe(0);
  });
});
