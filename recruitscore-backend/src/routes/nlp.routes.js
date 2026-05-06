import {
  analyzeCVs,
  createProfileFromCV,
} from "../controllers/nlp.controller.js";
import { isAuthenticated, hasRole } from "../middlewares/auth.middleware.js";

export default async function nlpRoutes(fastify) {
  // Analyser les CVs
  fastify.post(
    "/api/nlp/analyze",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh")],
    },
    analyzeCVs,
  );

  // Créer un profil depuis un CV analysé
  fastify.post(
    "/api/nlp/create-profile",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh")],
    },
    createProfileFromCV,
  );
}
