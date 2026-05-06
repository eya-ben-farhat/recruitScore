import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
  toggleQuestion,
  getBankStats,
} from "../controllers/question.controller.js";
import {
  isAuthenticated,
  isAdmin,
  hasRole,
} from "../middlewares/auth.middleware.js";

export default async function questionRoutes(fastify) {
  // Statistiques de la banque - avant les routes avec :id
  fastify.get(
    "/api/questions/stats",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    getBankStats,
  );

  // Questions aleatoires pour un test
  fastify.get(
    "/api/questions/random",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    getRandomQuestions,
  );

  // Creer une question - admin et manager uniquement
  fastify.post(
    "/api/questions",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    createQuestion,
  );

  // Obtenir toutes les questions
  fastify.get(
    "/api/questions",
    {
      preHandler: [isAuthenticated],
    },
    getQuestions,
  );

  // Obtenir une question par ID
  fastify.get(
    "/api/questions/:id",
    {
      preHandler: [isAuthenticated],
    },
    getQuestionById,
  );

  // Mettre a jour une question - admin et manager uniquement
  fastify.put(
    "/api/questions/:id",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    updateQuestion,
  );

  // Supprimer une question - admin uniquement
  fastify.delete(
    "/api/questions/:id",
    {
      preHandler: [isAuthenticated, isAdmin],
    },
    deleteQuestion,
  );

  // Activer ou desactiver une question - admin et manager
  fastify.patch(
    "/api/questions/:id/toggle",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    toggleQuestion,
  );
}
