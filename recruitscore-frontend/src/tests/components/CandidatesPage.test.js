import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, describe, it, jest, beforeEach } from "@jest/globals";

jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/store/authStore", () => {
  let currentState = {
    user: { role: "admin", permissions: { candidates: ["write", "delete"] } },
    token: "tok",
  };
  const useStore = (selector) => selector(currentState);
  useStore.__setState = (state) => {
    currentState = state;
  };
  return { __esModule: true, default: useStore };
});

// ✅ require() après les mocks
const CandidatesPage = require("@/app/(dashboard)/candidates/page").default;
const api = require("@/lib/axios").default;

const mockCandidates = [
  {
    _id: "1",
    personalInfo: {
      firstName: "Ahmed",
      lastName: "Ben Ali",
      email: "ahmed@test.com",
      phone: "12345678",
    },
    education: { specialty: "Informatique" },
    scores: { global: 85 },
    status: "new",
    tags: ["dev"],
  },
];

beforeEach(() => {
  api.get.mockImplementation((url) => {
    if (url.includes("/candidates"))
      return Promise.resolve({
        data: { candidates: mockCandidates, total: 1 },
      });
    if (url.includes("/tests")) return Promise.resolve({ data: { tests: [] } });
    return Promise.resolve({ data: {} });
  });
});

describe("CandidatesPage", () => {
  it("affiche la liste des candidats après chargement", async () => {
    render(<CandidatesPage />);
    await waitFor(() => {
      expect(screen.getByText("Ahmed Ben Ali")).toBeDefined();
      expect(screen.getByText("85 / 100")).toBeDefined();
    });
  });

  it("affiche le bouton Nouveau Candidat pour un admin", async () => {
    render(<CandidatesPage />);
    await waitFor(() => {
      expect(screen.getByText("+ Nouveau Candidat")).toBeDefined();
    });
  });

  it("affiche le bouton Shortlist pour un admin", async () => {
    render(<CandidatesPage />);
    await waitFor(() => {
      expect(screen.getByText(/Shortlist/i)).toBeDefined();
    });
  });

  it("filtre les candidats par statut au changement du select", async () => {
    render(<CandidatesPage />);
    await waitFor(() => screen.getByText("Ahmed Ben Ali"));
    const select = screen.getByDisplayValue("Tous les statuts");
    fireEvent.change(select, { target: { value: "accepted" } });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("status=accepted"),
      );
    });
  });
});
