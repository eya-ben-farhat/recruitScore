import ScoringTemplate from "../models/ScoringTemplate.model.js";
import KPI from "../models/KPI.model.js";

// Creer un template
export const createTemplate = async (request, reply) => {
  try {
    const { name, description, targetRole, kpis, isDefault } = request.body;

    // Verifier les champs obligatoires
    if (!name || !kpis || kpis.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "Les champs name et kpis sont obligatoires",
      });
    }

    // Verifier si le nom existe deja
    const templateExists = await ScoringTemplate.findOne({ name });
    if (templateExists) {
      return reply.status(400).send({
        success: false,
        message: "Un template avec ce nom existe deja",
      });
    }

    // Verifier que le total des poids = 100%
    const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
    if (totalWeight !== 100) {
      return reply.status(400).send({
        success: false,
        message: `Le total des poids doit etre 100%. Total actuel : ${totalWeight}%`,
      });
    }

    // Verifier que tous les KPIs existent et ont des regles de calcul
    for (const kpi of kpis) {
      const kpiExists = await KPI.findById(kpi.kpiId);
      if (!kpiExists) {
        return reply.status(400).send({
          success: false,
          message: `KPI avec l ID ${kpi.kpiId} non trouve`,
        });
      }
      if (!kpi.calculationRules) {
        return reply.status(400).send({
          success: false,
          message: `Les regles de calcul sont obligatoires pour chaque KPI`,
        });
      }
    }

    // Calculer le categorySummary
    const categorySummary = {
      formation: 0,
      technique: 0,
      softSkills: 0,
      experience: 0,
    };
    for (const kpi of kpis) {
      const kpiData = await KPI.findById(kpi.kpiId);
      categorySummary[kpiData.category] += kpi.weight;
    }

    // Si isDefault, desactiver les autres templates par defaut
    if (isDefault) {
      await ScoringTemplate.updateMany(
        { isDefault: true },
        { isDefault: false },
      );
    }

    const template = await ScoringTemplate.create({
      name,
      description,
      targetRole,
      kpis,
      categorySummary,
      configuredBy: request.user.id,
      isDefault: isDefault || false,
      isActive: true,
      createdBy: request.user.id,
    });

    return reply.status(201).send({
      success: true,
      message: "Template cree avec succes",
      template,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir tous les templates
export const getTemplates = async (request, reply) => {
  try {
    const { targetRole, isActive, isDefault } = request.query;

    const filter = {};
    if (targetRole) filter.targetRole = targetRole;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (isDefault !== undefined) filter.isDefault = isDefault === "true";

    const templates = await ScoringTemplate.find(filter)
      .populate("configuredBy", "firstName lastName")
      .populate("createdBy", "firstName lastName")
      .populate("kpis.kpiId", "name category type weight")
      .sort({ createdAt: -1 });

    return reply.status(200).send({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir un template par ID
export const getTemplateById = async (request, reply) => {
  try {
    const template = await ScoringTemplate.findById(request.params.id)
      .populate("configuredBy", "firstName lastName")
      .populate("createdBy", "firstName lastName")
      .populate("kpis.kpiId", "name category type config weight")
      .populate("feedback.userId", "firstName lastName role");

    if (!template) {
      return reply.status(404).send({
        success: false,
        message: "Template non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      template,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Mettre a jour un template
export const updateTemplate = async (request, reply) => {
  try {
    const { kpis, isDefault } = request.body;

    // Si isDefault mis a true, desactiver les autres
    if (isDefault) {
      await ScoringTemplate.updateMany(
        { isDefault: true, _id: { $ne: request.params.id } },
        { isDefault: false },
      );
    }

    // Verifier le total des poids si kpis modifies
    if (kpis) {
      const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
      if (totalWeight !== 100) {
        return reply.status(400).send({
          success: false,
          message: `Le total des poids doit etre 100%. Total actuel : ${totalWeight}%`,
        });
      }

      // Verifier les regles de calcul
      for (const kpi of kpis) {
        if (!kpi.calculationRules) {
          return reply.status(400).send({
            success: false,
            message: "Les regles de calcul sont obligatoires pour chaque KPI",
          });
        }
      }

      // Recalculer le categorySummary
      const categorySummary = {
        formation: 0,
        technique: 0,
        softSkills: 0,
        experience: 0,
      };
      for (const kpi of kpis) {
        const kpiData = await KPI.findById(kpi.kpiId);
        if (kpiData) {
          categorySummary[kpiData.category] += kpi.weight;
        }
      }
      request.body.categorySummary = categorySummary;
    }

    const template = await ScoringTemplate.findByIdAndUpdate(
      request.params.id,
      request.body,
      { new: true },
    );

    if (!template) {
      return reply.status(404).send({
        success: false,
        message: "Template non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      message: "Template mis a jour avec succes",
      template,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Supprimer un template
export const deleteTemplate = async (request, reply) => {
  try {
    const template = await ScoringTemplate.findByIdAndDelete(request.params.id);

    if (!template) {
      return reply.status(404).send({
        success: false,
        message: "Template non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      message: "Template supprime avec succes",
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Definir comme template par defaut
export const setDefaultTemplate = async (request, reply) => {
  try {
    // Desactiver tous les autres templates par defaut
    await ScoringTemplate.updateMany({ isDefault: true }, { isDefault: false });

    const template = await ScoringTemplate.findByIdAndUpdate(
      request.params.id,
      { isDefault: true },
      { new: true },
    );

    if (!template) {
      return reply.status(404).send({
        success: false,
        message: "Template non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      message: "Template defini comme defaut avec succes",
      template,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Ajouter un feedback
export const addFeedback = async (request, reply) => {
  try {
    const { comment } = request.body;

    if (!comment) {
      return reply.status(400).send({
        success: false,
        message: "Le commentaire est obligatoire",
      });
    }

    const template = await ScoringTemplate.findByIdAndUpdate(
      request.params.id,
      {
        $push: {
          feedback: {
            userId: request.user.id,
            comment,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    ).populate("feedback.userId", "firstName lastName role");

    if (!template) {
      return reply.status(404).send({
        success: false,
        message: "Template non trouve",
      });
    }

    return reply.status(201).send({
      success: true,
      message: "Feedback ajoute avec succes",
      feedback: template.feedback,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};
