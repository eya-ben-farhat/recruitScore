import Test from "../models/Test.model.js";
import Question from "../models/Question.model.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { createAuditLog } from "../services/audit.service.js";

// Creer un test
export const createTest = async (request, reply) => {
  try {
    const {
      title,
      description,
      targetRole,
      generationCriteria,
      duration,
      assignedCandidates,
      scoringTemplateId,
    } = request.body;

    if (!title || !generationCriteria || !generationCriteria.totalQuestions) {
      return reply.status(400).send({
        success: false,
        message:
          "Les champs title et generationCriteria.totalQuestions sont obligatoires",
      });
    }

    const test = await Test.create({
      title,
      description,
      targetRole,
      generationCriteria,
      duration,
      assignedCandidates: assignedCandidates || [],
      scoringTemplateId: scoringTemplateId || null,
      status: "draft",
      isActive: true,
      createdBy: request.user.id,
    });

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "CREATE_TEST",
      targetCollection: "Test",
      targetId: test._id,
      after: { title, targetRole, status: "draft" },
      ipAddress: request.ip,
      details: `Creation test : ${title}`,
    });

    return reply.status(201).send({
      success: true,
      message: "Test cree avec succes",
      test,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir tous les tests
export const getTests = async (request, reply) => {
  try {
    const { status, targetRole, page = 1, limit = 10 } = request.query;

    const filter = {};
    if (status) filter.status = status;
    if (targetRole) filter.targetRole = targetRole;

    const total = await Test.countDocuments(filter);
    const tests = await Test.find(filter)
      .populate("createdBy", "firstName lastName")
      .populate("assignedCandidates", "personalInfo")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return reply.status(200).send({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: tests.length,
      tests,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir un test par ID
export const getTestById = async (request, reply) => {
  try {
    const test = await Test.findById(request.params.id)
      .populate("createdBy", "firstName lastName")
      .populate("assignedCandidates", "personalInfo")
      .populate(
        "questions.questionId",
        "content type theme difficulty points options explanation programmingLanguage",
      );

    if (!test) {
      return reply.status(404).send({
        success: false,
        message: "Test non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      test,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Mettre a jour un test
export const updateTest = async (request, reply) => {
  try {
    const existingTest = await Test.findById(request.params.id);
    if (!existingTest) {
      return reply.status(404).send({
        success: false,
        message: "Test non trouve",
      });
    }

    if (existingTest.status !== "draft") {
      return reply.status(400).send({
        success: false,
        message: "Impossible de modifier un test actif ou ferme",
      });
    }

    const test = await Test.findByIdAndUpdate(request.params.id, request.body, {
      new: true,
    });

    return reply.status(200).send({
      success: true,
      message: "Test mis a jour avec succes",
      test,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Supprimer un test
export const deleteTest = async (request, reply) => {
  try {
    const test = await Test.findById(request.params.id);

    if (!test) {
      return reply.status(404).send({
        success: false,
        message: "Test non trouve",
      });
    }

    if (test.status === "active") {
      return reply.status(400).send({
        success: false,
        message: "Impossible de supprimer un test actif",
      });
    }

    await Test.findByIdAndDelete(request.params.id);

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "CREATE_TEST",
      targetCollection: "Test",
      targetId: request.params.id,
      before: { title: test.title, status: test.status },
      ipAddress: request.ip,
      details: `Suppression test : ${test.title}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Test supprime avec succes",
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Generer automatiquement les questions d un test
export const generateTest = async (request, reply) => {
  try {
    const test = await Test.findById(request.params.id);

    if (!test) {
      return reply.status(404).send({
        success: false,
        message: "Test non trouve",
      });
    }

    if (test.status !== "draft") {
      return reply.status(400).send({
        success: false,
        message: "Impossible de generer les questions d un test actif ou ferme",
      });
    }

    const { totalQuestions, themes, difficulty, types } =
      test.generationCriteria;

    if (themes && themes.length > 0) {
      for (const theme of themes) {
        const count = await Question.countDocuments({ theme, isActive: true });
        if (count === 0) {
          return reply.status(400).send({
            success: false,
            message: `Aucune question disponible pour le theme : ${theme}`,
          });
        }
      }
    }

    const filter = { isActive: true };
    if (themes && themes.length > 0) filter.theme = { $in: themes };
    if (types && types.length > 0) filter.type = { $in: types };
    if (difficulty && difficulty !== "mixed") filter.difficulty = difficulty;

    const availableCount = await Question.countDocuments(filter);
    if (availableCount < totalQuestions) {
      return reply.status(400).send({
        success: false,
        message: `Pas assez de questions disponibles. Disponibles : ${availableCount}, Demandees : ${totalQuestions}`,
      });
    }

    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: totalQuestions } },
    ]);

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    const updatedTest = await Test.findByIdAndUpdate(
      request.params.id,
      {
        questions: questions.map((q) => ({
          questionId: q._id,
          points: q.points,
        })),
        totalPoints,
        status: "active",
      },
      { new: true },
    ).populate(
      "questions.questionId",
      "content type theme difficulty points options",
    );

    // Audit log
    await createAuditLog({
      userId: request.user.id,
      action: "GENERATE_TEST",
      targetCollection: "Test",
      targetId: test._id,
      after: { totalPoints, questionsCount: questions.length },
      ipAddress: request.ip,
      details: `Generation test : ${test.title} - ${questions.length} questions`,
    });

    return reply.status(200).send({
      success: true,
      message: `Test genere avec succes - ${questions.length} questions selectionnees`,
      test: updatedTest,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Changer le statut d un test
export const changeTestStatus = async (request, reply) => {
  try {
    const { status } = request.body;

    const validStatuses = ["draft", "active", "closed"];
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({
        success: false,
        message: "Statut invalide",
      });
    }

    const test = await Test.findById(request.params.id);
    if (!test) {
      return reply.status(404).send({
        success: false,
        message: "Test non trouve",
      });
    }

    const validTransitions = {
      draft: ["active"],
      active: ["closed"],
      closed: [],
    };

    if (!validTransitions[test.status].includes(status)) {
      return reply.status(400).send({
        success: false,
        message: `Transition invalide : ${test.status} → ${status}`,
      });
    }

    if (
      status === "active" &&
      (!test.questions || test.questions.length === 0)
    ) {
      return reply.status(400).send({
        success: false,
        message:
          "Impossible d activer un test sans questions - generez les questions d abord",
      });
    }

    const updatedTest = await Test.findByIdAndUpdate(
      request.params.id,
      { status },
      { new: true },
    );

    return reply.status(200).send({
      success: true,
      message: `Statut mis a jour : ${updatedTest.status}`,
      status: updatedTest.status,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Generer et sauvegarder le PDF d un test
export const exportTestPDF = async (request, reply) => {
  try {
    const test = await Test.findById(request.params.id)
      .populate(
        "questions.questionId",
        "content type theme difficulty points options explanation programmingLanguage",
      )
      .populate("assignedCandidates", "personalInfo")
      .populate("scoringTemplateId", "name targetRole");

    if (!test) {
      return reply
        .status(404)
        .send({ success: false, message: "Test non trouve" });
    }

    if (!test.questions || test.questions.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "Impossible d exporter un test sans questions",
      });
    }

    const uploadsDir = "uploads/tests";
    if (!fs.existsSync(uploadsDir))
      fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `test_${test._id}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 0,
        size: "A4",
        autoFirstPage: true,
      });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const W = 595;
      const NAVY = "#1e3a5f";
      const BLUE = "#2563eb";
      const DARK = "#1e293b";
      const GRAY = "#64748b";
      const LGRAY = "#94a3b8";
      const BORDER = "#e2e8f0";
      const BG = "#f8fafc";
      const WHITE = "#ffffff";

      const totalPages = Math.ceil(test.questions.length / 5) + 1;
      const totalQuestions = test.questions.length;
      const totalPoints =
        test.totalPoints ||
        test.questions.reduce((s, q) => s + (q.points || 0), 0);
      const dateStr = new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      // ── Helper : ligne de règle ────────────────────────────────────────
      const rule = (y, color = BORDER, lw = 0.5) => {
        doc
          .moveTo(50, y)
          .lineTo(W - 50, y)
          .strokeColor(color)
          .lineWidth(lw)
          .stroke();
      };

      // ── Helper : champ vide à remplir ─────────────────────────────────
      const field = (label, x, y, w) => {
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(GRAY)
          .text(label + " :", x, y);
        const lw = doc.widthOfString(label + " :") + 4;
        doc
          .moveTo(x + lw, y + 9)
          .lineTo(x + lw + w, y + 9)
          .strokeColor(LGRAY)
          .lineWidth(0.75)
          .stroke();
      };

      // ── Helper : en-tête de page ──────────────────────────────────────
      const pageHeader = (pageNum) => {
        // Bande marine
        doc.save().rect(0, 0, W, 30).fill(NAVY).restore();
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor(WHITE)
          .text("RECRUITSCORE — TEST D'ÉVALUATION TECHNIQUE", 50, 11);
        doc
          .fontSize(7.5)
          .fillColor("rgba(255,255,255,0.6)")
          .text(`Page ${pageNum} / ${totalPages}`, W - 150, 11, {
            width: 100,
            align: "right",
          });

        // Ligne bleue fine
        doc.save().rect(0, 30, W, 2).fill(BLUE).restore();
      };

      // ── Helper : pied de page ─────────────────────────────────────────
      const pageFooter = () => {
        doc.save().rect(0, 800, W, 42).fill(BG).restore();
        doc
          .moveTo(0, 800)
          .lineTo(W, 800)
          .strokeColor(BORDER)
          .lineWidth(0.5)
          .stroke();
        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor(LGRAY)
          .text(
            "Ce document est confidentiel. Toute reproduction ou communication est interdite.",
            50,
            812,
            { width: W - 100, align: "center" },
          );
        doc
          .fontSize(7)
          .fillColor(LGRAY)
          .text(
            `${test.targetRole || "Évaluation Technique"} — ${dateStr}`,
            50,
            824,
            { width: W - 100, align: "center" },
          );
      };

      // ════════════════════════════════════════════════════════════════
      // PAGE 1 — EN-TÊTE EXAMEN
      // ════════════════════════════════════════════════════════════════
      pageHeader(1);

      // Commencer directement après l'en-tête de page
      let y = 50;

      // ── Encadré candidat EN HAUT ──────────────────────────────────────
      doc
        .save()
        .roundedRect(50, y, W - 100, 72, 4)
        .fill(WHITE)
        .restore();
      doc
        .save()
        .roundedRect(50, y, W - 100, 72, 4)
        .stroke(BORDER)
        .restore();
      // Titre encadré
      doc
        .save()
        .roundedRect(50, y, W - 100, 20, 4)
        .fill(NAVY)
        .restore();
      doc
        .save()
        .rect(50, y + 10, W - 100, 10)
        .fill(NAVY)
        .restore();
      doc
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .fillColor(WHITE)
        .text("IDENTIFICATION DU CANDIDAT", 50, y + 6, {
          width: W - 100,
          align: "center",
        });
      // Champs à remplir
      field("Nom", 70, y + 30, 130);
      field("Prénom", 250, y + 30, 130);
      field("Date", 430, y + 30, 80);
      field("Signature", 70, y + 52, 200);
      y += 88;

      // ── Encadré informations générales ────────────────────────────────
      doc
        .save()
        .roundedRect(50, y, W - 100, 56, 4)
        .fill(BG)
        .restore();
      doc
        .save()
        .roundedRect(50, y, W - 100, 56, 4)
        .stroke(BORDER)
        .restore();
      doc.save().rect(50, y, 3, 56).fill(BLUE).restore();

      const col1X = 70;
      const col2X = 220;
      const col3X = 380;

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(GRAY)
        .text("POSTE CIBLE", col1X, y + 10);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(DARK)
        .text(test.targetRole || "—", col1X, y + 22);

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(GRAY)
        .text("DURÉE", col2X, y + 10);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(DARK)
        .text(
          test.duration ? `${test.duration} minutes` : "Non limitée",
          col2X,
          y + 22,
        );

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(GRAY)
        .text("NOMBRE DE QUESTIONS", col3X, y + 10);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(DARK)
        .text(`${totalQuestions} questions`, col3X, y + 22);

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(GRAY)
        .text("TOTAL DES POINTS", col1X, y + 36);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(DARK)
        .text(`${totalPoints} points`, col1X, y + 48);

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(GRAY)
        .text("DATE", col2X, y + 36);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(DARK)
        .text(dateStr, col2X, y + 48);

      if (test.scoringTemplateId?.name) {
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(GRAY)
          .text("TEMPLATE", col3X, y + 36);
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(DARK)
          .text(test.scoringTemplateId.name, col3X, y + 48);
      }
      y += 66;

      // ── Titre du test ─────────────────────────────────────────────────
      doc
        .moveTo(50, y)
        .lineTo(W - 50, y)
        .strokeColor(NAVY)
        .lineWidth(1.5)
        .stroke();
      doc
        .moveTo(50, y + 3)
        .lineTo(W - 50, y + 3)
        .strokeColor(BLUE)
        .lineWidth(0.5)
        .stroke();
      y += 14;
      doc
        .fontSize(15)
        .font("Helvetica-Bold")
        .fillColor(DARK)
        .text(test.title.toUpperCase(), 50, y, {
          align: "center",
          width: W - 100,
        });
      if (test.description) {
        y += 22;
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(GRAY)
          .text(test.description, 50, y, { align: "center", width: W - 100 });
      }
      y += 20;
      doc
        .moveTo(50, y)
        .lineTo(W - 50, y)
        .strokeColor(NAVY)
        .lineWidth(1.5)
        .stroke();
      doc
        .moveTo(50, y + 3)
        .lineTo(W - 50, y + 3)
        .strokeColor(BLUE)
        .lineWidth(0.5)
        .stroke();
      y += 18;

      // ── Instructions ──────────────────────────────────────────────────
      doc
        .save()
        .roundedRect(50, y, W - 100, 90, 4)
        .fill(BG)
        .restore();
      doc
        .save()
        .roundedRect(50, y, W - 100, 90, 4)
        .stroke(BORDER)
        .restore();
      doc.save().rect(50, y, 3, 90).fill(NAVY).restore();

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(NAVY)
        .text("INSTRUCTIONS", 65, y + 10);

      const instructions = [
        "Lisez attentivement chaque question avant de répondre.",
        "Pour les questions à choix multiples, entourez la lettre correspondant à votre réponse.",
        "Pour les questions ouvertes, rédigez votre réponse de manière claire et structurée.",
        "Pour les questions de code, précisez le langage utilisé si différent de celui indiqué.",
        "Toute forme de triche entraîne l'annulation immédiate de l'évaluation.",
      ];

      instructions.forEach((inst, i) => {
        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor(DARK)
          .text(`${i + 1}.  ${inst}`, 65, y + 24 + i * 13, { width: W - 130 });
      });

      // Ligne de séparation avant les questions
      y += 108;
      doc
        .moveTo(50, y)
        .lineTo(W - 50, y)
        .strokeColor(NAVY)
        .lineWidth(1.5)
        .stroke();
      doc
        .moveTo(50, y + 3)
        .lineTo(W - 50, y + 3)
        .strokeColor(BLUE)
        .lineWidth(0.5)
        .stroke();

      // ── Début des questions sur la page 1 ────────────────────────────
      y += 18;

      // Thèmes utilisés
      const themes = [
        ...new Set(
          test.questions.map((q) => q.questionId?.theme).filter(Boolean),
        ),
      ];
      if (themes.length > 0) {
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(LGRAY)
          .text(`Thèmes abordés : ${themes.join("  •  ")}`, 50, y, {
            width: W - 100,
            align: "right",
          });
        y += 16;
      }

      // ════════════════════════════════════════════════════════════════
      // QUESTIONS
      // ════════════════════════════════════════════════════════════════
      let pageNum = 1;

      test.questions.forEach((q, index) => {
        const question = q.questionId;
        if (!question) return;

        // Estimer la hauteur nécessaire
        const contentLines = Math.ceil(question.content.length / 80);
        const optionsHeight =
          question.type === "qcm" ? (question.options?.length || 0) * 16 : 0;
        const estimatedH = contentLines * 14 + optionsHeight + 50;

        // Saut de page si nécessaire
        if (y + estimatedH > 790) {
          pageFooter();
          doc.addPage({ margin: 0, size: "A4" });
          pageNum++;
          pageHeader(pageNum);
          y = 50;
        }

        // ── Numéro  ───────────────────────────────────────────
        doc.save().roundedRect(50, y, 22, 22, 3).fill(NAVY).restore();
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .fillColor(WHITE)
          .text(`${index + 1}`, 50, y + 6, { width: 22, align: "center" });

        // ── Contenu de la question ──────────────────────────────────────
        y += 28;
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor(DARK)
          .text(question.content, 70, y, { width: W - 130, lineGap: 2 });
        y = doc.y + 8;

        // ── Options QCM ────────────────────────────────────────────────
        if (question.type === "qcm" && question.options?.length > 0) {
          question.options.forEach((opt, i) => {
            const letter = String.fromCharCode(65 + i);

            doc
              .save()
              .circle(88, y + 5, 7)
              .stroke(LGRAY)
              .restore();
            doc
              .fontSize(8)
              .font("Helvetica-Bold")
              .fillColor(GRAY)
              .text(letter, 85, y + 1);

            doc
              .fontSize(9.5)
              .font("Helvetica")
              .fillColor(DARK)
              .text(opt.label, 102, y + 1, { width: W - 165 });
            y += 16;
          });
          y += 4;
        }

        // ── Zone de réponse (questions ouvertes / pratiques) ────────────
        if (question.type === "open" || question.type === "practical") {
          const lineCount = 4;
          for (let l = 0; l < lineCount; l++) {
            doc
              .moveTo(78, y + l * 20)
              .lineTo(W - 50, y + l * 20)
              .strokeColor(BORDER)
              .lineWidth(0.5)
              .stroke();
          }
          y += lineCount * 20 + 8;
        }

        // ── Zone de code ───────────────────────────────────────────────
        if (question.type === "code") {
          if (question.programmingLanguage) {
            doc
              .fontSize(7.5)
              .font("Helvetica-Oblique")
              .fillColor(LGRAY)
              .text(`Langage : ${question.programmingLanguage}`, 78, y);
            y += 12;
          }
          doc
            .save()
            .rect(78, y, W - 130, 60)
            .fill("#f1f5f9")
            .restore();
          doc
            .save()
            .rect(78, y, W - 130, 60)
            .stroke(BORDER)
            .restore();
          doc
            .fontSize(8)
            .font("Helvetica-Oblique")
            .fillColor(LGRAY)
            .text("Zone de réponse — Code", 78, y + 24, {
              width: W - 130,
              align: "center",
            });
          y += 68;
        }

        // ── Séparateur entre questions ──────────────────────────────────
        if (index < test.questions.length - 1) {
          doc
            .moveTo(78, y)
            .lineTo(W - 50, y)
            .strokeColor(BORDER)
            .lineWidth(0.5)
            .stroke();
          y += 14;
        }
      });

      // Pied de page dernière page
      pageFooter();

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    const generatedAt = new Date();
    await Test.findByIdAndUpdate(request.params.id, {
      pdfExport: { generatedAt, filePath, fileName },
    });

    await createAuditLog({
      userId: request.user.id,
      action: "EXPORT_PDF",
      targetCollection: "Test",
      targetId: test._id,
      after: { fileName, generatedAt },
      ipAddress: request.ip,
      details: `Export PDF test : ${test.title}`,
    });

    return reply.status(200).send({
      success: true,
      message: "PDF genere avec succes",
      pdf: {
        fileName,
        generatedAt,
        downloadUrl: `${process.env.BASE_URL}/api/tests/${request.params.id}/download-pdf`,
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

// Telecharger le PDF d un test
export const downloadTestPDF = async (request, reply) => {
  try {
    const test = await Test.findById(request.params.id);

    if (!test) {
      return reply.status(404).send({
        success: false,
        message: "Test non trouve",
      });
    }

    if (!test.pdfExport?.filePath) {
      return reply.status(404).send({
        success: false,
        message: "Aucun PDF genere pour ce test",
      });
    }

    const filePath = test.pdfExport.filePath;

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({
        success: false,
        message: "Fichier PDF introuvable sur le serveur",
      });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return reply
      .status(200)
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        'attachment; filename="' + test.pdfExport.fileName + '"',
      )
      .header("Content-Length", fileBuffer.length)
      .send(fileBuffer);
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};
