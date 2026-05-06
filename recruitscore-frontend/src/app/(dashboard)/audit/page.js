"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
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
} from "recharts";

const actionColors = {
  CREATE_CANDIDATE: { bg: "#ecfdf5", color: "#059669" },
  UPDATE_CANDIDATE: { bg: "#eff6ff", color: "#2563eb" },
  DELETE_CANDIDATE: { bg: "#fef2f2", color: "#dc2626" },
  CHANGE_CANDIDATE_STATUS: { bg: "#fffbeb", color: "#d97706" },
  GENERATE_SHORTLIST: { bg: "#f5f3ff", color: "#7c3aed" },
  CREATE_KPI: { bg: "#ecfdf5", color: "#059669" },
  UPDATE_KPI: { bg: "#eff6ff", color: "#2563eb" },
  DELETE_KPI: { bg: "#fef2f2", color: "#dc2626" },
  CREATE_TEST: { bg: "#ecfdf5", color: "#059669" },
  GENERATE_TEST: { bg: "#f5f3ff", color: "#7c3aed" },
  EXPORT_PDF: { bg: "#fffbeb", color: "#d97706" },
  INTEGRATE_TEST_SCORE: { bg: "#f5f3ff", color: "#7c3aed" },
  CREATE_USER: { bg: "#ecfdf5", color: "#059669" },
  UPDATE_USER: { bg: "#eff6ff", color: "#2563eb" },
  DELETE_USER: { bg: "#fef2f2", color: "#dc2626" },
  EXPORT_REPORT: { bg: "#fffbeb", color: "#d97706" },
  LOGIN: { bg: "#ecfdf5", color: "#059669" },
  LOGOUT: { bg: "#f8fafc", color: "#64748b" },
};

const collectionLabels = {
  Candidate: "Candidats",
  KPI: "KPIs",
  Test: "Tests",
  TestResult: "Résultats",
  User: "Utilisateurs",
  Report: "Rapports",
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("logs");

  // Filtres
  const [actionFilter, setActionFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Detail modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (actionFilter) params.append("action", actionFilter);
      if (collectionFilter) params.append("targetCollection", collectionFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await api.get("/audit?" + params);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/audit/stats");
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, collectionFilter, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "stats") fetchStats();
  }, [activeTab]);

  const handleDetail = async (id) => {
    try {
      const res = await api.get("/audit/" + id);
      setSelectedLog(res.data.log);
      setShowDetail(true);
    } catch (err) {
      console.error(err);
    }
  };

  const resetFilters = () => {
    setActionFilter("");
    setCollectionFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const pages = Math.ceil(total / 20);

  const activityData =
    stats?.activityLast7Days?.map((d) => ({
      date: d._id,
      count: d.count,
    })) || [];

  const actionData =
    stats?.byAction?.slice(0, 8).map((a) => ({
      name: a._id.replace(/_/g, " "),
      count: a.count,
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
            Journal d'Audit
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            Traçabilité des actions — {total} entrée{total > 1 ? "s" : ""}
          </p>
        </div>
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
          { key: "logs", label: "Journal" },
          { key: "stats", label: "Statistiques" },
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

      {/* ===== JOURNAL ===== */}
      {activeTab === "logs" && (
        <>
          {/* Filtres */}
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
              flexWrap: "wrap",
            }}
          >
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Toutes les actions</option>
              {Object.keys(actionColors).map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <select
              value={collectionFilter}
              onChange={(e) => {
                setCollectionFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Toutes les collections</option>
              {Object.entries(collectionLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                color: "#1e293b",
                outline: "none",
              }}
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                color: "#1e293b",
                outline: "none",
              }}
            />

            {(actionFilter || collectionFilter || startDate || endDate) && (
              <button
                onClick={resetFilters}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#94a3b8",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Réinitialiser ✕
              </button>
            )}
          </div>

          {/* Table */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              overflow: "hidden",
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
                    "Date",
                    "Utilisateur",
                    "Action",
                    "Collection",
                    "Détails",
                    "",
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
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#94a3b8",
                      }}
                    >
                      Chargement...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#94a3b8",
                        fontSize: "13px",
                      }}
                    >
                      Aucun log trouvé
                    </td>
                  </tr>
                ) : (
                  logs.map((log, i) => (
                    <tr
                      key={log._id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: i % 2 === 0 ? "white" : "#fafafa",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "12px",
                          color: "#64748b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <p>
                          {new Date(log.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                        <p style={{ color: "#94a3b8" }}>
                          {new Date(log.createdAt).toLocaleTimeString("fr-FR")}
                        </p>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#1e293b",
                          }}
                        >
                          {log.userId?.firstName} {log.userId?.lastName}
                        </p>
                        <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {log.userId?.role}
                        </p>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "99px",
                            fontSize: "10px",
                            fontWeight: "700",
                            background:
                              actionColors[log.action]?.bg || "#f8fafc",
                            color: actionColors[log.action]?.color || "#64748b",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {log.action?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        {collectionLabels[log.targetCollection] ||
                          log.targetCollection ||
                          "—"}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "12px",
                          color: "#64748b",
                          maxWidth: "250px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.details || "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => handleDetail(log._id)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            background: "white",
                            color: "#64748b",
                            fontSize: "11px",
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {pages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "16px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: "white",
                    color: "#64748b",
                    fontSize: "12px",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    opacity: page === 1 ? 0.5 : 1,
                  }}
                >
                  Précédent
                </button>
                {Array.from(
                  { length: Math.min(pages, 5) },
                  (_, i) => i + 1,
                ).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: p === page ? "none" : "1px solid #e2e8f0",
                      background: p === page ? "#2563eb" : "white",
                      color: p === page ? "white" : "#64748b",
                      cursor: "pointer",
                      fontWeight: p === page ? "600" : "400",
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: "white",
                    color: "#64748b",
                    fontSize: "12px",
                    cursor: page === pages ? "not-allowed" : "pointer",
                    opacity: page === pages ? 0.5 : 1,
                  }}
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== STATISTIQUES ===== */}
      {activeTab === "stats" && stats && (
        <div>
          {/* Compteurs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            {[
              {
                label: "Total Actions",
                value: stats.totalLogs,
                color: "#2563eb",
              },
              {
                label: "Types d'actions",
                value: stats.byAction?.length || 0,
                color: "#7c3aed",
              },
              {
                label: "Utilisateurs actifs",
                value: stats.byUser?.length || 0,
                color: "#059669",
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
                    fontSize: "24px",
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
            {/* Activité 7 derniers jours */}
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
                Activité — 7 Derniers Jours
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={activityData}
                  margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
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
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ fill: "#2563eb", r: 4 }}
                    name="Actions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Actions les plus fréquentes */}
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
                Actions les Plus Fréquentes
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={actionData}
                  margin={{ top: 0, right: 10, left: -20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 8, fill: "#94a3b8" }}
                    angle={-30}
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
                    dataKey="count"
                    fill="#7c3aed"
                    radius={[4, 4, 0, 0]}
                    name="Actions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top utilisateurs */}
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
              Top Utilisateurs Actifs
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
              }}
            >
              {stats.byUser?.map((u, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "8px",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {u.user?.firstName?.charAt(0)}
                    {u.user?.lastName?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#1e293b",
                      }}
                    >
                      {u.user?.firstName} {u.user?.lastName}
                    </p>
                    <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {u.user?.role}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#2563eb",
                    }}
                  >
                    {u.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Log */}
      {showDetail && selectedLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                Détail de l'Action
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {[
                {
                  label: "Action",
                  value: selectedLog.action?.replace(/_/g, " "),
                },
                {
                  label: "Collection",
                  value:
                    collectionLabels[selectedLog.targetCollection] ||
                    selectedLog.targetCollection,
                },
                {
                  label: "Utilisateur",
                  value:
                    selectedLog.userId?.firstName +
                    " " +
                    selectedLog.userId?.lastName +
                    " (" +
                    selectedLog.userId?.role +
                    ")",
                },
                { label: "Email", value: selectedLog.userId?.email },
                {
                  label: "Date",
                  value: new Date(selectedLog.createdAt).toLocaleString(
                    "fr-FR",
                  ),
                },
                { label: "IP", value: selectedLog.ipAddress },
                { label: "Détails", value: selectedLog.details },
              ].map(
                (row, i) =>
                  row.value && (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "12px",
                        padding: "10px 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#94a3b8",
                          fontWeight: "700",
                          minWidth: "100px",
                          textTransform: "uppercase",
                        }}
                      >
                        {row.label}
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#1e293b",
                          fontWeight: "500",
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ),
              )}

              {/* Avant */}
              {selectedLog.before && (
                <div style={{ marginTop: "8px" }}>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Avant
                  </p>
                  <pre
                    style={{
                      background: "#fef2f2",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "11px",
                      color: "#dc2626",
                      overflow: "auto",
                      maxHeight: "150px",
                    }}
                  >
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {/* Après */}
              {selectedLog.after && (
                <div style={{ marginTop: "8px" }}>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Après
                  </p>
                  <pre
                    style={{
                      background: "#ecfdf5",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "11px",
                      color: "#059669",
                      overflow: "auto",
                      maxHeight: "150px",
                    }}
                  >
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
