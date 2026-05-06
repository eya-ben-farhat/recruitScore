import mongoose from "mongoose";

const scoringTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    targetRole: { type: String }, // 'dev backend', 'data analyst'...

    kpis: [
      {
        kpiId: { type: mongoose.Schema.Types.ObjectId, ref: "KPI" },
        weight: {
          type: Number,
          min: 0,
          max: 100,
        },
        calculationRules: {
          formula: { type: String },
          minThreshold: { type: Number },
          bonus: [
            {
              condition: { type: String },
              points: { type: Number },
            },
          ],
          malus: [
            {
              condition: { type: String },
              points: { type: Number },
            },
          ],
        },
      },
    ],

    // résumé des poids par catégorie
    categorySummary: {
      formation: { type: Number, default: 0 },
      technique: { type: Number, default: 0 },
      softSkills: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
    },

    // apprentissage continu via feedback
    feedback: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    configuredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("ScoringTemplate", scoringTemplateSchema);
