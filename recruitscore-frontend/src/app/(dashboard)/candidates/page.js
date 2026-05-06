"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";

const statusColors = {
  new: { bg: "#eff6ff", color: "#2563eb" },
  evaluating: { bg: "#fffbeb", color: "#d97706" },
  shortlisted: { bg: "#f5f3ff", color: "#7c3aed" },
  rejected: { bg: "#fef2f2", color: "#dc2626" },
  accepted: { bg: "#ecfdf5", color: "#059669" },
};

const statusLabels = {
  new: "Nouveau",
  evaluating: "En évaluation",
  shortlisted: "Présélectionné",
  rejected: "Rejeté",
  accepted: "Accepté",
};

export default function CandidatesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [testFilter, setTestFilter] = useState("");
  const [tests, setTests] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [shortlistLimit, setShortlistLimit] = useState(10);
  const [shortlistMinScore, setShortlistMinScore] = useState(0);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [shortlistResult, setShortlistResult] = useState(null);
  const limit = 10;

  const canWrite =
    user?.permissions?.candidates?.includes("write") &&
    user?.role !== "evaluator";
  const canDelete =
    user?.permissions?.candidates?.includes("delete") &&
    user?.role !== "evaluator";

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(testFilter && { testId: testFilter }),
      });

      const res = await api.get(`/candidates?${params}`);
      setCandidates(res.data.candidates);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const res = await api.get("/tests?limit=100");
      setTests(res.data.tests || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchCandidates();
  }, [token, page, statusFilter, testFilter]);

  useEffect(() => {
    if (!token) return;
    fetchTests();
  }, [token]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setTestFilter("");
    fetchCandidates();
  };

  const handleGenerateShortlist = async () => {
    setShortlistLoading(true);
    setShortlistResult(null);
    try {
      const res = await api.get(
        `/candidates/shortlist?limit=${shortlistLimit}&minScore=${shortlistMinScore}`,
      );
      setShortlistResult(res.data);
      fetchCandidates();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la génération");
    } finally {
      setShortlistLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce candidat ?")) return;
    try {
      await api.delete(`/candidates/${id}`);
      fetchCandidates();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const pages = Math.ceil(total / limit);

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
            Candidats
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            {total} candidat{total > 1 ? "s" : ""} au total
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              setShowShortlistModal(true);
              setShortlistResult(null);
              setShortlistLimit(10);
              setShortlistMinScore(0);
            }}
            style={{
              padding: "9px 18px",
              background: "#7c3aed",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              marginRight: "8px",
            }}
          >
            Shortlist
          </button>
          {canWrite && (
            <button
              onClick={() => router.push("/candidates/new")}
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
              + Nouveau Candidat
            </button>
          )}
        </div>
      </div>
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
          alignItems: "center",
        }}
      >
        <form
          onSubmit={handleSearch}
          style={{ display: "flex", gap: "12px", flex: 1 }}
        >
          <input
            type="text"
            placeholder="Rechercher un candidat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
              fontFamily: "Poppins, sans-serif",
              outline: "none",
              color: "#1e293b",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 16px",
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
            Rechercher
          </button>
        </form>

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
          <option value="new">Nouveau</option>
          <option value="evaluating">En évaluation</option>
          <option value="shortlisted">Présélectionné</option>
          <option value="rejected">Rejeté</option>
          <option value="accepted">Accepté</option>
        </select>

        <select
          value={testFilter}
          onChange={(e) => {
            setTestFilter(e.target.value);
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
          <option value="">Tous les tests</option>
          {tests.map((t) => (
            <option key={t._id} value={t._id}>
              {t.title}
            </option>
          ))}
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
                "Email",
                "Spécialité",
                "Score",
                "Statut",
                "Tags",
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
            ) : candidates.length === 0 ? (
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
                  Aucun candidat trouvé
                </td>
              </tr>
            ) : (
              candidates.map((c, i) => (
                <tr
                  key={c._id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "white" : "#fafafa",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Nom */}
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #1e3a5f, #2563eb)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "white",
                          flexShrink: 0,
                        }}
                      >
                        {c.personalInfo?.firstName?.charAt(0)}
                        {c.personalInfo?.lastName?.charAt(0)}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#1e293b",
                          }}
                        >
                          {c.personalInfo?.firstName} {c.personalInfo?.lastName}
                        </p>
                        <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {c.personalInfo?.phone || "—"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
                    {c.personalInfo?.email}
                  </td>

                  {/* Spécialité */}
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
                    {c.education?.specialty || "—"}
                  </td>

                  {/* Score */}
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "3px 10px",
                        borderRadius: "99px",
                        background:
                          c.scores?.global > 0 ? "#eff6ff" : "#f8fafc",
                        color: c.scores?.global > 0 ? "#2563eb" : "#94a3b8",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      {c.scores?.global > 0
                        ? `${c.scores.global} / 100`
                        : "Non scoré"}
                    </div>
                  </td>

                  {/* Statut */}
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "99px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: statusColors[c.status]?.bg || "#f8fafc",
                        color: statusColors[c.status]?.color || "#64748b",
                      }}
                    >
                      {statusLabels[c.status] || c.status}
                    </span>
                  </td>

                  {/* Tags */}
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}
                    >
                      {c.tags?.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: "10px",
                            fontWeight: "500",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => router.push(`/candidates/${c._id}`)}
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
                        Voir
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(c._id)}
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
              alignItems: "center",
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
      {showShortlistModal && (
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
              maxWidth: "480px",
            }}
          >
            {/* Header */}
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
                  Générer une Shortlist
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginTop: "4px",
                  }}
                >
                  Sélectionne les N meilleurs candidats par score global
                </p>
              </div>
              <button
                onClick={() => setShowShortlistModal(false)}
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

            {shortlistResult ? (
              // Résultat
              <div>
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #6ee7b7",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#059669",
                      marginBottom: "12px",
                    }}
                  >
                    {shortlistResult.count} candidat
                    {shortlistResult.count > 1 ? "s" : ""} présélectionné
                    {shortlistResult.count > 1 ? "s" : ""}
                  </p>
                  {shortlistResult.candidates?.map((c) => (
                    <div
                      key={c._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom: "1px solid #d1fae5",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#1e293b",
                          fontWeight: "500",
                        }}
                      >
                        {c.personalInfo?.firstName} {c.personalInfo?.lastName}
                      </p>
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: "99px",
                          background: "#eff6ff",
                          color: "#2563eb",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        {c.scores?.global} / 100
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowShortlistModal(false)}
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
                  Fermer
                </button>
              </div>
            ) : (
              // Formulaire
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#64748b",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Nombre de candidats à sélectionner
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={shortlistLimit}
                    onChange={(e) => setShortlistLimit(Number(e.target.value))}
                    style={{
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
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#64748b",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Score minimum (0 = tous)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={shortlistMinScore}
                    onChange={(e) =>
                      setShortlistMinScore(Number(e.target.value))
                    }
                    style={{
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
                    }}
                  />
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "12px",
                    color: "#64748b",
                    lineHeight: "1.6",
                  }}
                >
                  <strong style={{ color: "#1e293b" }}>
                    Ce qui sera fait :
                  </strong>
                  <br />• Les {shortlistLimit} candidats avec le meilleur score
                  global seront sélectionnés
                  <br />• Leur statut passera automatiquement à{" "}
                  <strong>Présélectionné</strong>
                  {shortlistMinScore > 0 && (
                    <>
                      <br />• Seuls les candidats avec un score ≥{" "}
                      <strong>{shortlistMinScore}</strong> seront considérés
                    </>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                    borderTop: "1px solid #f1f5f9",
                    paddingTop: "16px",
                  }}
                >
                  <button
                    onClick={() => setShowShortlistModal(false)}
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
                    onClick={handleGenerateShortlist}
                    disabled={shortlistLoading}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: shortlistLoading ? "#c4b5fd" : "#7c3aed",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: shortlistLoading ? "not-allowed" : "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {shortlistLoading ? "Génération..." : " Générer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
