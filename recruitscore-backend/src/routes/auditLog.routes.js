import {
  getAuditLogs,
  getAuditLogById,
  getUserAuditLogs,
  getAuditStats,
} from "../controllers/auditLog.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

export default async function auditLogRoutes(fastify) {
  // Tous les logs - admin uniquement
  fastify.get(
    "/api/audit",
    {
      preHandler: [isAuthenticated, isAdmin],
    },
    getAuditLogs,
  );

  // Stats des actions - admin uniquement
  fastify.get(
    "/api/audit/stats",
    {
      preHandler: [isAuthenticated, isAdmin],
    },
    getAuditStats,
  );

  // Un log par ID - admin uniquement
  fastify.get(
    "/api/audit/:id",
    {
      preHandler: [isAuthenticated, isAdmin],
    },
    getAuditLogById,
  );

  // Logs d un utilisateur - admin uniquement
  fastify.get(
    "/api/audit/user/:userId",
    {
      preHandler: [isAuthenticated, isAdmin],
    },
    getUserAuditLogs,
  );
}
