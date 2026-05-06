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
import Candidate from "../../models/Candidate.model.js";

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
  await Candidate.deleteMany({});
});

const baseCandidate = {
  personalInfo: {
    firstName: "Ahmed",
    lastName: "Trabelsi",
    email: "ahmed@test.com",
    phone: "21234567",
  },
  education: {
    level: "Bac+5",
    specialty: "Informatique",
    graduationYear: 2022,
  },
  technicalSkills: [{ name: "Node.js", level: "Avancé" }],
  experiences: [
    {
      title: "Dev",
      company: "TechCo",
      duration: 24,
      description: "Dev backend",
    },
  ],
  status: "new",
};

// ── Création ───────────────────────────────────────────────────────────────
describe("Candidate — Création", () => {
  it("crée un candidat avec succès", async () => {
    const c = await Candidate.create(baseCandidate);
    expect(c._id).toBeDefined();
    expect(c.personalInfo.email).toBe("ahmed@test.com");
    expect(c.status).toBe("new");
  });

  it("refuse un email dupliqué", async () => {
    await Candidate.create(baseCandidate);
    await expect(Candidate.create(baseCandidate)).rejects.toThrow();
  });

  it("crée avec le statut new par défaut", async () => {
    const { status, ...withoutStatus } = baseCandidate;
    const c = await Candidate.create(withoutStatus);
    expect(c.status).toBe("new");
  });
});

// ── Mise à jour ────────────────────────────────────────────────────────────
describe("Candidate — Mise à jour", () => {
  it("met à jour le statut", async () => {
    const c = await Candidate.create(baseCandidate);
    const updated = await Candidate.findByIdAndUpdate(
      c._id,
      { status: "shortlisted" },
      { new: true },
    );
    expect(updated.status).toBe("shortlisted");
  });

  it("met à jour le score global", async () => {
    const c = await Candidate.create(baseCandidate);
    await Candidate.findByIdAndUpdate(c._id, { "scores.global": 85.5 });
    const updated = await Candidate.findById(c._id);
    expect(updated.scores.global).toBe(85.5);
  });

  it("met à jour les scores par catégorie", async () => {
    const c = await Candidate.create(baseCandidate);
    await Candidate.findByIdAndUpdate(c._id, {
      "scores.byCategory": {
        formation: 20,
        technique: 40,
        softSkills: 10,
        experience: 10,
      },
    });
    const updated = await Candidate.findById(c._id);
    expect(updated.scores.byCategory.technique).toBe(40);
  });
});

// ── Requêtes ───────────────────────────────────────────────────────────────
describe("Candidate — Requêtes", () => {
  it("filtre par statut", async () => {
    await Candidate.create(baseCandidate);
    await Candidate.create({
      ...baseCandidate,
      personalInfo: { ...baseCandidate.personalInfo, email: "autre@test.com" },
      status: "accepted",
    });
    const results = await Candidate.find({ status: "new" });
    expect(results.length).toBe(1);
  });

  it("trie par score décroissant", async () => {
    await Candidate.create({ ...baseCandidate, "scores.global": 60 });
    await Candidate.create({
      ...baseCandidate,
      personalInfo: { ...baseCandidate.personalInfo, email: "b@test.com" },
      "scores.global": 85,
    });
    const results = await Candidate.find().sort({ "scores.global": -1 });
    expect(results[0].scores?.global).toBeGreaterThanOrEqual(
      results[1].scores?.global || 0,
    );
  });

  it("supprime un candidat", async () => {
    const c = await Candidate.create(baseCandidate);
    await Candidate.findByIdAndDelete(c._id);
    const found = await Candidate.findById(c._id);
    expect(found).toBeNull();
  });

  it("retourne null pour un id inexistant", async () => {
    const found = await Candidate.findById(new mongoose.Types.ObjectId());
    expect(found).toBeNull();
  });
});
