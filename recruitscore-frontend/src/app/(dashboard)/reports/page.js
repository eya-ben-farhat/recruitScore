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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const categoryLabels = {
  formation: "Formation",
  technique: "Technique",
  softSkills: "Soft Skills",
  experience: "Expérience",
};

const statusLabels = {
  new: "Nouveau",
  evaluating: "En évaluation",
  shortlisted: "Présélectionné",
  rejected: "Rejeté",
  accepted: "Accepté",
};

const statusColors = {
  new: "#3b82f6",
  evaluating: "#f59e0b",
  shortlisted: "#8b5cf6",
  rejected: "#ef4444",
  accepted: "#10b981",
};

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [activeTab, setActiveTab] = useState("global");
  const [globalStats, setGlobalStats] = useState(null);
  const [kpiStats, setKpiStats] = useState(null);
  const [periodStats, setPeriodStats] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");

  const canExport =
    user?.role === "admin" || user?.role === "rh" || user?.role === "manager";

  const fetchGlobalStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/global");
      setGlobalStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKpiStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/kpi");
      setKpiStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/period?period=" + period);
      setPeriodStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      (user?.role === "evaluator" || user?.role === "reader") &&
      activeTab !== "global"
    ) {
      setActiveTab("global");
      return;
    }
  }, [user?.role, activeTab]);

  useEffect(() => {
    if (!token) return;
    const allowedRoles = ["admin", "manager"];
    if (activeTab === "global") fetchGlobalStats();
    if (activeTab === "kpi" && allowedRoles.includes(user?.role))
      fetchKpiStats();
    if (activeTab === "periode" && allowedRoles.includes(user?.role))
      fetchPeriodStats();
  }, [token, activeTab, period, user?.role]);

  const downloadFile = async (url, filename) => {
    try {
      const res = await api.get(url, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      alert("Erreur lors du téléchargement");
    }
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const res = await api.post("/reports/export/pdf", { type: "global" });
      const fileName = res.data.report.fileName;
      await downloadFile("/reports/download/" + fileName, fileName);
    } catch (err) {
      alert(err.response?.data?.message || "Erreur export PDF");
    } finally {
      setExporting("");
    }
  };

  const handleExportExcel = async () => {
    setExporting("excel");
    try {
      const res = await api.post("/reports/export/excel");
      const fileName = res.data.report.fileName;
      await downloadFile("/reports/download/" + fileName, fileName);
    } catch (err) {
      alert(err.response?.data?.message || "Erreur export Excel");
    } finally {
      setExporting("");
    }
  };

  const pieData =
    globalStats?.byStatus?.map((s) => ({
      name: statusLabels[s._id] || s._id,
      value: s.count,
      color: statusColors[s._id] || "#94a3b8",
    })) || [];

  const barData =
    periodStats?.candidatesByPeriod?.map((p) => ({
      periode: p._id,
      candidats: p.count,
      score: Math.round(p.avgScore || 0),
    })) || [];

  const lineData =
    periodStats?.resultsByPeriod?.map((p) => ({
      periode: p._id,
      score: Math.round(p.avgScore || 0),
      tests: p.count,
    })) || [];

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
            Rapports et Statistiques
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            Analyse et aide à la décision
          </p>
        </div>
        {canExport && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleExportPDF}
              disabled={exporting === "pdf"}
              style={{
                padding: "9px 18px",
                background: "white",
                color: "#7c3aed",
                border: "1px solid #7c3aed",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: exporting === "pdf" ? "not-allowed" : "pointer",
                fontFamily: "Poppins, sans-serif",
                opacity: exporting === "pdf" ? 0.7 : 1,
              }}
            >
              {exporting === "pdf" ? "Export..." : "Exporter PDF"}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting === "excel"}
              style={{
                padding: "9px 18px",
                background: "#059669",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: exporting === "excel" ? "not-allowed" : "pointer",
                fontFamily: "Poppins, sans-serif",
                opacity: exporting === "excel" ? 0.7 : 1,
              }}
            >
              {exporting === "excel" ? "Export..." : "Exporter Excel"}
            </button>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "20px",
          background: "white",
          borderRadius: "12px",
          padding: "6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          width: "fit-content",
        }}
      >
        {[
          { key: "global", label: "Vue Globale" },
          ...(["admin", "manager"].includes(user?.role)
            ? [
                { key: "kpi", label: "Analyse KPIs" },
                { key: "periode", label: "Évolution" },
              ]
            : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === tab.key ? "#2563eb" : "transparent",
              color: activeTab === tab.key ? "white" : "#64748b",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "40vh",
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
      ) : (
        <>
          {/* ===== VUE GLOBALE ===== */}
          {activeTab === "global" && globalStats && (
            <div>
              {/* Compteurs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "14px",
                  marginBottom: "20px",
                }}
              >
                {[
                  {
                    label: "Total Candidats",
                    value: globalStats.totalCandidates,
                    color: "#2563eb",
                  },
                  {
                    label: "Score Moyen",
                    value: (globalStats.scores?.avgScore || 0) + " / 100",
                    color: "#7c3aed",
                  },
                  {
                    label: "Taux Acceptation",
                    value: (globalStats.acceptanceRate || 0) + "%",
                    color: "#059669",
                  },
                  {
                    label: "Acceptés",
                    value: globalStats.accepted || 0,
                    color: "#d97706",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      borderLeft: "4px solid " + s.color,
                    }}
                  >
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        marginBottom: "6px",
                      }}
                    >
                      {s.label}
                    </p>
                    <p
                      style={{
                        fontSize: "22px",
                        fontWeight: "800",
                        color: s.color,
                      }}
                    >
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                {/* Répartition statuts */}
                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#1e293b",
                      marginBottom: "20px",
                    }}
                  >
                    Répartition par Statut
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Répartition par domaine */}
                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#1e293b",
                      marginBottom: "20px",
                    }}
                  >
                    Répartition par Domaine
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={
                        globalStats.byTags?.map((t) => ({
                          name: t._id,
                          count: t.count,
                        })) || []
                      }
                      margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "11px",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                        name="Candidats"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stats scores */}
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "16px",
                  }}
                >
                  Statistiques des Scores
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                  }}
                >
                  {[
                    {
                      label: "Score Moyen",
                      value: globalStats.scores?.avgScore || 0,
                      color: "#2563eb",
                    },
                    {
                      label: "Score Max",
                      value: globalStats.scores?.maxScore || 0,
                      color: "#059669",
                    },
                    {
                      label: "Score Min",
                      value: globalStats.scores?.minScore || 0,
                      color: "#d97706",
                    },
                  ].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        textAlign: "center",
                        padding: "16px",
                        background: "#f8fafc",
                        borderRadius: "10px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          fontWeight: "600",
                        }}
                      >
                        {s.label}
                      </p>
                      <div
                        style={{
                          width: "70px",
                          height: "70px",
                          borderRadius: "50%",
                          margin: "0 auto 8px",
                          background:
                            "conic-gradient(" +
                            s.color +
                            " " +
                            s.value +
                            "%, #e2e8f0 0)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "50%",
                            background: "#f8fafc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: "800",
                            color: s.color,
                          }}
                        >
                          {s.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== ANALYSE KPIs ===== */}
          {activeTab === "kpi" && kpiStats && (
            <div>
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  marginBottom: "16px",
                  display: "inline-block",
                }}
              >
                <p style={{ fontSize: "13px", color: "#64748b" }}>
                  Total KPIs actifs :{" "}
                  <strong style={{ color: "#2563eb" }}>
                    {kpiStats.totalKPIs}
                  </strong>
                </p>
              </div>

              {/* Tableau KPIs */}
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                  marginBottom: "16px",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        background: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      {[
                        "KPI",
                        "Catégorie",
                        "Score Moyen",
                        "Score Max",
                        "Score Min",
                        "Candidats",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kpiStats.kpiStats?.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: "40px",
                            color: "#94a3b8",
                          }}
                        >
                          Aucune donnée disponible
                        </td>
                      </tr>
                    ) : (
                      kpiStats.kpiStats?.map((k, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: i % 2 === 0 ? "white" : "#fafafa",
                          }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "#1e293b",
                            }}
                          >
                            {k.kpi?.name}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "99px",
                                background: "#eff6ff",
                                color: "#2563eb",
                                fontSize: "11px",
                                fontWeight: "600",
                              }}
                            >
                              {categoryLabels[k.kpi?.category] ||
                                k.kpi?.category}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  height: "6px",
                                  background: "#f1f5f9",
                                  borderRadius: "99px",
                                  minWidth: "80px",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: Math.min(k.avgScore, 100) + "%",
                                    background: "#2563eb",
                                    borderRadius: "99px",
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  color: "#2563eb",
                                  minWidth: "40px",
                                }}
                              >
                                {Math.round(k.avgScore * 10) / 10}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "12px",
                              color: "#059669",
                              fontWeight: "600",
                            }}
                          >
                            {Math.round(k.maxScore * 10) / 10}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "12px",
                              color: "#ef4444",
                              fontWeight: "600",
                            }}
                          >
                            {Math.round(k.minScore * 10) / 10}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "12px",
                              color: "#64748b",
                            }}
                          >
                            {k.count}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Graphique KPIs */}
              {kpiStats.kpiStats?.length > 0 && (
                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#1e293b",
                      marginBottom: "16px",
                    }}
                  >
                    Score Moyen par KPI
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={kpiStats.kpiStats.map((k) => ({
                        name: k.kpi?.name,
                        score: Math.round(k.avgScore * 10) / 10,
                      }))}
                      margin={{ top: 0, right: 10, left: -20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9, fill: "#94a3b8" }}
                        angle={-35}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "11px",
                        }}
                      />
                      <Bar
                        dataKey="score"
                        fill="#7c3aed"
                        radius={[4, 4, 0, 0]}
                        name="Score Moyen"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ===== ÉVOLUTION PAR PÉRIODE ===== */}
          {activeTab === "periode" && (
            <div>
              {/* Sélecteur période */}
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  marginBottom: "16px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    fontWeight: "500",
                  }}
                >
                  Période :
                </span>
                {[
                  { value: "week", label: "Semaine" },
                  { value: "month", label: "Mois" },
                  { value: "year", label: "Année" },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: period === p.value ? "#2563eb" : "#f1f5f9",
                      color: period === p.value ? "white" : "#64748b",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {periodStats && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  {/* Candidatures par période */}
                  <div
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "24px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#1e293b",
                        marginBottom: "16px",
                      }}
                    >
                      Candidatures par{" "}
                      {period === "week"
                        ? "Semaine"
                        : period === "month"
                          ? "Mois"
                          : "Année"}
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={barData}
                        margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="periode"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            fontSize: "11px",
                          }}
                        />
                        <Bar
                          dataKey="candidats"
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                          name="Candidats"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Évolution scores */}
                  <div
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "24px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#1e293b",
                        marginBottom: "16px",
                      }}
                    >
                      Évolution Score Moyen
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={barData}
                        margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="periode"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            fontSize: "11px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#7c3aed"
                          strokeWidth={2.5}
                          dot={{ fill: "#7c3aed", r: 4 }}
                          name="Score Moy."
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Résultats tests par période */}
                  <div
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "24px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      gridColumn: "span 2",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#1e293b",
                        marginBottom: "16px",
                      }}
                    >
                      Résultats Tests par Période
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={lineData}
                        margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="periode"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            fontSize: "11px",
                          }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: "11px" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#059669"
                          strokeWidth={2.5}
                          dot={{ fill: "#059669", r: 4 }}
                          name="Score Moy. Tests %"
                        />
                        <Line
                          type="monotone"
                          dataKey="tests"
                          stroke="#d97706"
                          strokeWidth={2.5}
                          dot={{ fill: "#d97706", r: 4 }}
                          name="Nb Tests"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
