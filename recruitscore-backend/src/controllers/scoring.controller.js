import { calculateCandidateScore } from "../services/scoring.service.js";
import Candidate from "../models/Candidate.model.js";
import TestResult from "../models/TestResult.model.js";

// Calculer le score d un candidat
export const calculateScore = async (request, reply) => {
  try {
    const { candidateId } = request.params;
    const { templateId } = request.body;

    const scores = await calculateCandidateScore(candidateId, templateId);

    return reply.status(200).send({
      success: true,
      message: "Score calcule avec succes",
      scores,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: err.message || "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir le score d un candidat
export const getScore = async (request, reply) => {
  try {
    const candidate = await Candidate.findById(
      request.params.candidateId,
    ).select("personalInfo scores");

    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    if (!candidate.scores || candidate.scores.global === 0) {
      return reply.status(404).send({
        success: false,
        message: "Aucun score calcule pour ce candidat",
      });
    }

    return reply.status(200).send({
      success: true,
      candidate: {
        id: candidate._id,
        firstName: candidate.personalInfo.firstName,
        lastName: candidate.personalInfo.lastName,
      },
      scores: candidate.scores,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Recalculer le score d un candidat
export const recalculateScore = async (request, reply) => {
  try {
    const { candidateId } = request.params;
    const { templateId } = request.body;

    const scores = await calculateCandidateScore(candidateId, templateId);

    return reply.status(200).send({
      success: true,
      message: "Score recalcule avec succes",
      scores,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: err.message || "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir les scores de tous les candidats
export const getAllScores = async (request, reply) => {
  try {
    const { minScore = 0, page = 1, limit = 10 } = request.query;

    const filter = {
      "scores.global": { $gte: Number(minScore) },
    };

    const total = await Candidate.countDocuments(filter);
    const candidates = await Candidate.find(filter)
      .select("personalInfo education scores status tags")
      .sort({ "scores.global": -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return reply.status(200).send({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: candidates.length,
      candidates,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Comparer les scores de plusieurs candidats
export const compareScores = async (request, reply) => {
  try {
    const { candidateIds } = request.body;

    if (!candidateIds || candidateIds.length < 2) {
      return reply.status(400).send({
        success: false,
        message: "Au moins 2 candidats sont necessaires pour la comparaison",
      });
    }

    const candidates = await Candidate.find({
      _id: { $in: candidateIds },
    }).select("personalInfo education scores status tags");

    if (candidates.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Aucun candidat trouve",
      });
    }

    const sorted = candidates.sort((a, b) => b.scores.global - a.scores.global);

    return reply.status(200).send({
      success: true,
      count: sorted.length,
      comparison: sorted.map((c, index) => ({
        rank: index + 1,
        id: c._id,
        firstName: c.personalInfo.firstName,
        lastName: c.personalInfo.lastName,
        status: c.status,
        scores: c.scores,
      })),
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Integrer le score d un test dans le scoring global
export const integrateTestScore = async (request, reply) => {
  try {
    const { candidateId } = request.params;
    const { testResultId } = request.body;

    if (!testResultId) {
      return reply.status(400).send({
        success: false,
        message: "testResultId est obligatoire",
      });
    }

    // Recuperer le resultat du test
    const testResult = await TestResult.findById(testResultId);
    if (!testResult) {
      return reply.status(404).send({
        success: false,
        message: "Resultat de test non trouve",
      });
    }

    // Verifier que le test n est pas deja integre
    if (testResult.integratedInScoring) {
      return reply.status(400).send({
        success: false,
        message: "Ce resultat de test est deja integre dans le scoring",
      });
    }

    // Verifier que le test appartient au candidat
    if (testResult.candidateId.toString() !== candidateId) {
      return reply.status(400).send({
        success: false,
        message: "Ce test n appartient pas a ce candidat",
      });
    }

    // Recuperer le candidat
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    // Calculer l impact du test sur le score global
    const testImpact = testResult.percentage || 0;
    const currentGlobal = candidate.scores?.global || 0;
    const newGlobal =
      Math.round(((currentGlobal + testImpact) / 2) * 100) / 100;

    // Mettre a jour le score du candidat
    await Candidate.findByIdAndUpdate(candidateId, {
      "scores.global": newGlobal,
    });

    // Marquer le test comme integre
    await TestResult.findByIdAndUpdate(testResultId, {
      integratedInScoring: true,
      scoringImpact: testImpact,
      status: "integrated",
    });

    return reply.status(200).send({
      success: true,
      message: "Score du test integre avec succes",
      previousScore: currentGlobal,
      testScore: testImpact,
      newScore: newGlobal,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir l historique des scores d un candidat
export const getScoreHistory = async (request, reply) => {
  try {
    const candidate = await Candidate.findById(
      request.params.candidateId,
    ).select("personalInfo scores");

    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    // Recuperer les tests integres
    const testResults = await TestResult.find({
      candidateId: request.params.candidateId,
      integratedInScoring: true,
    }).select("totalScore totalPoints percentage evaluatedAt scoringImpact");

    return reply.status(200).send({
      success: true,
      candidate: {
        id: candidate._id,
        firstName: candidate.personalInfo.firstName,
        lastName: candidate.personalInfo.lastName,
      },
      currentScore: candidate.scores,
      testHistory: testResults,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};
