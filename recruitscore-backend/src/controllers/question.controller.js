import Question from "../models/Question.model.js";

// Creer une question
export const createQuestion = async (request, reply) => {
  try {
    const {
      type,
      content,
      theme,
      difficulty,
      targetSkill,
      options,
      explanation,
      programmingLanguage,
      points,
    } = request.body;

    // Verifier les champs obligatoires
    if (!type || !content || !theme || !difficulty || !points) {
      return reply.status(400).send({
        success: false,
        message:
          "Les champs type, content, theme, difficulty et points sont obligatoires",
      });
    }

    // Verifier les options pour les questions QCM
    if (type === "qcm") {
      if (!options || options.length < 2) {
        return reply.status(400).send({
          success: false,
          message: "Une question QCM doit avoir au moins 2 options",
        });
      }
      const hasCorrect = options.some((o) => o.isCorrect === true);
      if (!hasCorrect) {
        return reply.status(400).send({
          success: false,
          message: "Une question QCM doit avoir au moins une reponse correcte",
        });
      }
    }

    // Verifier le langage pour les questions de code
    if (type === "code" && !programmingLanguage) {
      return reply.status(400).send({
        success: false,
        message:
          "Le langage de programmation est obligatoire pour les questions de code",
      });
    }

    const question = await Question.create({
      type,
      content,
      theme,
      difficulty,
      targetSkill,
      options: options || [],
      explanation,
      programmingLanguage: programmingLanguage || null,
      points,
      isActive: true,
      createdBy: request.user.id,
    });

    return reply.status(201).send({
      success: true,
      message: "Question creee avec succes",
      question,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir toutes les questions
export const getQuestions = async (request, reply) => {
  try {
    const {
      type,
      theme,
      difficulty,
      targetSkill,
      isActive,
      page = 1,
      limit = 10,
    } = request.query;

    const filter = {};
    if (type) filter.type = type;
    if (theme) filter.theme = theme;
    if (difficulty) filter.difficulty = difficulty;
    if (targetSkill) filter.targetSkill = targetSkill;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const total = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return reply.status(200).send({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: questions.length,
      questions,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir une question par ID
export const getQuestionById = async (request, reply) => {
  try {
    const question = await Question.findById(request.params.id).populate(
      "createdBy",
      "firstName lastName",
    );

    if (!question) {
      return reply.status(404).send({
        success: false,
        message: "Question non trouvee",
      });
    }

    return reply.status(200).send({
      success: true,
      question,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Mettre a jour une question
export const updateQuestion = async (request, reply) => {
  try {
    const { type, options, programmingLanguage } = request.body;

    // Verifier les options si type QCM
    if (type === "qcm" || options) {
      if (!options || options.length < 2) {
        return reply.status(400).send({
          success: false,
          message: "Une question QCM doit avoir au moins 2 options",
        });
      }
      const hasCorrect = options.some((o) => o.isCorrect === true);
      if (!hasCorrect) {
        return reply.status(400).send({
          success: false,
          message: "Une question QCM doit avoir au moins une reponse correcte",
        });
      }
    }

    // Verifier le langage si type code
    if (type === "code" && !programmingLanguage) {
      return reply.status(400).send({
        success: false,
        message:
          "Le langage de programmation est obligatoire pour les questions de code",
      });
    }

    const question = await Question.findByIdAndUpdate(
      request.params.id,
      request.body,
      { new: true },
    );

    if (!question) {
      return reply.status(404).send({
        success: false,
        message: "Question non trouvee",
      });
    }

    return reply.status(200).send({
      success: true,
      message: "Question mise a jour avec succes",
      question,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Supprimer une question
export const deleteQuestion = async (request, reply) => {
  try {
    const question = await Question.findByIdAndDelete(request.params.id);

    if (!question) {
      return reply.status(404).send({
        success: false,
        message: "Question non trouvee",
      });
    }

    return reply.status(200).send({
      success: true,
      message: "Question supprimee avec succes",
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir des questions aleatoires pour un test
export const getRandomQuestions = async (request, reply) => {
  try {
    const { totalQuestions = 10, themes, difficulty } = request.query;

    const filter = { isActive: true };

    // Verifier la disponibilite par theme
    if (themes) {
      for (const theme of themes.split(",")) {
        const count = await Question.countDocuments({
          theme,
          isActive: true,
        });
        if (count === 0) {
          return reply.status(400).send({
            success: false,
            message: `Aucune question disponible pour le theme : ${theme}`,
          });
        }
      }
      filter.theme = { $in: themes.split(",") };
    }

    if (difficulty && difficulty !== "mixed") {
      filter.difficulty = difficulty;
    }

    // Recuperer des questions aleatoires avec $sample
    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: Number(totalQuestions) } },
    ]);

    if (questions.length < Number(totalQuestions)) {
      return reply.status(400).send({
        success: false,
        message: `Pas assez de questions disponibles. Disponibles : ${questions.length}, Demandees : ${totalQuestions}`,
      });
    }

    return reply.status(200).send({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Activer ou desactiver une question
export const toggleQuestion = async (request, reply) => {
  try {
    const question = await Question.findById(request.params.id);

    if (!question) {
      return reply.status(404).send({
        success: false,
        message: "Question non trouvee",
      });
    }

    question.isActive = !question.isActive;
    await question.save();

    return reply.status(200).send({
      success: true,
      message: `Question ${question.isActive ? "activee" : "desactivee"} avec succes`,
      isActive: question.isActive,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir les statistiques de la banque de questions
export const getBankStats = async (request, reply) => {
  try {
    // Stats par theme
    const byTheme = await Question.aggregate([
      {
        $group: {
          _id: "$theme",
          total: { $sum: 1 },
          active: {
            $sum: { $cond: ["$isActive", 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Stats par difficulte
    const byDifficulty = await Question.aggregate([
      {
        $group: {
          _id: "$difficulty",
          total: { $sum: 1 },
          active: {
            $sum: { $cond: ["$isActive", 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Stats par type
    const byType = await Question.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: 1 },
          active: {
            $sum: { $cond: ["$isActive", 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Total global
    const totalActive = await Question.countDocuments({ isActive: true });
    const totalInactive = await Question.countDocuments({ isActive: false });

    return reply.status(200).send({
      success: true,
      stats: {
        total: totalActive + totalInactive,
        active: totalActive,
        inactive: totalInactive,
        byTheme,
        byDifficulty,
        byType,
      },
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};
