import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";

export const seedAdmin = async () => {
  try {
    // vérifie si un admin existe déjà
    const adminExists = await User.findOne({ role: "admin" });

    if (adminExists) {
      console.log("Admin déjà existant");
      return;
    }

    // premier admin par défaut
    const hashedPassword = await bcrypt.hash("Admin@1234", 10);

    await User.create({
      firstName: "Super",
      lastName: "Admin",
      email: "admin@pixelium.tech",
      password: hashedPassword,
      role: "admin",
      permissions: {
        candidates: ["read", "write", "delete"],
        scoring: ["read", "write"],
        tests: ["read", "write", "delete"],
        reports: ["read", "export"],
      },
      lastLogin: null,
      refreshToken: null,
      isActive: true,
    });

    console.log("Compte admin créé avec succès !");
    console.log("Email    : admin@pixelium.tech");
    console.log("Password : Admin@1234");
    console.log("Pensez à changer le mot de passe !");
  } catch (err) {
    console.error("Erreur seed admin :", err);
  }
};
