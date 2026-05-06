"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";

const statusColors = {
  pending: { bg: "#fffbeb", color: "#d97706" },
  evaluated: { bg: "#eff6ff", color: "#2563eb" },
  integrated: { bg: "#ecfdf5", color: "#059669" },
};

const statusLabels = {
  pending: "En attente",
  evaluated: "Évalué",
  integrated: "Intégré",
};

const inputStyle = {
  width: "100%",
  padding: "9px 14px",
  borderRadius: "8px",
  border: "1.5px solid #e2e8f0",
  fontSize: "13px",
  fontFamily: "Poppins, sans-serif",
  outline: "none",
  color: "#1e293b",
  background: "white",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: "600",
  color: "#64748b",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

export default function ResultsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [tests, setTests] = useState([]);
  const [candidates, setCandidates] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal pondération
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [pendingIntegrateId, setPendingIntegrateId] = useState(null);
  const [kpiWeight, setKpiWeight] = useState(70);
  const [testWeight, setTestWeight] = useState(30);

  // Form saisie résultats
  const [form, setForm] = useState({
    candidateId: "",
    testId: "",
    evaluatorComment: "",
    answers: [],
  });
  const [selectedTest, setSelectedTest] = useState(null);

  const canWrite =
    user?.role === "admin" ||
    user?.role === "manager" ||
    user?.role === "evaluator";
  const canDelete =
    user?.role === "admin" ||
    user?.role === "manager" ||
    user?.role === "evaluator";
  const canIntegrate = user?.role === "admin" || user?.role === "manager";
  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.get("/results?" + params);
      setResults(res.data.results || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const res = await api.get("/tests?status=closed&limit=100");
      setTests(res.data.tests || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await api.get("/candidates?limit=100");
      setCandidates(res.data.candidates || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchResults();
  }, [token, page, statusFilter]);

  useEffect(() => {
    if (!token) return;
    fetchTests();
    fetchCandidates();
  }, [token]);

  const handleTestSelect = async (testId) => {
    setForm((prev) => ({ ...prev, testId, candidateId: "", answers: [] }));
    if (!testId) {
      setSelectedTest(null);
      return;
    }
    try {
      const res = await api.get("/tests/" + testId);
      const test = res.data.test;
      setSelectedTest(test);
      setForm((prev) => ({
        ...prev,
        testId,
        candidateId: "",
        answers: test.questions.map((q) => ({
          questionId: q.questionId?._id || q.questionId,
          questionContent: q.questionId?.content || "",
          maxPoints: q.points,
          pointsObtained: 0,
          answer: "",
        })),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const updateAnswer = (i, field, value) => {
    const updated = [...form.answers];
    updated[i][field] = value;
    setForm((prev) => ({ ...prev, answers: updated }));
  };

  const handleCreate = async () => {
    setError("");
    if (!form.candidateId) return setError("Sélectionnez un candidat");
    if (!form.testId) return setError("Sélectionnez un test");
    setSaving(true);
    try {
      await api.post("/results", {
        candidateId: form.candidateId,
        testId: form.testId,
        evaluatorComment: form.evaluatorComment || undefined,
        answers: form.answers.map((a) => ({
          questionId: a.questionId,
          answer: a.answer,
          pointsObtained: Number(a.pointsObtained) || 0,
        })),
      });
      setShowCreateModal(false);
      setForm({
        candidateId: "",
        testId: "",
        evaluatorComment: "",
        answers: [],
      });
      setSelectedTest(null);
      fetchResults();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la saisie");
    } finally {
      setSaving(false);
    }
  };

  const handleDetail = async (id) => {
    try {
      const res = await api.get("/results/" + id);
      setSelectedResult(res.data.result);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleIntegrate = (id) => {
    setPendingIntegrateId(id);
    setShowWeightModal(true);
  };

  const handleDeleteResult = async (id) => {
    if (!confirm("Supprimer ce résultat ?")) return;
    try {
      await api.delete(`/results/${id}`);
      fetchResults();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const confirmIntegrate = async () => {
    if (kpiWeight + testWeight !== 100) {
      alert("La somme des pondérations doit être 100%");
      return;
    }
    try {
      const res = await api.post(
        "/results/" + pendingIntegrateId + "/integrate",
        {
          kpiWeight: kpiWeight / 100,
          testWeight: testWeight / 100,
        },
      );
      setShowWeightModal(false);
      setSuccess(
        "Score intégré ! " +
          res.data.scoring.previousGlobal +
          " → " +
          res.data.scoring.newGlobal +
          " | Template : " +
          (res.data.scoring.templateUsed || "défaut") +
          " (KPI " +
          res.data.scoring.kpiWeight +
          " + Test " +
          res.data.scoring.testWeight +
          ")",
      );
      setTimeout(() => setSuccess(""), 5000);
      fetchResults();
      if (selectedResult?._id === pendingIntegrateId) {
        const r = await api.get("/results/" + pendingIntegrateId);
        setSelectedResult(r.data.result);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'intégration");
    }
  };

  const totalScore = form.answers.reduce(
    (s, a) => s + (Number(a.pointsObtained) || 0),
    0,
  );
  const maxScore = form.answers.reduce(
    (s, a) => s + (Number(a.maxPoints) || 0),
    0,
  );
  const percentage =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const pages = Math.ceil(total / 10);

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
            Résultats des Tests
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            {total} résultat{total > 1 ? "s" : ""} au total
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setError("");
              setForm({
                candidateId: "",
                testId: "",
                evaluatorComment: "",
                answers: [],
              });
              setSelectedTest(null);
            }}
            style={{
              padding: "9px 18px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            + Saisir Résultats
          </button>
        )}
      </div>

      {success && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            color: "#059669",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "16px",
            fontWeight: "500",
          }}
        >
          {success}
        </div>
      )}

      {/* Filtres */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          marginBottom: "16px",
          display: "flex",
          gap: "12px",
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
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
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="evaluated">Évalué</option>
          <option value="integrated">Intégré</option>
        </select>
      </div>

      {/* Tableau */}
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
                "Candidat",
                "Test",
                "Score",
                "Pourcentage",
                "Statut",
                "Évalué par",
                "Actions",
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
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#94a3b8",
                  }}
                >
                  Chargement...
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#94a3b8",
                    fontSize: "13px",
                  }}
                >
                  Aucun résultat trouvé
                </td>
              </tr>
            ) : (
              results.map((r, i) => (
                <tr
                  key={r._id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "white" : "#fafafa",
                  }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#1e293b",
                      }}
                    >
                      {r.candidateId?.personalInfo?.firstName}{" "}
                      {r.candidateId?.personalInfo?.lastName}
                    </p>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
                    {r.testId?.title}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {r.totalScore} / {r.totalPoints}
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
                          minWidth: "60px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: r.percentage + "%",
                            background:
                              r.percentage >= 70
                                ? "#059669"
                                : r.percentage >= 50
                                  ? "#d97706"
                                  : "#ef4444",
                            borderRadius: "99px",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color:
                            r.percentage >= 70
                              ? "#059669"
                              : r.percentage >= 50
                                ? "#d97706"
                                : "#ef4444",
                        }}
                      >
                        {r.percentage}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "99px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: statusColors[r.status]?.bg,
                        color: statusColors[r.status]?.color,
                      }}
                    >
                      {statusLabels[r.status]}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    {r.evaluatedBy?.firstName} {r.evaluatedBy?.lastName}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleDetail(r._id)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "6px",
                          border: "1px solid #2563eb",
                          background: "transparent",
                          color: "#2563eb",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                          fontFamily: "Poppins, sans-serif",
                        }}
                      >
                        Détail
                      </button>
                      {canIntegrate && r.status === "evaluated" && (
                        <button
                          onClick={() => handleIntegrate(r._id)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#ecfdf5",
                            color: "#059669",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          Intégrer
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteResult(r._id)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            border: "1px solid #ef4444",
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
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
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
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

      {/* Modal Saisie Résultats */}
      {showCreateModal && (
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
              maxWidth: "700px",
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
                Saisir les Résultats
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
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

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  color: "#dc2626",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              {/* Sélection test */}
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>
                  Test <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={form.testId}
                  onChange={(e) => handleTestSelect(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">-- Sélectionner un test fermé --</option>
                  {tests.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.title} — {t.totalPoints} pts
                    </option>
                  ))}
                </select>
              </div>

              {/* Sélection candidat */}
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>
                  Candidat <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={form.candidateId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      candidateId: e.target.value,
                    }))
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                  disabled={!form.testId}
                >
                  <option value="">
                    {form.testId
                      ? "-- Sélectionner un candidat assigné --"
                      : "-- Sélectionnez d'abord un test --"}
                  </option>
                  {(selectedTest?.assignedCandidates || []).map((c) => (
                    <option key={c._id || c} value={c._id || c}>
                      {c.personalInfo?.firstName} {c.personalInfo?.lastName}
                      {c.personalInfo?.email
                        ? ` — ${c.personalInfo.email}`
                        : ""}
                    </option>
                  ))}
                </select>
                {form.testId &&
                  selectedTest?.assignedCandidates?.length === 0 && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#f59e0b",
                        marginTop: "4px",
                      }}
                    >
                      Aucun candidat assigné à ce test
                    </p>
                  )}
              </div>

              {/* Commentaire évaluateur */}
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Commentaire de l'évaluateur</label>
                <textarea
                  value={form.evaluatorComment}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      evaluatorComment: e.target.value,
                    }))
                  }
                  placeholder="Observations, remarques sur le candidat..."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

            {/* Score en temps réel */}
            {form.answers.length > 0 && (
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "14px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      fontWeight: "600",
                      textTransform: "uppercase",
                    }}
                  >
                    Score Total
                  </p>
                  <p
                    style={{
                      fontSize: "20px",
                      fontWeight: "800",
                      color: "#1e293b",
                    }}
                  >
                    {totalScore} / {maxScore}
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Pourcentage
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color:
                          percentage >= 70
                            ? "#059669"
                            : percentage >= 50
                              ? "#d97706"
                              : "#ef4444",
                      }}
                    >
                      {percentage}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      background: "#e2e8f0",
                      borderRadius: "99px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: percentage + "%",
                        background:
                          percentage >= 70
                            ? "#059669"
                            : percentage >= 50
                              ? "#d97706"
                              : "#ef4444",
                        borderRadius: "99px",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Questions */}
            {form.answers.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Saisie des Points par Question
                </p>
                {form.answers.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #f1f5f9",
                      borderRadius: "10px",
                      padding: "14px",
                      marginBottom: "10px",
                      background: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "10px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#1e293b",
                          flex: 1,
                          lineHeight: "1.5",
                          fontWeight: "500",
                        }}
                      >
                        Q{i + 1}. {a.questionContent || "Question " + (i + 1)}
                      </p>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#94a3b8",
                          marginLeft: "12px",
                          flexShrink: 0,
                        }}
                      >
                        Max : {a.maxPoints} pts
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Réponse du candidat</label>
                        <input
                          type="text"
                          value={a.answer}
                          onChange={(e) =>
                            updateAnswer(i, "answer", e.target.value)
                          }
                          placeholder="Réponse saisie..."
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>
                          Points obtenus (max {a.maxPoints})
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={a.maxPoints}
                          value={a.pointsObtained}
                          onChange={(e) => {
                            const val = Math.min(
                              Number(e.target.value),
                              a.maxPoints,
                            );
                            updateAnswer(i, "pointsObtained", val);
                          }}
                          style={{
                            ...inputStyle,
                            borderColor:
                              Number(a.pointsObtained) > a.maxPoints
                                ? "#ef4444"
                                : "#e2e8f0",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "24px",
                borderTop: "1px solid #f1f5f9",
                paddingTop: "20px",
              }}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: saving ? "#93c5fd" : "#2563eb",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {saving ? "Sauvegarde..." : "Enregistrer les Résultats"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Résultat */}
      {showDetailModal && selectedResult && (
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
              maxWidth: "650px",
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
              <div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#1e293b",
                  }}
                >
                  {selectedResult.candidateId?.personalInfo?.firstName}{" "}
                  {selectedResult.candidateId?.personalInfo?.lastName}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginTop: "2px",
                  }}
                >
                  {selectedResult.testId?.title}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
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

            {/* Score global */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {[
                {
                  label: "Score",
                  value:
                    selectedResult.totalScore +
                    " / " +
                    selectedResult.totalPoints,
                  color: "#1e293b",
                },
                {
                  label: "Pourcentage",
                  value: selectedResult.percentage + "%",
                  color:
                    selectedResult.percentage >= 70
                      ? "#059669"
                      : selectedResult.percentage >= 50
                        ? "#d97706"
                        : "#ef4444",
                },
                {
                  label: "Statut",
                  value: statusLabels[selectedResult.status],
                  color: statusColors[selectedResult.status]?.color,
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8fafc",
                    borderRadius: "8px",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginBottom: "4px",
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Impact scoring */}
            {selectedResult.status === "integrated" && (
              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #6ee7b7",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#059669",
                    fontWeight: "600",
                  }}
                >
                  Impact sur le scoring global :{" "}
                  {selectedResult.scoringImpact > 0 ? "+" : ""}
                  {selectedResult.scoringImpact} points
                </p>
              </div>
            )}

            {/* Commentaire */}
            {selectedResult.evaluatorComment && (
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    fontWeight: "600",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Commentaire évaluateur
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#1e293b",
                    lineHeight: "1.6",
                  }}
                >
                  {selectedResult.evaluatorComment}
                </p>
              </div>
            )}

            {/* Détail réponses */}
            {selectedResult.answers?.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  Détail par Question
                </p>
                {selectedResult.answers.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #f1f5f9",
                      borderRadius: "8px",
                      padding: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#1e293b",
                        }}
                      >
                        Q{i + 1}.{" "}
                        {a.questionId?.content || "Question " + (i + 1)}
                      </p>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "#2563eb",
                          flexShrink: 0,
                          marginLeft: "8px",
                        }}
                      >
                        {a.pointsObtained} / {a.questionId?.points || "?"} pts
                      </span>
                    </div>
                    {a.answer && (
                      <p style={{ fontSize: "11px", color: "#64748b" }}>
                        Réponse : {String(a.answer)}
                      </p>
                    )}
                    {/* Barre score question */}
                    <div
                      style={{
                        height: "4px",
                        background: "#f1f5f9",
                        borderRadius: "99px",
                        marginTop: "8px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width:
                            (a.questionId?.points
                              ? (a.pointsObtained / a.questionId.points) * 100
                              : 0) + "%",
                          background: "#2563eb",
                          borderRadius: "99px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {canIntegrate && selectedResult.status === "evaluated" && (
              <div
                style={{
                  marginTop: "20px",
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "20px",
                }}
              >
                <button
                  onClick={() => handleIntegrate(selectedResult._id)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#2563eb",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Intégrer dans le Scoring Global
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Pondération */}
      {showWeightModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              width: "100%",
              maxWidth: "420px",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: "8px",
              }}
            >
              Pondération du Score
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                marginBottom: "24px",
              }}
            >
              Définissez la pondération entre le score KPIs et le score du test.
            </p>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Score KPIs (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiWeight}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setKpiWeight(val);
                  setTestWeight(100 - val);
                }}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Score Test (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={testWeight}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTestWeight(val);
                  setKpiWeight(100 - val);
                }}
                style={inputStyle}
              />
            </div>
            {/* Visualisation */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  height: "12px",
                  borderRadius: "99px",
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: kpiWeight + "%",
                    background: "#2563eb",
                    transition: "width 0.3s",
                  }}
                />
                <div
                  style={{
                    width: testWeight + "%",
                    background: "#7c3aed",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#2563eb",
                    fontWeight: "600",
                  }}
                >
                  KPIs : {kpiWeight}%
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#7c3aed",
                    fontWeight: "600",
                  }}
                >
                  Test : {testWeight}%
                </span>
              </div>
            </div>
            {kpiWeight + testWeight !== 100 && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#ef4444",
                  marginBottom: "12px",
                }}
              >
                La somme doit être égale à 100% (actuellement{" "}
                {kpiWeight + testWeight}%)
              </p>
            )}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowWeightModal(false)}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Annuler
              </button>
              <button
                onClick={confirmIntegrate}
                disabled={kpiWeight + testWeight !== 100}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    kpiWeight + testWeight !== 100 ? "#93c5fd" : "#2563eb",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor:
                    kpiWeight + testWeight !== 100 ? "not-allowed" : "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Confirmer l'intégration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
