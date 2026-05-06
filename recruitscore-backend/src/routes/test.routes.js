import {
  createTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest,
  generateTest,
  changeTestStatus,
  exportTestPDF,
  downloadTestPDF,
} from "../controllers/test.controller.js";
import {
  isAuthenticated,
  isAdmin,
  hasRole,
} from "../middlewares/auth.middleware.js";

export default async function testRoutes(fastify) {
  // Creer un test - admin et manager
  fastify.post(
    "/api/tests",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    createTest,
  );

  // Obtenir tous les tests
  fastify.get(
    "/api/tests",
    {
      preHandler: [isAuthenticated],
    },
    getTests,
  );

  // Obtenir un test par ID
  fastify.get(
    "/api/tests/:id",
    {
      preHandler: [isAuthenticated],
    },
    getTestById,
  );

  // Mettre a jour un test - admin et manager
  fastify.put(
    "/api/tests/:id",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    updateTest,
  );

  // Supprimer un test - admin uniquement
  fastify.delete(
    "/api/tests/:id",
    {
      preHandler: [isAuthenticated, isAdmin],
    },
    deleteTest,
  );

  // Generer les questions d un test - admin et manager
  fastify.post(
    "/api/tests/:id/generate",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    generateTest,
  );

  // Changer le statut d un test - admin et manager
  fastify.patch(
    "/api/tests/:id/status",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    changeTestStatus,
  );

  // Generer le PDF d un test - admin et manager
  fastify.post(
    "/api/tests/:id/export-pdf",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    exportTestPDF,
  );

  // Telecharger le PDF d un test
  fastify.get(
    "/api/tests/:id/download-pdf",
    {
      preHandler: [isAuthenticated],
    },
    downloadTestPDF,
  );
}
