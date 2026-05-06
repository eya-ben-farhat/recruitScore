import Question from "../models/Question.model.js";
import Test from "../models/Test.model.js";

const getGroq = () => ({
  url: "https://api.groq.com/openai/v1/chat/completions",
  key: process.env.GROQ_API_KEY_AI,
});

const GROQ_MODEL = "llama-3.3-70b-versatile";

// ─── Prompt système ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un expert en recrutement technique.
Tu génères des questions de test technique au format JSON strict.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte supplémentaire.`;

// ─── Builder du prompt utilisateur ───────────────────────────────────────────
function buildPrompt(jobDescription, totalQuestions, difficulty) {
  return `
Génère ${totalQuestions} questions techniques pour ce poste : "${jobDescription}"

RÈGLES STRICTES :
- Choisis les thèmes parmi : "algorithmique", "web", "DB", "réseau" selon ce qui est pertinent pour le poste
- Types disponibles : "qcm", "open", "practical", "code"
- Difficulté : ${difficulty === "mixed" ? 'mélange de "easy", "medium", "hard"' : `"${difficulty}" uniquement`}
- Pour les questions "qcm" : fournis exactement 4 options avec une seule correcte (isCorrect: true)
- Pour les questions "code" : remplis programmingLanguage parmi "javascript", "python", "java", "sql", "other"
- Pour les questions "open" et "practical" : options = []
- Points : easy=5, medium=10, hard=15
- Chaque question doit avoir une explication claire

Réponds UNIQUEMENT avec ce JSON (aucun texte autour) :
{
  "testTitle": "titre court du test",
  "testDescription": "description du test",
  "targetRole": "intitulé du poste détecté",
  "themes": ["liste des thèmes choisis"],
  "types": ["liste des types utilisés"],
  "questions": [
    {
      "type": "qcm|open|practical|code",
      "content": "énoncé de la question",
      "theme": "algorithmique|web|DB|réseau",
      "difficulty": "easy|medium|hard",
      "targetSkill": "compétence ciblée",
      "options": [
        { "label": "option A", "isCorrect": false },
        { "label": "option B", "isCorrect": true },
        { "label": "option C", "isCorrect": false },
        { "label": "option D", "isCorrect": false }
      ],
      "explanation": "explication de la bonne réponse",
      "programmingLanguage": null,
      "points": 10
    }
  ]
}`;
}

// ─── Appel Grok API ───────────────────────────────────────────────────────────

async function callGroq(prompt) {
  const { url, key } = getGroq();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;

  if (!rawText) throw new Error("Réponse vide de Groq");

  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`JSON invalide reçu de Groq: ${cleaned.substring(0, 200)}`);
  }
}

// ─── Controller principal ─────────────────────────────────────────────────────
export const generateTestWithAI = async (request, reply) => {
  try {
    const {
      jobDescription,
      totalQuestions = 10,
      difficulty = "mixed",
    } = request.body;

    // Validation
    if (!jobDescription || jobDescription.trim().length < 10) {
      return reply.status(400).send({
        success: false,
        message:
          "La description du poste est trop courte (minimum 10 caractères)",
      });
    }

    if (totalQuestions < 1 || totalQuestions > 30) {
      return reply.status(400).send({
        success: false,
        message: "Le nombre de questions doit être entre 1 et 30",
      });
    }

    const validDifficulties = ["easy", "medium", "hard", "mixed"];
    if (!validDifficulties.includes(difficulty)) {
      return reply.status(400).send({
        success: false,
        message: `Difficulté invalide. Valeurs acceptées : ${validDifficulties.join(", ")}`,
      });
    }

    // 1. Appel Grok
    const prompt = buildPrompt(jobDescription, totalQuestions, difficulty);
    const aiResult = await callGroq(prompt);

    if (!aiResult.questions || !Array.isArray(aiResult.questions)) {
      throw new Error("Structure JSON invalide : champ 'questions' manquant");
    }

    // 2. Validation et nettoyage des questions retournées par l'IA
    const validThemes = ["algorithmique", "web", "DB", "réseau"];
    const validTypes = ["qcm", "open", "practical", "code"];
    const validLangs = ["javascript", "python", "java", "sql", "other"];

    const questionsToInsert = aiResult.questions
      .filter((q) => {
        return (
          validTypes.includes(q.type) &&
          validThemes.includes(q.theme) &&
          ["easy", "medium", "hard"].includes(q.difficulty) &&
          q.content &&
          q.points > 0
        );
      })
      .map((q) => ({
        type: q.type,
        content: q.content,
        theme: q.theme,
        difficulty: q.difficulty,
        targetSkill: q.targetSkill || "",
        options: q.type === "qcm" ? q.options || [] : [],
        explanation: q.explanation || "",
        programmingLanguage:
          q.type === "code" && validLangs.includes(q.programmingLanguage)
            ? q.programmingLanguage
            : null,
        points: q.points,
        isActive: true,
        createdBy: request.user?.id || null,
      }));

    if (questionsToInsert.length === 0) {
      throw new Error(
        "Aucune question valide générée par l'IA. Reformulez la description du poste.",
      );
    }

    // 3. Insertion dans la banque de questions
    //const insertedQuestions = await Question.insertMany(questionsToInsert);

    const insertedQuestions = await Question.insertMany(questionsToInsert);
    console.log(
      `[AI] Questions insérées en DB:`,
      insertedQuestions.length,
      insertedQuestions.map((q) => q._id),
    );

    // 4. Calcul du total des points
    const totalPoints = insertedQuestions.reduce((sum, q) => sum + q.points, 0);

    // 5. Thèmes et types réellement utilisés
    const usedThemes = [...new Set(insertedQuestions.map((q) => q.theme))];
    const usedTypes = [...new Set(insertedQuestions.map((q) => q.type))];

    // 6. Création du Test en draft
    const newTest = await Test.create({
      title: aiResult.testTitle || `Test IA - ${aiResult.targetRole}`,
      description: aiResult.testDescription || "",
      targetRole: aiResult.targetRole || jobDescription.slice(0, 50),

      generationCriteria: {
        totalQuestions: insertedQuestions.length,
        themes: usedThemes,
        types: usedTypes,
        difficulty,
      },

      questions: insertedQuestions.map((q) => ({
        questionId: q._id,
        points: q.points,
      })),

      status: "draft",
      totalPoints,
      isActive: true,
      generatedByAI: true,
      createdBy: request.user?.id || null,
    });

    return reply.status(201).send({
      success: true,
      message: `Test généré avec succès — ${insertedQuestions.length} questions ajoutées à la banque`,
      data: {
        test: newTest,
        questionsAdded: insertedQuestions.length,
        totalPoints,
        themes: usedThemes,
        types: usedTypes,
      },
    });
  } catch (err) {
    console.error("[AI Controller] Erreur:", err.message);
    return reply.status(500).send({
      success: false,
      message: "Erreur lors de la génération du test",
      error: err.message,
    });
  }
};
