"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [dashboard, setDashboard] = useState(null);
  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const d = await api.get("/reports/dashboard");
        setDashboard(d.data.dashboard);

        if (user?.role !== "evaluator" && user?.role !== "reader") {
          const p = await api.get("/reports/period?period=month");
          setPeriod(p.data.stats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user?.role]);

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #2563eb",
            borderTop: "3px solid transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );

  const barData =
    (period?.candidatesByPeriod || dashboard?.candidatesByPeriod)?.map((p) => ({
      mois: p._id,
      candidats: p.count,
      score: Math.round(p.avgScore || 0),
    })) || [];

  const card = (label, value, color) => (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "16px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        borderLeft: `4px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          color: "#64748b",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: "24px", fontWeight: "700", color }}>{value ?? 0}</p>
    </div>
  );

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
          Tableau de bord
        </h2>
        <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
          Vue générale de la plateforme RecruitScore
        </p>
      </div>

      {/* Compteurs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {card(
          "Total Candidats",
          dashboard?.counters?.totalCandidates,
          "#2563eb",
        )}
        {card("Total Tests", dashboard?.counters?.totalTests, "#7c3aed")}
        {card("Résultats", dashboard?.counters?.totalResults, "#059669")}
        {card(
          "En Evaluation",
          dashboard?.counters?.pendingEvaluation,
          "#d97706",
        )}
      </div>

      {/* Graphiques */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {/* Barres */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#1e293b",
              marginBottom: "16px",
            }}
          >
            Candidatures par Mois
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={barData}
              margin={{ top: 0, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: "11px",
                }}
              />
              <Bar
                dataKey="candidats"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                name="Candidats"
              />
              <Bar
                dataKey="score"
                fill="#bfdbfe"
                radius={[4, 4, 0, 0]}
                name="Score Moy."
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Courbe */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#1e293b",
              marginBottom: "16px",
            }}
          >
            Evolution des Candidatures
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart
              data={barData}
              margin={{ top: 0, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: "11px",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: "10px" }}
              />
              <Line
                type="monotone"
                dataKey="candidats"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ fill: "#2563eb", r: 4 }}
                activeDot={{ r: 6 }}
                name="Candidats"
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ fill: "#f59e0b", r: 4 }}
                activeDot={{ r: 6 }}
                name="Score Moy."
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bas de page */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "14px",
        }}
      >
        {/* Score moyen */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#1e293b",
              marginBottom: "16px",
            }}
          >
            Score Moyen Global
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                background: `conic-gradient(#2563eb ${dashboard?.avgScore ?? 0}%, #e2e8f0 0)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "50%",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#2563eb",
                }}
              >
                {dashboard?.avgScore ?? 0}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#64748b" }}>
                Score sur 100
              </p>
              <p
                style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}
              >
                {dashboard?.counters?.totalCandidates ?? 0} candidats
              </p>
            </div>
          </div>
        </div>

        {/* Top candidats */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#1e293b",
              marginBottom: "16px",
            }}
          >
            Top 5 Candidats
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {dashboard?.topCandidates?.length === 0 && (
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                Aucun candidat scoré
              </p>
            )}
            {dashboard?.topCandidates?.map((c, i) => (
              <div
                key={c._id}
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background:
                      i === 0
                        ? "#fbbf24"
                        : i === 1
                          ? "#94a3b8"
                          : i === 2
                            ? "#d97706"
                            : "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: "700",
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#1e293b",
                    flex: 1,
                  }}
                >
                  {c.personalInfo?.firstName} {c.personalInfo?.lastName}
                </p>
                <div
                  style={{
                    padding: "2px 8px",
                    borderRadius: "99px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                >
                  {c.scores?.global ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Derniers tests */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#1e293b",
              marginBottom: "16px",
            }}
          >
            Derniers Tests
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {dashboard?.recentTests?.length === 0 && (
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                Aucun test créé
              </p>
            )}
            {dashboard?.recentTests?.map((t) => (
              <div
                key={t._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#1e293b",
                    }}
                  >
                    {t.title}
                  </p>
                  <p style={{ fontSize: "10px", color: "#94a3b8" }}>
                    {t.targetRole}
                  </p>
                </div>
                <div
                  style={{
                    padding: "2px 8px",
                    borderRadius: "99px",
                    fontSize: "10px",
                    fontWeight: "600",
                    background:
                      t.status === "active"
                        ? "#ecfdf5"
                        : t.status === "closed"
                          ? "#fef2f2"
                          : t.status === "draft"
                            ? "#f8fafc"
                            : "#fffbeb",
                    color:
                      t.status === "active"
                        ? "#059669"
                        : t.status === "closed"
                          ? "#dc2626"
                          : t.status === "draft"
                            ? "#64748b"
                            : "#d97706",
                  }}
                >
                  {t.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
