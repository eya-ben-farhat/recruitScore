import { login, logout, refreshToken } from "../controllers/auth.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

export default async function authRoutes(fastify) {
  // Login - public
  fastify.post("/api/auth/login", login);

  // Logout - protege
  fastify.post(
    "/api/auth/logout",
    {
      preHandler: [isAuthenticated],
    },
    logout,
  );

  // Refresh token - public
  fastify.post("/api/auth/refresh", refreshToken);
}
