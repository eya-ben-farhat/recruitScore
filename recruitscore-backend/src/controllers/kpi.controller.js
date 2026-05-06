import KPI from "../models/KPI.model.js";

// Validation de la config selon le type
const validateConfig = (type, config) => {
  if (!config) return "La configuration est obligatoire";

  switch (type) {
    case "numeric":
      if (config.min === undefined || config.max === undefined)
        return "Pour un KPI numerique, min et max sont obligatoires";
      if (config.min >= config.max) return "min doit etre inferieur a max";
      break;

    case "boolean":
      if (config.truePoints === undefined || config.falsePoints === undefined)
        return "Pour un KPI boolean, truePoints et falsePoints sont obligatoires";
      break;

    case "choice":
      if (!config.choices || config.choices.length === 0)
        return "Pour un KPI choice, les choix sont obligatoires";
      break;

    case "range":
      if (!config.ranges || config.ranges.length === 0)
        return "Pour un KPI range, les ranges sont obligatoires";
      break;
  }
  return null;
};

// Creer un KPI
export const createKPI = async (request, reply) => {
  try {
    const {
      name,
      description,
      category,
      type,
      config,
      weight,
      minThreshold,
      bonus,
      malus,
      templateRef,
    } = request.body;

    // Verifier les champs obligatoires
    if (!name || !category || !type || weight === undefined) {
      return reply.status(400).send({
        success: false,
        message: "Les champs name, category, type et weight sont obligatoires",
      });
    }

    // Verifier si le nom existe deja
    const kpiExists = await KPI.findOne({ name });
    if (kpiExists) {
      return reply.status(400).send({
        success: false,
        message: "Un KPI avec ce nom existe deja",
      });
    }

    // Verifier que le poids est entre 0 et 100
    if (weight < 0 || weight > 100) {
      return reply.status(400).send({
        success: false,
        message: "Le poids doit etre entre 0 et 100",
      });
    }

    // Valider la config selon le type
    const configError = validateConfig(type, config);
    if (configError) {
      return reply.status(400).send({
        success: false,
        message: configError,
      });
    }

    // Verifier que le total des poids ne depasse pas 100
    const existingKPIs = await KPI.find({ isActive: true });
    const totalWeight = existingKPIs.reduce((sum, kpi) => sum + kpi.weight, 0);
    if (totalWeight + weight > 100) {
      return reply.status(400).send({
        success: false,
        message: `Poids total depasse 100%. Poids disponible : ${100 - totalWeight}%`,
      });
    }

    const kpi = await KPI.create({
      name,
      description,
      category,
      type,
      config,
      weight,
      minThreshold: minThreshold || 0,
      bonus: bonus || [],
      malus: malus || [],
      isActive: true,
      templateRef: templateRef || null,
      createdBy: request.user.id,
    });

    return reply.status(201).send({
      success: true,
      message: "KPI cree avec succes",
      kpi,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir tous les KPIs
export const getKPIs = async (request, reply) => {
  try {
    const { category, type, isActive } = request.query;

    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const kpis = await KPI.find(filter)
      .populate("createdBy", "firstName lastName")
      .sort({ category: 1, weight: -1 });

    const totalWeight = kpis
      .filter((k) => k.isActive)
      .reduce((sum, kpi) => sum + kpi.weight, 0);

    return reply.status(200).send({
      success: true,
      count: kpis.length,
      totalWeight,
      kpis,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir un KPI par ID
export const getKPIById = async (request, reply) => {
  try {
    const kpi = await KPI.findById(request.params.id).populate(
      "createdBy",
      "firstName lastName",
    );

    if (!kpi) {
      return reply.status(404).send({
        success: false,
        message: "KPI non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      kpi,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Mettre a jour un KPI
export const updateKPI = async (request, reply) => {
  try {
    const { weight, type, config } = request.body;

    // Valider la config si le type est modifie
    if (type && config) {
      const configError = validateConfig(type, config);
      if (configError) {
        return reply.status(400).send({
          success: false,
          message: configError,
        });
      }
    }

    // Verifier le poids si modifie
    if (weight !== undefined) {
      if (weight < 0 || weight > 100) {
        return reply.status(400).send({
          success: false,
          message: "Le poids doit etre entre 0 et 100",
        });
      }

      const existingKPIs = await KPI.find({
        isActive: true,
        _id: { $ne: request.params.id },
      });
      const totalWeight = existingKPIs.reduce(
        (sum, kpi) => sum + kpi.weight,
        0,
      );
      if (totalWeight + weight > 100) {
        return reply.status(400).send({
          success: false,
          message: `Poids total depasse 100%. Poids disponible : ${100 - totalWeight}%`,
        });
      }
    }

    const kpi = await KPI.findByIdAndUpdate(request.params.id, request.body, {
      new: true,
    });

    if (!kpi) {
      return reply.status(404).send({
        success: false,
        message: "KPI non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      message: "KPI mis a jour avec succes",
      kpi,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Supprimer un KPI
export const deleteKPI = async (request, reply) => {
  try {
    const kpi = await KPI.findByIdAndDelete(request.params.id);

    if (!kpi) {
      return reply.status(404).send({
        success: false,
        message: "KPI non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      message: "KPI supprime avec succes",
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Activer ou desactiver un KPI avec reajustement proportionnel
export const toggleKPI = async (request, reply) => {
  try {
    const kpi = await KPI.findById(request.params.id);

    if (!kpi) {
      return reply.status(404).send({
        success: false,
        message: "KPI non trouve",
      });
    }

    kpi.isActive = !kpi.isActive;
    await kpi.save();

    // Reajustement proportionnel si KPI desactive
    if (!kpi.isActive) {
      const activeKPIs = await KPI.find({
        isActive: true,
        _id: { $ne: kpi._id },
      });

      if (activeKPIs.length > 0) {
        const totalActiveWeight = activeKPIs.reduce(
          (sum, k) => sum + k.weight,
          0,
        );

        for (const activeKPI of activeKPIs) {
          const newWeight =
            activeKPI.weight +
            (activeKPI.weight / totalActiveWeight) * kpi.weight;
          await KPI.findByIdAndUpdate(activeKPI._id, {
            weight: Math.round(newWeight),
            weightAdjusted: true,
          });
        }
      }
    }

    return reply.status(200).send({
      success: true,
      message: `KPI ${kpi.isActive ? "active" : "desactive"} avec succes`,
      isActive: kpi.isActive,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};
