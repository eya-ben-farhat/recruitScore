import { render, screen } from "@testing-library/react";
import { expect, describe, it, jest, beforeEach } from "@jest/globals";

jest.mock("next/navigation", () => ({
  __esModule: true,
  usePathname: () => "/dashboard",
}));

jest.mock("next/link", () => {
  const Link = ({ children, href }) => <a href={href}>{children}</a>;
  Link.displayName = "Link";
  return { __esModule: true, default: Link };
});

jest.mock("@/store/authStore", () => {
  let currentState = { user: null, token: null, isReady: false };
  const useStore = (selector) => selector(currentState);
  useStore.__setState = (state) => {
    currentState = state;
  };
  return { __esModule: true, default: useStore };
});

const SidebarModule = require("../../components/layout/Sidebar");
const Sidebar = SidebarModule.default || SidebarModule;
const useAuthStore = require("@/store/authStore").default;

describe("Sidebar — Rôle admin", () => {
  beforeEach(() => {
    useAuthStore.__setState({
      user: { role: "admin" },
      token: "x",
      isReady: true,
    });
  });

  it("affiche tous les menus pour le rôle admin", () => {
    render(<Sidebar />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Candidats")).toBeDefined();
    expect(screen.getByText("Tests")).toBeDefined();
    expect(screen.getByText("Utilisateurs")).toBeDefined();
    expect(screen.getByText("Audit")).toBeDefined();
  });
});

describe("Sidebar — Rôle reader", () => {
  beforeEach(() => {
    useAuthStore.__setState({
      user: { role: "reader" },
      token: "x",
      isReady: true,
    });
  });

  it("affiche uniquement Dashboard et Rapports pour le rôle reader", () => {
    render(<Sidebar />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Rapports")).toBeDefined();
    expect(screen.queryByText("Candidats")).toBeNull();
    expect(screen.queryByText("Tests")).toBeNull();
  });
});
