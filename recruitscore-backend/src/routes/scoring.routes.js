import {
  calculateScore,
  getScore,
  recalculateScore,
  getAllScores,
  compareScores,
  integrateTestScore,
  getScoreHistory,
} from "../controllers/scoring.controller.js";
import { isAuthenticated, hasRole } from "../middlewares/auth.middleware.js";

export default async function scoringRoutes(fastify) {
  // Calculer le score d un candidat - manager et admin
  fastify.post(
    "/api/scoring/:candidateId/calculate",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    calculateScore,
  );

  // Obtenir le score d un candidat
  fastify.get(
    "/api/scoring/:candidateId/score",
    {
      preHandler: [isAuthenticated],
    },
    getScore,
  );

  // Recalculer le score d un candidat - manager et admin
  fastify.post(
    "/api/scoring/:candidateId/recalculate",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    recalculateScore,
  );

  // Obtenir les scores de tous les candidats
  fastify.get(
    "/api/scoring/all",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager")],
    },
    getAllScores,
  );

  // Comparer les scores de plusieurs candidats
  fastify.post(
    "/api/scoring/compare",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager")],
    },
    compareScores,
  );

  // Integrer le score d un test dans le scoring global
  fastify.post(
    "/api/scoring/:candidateId/integrate-test",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    integrateTestScore,
  );

  // Obtenir l historique des scores d un candidat
  fastify.get(
    "/api/scoring/:candidateId/history",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager")],
    },
    getScoreHistory,
  );
}
