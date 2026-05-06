"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";

const menuCategories = [
  {
    label: "Vue Générale",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/reports", label: "Rapports" },
    ],
  },
  {
    label: "Gestion des Candidats",
    items: [
      { href: "/candidates", label: "Candidats" },
      { href: "/nlpsearch", label: "Recherche IA" },
    ],
  },
  {
    label: "Gestion des Tests",
    items: [
      { href: "/tests", label: "Tests" },
      { href: "/results", label: "Résultats" },
    ],
  },
  {
    label: "Scoring",
    items: [
      { href: "/kpis", label: "KPIs" },
      { href: "/templates", label: "Templates" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/users", label: "Utilisateurs" },
      { href: "/audit", label: "Audit" },
      { href: "/settings", label: "Paramètres" },
    ],
  },
];

const roleAccess = {
  admin: [
    "/dashboard",
    "/candidates",
    "/nlpsearch",
    "/tests",
    "/results",
    "/kpis",
    "/templates",
    "/reports",
    "/users",
    "/audit",
    "/settings",
  ],
  rh: [
    "/dashboard",
    "/candidates",
    "/nlpsearch",
    "/tests",
    "/results",
    "/reports",
  ],
  manager: [
    "/dashboard",
    "/candidates",
    "/tests",
    "/results",
    "/kpis",
    "/templates",
    "/reports",
  ],
  evaluator: ["/dashboard", "/candidates", "/results", "/tests", "/reports"],
  reader: ["/dashboard", "/reports"],
};

export default function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  console.log("USER DANS SIDEBAR:", user);
  const allowed = roleAccess[user?.role] || [];

  const visibleCategories = menuCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => allowed.includes(item.href)),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <aside
      style={{
        width: "220px",
        minHeight: "100vh",
        background: "#1e3a5f",
        borderRight: "1px solid rgba(37,99,235,0.2)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px",
          borderBottom: "1px solid rgba(37,99,235,0.3)",
        }}
      >
        <span
          style={{
            fontSize: "18px",
            fontWeight: "700",
            color: "white",
            letterSpacing: "1px",
            fontFamily: "Poppins, sans-serif",
            textTransform: "uppercase",
          }}
        >
          RecruitScore
        </span>
      </div>

      {/* Menu */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "12px",
          overflowY: "auto",
          flex: 1,
        }}
      >
        {visibleCategories.map((cat, catIndex) => (
          <div key={cat.label} style={{ marginBottom: "4px" }}>
            {/* Titre catégorie */}
            <p
              style={{
                padding: "8px 20px 3px",
                fontSize: "9px",
                fontWeight: "700",
                color: "rgba(148,163,184,0.7)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontFamily: "Poppins, sans-serif",
                margin: 0,
              }}
            >
              {cat.label}
            </p>

            {/* Items */}
            {cat.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  padding: "8px 20px 8px 24px",
                  color: pathname === item.href ? "white" : "#bfdbfe",
                  textDecoration: "none",
                  fontSize: "12px",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: "500",
                  background:
                    pathname === item.href
                      ? "rgba(37,99,235,0.3)"
                      : "transparent",
                  borderLeft:
                    pathname === item.href
                      ? "3px solid #60a5fa"
                      : "3px solid transparent",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== item.href) {
                    e.currentTarget.style.background = "rgba(30,64,175,0.5)";
                    e.currentTarget.style.color = "white";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== item.href) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#bfdbfe";
                  }
                }}
              >
                {item.label}
              </Link>
            ))}

            {/* Séparateur entre catégories */}
            {catIndex < visibleCategories.length - 1 && (
              <div
                style={{
                  height: "1px",
                  background: "rgba(37,99,235,0.2)",
                  margin: "8px 20px 0",
                }}
              />
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
