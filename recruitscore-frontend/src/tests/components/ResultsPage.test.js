import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/store/authStore", () => {
  let currentState = { user: { role: "admin" }, token: "tok" };
  const useStore = (selector) => selector(currentState);
  useStore.__setState = (state) => {
    currentState = state;
  };
  return { __esModule: true, default: useStore };
});

const ResultsPage = require("@/app/(dashboard)/results/page").default;
const api = require("@/lib/axios").default;

const mockResults = [
  {
    _id: "r1",
    candidateId: { personalInfo: { firstName: "Ahmed", lastName: "Ben Ali" } },
    testId: { title: "Test Backend", totalPoints: 100 },
    totalScore: 75,
    totalPoints: 100,
    percentage: 75,
    status: "evaluated",
    evaluatedBy: { firstName: "Admin", lastName: "User" },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation((url) => {
    if (url.includes("/results"))
      return Promise.resolve({ data: { results: mockResults, total: 1 } });
    if (url.includes("/tests")) return Promise.resolve({ data: { tests: [] } });
    if (url.includes("/candidates"))
      return Promise.resolve({ data: { candidates: [] } });
    return Promise.resolve({ data: {} });
  });
});

// ✅ Nettoyer le DOM après chaque test
afterEach(() => cleanup());

describe("ResultsPage — Affichage", () => {
  it("affiche la liste des résultats", async () => {
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("Ahmed Ben Ali")).toBeDefined();
      expect(screen.getByText("Test Backend")).toBeDefined();
    });
  });

  it("affiche le pourcentage correctement", async () => {
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("75%")).toBeDefined();
    });
  });

  it("affiche le bouton Intégrer pour un résultat évalué", async () => {
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("Intégrer")).toBeDefined();
    });
  });
});

describe("ResultsPage — Intégration", () => {
  it("appelle l'API integrate au clic sur Intégrer", async () => {
    api.post.mockResolvedValue({
      data: {
        success: true,
        scoring: {
          previousGlobal: 80,
          newGlobal: 74,
          templateUsed: "Template Dev",
          kpiWeight: 0.7,
          testWeight: 0.3,
        },
      },
    });

    render(<ResultsPage />);

    // Étape 1 : cliquer "Intégrer" dans le tableau
    await waitFor(() => screen.getByText("Intégrer"));
    fireEvent.click(screen.getByText("Intégrer"));

    // Étape 2 : modal de pondération → cliquer "Confirmer"
    await waitFor(() => screen.getByText("Confirmer l'intégration"));
    fireEvent.click(screen.getByText("Confirmer l'intégration"));

    // Étape 3 : vérifier l'appel API
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/results/r1/integrate",
        expect.any(Object),
      );
    });
  });
});
