import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import Candidate from "../models/Candidate.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY_NLP });

// Extraire le texte d'un fichier
const extractText = async (filePath, mimeType) => {
  const buffer = fs.readFileSync(filePath);
  if (mimeType === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  } else if (mimeType.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error("Format non supporté");
};

// Analyser les CVs avec Groq
export const analyzeCVs = async (request, reply) => {
  const uploadedFiles = [];
  try {
    const parts = request.parts();
    let jobDescription = "";
    let topN = 5;
    const files = [];

    for await (const part of parts) {
      if (part.type === "file") {
        const fileName = `nlp_${Date.now()}_${part.filename}`;
        const filePath = path.join(__dirname, "../../uploads/nlp", fileName);

        if (!fs.existsSync(path.join(__dirname, "../../uploads/nlp"))) {
          fs.mkdirSync(path.join(__dirname, "../../uploads/nlp"), {
            recursive: true,
          });
        }

        const buffer = await part.toBuffer();
        fs.writeFileSync(filePath, buffer);
        uploadedFiles.push(filePath);

        files.push({
          originalName: part.filename,
          filePath,
          mimeType: part.mimetype,
        });
      } else if (part.fieldname === "jobDescription") {
        jobDescription = part.value;
      } else if (part.fieldname === "topN") {
        topN = parseInt(part.value) || 5;
      }
    }

    if (!jobDescription) {
      return reply.status(400).send({
        success: false,
        message: "La description du poste est obligatoire",
      });
    }

    if (files.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "Aucun CV uploadé",
      });
    }

    // Extraire le texte de chaque CV
    const cvTexts = [];
    for (const file of files) {
      try {
        const text = await extractText(file.filePath, file.mimeType);
        cvTexts.push({
          originalName: file.originalName,
          filePath: file.filePath,
          text: text.slice(0, 3000),
        });
      } catch (err) {
        console.error(`Erreur extraction ${file.originalName}:`, err.message);
      }
    }

    // Analyser avec Groq
    const prompt = `Tu es un expert RH. Analyse ces CVs par rapport au poste suivant et retourne UNIQUEMENT un JSON valide.

POSTE : ${jobDescription}

CVs à analyser :
${cvTexts.map((cv, i) => `CV ${i + 1} (${cv.originalName}):\n${cv.text}`).join("\n\n---\n\n")}

Retourne UNIQUEMENT ce JSON sans aucun texte avant ou après.
Cherche toutes les informations même si elles utilisent des termes différents :
- "education", "formation", "études", "scolarité" → mettre dans educationDegree, educationLevel, educationSpecialty, educationInstitution
- "expérience professionnelle", "expériences", "projets", "réalisations" → mettre dans experiences et projects
- "github", "gitlab", "portfolio" → mettre dans github
- "linkedin" → mettre dans linkedin

{
  "results": [
    {
      "cvIndex": 0,
      "fileName": "nom_du_fichier.pdf",
      "candidateName": "Prénom Nom extrait du CV",
      "score": 85,
      "strengths": ["point fort 1", "point fort 2"],
      "weaknesses": ["point faible 1"],
      "skills": ["compétence 1", "compétence 2"],
      "experienceYears": 3,
      "email": "email@example.com ou null",
      "phone": "telephone ou null",
      "github": "url github ou null",
      "linkedin": "url linkedin ou null",
      "educationDegree": "Licence ou Master ou etc",
      "educationLevel": "Bac+3 ou Bac+5 ou etc",
      "educationSpecialty": "Informatique ou Génie Logiciel ou etc",
      "educationInstitution": "nom de l université ou école",
      "educationYear": 2022,
      "experiences": [
        {
          "title": "intitulé du poste",
          "company": "nom entreprise",
          "duration": 6,
          "description": "description du poste"
        }
      ],
      "projects": [
        {
          "name": "nom du projet",
          "description": "description du projet",
          "technologies": ["tech1", "tech2"],
          "githubUrl": "url du projet ou null"
        }
      ]
    }
  ]
}`;

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
    });

    let responseText = completion.choices[0].message.content.trim();

    // Nettoyer la réponse
    if (responseText.includes("```json")) {
      responseText = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      responseText = responseText.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(responseText);

    // Ajouter le filePath à chaque résultat
    const results = parsed.results.map((r) => ({
      ...r,
      filePath: cvTexts[r.cvIndex]?.filePath || null,
    }));

    // Trier par score et prendre les topN
    const sorted = results.sort((a, b) => b.score - a.score).slice(0, topN);

    // Supprimer les CVs non sélectionnés
    const selectedPaths = sorted.map((r) => r.filePath);
    for (const file of uploadedFiles) {
      if (!selectedPaths.includes(file)) {
        fs.unlinkSync(file);
      }
    }

    return reply.status(200).send({
      success: true,
      total: files.length,
      selected: sorted.length,
      results: sorted,
    });
  } catch (err) {
    // Nettoyer les fichiers en cas d'erreur
    for (const file of uploadedFiles) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    console.error("❌ Erreur complète:", err);
    return reply.status(500).send({
      success: false,
      message: "Erreur lors de l'analyse",
      error: err.message,
    });
  }
};

// Créer le profil candidat depuis un CV analysé
export const createProfileFromCV = async (request, reply) => {
  try {
    const { candidateData, filePath } = request.body;

    // Vérifier si l'email existe déjà
    if (candidateData.email) {
      const existing = await Candidate.findOne({
        "personalInfo.email": candidateData.email,
      });
      if (existing) {
        return reply.status(400).send({
          success: false,
          message: "Un candidat avec cet email existe déjà",
        });
      }
    }

    // Créer le candidat
    const candidate = await Candidate.create({
      personalInfo: {
        firstName: candidateData.firstName || "Inconnu",
        lastName: candidateData.lastName || "Inconnu",
        email: candidateData.email || `candidat_${Date.now()}@temp.com`,
        phone: candidateData.phone || null,
        github: candidateData.github || null,
        linkedin: candidateData.linkedin || null,
      },
      education: {
        degree: candidateData.educationDegree || null,
        level: candidateData.educationLevel || null,
        specialty: candidateData.educationSpecialty || null,
        institution: candidateData.educationInstitution || null,
        graduationYear: candidateData.educationYear || null,
      },
      technicalSkills: (candidateData.skills || []).map((s) => ({
        name: s,
        level: "Intermédiaire",
      })),
      experiences: (candidateData.experiences || []).map((exp) => ({
        title: exp.title || "Expérience",
        company: exp.company || "—",
        duration: exp.duration || 0,
        description: exp.description || "",
      })),
      projects: (candidateData.projects || []).map((p) => ({
        name: p.name || "Projet",
        description: p.description || "",
        technologies: p.technologies || [],
        githubUrl: p.githubUrl || null,
      })),
      status: "new",
      createdBy: request.user.id,
    });

    // Déplacer le CV dans le dossier candidats
    if (filePath && fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      const newPath = path.join(__dirname, "../../uploads/cvs", fileName);

      if (!fs.existsSync(path.join(__dirname, "../../uploads/cvs"))) {
        fs.mkdirSync(path.join(__dirname, "../../uploads/cvs"), {
          recursive: true,
        });
      }

      fs.renameSync(filePath, newPath);

      await Candidate.findByIdAndUpdate(candidate._id, {
        cv: {
          fileName,
          filePath: `uploads/cvs/${fileName}`,
          uploadedAt: new Date(),
          mimeType: fileName.endsWith(".pdf")
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      });
    }

    return reply.status(201).send({
      success: true,
      message: "Profil créé avec succès",
      candidate,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur lors de la création du profil",
      error: err.message,
    });
  }
};
