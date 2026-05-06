import {
  createTestResult,
  getTestResults,
  getTestResultById,
  getCandidateResults,
  updateEvaluatorComment,
  integrateTestResult,
  deleteTestResult,
} from "../controllers/testResult.controller.js";
import {
  isAuthenticated,
  isAdmin,
  hasRole,
} from "../middlewares/auth.middleware.js";

export default async function testResultRoutes(fastify) {
  // Saisir les resultats - evaluateur, manager, admin
  fastify.post(
    "/api/results",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager", "evaluator")],
    },
    createTestResult,
  );

  // Obtenir tous les resultats - admin, rh, manager
  fastify.get(
    "/api/results",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager" , "evaluator")],
    },
    getTestResults,
  );

  // Obtenir un resultat par ID
  fastify.get(
    "/api/results/:id",
    {
      preHandler: [
        isAuthenticated,
        hasRole("admin", "rh", "manager", "evaluator"),
      ],
    },
    getTestResultById,
  );

  // Obtenir les resultats d un candidat
  fastify.get(
    "/api/results/candidate/:candidateId",
    {
      preHandler: [
        isAuthenticated,
        hasRole("admin", "rh", "manager", "evaluator"),
      ],
    },
    getCandidateResults,
  );

  // Mettre a jour le commentaire - evaluateur, manager, admin
  fastify.patch(
    "/api/results/:id/comment",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager", "evaluator")],
    },
    updateEvaluatorComment,
  );

  // Integrer dans le scoring - admin et manager
  fastify.post(
    "/api/results/:id/integrate",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    integrateTestResult,
  );

  // Supprimer un resultat - admin, manager, evaluator
  fastify.delete(
    "/api/results/:id",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager", "evaluator")],
    },
    deleteTestResult,
  );
}
