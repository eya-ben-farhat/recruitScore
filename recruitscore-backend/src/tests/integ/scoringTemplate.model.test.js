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
import ScoringTemplate from "../../models/ScoringTemplate.model.js";

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
  await ScoringTemplate.deleteMany({});
});

// ── Création ───────────────────────────────────────────────────────────────
describe("ScoringTemplate — Création", () => {
  it("crée un template avec succès", async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const t = await ScoringTemplate.create({
      name: "Template Dev Backend",
      targetRole: "dev backend",
      kpis: [
        { kpiId, weight: 100, calculationRules: { formula: "proportional" } },
      ],
      isDefault: false,
      isActive: true,
    });
    expect(t._id).toBeDefined();
    expect(t.kpis.length).toBe(1);
  });

  it("crée un template par défaut", async () => {
    const t = await ScoringTemplate.create({
      name: "Template Défaut",
      kpis: [],
      isDefault: true,
    });
    expect(t.isDefault).toBe(true);
  });

  it("retourne le template par défaut", async () => {
    await ScoringTemplate.create({ name: "T1", kpis: [], isDefault: false });
    await ScoringTemplate.create({ name: "T2", kpis: [], isDefault: true });
    const def = await ScoringTemplate.findOne({ isDefault: true });
    expect(def.name).toBe("T2");
  });
});
