import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["qcm", "open", "practical", "code"],
      required: true,
    },
    content: { type: String, required: true },
    theme: {
      type: String,
      enum: ["algorithmique", "web", "DB", "réseau"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    targetSkill: { type: String },
    options: [
      {
        label: { type: String },
        isCorrect: { type: Boolean },
      },
    ],
    // explication de la réponse correcte
    explanation: { type: String },

    // uniquement pour les questions de type code
    programmingLanguage: {
      type: String,
      enum: ["javascript", "python", "java", "sql", "other"],
      default: null,
    },

    points: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("Question", questionSchema);
