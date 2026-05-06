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
import TestResult from "../../models/TestResult.model.js";

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
  await TestResult.deleteMany({});
});

describe("Modèle TestResult — Intégration MongoDB", () => {
  const candidateId = new mongoose.Types.ObjectId();
  const testId = new mongoose.Types.ObjectId();

  it("crée un résultat de test avec succès", async () => {
    const result = await TestResult.create({
      candidateId,
      testId,
      answers: [],
      totalScore: 70,
      totalPoints: 100,
      percentage: 70,
      status: "evaluated",
    });
    expect(result._id).toBeDefined();
    expect(result.percentage).toBe(70);
    expect(result.status).toBe("evaluated");
  });

  it("passe au statut integrated après intégration", async () => {
    const result = await TestResult.create({
      candidateId,
      testId,
      answers: [],
      totalScore: 70,
      totalPoints: 100,
      percentage: 70,
      status: "evaluated",
    });
    const updated = await TestResult.findByIdAndUpdate(
      result._id,
      { status: "integrated", integratedInScoring: true, scoringImpact: -5 },
      { new: true },
    );
    expect(updated.status).toBe("integrated");
    expect(updated.integratedInScoring).toBe(true);
  });

  it("garantit l'unicité du couple candidat/test", async () => {
    await TestResult.create({
      candidateId,
      testId,
      answers: [],
      totalScore: 70,
      totalPoints: 100,
      percentage: 70,
      status: "evaluated",
    });
    await expect(
      TestResult.create({
        candidateId,
        testId,
        answers: [],
        totalScore: 80,
        totalPoints: 100,
        percentage: 80,
        status: "evaluated",
      }),
    ).rejects.toThrow();
  });
});
