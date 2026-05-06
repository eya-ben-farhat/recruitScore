import Candidate from "../models/Candidate.model.js";
import KPI from "../models/KPI.model.js";
import Test from "../models/Test.model.js";
import TestResult from "../models/TestResult.model.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { createAuditLog } from "../services/audit.service.js";

// Stats globales
export const getGlobalStats = async (request, reply) => {
  try {
    const totalCandidates = await Candidate.countDocuments();

    const byStatus = await Candidate.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const scoreStats = await Candidate.aggregate([
      { $match: { "scores.global": { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$scores.global" },
          maxScore: { $max: "$scores.global" },
          minScore: { $min: "$scores.global" },
        },
      },
    ]);

    const accepted = await Candidate.countDocuments({ status: "accepted" });
    const rejected = await Candidate.countDocuments({ status: "rejected" });
    const acceptanceRate =
      totalCandidates > 0
        ? Math.round((accepted / totalCandidates) * 100 * 100) / 100
        : 0;

    const byTags = await Candidate.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const byAvailability = await Candidate.aggregate([
      { $group: { _id: "$availability.type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return reply.status(200).send({
      success: true,
      stats: {
        totalCandidates,
        byStatus,
        scores: scoreStats[0] || { avgScore: 0, maxScore: 0, minScore: 0 },
        acceptanceRate,
        accepted,
        rejected,
        byTags,
        byAvailability,
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

// Stats par KPI
export const getKPIStats = async (request, reply) => {
  try {
    const kpis = await KPI.find({ isActive: true });

    const kpiStats = await Candidate.aggregate([
      { $match: { "scores.byKPI": { $exists: true, $ne: [] } } },
      { $unwind: "$scores.byKPI" },
      {
        $group: {
          _id: "$scores.byKPI.kpiId",
          avgScore: { $avg: "$scores.byKPI.pointsObtained" }, // ✅ corrigé
          maxScore: { $max: "$scores.byKPI.pointsObtained" }, // ✅ corrigé
          minScore: { $min: "$scores.byKPI.pointsObtained" }, // ✅ corrigé
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "kpis",
          localField: "_id",
          foreignField: "_id",
          as: "kpi",
        },
      },
      { $unwind: "$kpi" },
      {
        $project: {
          avgScore: 1,
          maxScore: 1,
          minScore: 1,
          count: 1,
          "kpi.name": 1,
          "kpi.category": 1,
          "kpi.weight": 1,
        },
      },
      { $sort: { avgScore: -1 } },
    ]);

    return reply.status(200).send({
      success: true,
      stats: {
        totalKPIs: kpis.length,
        kpiStats,
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

// Stats par periode
export const getPeriodStats = async (request, reply) => {
  try {
    const { period = "month" } = request.query;

    const dateFormat =
      period === "week" ? "%Y-%U" : period === "year" ? "%Y" : "%Y-%m";

    const candidatesByPeriod = await Candidate.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 },
          avgScore: { $avg: "$scores.global" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    const testsByPeriod = await Test.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    const resultsByPeriod = await TestResult.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 },
          avgScore: { $avg: "$percentage" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    return reply.status(200).send({
      success: true,
      period,
      stats: {
        candidatesByPeriod,
        testsByPeriod,
        resultsByPeriod,
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

// Tableau de bord
export const getDashboard = async (request, reply) => {
  try {
    const totalCandidates = await Candidate.countDocuments();
    const totalTests = await Test.countDocuments();
    const totalResults = await TestResult.countDocuments();
    const pendingEvaluation = await Candidate.countDocuments({
      status: "evaluating",
    });

    const topCandidates = await Candidate.find({ "scores.global": { $gt: 0 } })
      .select("personalInfo scores status tags")
      .sort({ "scores.global": -1 })
      .limit(5);

    const recentCandidates = await Candidate.find()
      .select("personalInfo status scores createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentTests = await Test.find()
      .select(
        "title status targetRole createdAt assignedCandidates scoringTemplateId",
      )
      .populate("assignedCandidates", "personalInfo")
      .populate("scoringTemplateId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    const byStatus = await Candidate.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const scoreStats = await Candidate.aggregate([
      { $match: { "scores.global": { $gt: 0 } } },
      { $group: { _id: null, avgScore: { $avg: "$scores.global" } } },
    ]);

    const candidatesByPeriod = await Candidate.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
          avgScore: { $avg: "$scores.global" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    return reply.status(200).send({
      success: true,
      dashboard: {
        counters: {
          totalCandidates,
          totalTests,
          totalResults,
          pendingEvaluation,
        },
        avgScore: Math.round((scoreStats[0]?.avgScore || 0) * 100) / 100,
        topCandidates,
        recentCandidates,
        recentTests,
        byStatus,
        candidatesByPeriod,
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

// Stats d un candidat
export const getCandidateStats = async (request, reply) => {
  try {
    const candidate = await Candidate.findById(request.params.id).populate(
      "createdBy",
      "firstName lastName",
    );

    if (!candidate) {
      return reply.status(404).send({
        success: false,
        message: "Candidat non trouve",
      });
    }

    const testResults = await TestResult.find({
      candidateId: request.params.id,
    })
      .populate("testId", "title totalPoints duration")
      .sort({ createdAt: -1 });

    const globalAvg = await Candidate.aggregate([
      { $match: { "scores.global": { $gt: 0 } } },
      { $group: { _id: null, avgScore: { $avg: "$scores.global" } } },
    ]);

    const avgScore = Math.round((globalAvg[0]?.avgScore || 0) * 100) / 100;
    const candidateScore = candidate.scores?.global || 0;
    const difference = Math.round((candidateScore - avgScore) * 100) / 100;

    return reply.status(200).send({
      success: true,
      stats: {
        candidate: {
          id: candidate._id,
          personalInfo: candidate.personalInfo,
          status: candidate.status,
          scores: candidate.scores,
          tags: candidate.tags,
        },
        testResults,
        comparison: {
          candidateScore,
          globalAverage: avgScore,
          difference,
          aboveAverage: difference > 0,
        },
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

// Export rapport PDF
export const exportReportPDF = async (request, reply) => {
  try {
    const { type = "global" } = request.body;

    // ── Collecte des données ───────────────────────────────────────────────
    const totalCandidates = await Candidate.countDocuments();
    const byStatus = await Candidate.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const scoreStats = await Candidate.aggregate([
      { $match: { "scores.global": { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$scores.global" },
          maxScore: { $max: "$scores.global" },
          minScore: { $min: "$scores.global" },
        },
      },
    ]);
    const topCandidates = await Candidate.find({ "scores.global": { $gt: 0 } })
      .select("personalInfo scores status education")
      .sort({ "scores.global": -1 })
      .limit(10);

    const totalTests = await Test.countDocuments();
    const activeTests = await Test.countDocuments({ status: "active" });
    const closedTests = await Test.countDocuments({ status: "closed" });
    const totalResults = await TestResult.countDocuments();
    const integrated = await TestResult.countDocuments({
      integratedInScoring: true,
    });
    const accepted = await Candidate.countDocuments({ status: "accepted" });
    const rejected = await Candidate.countDocuments({ status: "rejected" });
    const shortlisted = await Candidate.countDocuments({
      status: "shortlisted",
    });
    const evaluating = await Candidate.countDocuments({ status: "evaluating" });
    const newCands = await Candidate.countDocuments({ status: "new" });
    const scoredCands = await Candidate.countDocuments({
      "scores.global": { $gt: 0 },
    });

    const avgScore = Math.round((scoreStats[0]?.avgScore || 0) * 100) / 100;
    const maxScore = scoreStats[0]?.maxScore || 0;
    const minScore = Math.round((scoreStats[0]?.minScore || 0) * 100) / 100;
    const acceptanceRate =
      totalCandidates > 0 ? Math.round((accepted / totalCandidates) * 100) : 0;
    const scoringRate =
      totalCandidates > 0
        ? Math.round((scoredCands / totalCandidates) * 100)
        : 0;

    // ── Préparation fichier ────────────────────────────────────────────────
    const uploadsDir = "uploads/reports";
    if (!fs.existsSync(uploadsDir))
      fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `report_${type}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 0, size: "A4" });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ── Palette sobre et professionnelle ──────────────────────────────────
      const W = 595;
      const NAVY = "#1e3a5f"; // bleu marine — couleur principale
      const BLUE = "#2563eb"; // bleu accent
      const DARK = "#1e293b"; // texte principal
      const GRAY = "#64748b"; // texte secondaire
      const LGRAY = "#94a3b8"; // texte tertiaire
      const BORDER = "#e2e8f0"; // bordures
      const BG = "#f8fafc"; // fond léger
      const WHITE = "#ffffff";
      const GREEN = "#059669";
      const RED = "#dc2626";
      const AMBER = "#d97706";

      // ── Helpers ───────────────────────────────────────────────────────────
      const rule = (y, color = BORDER, lw = 0.5) => {
        doc
          .moveTo(50, y)
          .lineTo(W - 50, y)
          .strokeColor(color)
          .lineWidth(lw)
          .stroke();
      };

      const sectionTitle = (text, y) => {
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor(NAVY)
          .text(text.toUpperCase(), 50, y);
        doc
          .moveTo(50, y + 16)
          .lineTo(W - 50, y + 16)
          .strokeColor(NAVY)
          .lineWidth(1.5)
          .stroke();
        return y + 26;
      };

      const paragraph = (text, y, width = W - 100) => {
        doc
          .fontSize(9.5)
          .font("Helvetica")
          .fillColor(DARK)
          .text(text, 50, y, { width, lineGap: 3, align: "justify" });
        return doc.y + 6;
      };

      // Barre horizontale sobre
      const hBar = (x, y, totalW, h, pct, color) => {
        doc.save().rect(x, y, totalW, h).fill(BG).restore();
        if (pct > 0) {
          doc
            .save()
            .rect(x, y, totalW * (pct / 100), h)
            .fill(color)
            .restore();
        }
      };

      // ════════════════════════════════════════════════════════════════════
      // PAGE DE COUVERTURE
      // ════════════════════════════════════════════════════════════════════

      // Bande marine supérieure
      doc.save().rect(0, 0, W, 200).fill(NAVY).restore();

      // Liseré bleu fin en bas de la bande
      doc.save().rect(0, 200, W, 3).fill(BLUE).restore();

      // Logo / Nom plateforme
      doc
        .fontSize(28)
        .font("Helvetica-Bold")
        .fillColor(WHITE)
        .text("RecruitScore", 50, 60);
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("rgba(255,255,255,0.6)")
        .text("Plateforme de Recrutement Intelligent", 50, 96);

      // Titre du rapport
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor(WHITE)
        .text("Rapport d'Analyse du Processus de Recrutement", 50, 140, {
          width: W - 100,
        });

      // Métadonnées couverture
      let y = 230;
      const meta = [
        ["Type de rapport", "Rapport Global"],
        [
          "Date de génération",
          new Date().toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
        ],
        ["Période couverte", "Données cumulées"],
        ["Statut", "Confidentiel — Usage interne"],
      ];

      meta.forEach(([label, value]) => {
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor(GRAY)
          .text(label.toUpperCase(), 50, y);
        doc.fontSize(10).font("Helvetica").fillColor(DARK).text(value, 200, y);
        rule(y + 16);
        y += 28;
      });

      // Note de bas de couverture
      doc.save().rect(0, 770, W, 72).fill(BG).restore();
      rule(770, BORDER, 0.5);
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(LGRAY)
        .text(
          "Ce document est généré automatiquement par la plateforme RecruitScore. " +
            "Les données présentées reflètent l'état du système au moment de la génération. " +
            "Toute reproduction ou diffusion externe est soumise à autorisation préalable.",
          50,
          785,
          { width: W - 100, align: "justify", lineGap: 2 },
        );

      // ════════════════════════════════════════════════════════════════════
      // PAGE 1 — SYNTHÈSE EXÉCUTIVE
      // ════════════════════════════════════════════════════════════════════
      doc.addPage({ margin: 0, size: "A4" });

      // En-tête de page sobre
      doc.save().rect(0, 0, W, 45).fill(BG).restore();
      rule(45, BORDER, 0.5);
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(LGRAY)
        .text("RECRUITSCORE — RAPPORT D'ANALYSE", 50, 17);
      doc
        .fontSize(8)
        .fillColor(LGRAY)
        .text(new Date().toLocaleDateString("fr-FR"), W - 150, 17, {
          width: 100,
          align: "right",
        });

      y = 70;

      // ── 1. Synthèse exécutive ─────────────────────────────────────────────
      y = sectionTitle("1. Synthèse Exécutive", y);
      y += 6;

      const synthText =
        `Au moment de la génération de ce rapport, la plateforme RecruitScore recense ` +
        `${totalCandidates} candidature${totalCandidates > 1 ? "s" : ""} enregistrée${totalCandidates > 1 ? "s" : ""}, ` +
        `dont ${scoredCands} ont fait l'objet d'une évaluation par le système de scoring ` +
        `(soit ${scoringRate}% du vivier total). ` +
        `Le taux d'acceptation global s'établit à ${acceptanceRate}%, avec ${accepted} candidat${accepted > 1 ? "s" : ""} ` +
        `retenu${accepted > 1 ? "s" : ""} sur l'ensemble des profils traités. ` +
        `${rejected} candidature${rejected > 1 ? "s ont été rejetées" : " a été rejetée"} à l'issue du processus d'évaluation, ` +
        `tandis que ${shortlisted} profil${shortlisted > 1 ? "s demeurent présélectionnés" : " demeure présélectionné"} ` +
        `et ${evaluating} ${evaluating > 1 ? "sont" : "est"} actuellement en cours d'évaluation.`;

      y = paragraph(synthText, y);
      y += 8;

      const synthText2 =
        `Sur le plan des évaluations techniques, ${totalTests} test${totalTests > 1 ? "s" : ""} ` +
        `ont été créés sur la plateforme, dont ${activeTests} actuellement actif${activeTests > 1 ? "s" : ""} ` +
        `et ${closedTests} clôturé${closedTests > 1 ? "s" : ""}. ` +
        `${totalResults} résultat${totalResults > 1 ? "s" : ""} de test ` +
        `${totalResults > 1 ? "ont été saisis" : "a été saisi"}, ` +
        `parmi lesquels ${integrated} ${integrated > 1 ? "ont été intégrés" : "a été intégré"} ` +
        `dans le calcul du score global des candidats concernés.`;

      y = paragraph(synthText2, y);
      y += 20;

      // ── 2. Indicateurs Clés de Performance ──────────────────────────────
      y = sectionTitle("2. Indicateurs Clés de Performance", y);
      y += 10;

      // Tableau KPIs sobre
      const kpis = [
        {
          label: "Total candidatures",
          value: `${totalCandidates}`,
          note: "Profils enregistrés dans le système",
        },
        {
          label: "Candidatures évaluées",
          value: `${scoredCands} (${scoringRate}%)`,
          note: "Ont reçu un score KPI",
        },
        {
          label: "Taux d'acceptation",
          value: `${acceptanceRate}%`,
          note: `${accepted} candidats acceptés`,
        },
        {
          label: "Score moyen global",
          value: `${avgScore} / 100`,
          note: "Moyenne sur les profils scorés",
        },
        {
          label: "Score le plus élevé",
          value: `${maxScore} / 100`,
          note: "Meilleur profil évalué",
        },
        {
          label: "Tests techniques créés",
          value: `${totalTests}`,
          note: `${activeTests} actifs, ${closedTests} clôturés`,
        },
        {
          label: "Résultats intégrés",
          value: `${integrated} / ${totalResults}`,
          note: "Intégrés dans le scoring global",
        },
      ];

      // En-tête tableau
      doc
        .save()
        .rect(50, y, W - 100, 20)
        .fill(NAVY)
        .restore();
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(WHITE)
        .text("INDICATEUR", 60, y + 6, { width: 180 });
      doc.text("VALEUR", 245, y + 6, { width: 80, align: "center" });
      doc.text("OBSERVATION", 330, y + 6, { width: 200 });
      y += 20;

      kpis.forEach((k, i) => {
        const bg = i % 2 === 0 ? WHITE : BG;
        doc
          .save()
          .rect(50, y, W - 100, 22)
          .fill(bg)
          .restore();
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(DARK)
          .text(k.label, 60, y + 6, { width: 180 });
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor(BLUE)
          .text(k.value, 245, y + 6, { width: 80, align: "center" });
        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor(GRAY)
          .text(k.note, 330, y + 6, { width: 200 });
        doc
          .save()
          .rect(50, y + 22, W - 100, 0.5)
          .fill(BORDER)
          .restore();
        y += 22;
      });

      // Bordure tableau
      doc
        .save()
        .rect(50, y - kpis.length * 22 - 20, W - 100, kpis.length * 22 + 20)
        .stroke(BORDER)
        .restore();

      y += 24;

      // ── 3. Analyse de la Distribution des Scores ─────────────────────────
      y = sectionTitle("3. Analyse de la Distribution des Scores", y);
      y += 6;

      const distText =
        `L'analyse de la distribution des scores révèle un écart de ${Math.round(maxScore - minScore)} points ` +
        `entre le profil le mieux évalué (${maxScore}/100) et le profil le moins bien noté (${minScore}/100), ` +
        `pour une moyenne générale de ${avgScore}/100. ` +
        `${
          avgScore >= 60
            ? "Ce niveau moyen satisfaisant témoigne d'un vivier de candidats globalement compétent et en adéquation avec les profils recherchés."
            : avgScore >= 40
              ? "Ce niveau moyen modéré indique une hétérogénéité dans les profils candidats, nécessitant un affinement des critères de présélection."
              : "Ce niveau moyen faible suggère un décalage entre les profils disponibles et les exigences des postes à pourvoir."
        }`;

      y = paragraph(distText, y);
      y += 12;

      // Visualisation distribution sobre — 3 segments
      const segments = [
        {
          label: "Profils faibles (< 40)",
          count: topCandidates.filter((c) => c.scores?.global < 40).length,
          color: RED,
          pct: 0,
        },
        {
          label: "Profils moyens (40 – 69)",
          count: topCandidates.filter(
            (c) => c.scores?.global >= 40 && c.scores?.global < 70,
          ).length,
          color: AMBER,
          pct: 0,
        },
        {
          label: "Profils forts (> 70)",
          count: topCandidates.filter((c) => c.scores?.global >= 70).length,
          color: GREEN,
          pct: 0,
        },
      ];
      const totalSeg = segments.reduce((s, seg) => s + seg.count, 0) || 1;
      segments.forEach((seg) => {
        seg.pct = Math.round((seg.count / totalSeg) * 100);
      });

      // Graphique barre empilée horizontale
      const barY = y;
      const barH = 24;
      const barTotalW = W - 100;
      let barX = 50;

      segments.forEach((seg) => {
        const segW = (seg.pct / 100) * barTotalW;
        if (segW > 0) {
          doc.save().rect(barX, barY, segW, barH).fill(seg.color).restore();
          if (segW > 30) {
            doc
              .fontSize(8)
              .font("Helvetica-Bold")
              .fillColor(WHITE)
              .text(`${seg.pct}%`, barX, barY + 8, {
                width: segW,
                align: "center",
              });
          }
          barX += segW;
        }
      });

      y += barH + 10;

      // Légende
      segments.forEach((seg, i) => {
        const lX = 50 + i * 165;
        doc.save().rect(lX, y, 10, 10).fill(seg.color).restore();
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(DARK)
          .text(
            `${seg.label} — ${seg.count} profil${seg.count > 1 ? "s" : ""}`,
            lX + 14,
            y + 1,
          );
      });

      y += 28;

      // ── Pied de page ──────────────────────────────────────────────────────
      doc.save().rect(0, 780, W, 42).fill(BG).restore();
      rule(780, BORDER, 0.5);
      doc
        .fontSize(7.5)
        .font("Helvetica")
        .fillColor(LGRAY)
        .text("RecruitScore — Confidentiel", 50, 793);
      doc
        .fontSize(7.5)
        .fillColor(LGRAY)
        .text("Page 1 / 2", W - 150, 793, { width: 100, align: "right" });
      rule(810, BORDER, 0.5);

      // ════════════════════════════════════════════════════════════════════
      // PAGE 2 — CLASSEMENT DES CANDIDATS & RÉPARTITION PAR STATUT
      // ════════════════════════════════════════════════════════════════════
      doc.addPage({ margin: 0, size: "A4" });

      // En-tête page 2
      doc.save().rect(0, 0, W, 45).fill(BG).restore();
      rule(45, BORDER, 0.5);
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(LGRAY)
        .text("RECRUITSCORE — RAPPORT D'ANALYSE", 50, 17);
      doc
        .fontSize(8)
        .fillColor(LGRAY)
        .text(new Date().toLocaleDateString("fr-FR"), W - 150, 17, {
          width: 100,
          align: "right",
        });

      y = 70;

      // ── 4. Répartition par Statut ─────────────────────────────────────────
      y = sectionTitle("4. Répartition des Candidatures par Statut", y);
      y += 6;

      const statusData = [
        {
          label: "Nouveau",
          count: newCands,
          color: BLUE,
          pct:
            totalCandidates > 0
              ? Math.round((newCands / totalCandidates) * 100)
              : 0,
        },
        {
          label: "En évaluation",
          count: evaluating,
          color: AMBER,
          pct:
            totalCandidates > 0
              ? Math.round((evaluating / totalCandidates) * 100)
              : 0,
        },
        {
          label: "Présélectionné",
          count: shortlisted,
          color: "#7c3aed",
          pct:
            totalCandidates > 0
              ? Math.round((shortlisted / totalCandidates) * 100)
              : 0,
        },
        {
          label: "Accepté",
          count: accepted,
          color: GREEN,
          pct:
            totalCandidates > 0
              ? Math.round((accepted / totalCandidates) * 100)
              : 0,
        },
        {
          label: "Rejeté",
          count: rejected,
          color: RED,
          pct:
            totalCandidates > 0
              ? Math.round((rejected / totalCandidates) * 100)
              : 0,
        },
      ];

      const statText =
        `La répartition des ${totalCandidates} candidatures par statut met en évidence ` +
        `l'état d'avancement global du processus de recrutement. ` +
        `${newCands} candidature${newCands > 1 ? "s demeurent" : " demeure"} à l'état initial sans traitement, ` +
        `${evaluating} ${evaluating > 1 ? "sont" : "est"} en cours d'évaluation, ` +
        `et ${shortlisted} ${shortlisted > 1 ? "ont été présélectionnées" : "a été présélectionnée"} ` +
        `pour la phase suivante du recrutement.`;

      y = paragraph(statText, y);
      y += 12;

      // Graphique barres horizontales sobre
      statusData.forEach((s) => {
        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor(DARK)
          .text(s.label, 50, y + 3, { width: 100 });
        hBar(160, y, 280, 14, s.pct, s.color);
        doc
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .fillColor(DARK)
          .text(`${s.count}`, 450, y + 3, { width: 30, align: "right" });
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(LGRAY)
          .text(`${s.pct}%`, 488, y + 3, { width: 50 });
        y += 26;
      });

      y += 14;

      // ── 5. Classement des Candidats ──────────────────────────────────────
      y = sectionTitle("5. Classement des Candidats par Score", y);
      y += 6;

      const rankText =
        `Le tableau suivant présente les dix candidats ayant obtenu les meilleurs scores ` +
        `à l'issue de l'évaluation par indicateurs clés de performance. ` +
        `Ce classement constitue une base objective pour orienter les décisions de présélection ` +
        `et d'entretien dans la phase suivante du processus de recrutement.`;

      y = paragraph(rankText, y);
      y += 10;

      // En-tête tableau classement
      doc
        .save()
        .rect(50, y, W - 100, 20)
        .fill(NAVY)
        .restore();
      doc.fontSize(8).font("Helvetica-Bold").fillColor(WHITE);
      doc.text("Rang", 60, y + 6, { width: 30 });
      doc.text("Candidat", 95, y + 6, { width: 160 });
      doc.text("Spécialité", 260, y + 6, { width: 120 });
      doc.text("Score", 385, y + 6, { width: 60, align: "center" });
      doc.text("Statut", 450, y + 6, { width: 90, align: "center" });
      y += 20;

      const statusLabels = {
        new: "Nouveau",
        evaluating: "En éval.",
        shortlisted: "Présélect.",
        accepted: "Accepté",
        rejected: "Rejeté",
      };

      topCandidates.forEach((c, i) => {
        const bg = i % 2 === 0 ? WHITE : BG;
        doc
          .save()
          .rect(50, y, W - 100, 22)
          .fill(bg)
          .restore();

        const score = c.scores?.global || 0;
        const scoreColor = score >= 70 ? GREEN : score >= 50 ? AMBER : RED;

        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor(NAVY)
          .text(`${i + 1}`, 60, y + 6, { width: 30 });
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(DARK)
          .text(
            `${c.personalInfo?.firstName || ""} ${c.personalInfo?.lastName || ""}`,
            95,
            y + 6,
            { width: 160 },
          );
        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor(GRAY)
          .text(c.education?.specialty || "—", 260, y + 6, { width: 120 });
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor(scoreColor)
          .text(`${score} / 100`, 385, y + 6, { width: 60, align: "center" });
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(GRAY)
          .text(statusLabels[c.status] || c.status, 450, y + 6, {
            width: 90,
            align: "center",
          });

        doc
          .save()
          .rect(50, y + 22, W - 100, 0.5)
          .fill(BORDER)
          .restore();
        y += 22;
      });

      // Bordure tableau
      doc
        .save()
        .rect(
          50,
          y - topCandidates.length * 22 - 20,
          W - 100,
          topCandidates.length * 22 + 20,
        )
        .stroke(BORDER)
        .restore();

      y += 20;

      // ── 6. Recommandations ────────────────────────────────────────────────
      y = sectionTitle("6. Recommandations", y);
      y += 6;

      const reco =
        acceptanceRate >= 20
          ? `Le taux d'acceptation de ${acceptanceRate}% et le score moyen de ${avgScore}/100 ` +
            `indiquent un processus de recrutement efficace. Il est recommandé de maintenir ` +
            `les critères d'évaluation actuels tout en veillant à intégrer systématiquement ` +
            `les résultats des tests techniques dans le score global de chaque candidat.`
          : `Le taux d'acceptation de ${acceptanceRate}% et le score moyen de ${avgScore}/100 ` +
            `suggèrent un renforcement des critères de sourcing en amont afin d'améliorer ` +
            `la qualité du vivier. Une révision des templates de scoring par poste cible ` +
            `et un recours accru à la recherche sémantique de CVs sont recommandés.`;

      y = paragraph(reco, y);

      // ── Pied de page ──────────────────────────────────────────────────────
      doc.save().rect(0, 780, W, 42).fill(BG).restore();
      rule(780, BORDER, 0.5);
      doc
        .fontSize(7.5)
        .font("Helvetica")
        .fillColor(LGRAY)
        .text("RecruitScore — Confidentiel", 50, 793);
      doc
        .fontSize(7.5)
        .fillColor(LGRAY)
        .text("Page 2 / 2", W - 150, 793, { width: 100, align: "right" });
      rule(810, BORDER, 0.5);

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    await createAuditLog({
      userId: request.user.id,
      action: "EXPORT_REPORT",
      targetCollection: "Report",
      after: { fileName, type },
      ipAddress: request.ip,
      details: `Export rapport PDF type : ${type}`,
    });

    return reply.status(200).send({
      success: true,
      message: "Rapport PDF généré avec succès",
      report: {
        fileName,
        generatedAt: new Date(),
        downloadUrl: `${process.env.BASE_URL}/api/reports/download/${fileName}`,
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

// Export rapport Excel
export const exportReportExcel = async (request, reply) => {
  try {
    const candidates = await Candidate.find()
      .select(
        "personalInfo education scores status tags availability createdAt",
      )
      .sort({ "scores.global": -1 });

    const uploadsDir = "uploads/reports";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `report_candidates_${Date.now()}.xlsx`;
    const filePath = path.join(uploadsDir, fileName);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Candidats");

    workbook.creator = "RecruitScore";
    workbook.created = new Date();

    worksheet.columns = [
      { header: "Nom", key: "lastName", width: 15 },
      { header: "Prenom", key: "firstName", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Telephone", key: "phone", width: 15 },
      { header: "Specialite", key: "specialty", width: 20 },
      { header: "Niveau", key: "level", width: 12 },
      { header: "Score Global", key: "score", width: 14 },
      { header: "Statut", key: "status", width: 14 },
      { header: "Tags", key: "tags", width: 20 },
      { header: "Disponibilite", key: "availability", width: 15 },
      { header: "Date Ajout", key: "createdAt", width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    worksheet.getRow(1).alignment = { horizontal: "center" };

    candidates.forEach((c) => {
      worksheet.addRow({
        lastName: c.personalInfo?.lastName || "",
        firstName: c.personalInfo?.firstName || "",
        email: c.personalInfo?.email || "",
        phone: c.personalInfo?.phone || "",
        specialty: c.education?.specialty || "",
        level: c.education?.level || "",
        score: c.scores?.global || 0,
        status: c.status || "",
        tags: (c.tags || []).join(", "),
        availability: c.availability?.type || "",
        createdAt: c.createdAt
          ? new Date(c.createdAt).toLocaleDateString("fr-FR")
          : "",
      });
    });

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    const summarySheet = workbook.addWorksheet("Resume");
    const total = candidates.length;
    const accepted = candidates.filter((c) => c.status === "accepted").length;
    const rejected = candidates.filter((c) => c.status === "rejected").length;
    const avgScore =
      total > 0
        ? Math.round(
            (candidates.reduce((s, c) => s + (c.scores?.global || 0), 0) /
              total) *
              100,
          ) / 100
        : 0;

    summarySheet.columns = [
      { header: "Indicateur", key: "label", width: 25 },
      { header: "Valeur", key: "value", width: 15 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.addRows([
      { label: "Total Candidatures", value: total },
      { label: "Acceptes", value: accepted },
      { label: "Rejetes", value: rejected },
      { label: "Score Moyen", value: avgScore },
      { label: "Date Export", value: new Date().toLocaleDateString("fr-FR") },
    ]);

    await workbook.xlsx.writeFile(filePath);

    await createAuditLog({
      userId: request.user.id,
      action: "EXPORT_REPORT",
      targetCollection: "Report",
      after: { fileName, type: "excel" },
      ipAddress: request.ip,
      details: `Export rapport Excel - ${candidates.length} candidats`,
    });

    const downloadUrl = `${process.env.BASE_URL}/api/reports/download/${fileName}`;

    return reply.status(200).send({
      success: true,
      message: "Rapport Excel genere avec succes",
      report: {
        fileName,
        generatedAt: new Date(),
        downloadUrl,
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

// Telecharger un rapport  ✅ corrigé
export const downloadReport = async (request, reply) => {
  try {
    const { fileName } = request.params;
    const filePath = path.join("uploads/reports", fileName);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({
        success: false,
        message: "Fichier non trouve",
      });
    }

    const isPDF = fileName.endsWith(".pdf");

    const contentType = isPDF
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const fileBuffer = fs.readFileSync(filePath);

    return reply
      .header("Content-Type", contentType)
      .header("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(fileBuffer);
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};
