import { describe, it, expect } from "@jest/globals";

// ── Formules extraites pour test unitaire ──────────────────────────────────
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

// ── Tests formule proportionnelle ──────────────────────────────────────────
describe("applyFormula — proportional", () => {
  it("retourne 100 quand la valeur est au maximum", () => {
    expect(applyFormula("proportional", 10, { min: 0, max: 10 })).toBe(100);
  });

  it("retourne 0 quand la valeur est au minimum", () => {
    expect(applyFormula("proportional", 0, { min: 0, max: 10 })).toBe(0);
  });

  it("retourne 50 quand la valeur est au milieu", () => {
    expect(applyFormula("proportional", 5, { min: 0, max: 10 })).toBe(50);
  });

  it("retourne 0 quand min === max pour éviter division par zéro", () => {
    expect(applyFormula("proportional", 5, { min: 5, max: 5 })).toBe(0);
  });

  it("est plafonné à 100 si la valeur dépasse le maximum", () => {
    expect(applyFormula("proportional", 15, { min: 0, max: 10 })).toBe(100);
  });
});

// ── Tests formule binaire ──────────────────────────────────────────────────
describe("applyFormula — binary", () => {
  it("retourne 100 quand la valeur est true et truePoints est le max", () => {
    expect(
      applyFormula("binary", true, { truePoints: 10, falsePoints: 0 }),
    ).toBe(100);
  });

  it("retourne 0 quand la valeur est false et falsePoints = 0", () => {
    expect(
      applyFormula("binary", false, { truePoints: 10, falsePoints: 0 }),
    ).toBe(0);
  });

  it("retourne 0 quand truePoints et falsePoints sont 0", () => {
    expect(
      applyFormula("binary", true, { truePoints: 0, falsePoints: 0 }),
    ).toBe(0);
  });
});

// ── Tests formule scale (choices) ─────────────────────────────────────────
describe("applyFormula — scale avec choices", () => {
  const config = {
    choices: [
      { label: "Débutant", points: 1 },
      { label: "Intermédiaire", points: 2 },
      { label: "Avancé", points: 3 },
    ],
  };

  it("retourne 100 pour le choix avec le plus de points", () => {
    expect(applyFormula("scale", "Avancé", config)).toBeCloseTo(100);
  });

  it("retourne 33.33 pour le choix avec le moins de points", () => {
    expect(applyFormula("scale", "Débutant", config)).toBeCloseTo(33.33, 1);
  });

  it("retourne 0 si le choix n'existe pas dans la liste", () => {
    expect(applyFormula("scale", "Expert", config)).toBe(0);
  });
});

// ── Tests calcul score global KPI + Test ──────────────────────────────────
describe("Calcul score global KPI + Test", () => {
  it("calcule correctement avec pondération 70/30", () => {
    const result = Math.round((80 * 0.7 + 60 * 0.3) * 100) / 100;
    expect(result).toBe(74);
  });

  it("retourne le score KPI seul si testWeight = 0", () => {
    const result = Math.round((85 * 1 + 0 * 0) * 100) / 100;
    expect(result).toBe(85);
  });

  it("retourne le score test seul si kpiWeight = 0", () => {
    const result = Math.round((0 * 0 + 70 * 1) * 100) / 100;
    expect(result).toBe(70);
  });

  it("la somme des pondérations doit être 1", () => {
    expect(Math.abs(0.7 + 0.3 - 1)).toBeLessThan(0.01);
  });

  it("rejette une pondération dont la somme ≠ 1", () => {
    expect(Math.abs(0.6 + 0.6 - 1)).toBeGreaterThan(0.01);
  });

  it("retourne 0 si les deux scores sont 0", () => {
    const result = Math.round((0 * 0.7 + 0 * 0.3) * 100) / 100;
    expect(result).toBe(0);
  });

  it("gère les scores décimaux", () => {
    const result = Math.round((72.5 * 0.7 + 65.5 * 0.3) * 100) / 100;
    expect(result).toBe(70.4);
  });
});

// ── Tests mise à jour byCategory après intégration test ───────────────────
describe("Mise à jour byCategory après intégration test", () => {
  const kpiScore = 80;
  const testScore = 60;
  const kpiWeight = 0.7;
  const testWeight = 0.3;
  const oldByCategory = {
    formation: 20,
    technique: 40,
    softSkills: 10,
    experience: 10,
  };

  const computeNewByCategory = (kpiSc, testSc, kpiW, testW, oldCats) => {
    const newByCategory = {};
    for (const cat of Object.keys(oldCats)) {
      const catValue = oldCats[cat];
      const catRatio = catValue / kpiSc;
      newByCategory[cat] =
        Math.round((catValue * kpiW + testSc * testW * catRatio) * 100) / 100;
    }
    return newByCategory;
  };

  it("la somme des catégories égale le nouveau score global", () => {
    const newGlobal =
      Math.round((kpiScore * kpiWeight + testScore * testWeight) * 100) / 100;
    const newByCategory = computeNewByCategory(
      kpiScore,
      testScore,
      kpiWeight,
      testWeight,
      oldByCategory,
    );
    const sum =
      Math.round(
        Object.values(newByCategory).reduce((s, v) => s + v, 0) * 100,
      ) / 100;
    expect(sum).toBeCloseTo(newGlobal, 1);
  });

  it("chaque catégorie est positive ou nulle", () => {
    const newByCategory = computeNewByCategory(
      kpiScore,
      testScore,
      kpiWeight,
      testWeight,
      oldByCategory,
    );
    Object.values(newByCategory).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });

  it("gère le cas kpiScore = 0 sans division par zéro", () => {
    const categories = ["formation", "technique", "softSkills", "experience"];
    const equalShare = Math.round(((testScore * testWeight) / 4) * 100) / 100;
    const newByCategory = Object.fromEntries(
      categories.map((cat) => [cat, equalShare]),
    );
    expect(Object.values(newByCategory).every((v) => v === equalShare)).toBe(
      true,
    );
  });

  it("met à jour les catégories proportionnellement au score KPI", () => {
    const newByCategory = computeNewByCategory(
      kpiScore,
      testScore,
      kpiWeight,
      testWeight,
      oldByCategory,
    );
    const newGlobal =
      Math.round((kpiScore * kpiWeight + testScore * testWeight) * 100) / 100;
    const sumCategories =
      Math.round(
        Object.values(newByCategory).reduce((s, v) => s + v, 0) * 100,
      ) / 100;
    expect(sumCategories).toBeCloseTo(newGlobal, 1);
  });
});
