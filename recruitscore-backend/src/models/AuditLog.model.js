import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        // Candidats
        "CREATE_CANDIDATE",
        "UPDATE_CANDIDATE",
        "DELETE_CANDIDATE",
        "CHANGE_CANDIDATE_STATUS",
        "UPDATE_CANDIDATE_SCORE",
        "SHORTLIST_CANDIDATE",
        "GENERATE_SHORTLIST",

        // KPIs
        "CREATE_KPI",
        "UPDATE_KPI",
        "DELETE_KPI",
        "UPDATE_KPI_WEIGHT",

        // Templates de scoring
        "CREATE_SCORING_TEMPLATE",
        "UPDATE_SCORING_TEMPLATE",
        "DELETE_SCORING_TEMPLATE",

        // Tests
        "CREATE_TEST",
        "GENERATE_TEST",
        "EXPORT_PDF",
        "INTEGRATE_TEST_SCORE",

        // Questions
        "CREATE_QUESTION",
        "UPDATE_QUESTION",
        "DELETE_QUESTION",

        // Rapports
        "EXPORT_REPORT",

        // Utilisateurs
        "CREATE_USER",
        "UPDATE_USER",
        "DELETE_USER",

        // Sessions
        "LOGIN",
        "LOGOUT",
      ],
      required: true,
    },
    targetCollection: { type: String },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    details: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model("AuditLog", auditLogSchema);
