import nodemailer from "nodemailer";
import User from "../models/User.model.js";

const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

const emailTemplates = {
  newCandidate: (data) => ({
    subject: ` Nouveau candidat — ${data.firstName} ${data.lastName}`,
    html: `
      <div style="font-family: Poppins, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; font-size: 20px; margin: 0;">RecruitScore</h1>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; font-size: 16px;">Nouveau candidat ajouté</h2>
          <p style="color: #64748b; font-size: 14px;">Un nouveau candidat vient d'être ajouté à la plateforme.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Nom :</strong> ${data.firstName} ${data.lastName}</p>
            <p style="margin: 8px 0 0; font-size: 14px;"><strong>Email :</strong> ${data.email}</p>
            <p style="margin: 8px 0 0; font-size: 14px;"><strong>Spécialité :</strong> ${data.specialty || "—"}</p>
          </div>
          <a href="${process.env.BASE_URL}/candidates/${data.candidateId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
            Voir le profil
          </a>
        </div>
        <div style="background: #f8fafc; padding: 12px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">RecruitScore — Plateforme de recrutement</p>
        </div>
      </div>
    `,
  }),

  scoreCalculated: (data) => ({
    subject: ` Score calculé — ${data.firstName} ${data.lastName}`,
    html: `
      <div style="font-family: Poppins, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; font-size: 20px; margin: 0;">RecruitScore</h1>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; font-size: 16px;">Score calculé</h2>
          <p style="color: #64748b; font-size: 14px;">Un score vient d'être calculé pour un candidat.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Candidat :</strong> ${data.firstName} ${data.lastName}</p>
            <p style="margin: 8px 0 0; font-size: 14px;"><strong>Score global :</strong> 
              <span style="color: #2563eb; font-weight: 700; font-size: 18px;">${data.score}/100</span>
            </p>
            <p style="margin: 8px 0 0; font-size: 14px;"><strong>Template :</strong> ${data.templateName}</p>
          </div>
          <a href="${process.env.BASE_URL}/candidates/${data.candidateId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
            Voir le profil
          </a>
        </div>
        <div style="background: #f8fafc; padding: 12px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">RecruitScore — Plateforme de recrutement</p>
        </div>
      </div>
    `,
  }),

  testResult: (data) => ({
    subject: ` Résultat de test — ${data.firstName} ${data.lastName}`,
    html: `
      <div style="font-family: Poppins, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; font-size: 20px; margin: 0;">RecruitScore</h1>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; font-size: 16px;">Nouveau résultat de test</h2>
          <p style="color: #64748b; font-size: 14px;">Un résultat de test vient d'être saisi.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Candidat :</strong> ${data.firstName} ${data.lastName}</p>
            <p style="margin: 8px 0 0; font-size: 14px;"><strong>Test :</strong> ${data.testTitle}</p>
            <p style="margin: 8px 0 0; font-size: 14px;"><strong>Score :</strong> 
              <span style="color: ${data.percentage >= 70 ? "#059669" : data.percentage >= 50 ? "#d97706" : "#ef4444"}; font-weight: 700;">
                ${data.totalScore}/${data.totalPoints} (${data.percentage}%)
              </span>
            </p>
          </div>
          <a href="${process.env.BASE_URL}/results" 
             style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
            Voir les résultats
          </a>
        </div>
        <div style="background: #f8fafc; padding: 12px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">RecruitScore — Plateforme de recrutement</p>
        </div>
      </div>
    `,
  }),
};

const typeToField = {
  newCandidate: "notificationPreferences.newCandidate",
  scoreCalculated: "notificationPreferences.scoreCalculated",
  testResult: "notificationPreferences.testResult",
};

export const sendEmail = async (type, data) => {
  try {
    console.log("===> sendEmail appelé, type:", type, "data:", data);

    console.log(
      `[EMAIL] Variables env: HOST=${process.env.MAIL_HOST}, PORT=${process.env.MAIL_PORT}, USER=${process.env.MAIL_USER ? "***" : "undefined"}`,
    );

    const prefField = typeToField[type];

    const admins = await User.find({
      role: "admin",
      ...(prefField
        ? {
            $or: [{ [prefField]: true }, { [prefField]: { $exists: false } }],
          }
        : {}),
    }).select("email");
    if (admins.length === 0) {
      admins = await User.find({ role: "admin" }).select("email");
    }

    console.log(`[EMAIL] Type: ${type}, Admins trouvés: ${admins.length}`);
    if (admins.length === 0) {
      console.log("[EMAIL] Aucun admin trouvé, email non envoyé");
      return;
    }

    const adminEmails = admins.map((a) => a.email);
    console.log(`[EMAIL] Envoi à: ${adminEmails.join(", ")}`);

    const template = emailTemplates[type](data);

    console.log(`[EMAIL] Tentative d'envoi...`);
    const result = await getTransporter().sendMail({
      from: `"RecruitScore" <${process.env.MAIL_USER}>`,
      to: adminEmails.join(", "),
      subject: template.subject,
      html: template.html,
    });
    console.log(
      `Email envoyé avec succès: ${type} → ${adminEmails.join(", ")}, ID: ${result.messageId}`,
    );
  } catch (err) {
    console.error("Email error:", err.message);
    console.error("Email stack:", err.stack);
  }
};
