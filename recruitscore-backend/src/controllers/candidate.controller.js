import Candidate from "../models/Candidate.model.js";
import { uploadCV, deleteCV } from "../services/file.service.js";
import { createAuditLog } from "../services/audit.service.js";
import { sendEmail } from "../services/email.service.js";
import TestResult from "../models/TestResult.model.js";
import Test from "../models/Test.model.js";

// Creer une candidature
export const createCandidate = async (request, reply) => {
  try {
    const {
      personalInfo,
      education,
      technicalSkills,
      experiences,
      projects,
      languages,
      availability,
      tags,
    } = request.body;

    const candidateExists = await Candidate.findOne({
      "personalInfo.email": personalInfo.email,
    });
    if (candidateExists) {
      return reply.status(400).send({
        success: false,
        message: "Un candidat avec cet email existe deja",
      });
    }

    const candidate = await Candidate.create({
      personalInfo,
      education,
      technicalSkills,
      experiences,
      projects,
      languages,
      availability,
      tags,
      status: "new",
      createdBy: request.user.id,
    });

    await sendEmail("newCandidate", {
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      email: personalInfo.email,
      specialty: education?.specialty,
      candidateId: candidate._id,
    });

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "CREATE_CANDIDATE",
      targetCollection: "Candidate",
      targetId: candidate._id,
      after: { email: personalInfo.email, status: "new" },
      ipAddress: request.ip,
      details: `Creation candidature ${personalInfo.firstName} ${personalInfo.lastName}`,
    });

    return reply.status(201).send({
      success: true,
      message: "Candidature creee avec succes",
      candidate,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir toutes les candidatures
export const getCandidates = async (request, reply) => {
  try {
    const {
      status,
      tags,
      minScore,
      search,
      specialty,
      skill,
      startDate,
      testId,
      page = 1,
      limit = 10,
    } = request.query;

    const filter = {};

    if (status) filter.status = status;
    if (tags) filter.tags = { $in: tags.split(",") };
    if (minScore) filter["scores.global"] = { $gte: Number(minScore) };
    if (specialty) filter["education.specialty"] = specialty;
    if (skill) filter["technicalSkills.name"] = skill;
    if (startDate)
      filter["availability.startDate"] = { $gte: new Date(startDate) };
    if (search) filter.$text = { $search: search };
    if (testId) {
      // Chercher dans TestResult (candidats avec résultats)
      const results = await TestResult.find({ testId }).select("candidateId");
      const candidateIdsFromResults = results.map((r) =>
        r.candidateId.toString(),
      );

      // Chercher dans Test (candidats assignés)
      const test = await Test.findById(testId).select("assignedCandidates");
      const candidateIdsFromTest = (test?.assignedCandidates || []).map((id) =>
        id.toString(),
      );

      // Union des deux listes sans doublons
      const allCandidateIds = [
        ...new Set([...candidateIdsFromResults, ...candidateIdsFromTest]),
      ];

      filter._id = { $in: allCandidateIds };
    }

    const total = await Candidate.countDocuments(filter);
    const candidates = await Candidate.find(filter)
      .select("-scores.byKPI")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

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

// Obtenir une candidature par ID
export const getCandidateById = async (request, reply) => {
  try {
    const candidate = await Candidate.findById(request.params.id)
      .populate("createdBy", "firstName lastName email")
      .populate("comments.userId", "firstName lastName role");

    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      candidate,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Mettre a jour une candidature
export const updateCandidate = async (request, reply) => {
  try {
    // Recuperer avant modification pour le log
    const before = await Candidate.findById(request.params.id).select(
      "personalInfo status",
    );

    const candidate = await Candidate.findByIdAndUpdate(
      request.params.id,
      request.body,
      { new: true },
    );

    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "UPDATE_CANDIDATE",
      targetCollection: "Candidate",
      targetId: candidate._id,
      before: before,
      after: request.body,
      ipAddress: request.ip,
      details: `Modification candidature ${candidate.personalInfo?.firstName} ${candidate.personalInfo?.lastName}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Candidature mise a jour avec succes",
      candidate,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Supprimer une candidature
export const deleteCandidate = async (request, reply) => {
  try {
    const candidate = await Candidate.findById(request.params.id);

    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    if (candidate.cv && candidate.cv.filePath) {
      deleteCV(candidate.cv.filePath);
    }

    await Candidate.findByIdAndDelete(request.params.id);

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "DELETE_CANDIDATE",
      targetCollection: "Candidate",
      targetId: request.params.id,
      before: {
        email: candidate.personalInfo?.email,
        status: candidate.status,
      },
      ipAddress: request.ip,
      details: `Suppression candidature ${candidate.personalInfo?.firstName} ${candidate.personalInfo?.lastName}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Candidature supprimee avec succes",
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Changer le statut d une candidature
export const changeCandidateStatus = async (request, reply) => {
  try {
    const { status } = request.body;

    const validStatuses = [
      "new",
      "evaluating",
      "shortlisted",
      "rejected",
      "accepted",
    ];
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({
        success: false,
        message: "Statut invalide",
      });
    }

    // Recuperer avant modification pour le log
    const before = await Candidate.findById(request.params.id).select("status");

    const candidate = await Candidate.findByIdAndUpdate(
      request.params.id,
      { status },
      { new: true },
    );

    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "CHANGE_CANDIDATE_STATUS",
      targetCollection: "Candidate",
      targetId: candidate._id,
      before: { status: before?.status },
      after: { status },
      ipAddress: request.ip,
      details: `Changement statut ${candidate.personalInfo?.firstName} ${candidate.personalInfo?.lastName} : ${before?.status} → ${status}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Statut mis a jour avec succes",
      status: candidate.status,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Upload CV
export const uploadCandidateCV = async (request, reply) => {
  try {
    const candidate = await Candidate.findById(request.params.id);

    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    if (candidate.cv && candidate.cv.filePath) {
      deleteCV(candidate.cv.filePath);
    }

    const file = await request.file();
    const cvData = await uploadCV(file, request.params.id);

    await Candidate.findByIdAndUpdate(request.params.id, { cv: cvData });

    return reply.status(200).send({
      success: true,
      message: "CV uploade avec succes",
      cv: cvData,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: err.message || "Erreur serveur",
      error: err.message,
    });
  }
};

// Ajouter un commentaire
export const addComment = async (request, reply) => {
  try {
    const { content } = request.body;

    if (!content) {
      return reply.status(400).send({
        success: false,
        message: "Le contenu du commentaire est obligatoire",
      });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      request.params.id,
      {
        $push: {
          comments: {
            userId: request.user.id,
            content,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    ).populate("comments.userId", "firstName lastName role");

    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    return reply.status(201).send({
      success: true,
      message: "Commentaire ajoute avec succes",
      comments: candidate.comments,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Generer une shortlist
export const generateShortlist = async (request, reply) => {
  try {
    const { limit = 10, minScore = 0 } = request.query;

    const candidates = await Candidate.find({
      "scores.global": { $gte: Number(minScore) },
    })
      .select("personalInfo education scores status tags")
      .sort({ "scores.global": -1 })
      .limit(Number(limit));

    const ids = candidates.map((c) => c._id);
    await Candidate.updateMany(
      { _id: { $in: ids } },
      { status: "shortlisted" },
    );

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "GENERATE_SHORTLIST",
      targetCollection: "Candidate",
      ipAddress: request.ip,
      details: `Generation shortlist : ${candidates.length} candidats selectionnés (minScore: ${minScore})`,
    });

    return reply.status(200).send({
      success: true,
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

// Classement des candidats par score
export const getRanking = async (request, reply) => {
  try {
    const { minScore = 0 } = request.query;

    const candidates = await Candidate.find({
      "scores.global": { $gte: Number(minScore) },
    })
      .select("personalInfo education scores status tags")
      .sort({ "scores.global": -1 });

    return reply.status(200).send({
      success: true,
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
