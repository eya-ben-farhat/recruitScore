import {
  createKPI,
  getKPIs,
  getKPIById,
  updateKPI,
  deleteKPI,
  toggleKPI,
} from "../controllers/kpi.controller.js";
import {
  isAuthenticated,
  isAdmin,
  hasRole,
} from "../middlewares/auth.middleware.js";

export default async function kpiRoutes(fastify) {
  // Creer un KPI - admin et manager uniquement
  fastify.post(
    "/api/kpis",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    createKPI,
  );

  // Obtenir tous les KPIs
  fastify.get(
    "/api/kpis",
    {
      preHandler: [isAuthenticated],
    },
    getKPIs,
  );

  // Obtenir un KPI par ID
  fastify.get(
    "/api/kpis/:id",
    {
      preHandler: [isAuthenticated],
    },
    getKPIById,
  );

  // Mettre a jour un KPI - admin et manager uniquement
  fastify.put(
    "/api/kpis/:id",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    updateKPI,
  );

  // Supprimer un KPI - admin uniquement
  fastify.delete(
    "/api/kpis/:id",
    {
      preHandler: [isAuthenticated, isAdmin],
    },
    deleteKPI,
  );

  // Activer ou desactiver un KPI - admin et manager uniquement
  fastify.patch(
    "/api/kpis/:id/toggle",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    toggleKPI,
  );
}
