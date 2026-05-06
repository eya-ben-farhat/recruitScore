import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate,
  addFeedback,
} from "../controllers/scoringTemplate.controller.js";
import {
  isAuthenticated,
  isAdmin,
  hasRole,
} from "../middlewares/auth.middleware.js";

export default async function scoringTemplateRoutes(fastify) {
  // Creer un template - admin et manager uniquement
  fastify.post(
    "/api/templates",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    createTemplate,
  );

  // Obtenir tous les templates
  fastify.get(
    "/api/templates",
    {
      preHandler: [isAuthenticated],
    },
    getTemplates,
  );

  // Obtenir un template par ID
  fastify.get(
    "/api/templates/:id",
    {
      preHandler: [isAuthenticated],
    },
    getTemplateById,
  );

  // Mettre a jour un template - admin et manager uniquement
  fastify.put(
    "/api/templates/:id",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    updateTemplate,
  );

  // Supprimer un template - admin uniquement
  fastify.delete(
    "/api/templates/:id",
    {
      preHandler: [isAuthenticated, isAdmin],
    },
    deleteTemplate,
  );

  // Definir comme template par defaut - admin et manager uniquement
  fastify.patch(
    "/api/templates/:id/default",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    setDefaultTemplate,
  );

  // Ajouter un feedback - tous sauf reader
  fastify.post(
    "/api/templates/:id/feedback",
    {
      preHandler: [
        isAuthenticated,
        hasRole("admin", "rh", "manager", "evaluator"),
      ],
    },
    addFeedback,
  );
}
