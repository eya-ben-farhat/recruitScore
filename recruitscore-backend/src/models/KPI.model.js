import mongoose from "mongoose";

const kpiSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["formation", "technique", "softSkills", "experience"],
      required: true,
    },
    type: {
      type: String,
      enum: ["numeric", "boolean", "choice", "range"],
      required: true,
    },
    config: {
      // si type = numeric
      min: { type: Number },
      max: { type: Number },

      // si type = choice
      choices: [
        {
          label: { type: String },
          points: { type: Number },
        },
      ],

      // si type = boolean
      truePoints: { type: Number },
      falsePoints: { type: Number },

      // si type = range
      ranges: [
        {
          from: { type: Number },
          to: { type: Number },
          points: { type: Number },
        },
      ],
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    weightAdjusted: { type: Boolean, default: false },
    minThreshold: { type: Number, default: 0 },
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
    isActive: { type: Boolean, default: true },
    templateRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScoringTemplate",
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("KPI", kpiSchema);
