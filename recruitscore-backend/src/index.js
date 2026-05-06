import Fastify from "fastify";
import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { seedAdmin } from "./config/seed.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import kpiRoutes from "./routes/kpi.routes.js";
import scoringTemplateRoutes from "./routes/scoringTemplate.routes.js";
import scoringRoutes from "./routes/scoring.routes.js";
import questionRoutes from "./routes/question.routes.js";
import { seedQuestions } from "./config/seedQuestions.js";
import testRoutes from "./routes/test.routes.js";
import testResultRoutes from "./routes/testResult.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import reportRoutes from "./routes/report.routes.js";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import nlpRoutes from "./routes/nlp.routes.js";
import aiRoutes from "./routes/ai.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });

const start = async () => {
  try {
    await app.register(cors, {
      origin: "http://localhost:3001",
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });

    await app.register(multipart, {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    });

    await app.register(fastifyStatic, {
      root: path.join(__dirname, "..", "uploads"),
      prefix: "/uploads/",
    });

    // 1. Connexion MongoDB
    await connectDB();

    // 2. Creation admin par defaut
    await seedAdmin();
    await seedQuestions();

    // 3. Enregistrer les routes
    app.register(authRoutes);
    app.register(userRoutes);
    app.register(candidateRoutes);
    app.register(kpiRoutes);
    app.register(scoringTemplateRoutes);
    app.register(scoringRoutes);
    app.register(questionRoutes);
    app.register(testRoutes);
    app.register(testResultRoutes);
    app.register(auditLogRoutes);
    app.register(reportRoutes);
    app.register(nlpRoutes);
    app.register(aiRoutes);
    // 4. Demarrage du serveur
    await app.listen({ port: process.env.PORT, host: "0.0.0.0" });
    console.log(`Serveur demarre sur http://localhost:${process.env.PORT}`);
  } catch (err) {
    console.error("Erreur demarrage :", err);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB deconnecte");
  process.exit(0);
});

start();
