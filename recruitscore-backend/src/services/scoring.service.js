import ScoringTemplate from "../models/ScoringTemplate.model.js";
import Candidate from "../models/Candidate.model.js";
import { sendEmail } from "./email.service.js";
import TestResult from "../models/TestResult.model.js";
import Test from "../models/Test.model.js";
import { SCORING_CONFIG } from "../config/scoringConfig.js";

// Appliquer la formule de conversion
const applyFormula = (formula, value, config) => {
  switch (formula) {
    case "proportional":
      if (config.min === undefined || config.max === undefined) return 0;
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
      if (
        config.min !== undefined &&
        config.max !== undefined &&
        config.max !== config.min
      ) {
        return Math.min(
          Math.max(((value - config.min) / (config.max - config.min)) * 100, 0),
          100,
        );
      }
      return 0;
  }
};

// Appliquer les bonus
const applyBonus = (points, bonus, candidateData) => {
  let totalBonus = 0;
  for (const b of bonus) {
    try {
      const condition = new Function("candidate", `return ${b.condition}`)(
        candidateData,
      );
      if (condition) totalBonus += b.points;
    } catch (err) {
      console.error("Erreur evaluation bonus:", err.message);
    }
  }
  return points + totalBonus;
};

// Appliquer les malus
const applyMalus = (points, malus, candidateData) => {
  let totalMalus = 0;
  for (const m of malus) {
    try {
      const condition = new Function("candidate", `return ${m.condition}`)(
        candidateData,
      );
      if (condition) totalMalus += m.points;
    } catch (err) {
      console.error("Erreur evaluation malus:", err.message);
    }
  }
  return Math.max(0, points - totalMalus);
};

// Extraire la valeur du candidat selon la categorie et le type du KPI
const extractCandidateValue = (candidate, kpi) => {
  switch (kpi.category) {
    case "formation": {
      if (kpi.type === "numeric")
        return candidate.education?.graduationYear || null;
      if (kpi.type === "choice") return candidate.education?.level || null;
      return candidate.education?.graduationYear || null;
    }
    case "technique": {
      if (kpi.type === "boolean")
        return !!(
          candidate.personalInfo?.github ||
          candidate.projects?.some((p) => p.githubUrl)
        );
      if (kpi.type === "choice") {
        const skills = candidate.technicalSkills || [];
        if (skills.length === 0) return null;
        const levelPoints = { Débutant: 1, Intermédiaire: 2, Avancé: 3 };
        const topSkill = skills.reduce((best, skill) => {
          return (levelPoints[skill.level] || 0) >
            (levelPoints[best.level] || 0)
            ? skill
            : best;
        }, skills[0]);
        const levelMap = {
          Débutant: "Debutant",
          Intermédiaire: "Intermediaire",
          Avancé: "Avance",
        };
        return levelMap[topSkill.level] || topSkill.level;
      }
      if (kpi.type === "numeric") return candidate.technicalSkills?.length || 0;
      return null;
    }
    case "experience": {
      const totalDuration =
        candidate.experiences?.reduce(
          (sum, exp) => sum + (exp.duration || 0),
          0,
        ) || 0;
      if (kpi.type === "range" || kpi.type === "numeric") return totalDuration;
      if (kpi.type === "boolean") return totalDuration > 0;
      return totalDuration;
    }
    case "softSkills": {
      if (kpi.type === "numeric") return candidate.languages?.length || 0;
      if (kpi.type === "choice") {
        const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
        const languages = candidate.languages || [];
        if (languages.length === 0) return null;
        const topLang = languages.reduce((best, lang) => {
          return levels.indexOf(lang.level) > levels.indexOf(best.level)
            ? lang
            : best;
        }, languages[0]);
        return topLang.level;
      }
      if (kpi.type === "boolean") return (candidate.projects?.length || 0) > 0;
      return null;
    }
    default:
      return null;
  }
};

// Calculer le score d un candidat
export const calculateCandidateScore = async (
  candidateId,
  templateId = null,
) => {
  // 1. Recuperer le candidat
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) throw new Error("Candidat non trouve");

  // 2. Recuperer le template
  let template;
  if (templateId) {
    template =
      await ScoringTemplate.findById(templateId).populate("kpis.kpiId");
  } else {
    template = await ScoringTemplate.findOne({ isDefault: true }).populate(
      "kpis.kpiId",
    );
  }
  if (!template) throw new Error("Template de scoring non trouve");

  // 3. Calculer les scores par KPI
  const byKPI = [];
  const byCategory = {
    formation: 0,
    technique: 0,
    softSkills: 0,
    experience: 0,
  };
  let globalScore = 0;

  for (const templateKPI of template.kpis) {
    const kpi = templateKPI.kpiId;
    const rules = templateKPI.calculationRules;

    if (!kpi || !kpi.isActive) continue;

    // Extraire la valeur du candidat
    const value = extractCandidateValue(candidate, kpi);

    // Utiliser la formule définie dans les règles du template
    // ou la formule par défaut selon le type du KPI
    const formula =
      rules?.formula ||
      (kpi.type === "boolean"
        ? "binary"
        : kpi.type === "choice"
          ? "scale"
          : kpi.type === "range"
            ? "scale"
            : "proportional");

    // Calculer les points normalisés (0-100)
    let normalizedPoints = applyFormula(formula, value, kpi.config);

    // Appliquer bonus et malus depuis les règles du template
    let points = normalizedPoints;
    if (rules?.bonus?.length > 0)
      points = applyBonus(points, rules.bonus, candidate);
    if (rules?.malus?.length > 0)
      points = applyMalus(points, rules.malus, candidate);

    // Verifier le seuil minimum
    const minThreshold = rules?.minThreshold || kpi.minThreshold || 0;
    let justification = `Formule: ${formula}, Valeur: ${value}, Points: ${Math.round(normalizedPoints)}`;
    if (points < minThreshold) {
      points = 0;
      justification += " - Seuil minimum non atteint";
    }

    // Points ponderes selon le poids du KPI dans le template
    const pointsObtained = (points / 100) * templateKPI.weight;

    byKPI.push({
      kpiId: kpi._id,
      kpiName: kpi.name,
      rawValue: value,
      pointsObtained: Math.round(pointsObtained * 100) / 100,
      maxPoints: templateKPI.weight,
      justification,
    });

    byCategory[kpi.category] += pointsObtained;
    globalScore += pointsObtained;
  }

  // 4. Arrondir les scores
  const scores = {
    global: Math.round(globalScore * 100) / 100,
    byCategory: {
      formation: Math.round(byCategory.formation * 100) / 100,
      technique: Math.round(byCategory.technique * 100) / 100,
      softSkills: Math.round(byCategory.softSkills * 100) / 100,
      experience: Math.round(byCategory.experience * 100) / 100,
    },
    byKPI,
    calculatedAt: new Date(),
  };

  // 5. Sauvegarder les scores dans le candidat
  await Candidate.findByIdAndUpdate(candidateId, { scores });

  await sendEmail("scoreCalculated", {
    firstName: candidate.personalInfo.firstName,
    lastName: candidate.personalInfo.lastName,
    score: scores.global,
    templateName: template.name,
    candidateId: candidateId,
  });

  // Vérifier si un résultat test est déjà intégré pour ce candidat
  const integratedResult = await TestResult.findOne({
    candidateId,
    integratedInScoring: true,
  }).sort({ updatedAt: -1 }); // Prendre le plus récent

  if (integratedResult) {
    // Récupérer le test pour avoir le template et les poids
    const test = await Test.findById(integratedResult.testId);
    const kpiWeight = SCORING_CONFIG.kpiWeight;
    const testWeight = SCORING_CONFIG.testWeight;

    const newGlobal =
      Math.round(
        (scores.global * kpiWeight + integratedResult.percentage * testWeight) *
          100,
      ) / 100;

    // Recalculer byCategory avec le nouveau global
    const categories = ["formation", "technique", "softSkills", "experience"];
    const newByCategory = {};
    if (scores.global > 0) {
      for (const cat of categories) {
        const catValue = scores.byCategory[cat] || 0;
        const catRatio = catValue / scores.global;
        newByCategory[cat] =
          Math.round(
            (catValue * kpiWeight +
              integratedResult.percentage * testWeight * catRatio) *
              100,
          ) / 100;
      }
    }

    await Candidate.findByIdAndUpdate(candidateId, {
      "scores.global": newGlobal,
      "scores.byCategory": newByCategory,
      "scores.calculatedAt": new Date(),
    });

    // Mettre à jour scores retournés
    scores.global = newGlobal;
    scores.byCategory = newByCategory;
  }

  return scores;
};
