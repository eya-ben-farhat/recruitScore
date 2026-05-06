import {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  changeCandidateStatus,
  uploadCandidateCV,
  addComment,
  generateShortlist,
  getRanking,
} from "../controllers/candidate.controller.js";
import {
  isAuthenticated,
  hasRole,
  hasPermission,
} from "../middlewares/auth.middleware.js";

export default async function candidateRoutes(fastify) {
  // Creer une candidature
  fastify.post(
    "/api/candidates",
    {
      preHandler: [isAuthenticated, hasPermission("candidates", "write")],
    },
    createCandidate,
  );

  // Obtenir toutes les candidatures
  fastify.get(
    "/api/candidates",
    {
      preHandler: [isAuthenticated, hasPermission("candidates", "read")],
    },
    getCandidates,
  );

  // Classement des candidats
  fastify.get(
    "/api/candidates/ranking",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager")],
    },
    getRanking,
  );

  // Generer une shortlist
  fastify.get(
    "/api/candidates/shortlist",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager")],
    },
    generateShortlist,
  );

  // Obtenir une candidature par ID
  fastify.get(
    "/api/candidates/:id",
    {
      preHandler: [isAuthenticated, hasPermission("candidates", "read")],
    },
    getCandidateById,
  );

  // Mettre a jour une candidature
  fastify.put(
    "/api/candidates/:id",
    {
      preHandler: [isAuthenticated, hasPermission("candidates", "write")],
    },
    updateCandidate,
  );

  // Supprimer une candidature
  fastify.delete(
    "/api/candidates/:id",
    {
      preHandler: [isAuthenticated, hasPermission("candidates", "delete")],
    },
    deleteCandidate,
  );

  // Changer le statut
  fastify.patch(
    "/api/candidates/:id/status",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager")],
    },
    changeCandidateStatus,
  );

  // Upload CV
  fastify.post(
    "/api/candidates/:id/cv",
    {
      preHandler: [isAuthenticated, hasPermission("candidates", "write")],
    },
    uploadCandidateCV,
  );

  // Ajouter un commentaire
  fastify.post(
    "/api/candidates/:id/comments",
    {
      preHandler: [
        isAuthenticated,
        hasRole("admin", "rh", "manager", "evaluator"),
      ],
    },
    addComment,
  );
}
