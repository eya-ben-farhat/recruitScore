import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    personalInfo: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      phone: { type: String },
      github: { type: String },
      linkedin: { type: String },
      address: { type: String },
    },
    education: {
      institution: { type: String },
      degree: { type: String },
      level: { type: String },
      specialty: { type: String },
      graduationYear: { type: Number },
    },
    technicalSkills: [
      {
        name: { type: String },
        level: { type: String, enum: ["Débutant", "Intermédiaire", "Avancé"] },
      },
    ],
    experiences: [
      {
        title: { type: String },
        company: { type: String },
        duration: { type: Number },
        description: { type: String },
      },
    ],
    projects: [
      {
        name: { type: String },
        description: { type: String },
        githubUrl: { type: String },
        technologies: [String],
      },
    ],
    languages: [
      {
        name: { type: String },
        level: { type: String, enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
      },
    ],
    availability: {
      startDate: { type: Date },
      duration: { type: Number },
    },
    cv: {
      fileName: { type: String },
      filePath: { type: String },
      previewUrl: { type: String },
      uploadedAt: { type: Date },
      mimeType: {
        type: String,
        enum: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      },
    },
    status: {
      type: String,
      enum: ["new", "evaluating", "shortlisted", "rejected", "accepted"],
      default: "new",
    },
    tags: {
      type: [String],
      enum: [
        "dev",
        "data",
        "reseau",
        "devops",
        "embedded",
        "cybersec",
        "design",
        "mobile",
      ],
    },
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        content: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    scores: {
      global: { type: Number, default: 0 },
      byCategory: {
        formation: { type: Number, default: 0 },
        technique: { type: Number, default: 0 },
        softSkills: { type: Number, default: 0 },
        experience: { type: Number, default: 0 },
      },
      byKPI: [
        {
          kpiId: { type: mongoose.Schema.Types.ObjectId, ref: "KPI" },
          kpiName: { type: String },
          rawValue: { type: mongoose.Schema.Types.Mixed },
          pointsObtained: { type: Number },
          maxPoints: { type: Number },
          justification: { type: String },
        },
      ],
      calculatedAt: { type: Date },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Index pour la recherche full-text
candidateSchema.index({
  "personalInfo.firstName": "text",
  "personalInfo.lastName": "text",
  "technicalSkills.name": "text",
  "education.specialty": "text",
  "projects.description": "text",
});

export default mongoose.model("Candidate", candidateSchema);
