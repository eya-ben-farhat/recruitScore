import { describe, it, expect, jest } from "@jest/globals";
import jwt from "jsonwebtoken";

// Simulation du middleware isAuthenticated
const isAuthenticated = async (request, reply) => {
  const authHeader = request.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ message: "Token manquant" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "test_secret");
    request.user = decoded;
  } catch {
    return reply.status(401).send({ message: "Token invalide" });
  }
};

describe("Middleware isAuthenticated", () => {
  it("rejette une requête sans token", async () => {
    const request = { headers: {} };
    const reply = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await isAuthenticated(request, reply);
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it("rejette un token invalide", async () => {
    const request = { headers: { authorization: "Bearer token_invalide" } };
    const reply = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await isAuthenticated(request, reply);
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it("accepte un token valide et attache l'utilisateur à la requête", async () => {
    const payload = { id: "user123", role: "admin" };
    const token = jwt.sign(payload, "test_secret");
    const request = { headers: { authorization: `Bearer ${token}` } };
    const reply = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await isAuthenticated(request, reply);
    expect(request.user).toBeDefined();
    expect(request.user.role).toBe("admin");
  });
});

// ── Tests whitelist des rôles ──────────────────────────────────────────────
const hasRole =
  (...roles) =>
  async (request, reply) => {
    if (!roles.includes(request.user?.role)) {
      return reply.status(403).send({ message: "Accès refusé" });
    }
  };

describe("Middleware hasRole", () => {
  it("autorise un rôle présent dans la whitelist", async () => {
    const request = { user: { role: "admin" } };
    const reply = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await hasRole("admin", "manager")(request, reply);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it("refuse un rôle absent de la whitelist", async () => {
    const request = { user: { role: "reader" } };
    const reply = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await hasRole("admin", "manager")(request, reply);
    expect(reply.status).toHaveBeenCalledWith(403);
  });
});
