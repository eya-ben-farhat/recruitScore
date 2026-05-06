import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  updateMyEmail,
  updateMyPassword,
} from "../controllers/user.controller.js";
import User from "../models/User.model.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

export default async function userRoutes(fastify) {
  // ===== ROUTES PERSONNELLES (tous les utilisateurs connectés) =====

  // Mettre a jour son propre email
  fastify.put(
    "/api/users/me/email",
    { preHandler: [isAuthenticated] },
    updateMyEmail,
  );

  // Mettre a jour son propre mot de passe
  fastify.put(
    "/api/users/me/password",
    { preHandler: [isAuthenticated] },
    updateMyPassword,
  );

  // Mettre à jour ses préférences de notification
  fastify.put(
    "/api/users/me/notifications",
    { preHandler: [isAuthenticated] },
    async (request, reply) => {
      try {
        const { newCandidate, scoreCalculated, testResult } = request.body;

        await User.findByIdAndUpdate(request.user.id, {
          notificationPreferences: { newCandidate, scoreCalculated, testResult },
        });

        return reply.status(200).send({ message: "Préférences mises à jour" });
      } catch (err) {
        return reply.status(500).send({ message: "Erreur serveur" });
      }
    },
  );

  // ===== ROUTES ADMIN =====

  // Creer un utilisateur - admin uniquement
  fastify.post(
    "/api/users",
    { preHandler: [isAuthenticated, isAdmin] },
    createUser,
  );

  // Obtenir tous les utilisateurs - admin uniquement
  fastify.get(
    "/api/users",
    { preHandler: [isAuthenticated, isAdmin] },
    getUsers,
  );

  // Obtenir un utilisateur par ID - admin uniquement
  fastify.get(
    "/api/users/:id",
    { preHandler: [isAuthenticated, isAdmin] },
    getUserById,
  );

  // Mettre a jour un utilisateur - admin uniquement
  fastify.put(
    "/api/users/:id",
    { preHandler: [isAuthenticated, isAdmin] },
    updateUser,
  );

  // Supprimer un utilisateur - admin uniquement
  fastify.delete(
    "/api/users/:id",
    { preHandler: [isAuthenticated, isAdmin] },
    deleteUser,
  );

  // Activer ou desactiver un utilisateur - admin uniquement
  fastify.patch(
    "/api/users/:id/status",
    { preHandler: [isAuthenticated, isAdmin] },
    toggleUserStatus,
  );
}
