import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "rh", "manager", "evaluator", "reader"],
      required: true,
    },
    permissions: {
      candidates: {
        type: [String],
        enum: ["read", "write", "delete"],
        default: [],
      },
      scoring: {
        type: [String],
        enum: ["read", "write"],
        default: [],
      },
      tests: {
        type: [String],
        enum: ["read", "write", "delete"],
        default: [],
      },
      reports: {
        type: [String],
        enum: ["read", "export"],
        default: [],
      },
    },
    notificationPreferences: {
      newCandidate: { type: Boolean, default: true },
      scoreCalculated: { type: Boolean, default: true },
      testResult: { type: Boolean, default: true },
    },
    refreshToken: { type: String, default: null },
    lastLogin: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
