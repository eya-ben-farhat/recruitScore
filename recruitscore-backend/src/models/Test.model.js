import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    targetRole: { type: String },

    // critères de génération automatique
    generationCriteria: {
      totalQuestions: { type: Number, required: true },
      themes: [
        {
          type: String,
          enum: ["algorithmique", "web", "DB", "réseau"],
        },
      ],
      types: [
        {
          type: String,
          enum: ["qcm", "open", "practical", "code"],
        },
      ],
      difficulty: {
        type: String,
        enum: ["easy", "medium", "hard", "mixed"],
        default: "mixed",
      },
    },

    // questions sélectionnées automatiquement par le système
    questions: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
        points: { type: Number },
      },
    ],

    // candidat assigné au test
    assignedCandidates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidate",
      },
    ],
    scoringTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScoringTemplate",
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "draft",
    },

    totalPoints: { type: Number },
    duration: { type: Number }, // en minutes

    // export PDF
    pdfExport: {
      generatedAt: { type: Date },
      filePath: { type: String },
      fileName: { type: String },
    },

    generatedByAI: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("Test", testSchema);
