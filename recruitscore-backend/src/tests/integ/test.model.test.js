import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Test from "../../models/Test.model.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Test.deleteMany({});
});

const baseTest = {
  title: "Test Backend Node.js",
  targetRole: "dev backend",
  generationCriteria: { totalQuestions: 10, difficulty: "mixed" },
  status: "draft",
};

// ── Création ───────────────────────────────────────────────────────────────
describe("Test — Création", () => {
  it("crée un test en statut draft", async () => {
    const t = await Test.create(baseTest);
    expect(t._id).toBeDefined();
    expect(t.status).toBe("draft");
  });

  it("crée un test généré par IA avec le flag generatedByAI", async () => {
    const t = await Test.create({ ...baseTest, generatedByAI: true });
    expect(t.generatedByAI).toBe(true);
  });

  it("crée un test avec des candidats assignés", async () => {
    const candidateId = new mongoose.Types.ObjectId();
    const t = await Test.create({
      ...baseTest,
      assignedCandidates: [candidateId],
    });
    expect(t.assignedCandidates.length).toBe(1);
  });
});

// ── Transitions de statut ──────────────────────────────────────────────────
describe("Test — Transitions de statut", () => {
  it("passe de draft à active", async () => {
    const t = await Test.create(baseTest);
    const updated = await Test.findByIdAndUpdate(
      t._id,
      { status: "active" },
      { new: true },
    );
    expect(updated.status).toBe("active");
  });

  it("passe de active à closed", async () => {
    const t = await Test.create({ ...baseTest, status: "active" });
    const updated = await Test.findByIdAndUpdate(
      t._id,
      { status: "closed" },
      { new: true },
    );
    expect(updated.status).toBe("closed");
  });
});

// ── Requêtes ───────────────────────────────────────────────────────────────
describe("Test — Requêtes", () => {
  it("filtre par statut", async () => {
    await Test.create(baseTest);
    await Test.create({ ...baseTest, title: "Test 2", status: "active" });
    const drafts = await Test.find({ status: "draft" });
    expect(drafts.length).toBe(1);
  });

  it("filtre par targetRole", async () => {
    await Test.create(baseTest);
    await Test.create({
      ...baseTest,
      title: "Test Frontend",
      targetRole: "dev frontend",
    });
    const results = await Test.find({ targetRole: "dev backend" });
    expect(results.length).toBe(1);
  });

  it("supprime un test draft", async () => {
    const t = await Test.create(baseTest);
    await Test.findByIdAndDelete(t._id);
    const found = await Test.findById(t._id);
    expect(found).toBeNull();
  });
});
