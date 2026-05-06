import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import { createAuditLog } from "../services/audit.service.js";

const defaultPermissions = {
  admin: {
    candidates: ["read", "write", "delete"],
    scoring: ["read", "write"],
    tests: ["read", "write", "delete"],
    reports: ["read", "export"],
  },
  rh: {
    candidates: ["read", "write", "delete"],
    scoring: ["read"],
    tests: ["read"],
    reports: ["read", "export"],
  },
  manager: {
    candidates: ["read"],
    scoring: ["read", "write"],
    tests: ["read", "write", "delete"],
    reports: ["read"],
  },
  evaluator: {
    candidates: ["read"],
    scoring: ["read"],
    tests: ["read"],
    reports: [],
  },
  reader: {
    candidates: ["read"],
    scoring: [],
    tests: [],
    reports: ["read"],
  },
};

const validRoles = ["admin", "rh", "manager", "evaluator", "reader"];

export const createUser = async (request, reply) => {
  try {
    const { firstName, lastName, email, password, role } = request.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return reply.status(400).send({
        success: false,
        message: "Tous les champs sont obligatoires",
      });
    }

    if (!validRoles.includes(role)) {
      return reply.status(400).send({
        success: false,
        message: "Role invalide",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return reply.status(400).send({
        success: false,
        message: "Cet email est deja utilise",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const permissions = defaultPermissions[role];

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      permissions,
      isActive: true,
    });

    await createAuditLog({
      userId: request.user.id,
      action: "CREATE_USER",
      targetCollection: "User",
      targetId: user._id,
      after: { firstName, lastName, email, role },
      ipAddress: request.ip,
      details: `Creation utilisateur ${email} avec role ${role}`,
    });

    return reply.status(201).send({
      success: true,
      message: "Utilisateur cree avec succes",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
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

export const getUsers = async (request, reply) => {
  try {
    const users = await User.find().select("-password -refreshToken");

    return reply.status(200).send({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

export const getUserById = async (request, reply) => {
  try {
    const user = await User.findById(request.params.id).select(
      "-password -refreshToken",
    );

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: "Utilisateur non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      user,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

export const updateUser = async (request, reply) => {
  try {
    const { firstName, lastName, email, role } = request.body;

    if (role && !validRoles.includes(role)) {
      return reply.status(400).send({
        success: false,
        message: "Role invalide",
      });
    }

    if (email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: request.params.id },
      });
      if (emailExists) {
        return reply.status(400).send({
          success: false,
          message: "Cet email est deja utilise",
        });
      }
    }

    const before = await User.findById(request.params.id).select(
      "-password -refreshToken",
    );

    const updateData = { firstName, lastName, email, role };
    if (role) {
      updateData.permissions = defaultPermissions[role];
    }

    const user = await User.findByIdAndUpdate(request.params.id, updateData, {
      new: true,
    }).select("-password -refreshToken");

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: "Utilisateur non trouve",
      });
    }

    await createAuditLog({
      userId: request.user.id,
      action: "UPDATE_USER",
      targetCollection: "User",
      targetId: user._id,
      before: before,
      after: updateData,
      ipAddress: request.ip,
      details: `Modification utilisateur ${user.email}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Utilisateur mis a jour avec succes",
      user,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

export const deleteUser = async (request, reply) => {
  try {
    const user = await User.findByIdAndDelete(request.params.id);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: "Utilisateur non trouve",
      });
    }

    await createAuditLog({
      userId: request.user.id,
      action: "DELETE_USER",
      targetCollection: "User",
      targetId: request.params.id,
      before: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      ipAddress: request.ip,
      details: `Suppression utilisateur ${user.email}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Utilisateur supprime avec succes",
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

export const toggleUserStatus = async (request, reply) => {
  try {
    const user = await User.findById(request.params.id);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: "Utilisateur non trouve",
      });
    }

    const previousStatus = user.isActive;
    user.isActive = !user.isActive;
    await user.save();

    await createAuditLog({
      userId: request.user.id,
      action: "UPDATE_USER",
      targetCollection: "User",
      targetId: user._id,
      before: { isActive: previousStatus },
      after: { isActive: user.isActive },
      ipAddress: request.ip,
      details: `Utilisateur ${user.email} ${user.isActive ? "active" : "desactive"}`,
    });

    return reply.status(200).send({
      success: true,
      message: `Utilisateur ${user.isActive ? "active" : "desactive"} avec succes`,
      isActive: user.isActive,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

export const updateMyEmail = async (request, reply) => {
  try {
    const { email } = request.body;
    if (!email) {
      return reply
        .status(400)
        .send({ success: false, message: "Email obligatoire" });
    }
    const emailExists = await User.findOne({
      email,
      _id: { $ne: request.user.id },
    });
    if (emailExists) {
      return reply
        .status(400)
        .send({ success: false, message: "Cet email est deja utilise" });
    }
    const user = await User.findByIdAndUpdate(
      request.user.id,
      { email },
      { new: true },
    ).select("-password -refreshToken");
    await createAuditLog({
      userId: request.user.id,
      action: "UPDATE_USER",
      targetCollection: "User",
      targetId: request.user.id,
      after: { email },
      ipAddress: request.ip,
      details: "Modification email utilisateur",
    });
    return reply
      .status(200)
      .send({ success: true, message: "Email mis a jour", user });
  } catch (err) {
    return reply
      .status(500)
      .send({ success: false, message: "Erreur serveur", error: err.message });
  }
};

export const updateMyPassword = async (request, reply) => {
  try {
    const { currentPassword, newPassword } = request.body;
    if (!currentPassword || !newPassword) {
      return reply
        .status(400)
        .send({ success: false, message: "Tous les champs sont obligatoires" });
    }
    if (newPassword.length < 8) {
      return reply
        .status(400)
        .send({
          success: false,
          message: "Le mot de passe doit contenir au moins 8 caracteres",
        });
    }
    const user = await User.findById(request.user.id);
    if (!user) {
      return reply
        .status(404)
        .send({ success: false, message: "Utilisateur non trouve" });
    }
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return reply
        .status(400)
        .send({ success: false, message: "Mot de passe actuel incorrect" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(request.user.id, { password: hashedPassword });
    await createAuditLog({
      userId: request.user.id,
      action: "UPDATE_USER",
      targetCollection: "User",
      targetId: request.user.id,
      ipAddress: request.ip,
      details: "Changement mot de passe",
    });
    return reply
      .status(200)
      .send({ success: true, message: "Mot de passe mis a jour avec succes" });
  } catch (err) {
    return reply
      .status(500)
      .send({ success: false, message: "Erreur serveur", error: err.message });
  }
};
