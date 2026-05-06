import {
  getGlobalStats,
  getKPIStats,
  getPeriodStats,
  getDashboard,
  getCandidateStats,
  exportReportPDF,
  exportReportExcel,
  downloadReport,
} from "../controllers/report.controller.js";
import {
  isAuthenticated,
  isAdmin,
  hasRole,
} from "../middlewares/auth.middleware.js";

export default async function reportRoutes(fastify) {
  // Tableau de bord - admin, rh, manager
  fastify.get(
    "/api/reports/dashboard",
    {
      preHandler: [
        isAuthenticated,
        hasRole("admin", "rh", "manager", "evaluator", "reader"),
      ],
    },
    getDashboard,
  );

  // Stats globales - admin, rh, manager
  fastify.get(
    "/api/reports/global",
    {
      preHandler: [
        isAuthenticated,
        hasRole("admin", "rh", "manager", "evaluator", "reader"),
      ],
    },
    getGlobalStats,
  );

  // Stats par KPI - admin, manager
  fastify.get(
    "/api/reports/kpi",
    {
      preHandler: [isAuthenticated, hasRole("admin", "manager")],
    },
    getKPIStats,
  );

  // Stats par periode - admin, rh, manager
  fastify.get(
    "/api/reports/period",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager")],
    },
    getPeriodStats,
  );

  // Stats d un candidat - admin, rh, manager, evaluator
  fastify.get(
    "/api/reports/candidate/:id",
    {
      preHandler: [
        isAuthenticated,
        hasRole("admin", "rh", "manager", "evaluator"),
      ],
    },
    getCandidateStats,
  );

  // Export PDF - admin, rh, manager
  fastify.post(
    "/api/reports/export/pdf",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager")],
    },
    exportReportPDF,
  );

  // Export Excel - admin, rh, manager
  fastify.post(
    "/api/reports/export/excel",
    {
      preHandler: [isAuthenticated, hasRole("admin", "rh", "manager")],
    },
    exportReportExcel,
  );

  // Telecharger un rapport - tous connectes
  fastify.get(
    "/api/reports/download/:fileName",
    {
      preHandler: [isAuthenticated],
    },
    downloadReport,
  );
}
