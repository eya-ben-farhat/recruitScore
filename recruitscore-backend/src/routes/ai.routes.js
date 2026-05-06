import { generateTestWithAI } from "../controllers/ai.controller.js";
import { isAuthenticated, hasRole } from "../middlewares/auth.middleware.js";

export default async function aiRoutes(fastify) {
  /**
   * POST /api/ai/generate-test
   * Body: {
   *   jobDescription : string  (obligatoire, min 10 chars)
   *   totalQuestions : number  (optionnel, défaut 10, max 30)
   *   difficulty     : string  (optionnel, défaut "mixed")
   * }
   * Roles autorisés : admin, manager
   */
  fastify.post(
    "/api/ai/generate-test",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    generateTestWithAI,
  );
}
