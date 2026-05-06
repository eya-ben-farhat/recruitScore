import TestResult from "../models/TestResult.model.js";
import Test from "../models/Test.model.js";
import Candidate from "../models/Candidate.model.js";
import { createAuditLog } from "../services/audit.service.js";
import { SCORING_CONFIG } from "../config/scoringConfig.js";
import { sendEmail } from "../services/email.service.js";
import { calculateCandidateScore } from "../services/scoring.service.js";

// Saisir les resultats d un test
export const createTestResult = async (request, reply) => {
  try {
    const { candidateId, testId, answers, evaluatorComment } = request.body;

    if (!candidateId || !testId || !answers || answers.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "Les champs candidateId, testId et answers sont obligatoires",
      });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    const test = await Test.findById(testId).populate("questions.questionId");
    if (!test) {
      return reply.status(404).send({
        success: false,
        message: "Test non trouve",
      });
    }

    if (test.status !== "closed") {
      return reply.status(400).send({
        success: false,
        message: "Le test doit etre ferme avant de saisir les resultats",
      });
    }

    const isAssigned = test.assignedCandidates.some(
      (id) => id.toString() === candidateId,
    );
    if (!isAssigned) {
      return reply.status(400).send({
        success: false,
        message: "Ce candidat n est pas assigne a ce test",
      });
    }

    const existingResult = await TestResult.findOne({ candidateId, testId });
    if (existingResult) {
      return reply.status(400).send({
        success: false,
        message: "Un resultat existe deja pour ce candidat et ce test",
      });
    }

    for (const answer of answers) {
      const question = test.questions.find(
        (q) => q.questionId._id.toString() === answer.questionId,
      );
      if (question && answer.pointsObtained > question.points) {
        return reply.status(400).send({
          success: false,
          message: `Points obtenus (${answer.pointsObtained}) depassent les points max (${question.points}) pour cette question`,
        });
      }
    }

    const totalScore = answers.reduce(
      (sum, a) => sum + (a.pointsObtained || 0),
      0,
    );
    const totalPoints = test.totalPoints;
    const percentage =
      totalPoints > 0
        ? Math.round((totalScore / totalPoints) * 100 * 100) / 100
        : 0;

    const testResult = await TestResult.create({
      candidateId,
      testId,
      answers,
      totalScore,
      totalPoints,
      percentage,
      evaluatorComment: evaluatorComment || null,
      evaluatedBy: request.user.id,
      evaluatedAt: new Date(),
      status: "evaluated",
      integratedInScoring: false,
      scoringImpact: 0,
    });

    await sendEmail("testResult", {
      firstName: candidate.personalInfo.firstName,
      lastName: candidate.personalInfo.lastName,
      testTitle: test.title,
      totalScore,
      totalPoints,
      percentage,
    });

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "INTEGRATE_TEST_SCORE",
      targetCollection: "TestResult",
      targetId: testResult._id,
      after: { totalScore, totalPoints, percentage },
      ipAddress: request.ip,
      details: `Saisie resultats test pour candidat ${candidateId} - score ${percentage}%`,
    });

    return reply.status(201).send({
      success: true,
      message: "Resultats saisis avec succes",
      testResult,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir tous les resultats
export const getTestResults = async (request, reply) => {
  try {
    const { status, page = 1, limit = 10 } = request.query;

    const filter = {};
    if (status) filter.status = status;

    const total = await TestResult.countDocuments(filter);
    const results = await TestResult.find(filter)
      .populate("candidateId", "personalInfo")
      .populate("testId", "title totalPoints")
      .populate("evaluatedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return reply.status(200).send({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: results.length,
      results,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir un resultat par ID
export const getTestResultById = async (request, reply) => {
  try {
    const result = await TestResult.findById(request.params.id)
      .populate("candidateId", "personalInfo")
      .populate("testId", "title totalPoints questions")
      .populate("evaluatedBy", "firstName lastName")
      .populate("answers.questionId", "content type points");

    if (!result) {
      return reply.status(404).send({
        success: false,
        message: "Resultat non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      result,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir les resultats d un candidat
export const getCandidateResults = async (request, reply) => {
  try {
    const results = await TestResult.find({
      candidateId: request.params.candidateId,
    })
      .populate("testId", "title totalPoints duration")
      .populate("evaluatedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    return reply.status(200).send({
      success: true,
      count: results.length,
      results,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Mettre a jour le commentaire evaluateur
export const updateEvaluatorComment = async (request, reply) => {
  try {
    const { evaluatorComment } = request.body;

    if (!evaluatorComment) {
      return reply.status(400).send({
        success: false,
        message: "Le commentaire est obligatoire",
      });
    }

    const result = await TestResult.findById(request.params.id);
    if (!result) {
      return reply.status(404).send({
        success: false,
        message: "Resultat non trouve",
      });
    }

    if (result.status === "integrated") {
      return reply.status(400).send({
        success: false,
        message:
          "Impossible de modifier un resultat deja integre dans le scoring",
      });
    }

    const updatedResult = await TestResult.findByIdAndUpdate(
      request.params.id,
      { evaluatorComment },
      { new: true },
    );

    return reply.status(200).send({
      success: true,
      message: "Commentaire mis a jour avec succes",
      result: updatedResult,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Integrer le resultat dans le scoring global
export const integrateTestResult = async (request, reply) => {
  try {
    const result = await TestResult.findById(request.params.id);

    if (!result) {
      return reply
        .status(404)
        .send({ success: false, message: "Resultat non trouve" });
    }

    if (result.integratedInScoring) {
      return reply.status(400).send({
        success: false,
        message: "Ce resultat est deja integre dans le scoring",
      });
    }

    if (result.status !== "evaluated") {
      return reply.status(400).send({
        success: false,
        message: "Le resultat doit etre evalue avant integration",
      });
    }

    const candidate = await Candidate.findById(result.candidateId);
    if (!candidate) {
      return reply
        .status(404)
        .send({ success: false, message: "Candidat non trouve" });
    }

    // Récupérer le test pour obtenir le scoringTemplateId imposé
    const test = await Test.findById(result.testId);
    if (!test) {
      return reply
        .status(404)
        .send({ success: false, message: "Test non trouve" });
    }

    // Le template est imposé par le test — pas de choix possible
    const templateId = test.scoringTemplateId || null;

    // Recalculer le score KPI avec le template du test
    const freshScores = await calculateCandidateScore(
      result.candidateId,
      templateId,
    );
    const kpiScore = freshScores.global;

    // Pondération depuis la requête ou config par défaut
    const kpiWeight = request.body?.kpiWeight ?? SCORING_CONFIG.kpiWeight;
    const testWeight = request.body?.testWeight ?? SCORING_CONFIG.testWeight;

    if (Math.abs(kpiWeight + testWeight - 1) > 0.01) {
      return reply.status(400).send({
        success: false,
        message: "La somme des pondérations doit être égale à 100%",
      });
    }

    const testScore = result.percentage;

    const newGlobal =
      Math.round((kpiScore * kpiWeight + testScore * testWeight) * 100) / 100;
    const scoringImpact = Math.round((newGlobal - kpiScore) * 100) / 100;

    // Mettre à jour byCategory proportionnellement
    // Logique : chaque catégorie est réduite par kpiWeight, puis l'impact du test
    // est réparti selon le poids de chaque catégorie dans le score KPI total
    const oldByCategory = candidate.scores?.byCategory || {
      formation: 0,
      technique: 0,
      softSkills: 0,
      experience: 0,
    };

    const categories = ["formation", "technique", "softSkills", "experience"];
    const newByCategory = {};

    if (kpiScore > 0) {
      // Répartir l'impact du test proportionnellement au poids de chaque catégorie
      for (const cat of categories) {
        const catValue = oldByCategory[cat] || 0;
        const catRatio = catValue / kpiScore; // proportion de cette catégorie dans le score KPI
        const catKPIPart = catValue * kpiWeight; // part KPI de cette catégorie
        const catTestPart = testScore * testWeight * catRatio; // part test répartie proportionnellement
        newByCategory[cat] = Math.round((catKPIPart + catTestPart) * 100) / 100;
      }
    } else {
      // Si pas de score KPI, répartir le test équitablement entre les catégories
      const equalShare = Math.round(((testScore * testWeight) / 4) * 100) / 100;
      for (const cat of categories) {
        newByCategory[cat] = equalShare;
      }
    }

    await Candidate.findByIdAndUpdate(result.candidateId, {
      "scores.global": newGlobal,
      "scores.byCategory": newByCategory,
      "scores.calculatedAt": new Date(),
    });

    const updatedResult = await TestResult.findByIdAndUpdate(
      request.params.id,
      { integratedInScoring: true, status: "integrated", scoringImpact },
      { new: true },
    );

    await createAuditLog({
      userId: request.user.id,
      action: "INTEGRATE_TEST_SCORE",
      targetCollection: "TestResult",
      targetId: result._id,
      before: { scoringGlobal: kpiScore },
      after: {
        scoringGlobal: newGlobal,
        scoringImpact,
        templateId,
        kpiWeight,
        testWeight,
      },
      ipAddress: request.ip,
      details: `Integration scoring candidat ${result.candidateId} : ${kpiScore} → ${newGlobal} (template: ${templateId || "defaut"})`,
    });

    return reply.status(200).send({
      success: true,
      message: "Resultat integre dans le scoring avec succes",
      result: updatedResult,
      scoring: {
        previousGlobal: kpiScore,
        newGlobal,
        scoringImpact,
        templateUsed: templateId || "template par defaut",
        kpiWeight: kpiWeight * 100 + "%",
        testWeight: testWeight * 100 + "%",
      },
    });
  } catch (err) {
    return reply
      .status(500)
      .send({ success: false, message: "Erreur serveur", error: err.message });
  }
};

// Supprimer un resultat de test
export const deleteTestResult = async (request, reply) => {
  try {
    const result = await TestResult.findById(request.params.id);

    if (!result) {
      return reply.status(404).send({
        success: false,
        message: "Resultat non trouve",
      });
    }

    if (result.integratedInScoring) {
      return reply.status(400).send({
        success: false,
        message:
          "Impossible de supprimer un resultat deja integre dans le scoring",
      });
    }

    await TestResult.findByIdAndDelete(request.params.id);

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "DELETE_TEST_RESULT",
      targetCollection: "TestResult",
      targetId: request.params.id,
      before: {
        candidateId: result.candidateId,
        testId: result.testId,
        totalScore: result.totalScore,
      },
      ipAddress: request.ip,
      details: `Suppression resultat test pour candidat ${result.candidateId}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Resultat supprime avec succes",
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};
