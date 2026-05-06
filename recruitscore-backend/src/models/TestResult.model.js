import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
        answer: { type: mongoose.Schema.Types.Mixed },
        pointsObtained: { type: Number, default: 0 },
      },
    ],
    totalScore: { type: Number, default: 0 },
    totalPoints: { type: Number },
    percentage: { type: Number }, // score en %

    // statut du résultat
    status: {
      type: String,
      enum: ["pending", "evaluated", "integrated"],
      default: "pending",
    },

    // commentaire de l'évaluateur
    evaluatorComment: { type: String },

    // impact sur le score global du candidat
    scoringImpact: { type: Number, default: 0 },

    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    evaluatedAt: { type: Date },
    integratedInScoring: { type: Boolean, default: false },
  },
  { timestamps: true },
);
testResultSchema.index({ candidateId: 1, testId: 1 }, { unique: true });

export default mongoose.model("TestResult", testResultSchema);
