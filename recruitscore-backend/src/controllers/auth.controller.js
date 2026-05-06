import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { createAuditLog } from "../services/audit.service.js";

// Login
export const login = async (request, reply) => {
  try {
    const { email, password } = request.body;

    // 1. Verifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return reply.status(401).send({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // 2. Verifier si le compte est actif
    if (!user.isActive) {
      return reply.status(403).send({
        success: false,
        message: "Compte desactive, contactez l administrateur",
      });
    }

    // 3. Verifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return reply.status(401).send({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // 4. Generer le token JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        permissions: user.permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    // 5. Generer le refresh token
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // 6. Sauvegarder le refresh token et lastLogin
    await User.findByIdAndUpdate(user._id, {
      refreshToken: refreshToken,
      lastLogin: new Date(),
    });

    // Audit log
    await createAuditLog({
      userId: user._id,
      action: "LOGIN",
      targetCollection: "User",
      targetId: user._id,
      ipAddress: request.ip,
      details: `Connexion de ${user.email}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Connexion reussie",
      token,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Logout
export const logout = async (request, reply) => {
  try {
    // Recuperer l utilisateur pour le log
    const user = await User.findById(request.user.id);

    // Supprimer le refresh token
    await User.findByIdAndUpdate(request.user.id, {
      refreshToken: null,
    });

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "LOGOUT",
      targetCollection: "User",
      targetId: request.user.id,
      ipAddress: request.ip,
      details: `Deconnexion de ${user.email}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Deconnexion reussie",
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Refresh token
export const refreshToken = async (request, reply) => {
  try {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.status(401).send({
        success: false,
        message: "Refresh token manquant",
      });
    }

    // Verifier le refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Verifier si le refresh token correspond a celui en base
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return reply.status(401).send({
        success: false,
        message: "Refresh token invalide",
      });
    }

    // Generer un nouveau token
    const newToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        permissions: user.permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    return reply.status(200).send({
      success: true,
      token: newToken,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};
