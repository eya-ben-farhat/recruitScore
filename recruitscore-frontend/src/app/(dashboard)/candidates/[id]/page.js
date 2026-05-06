"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  evaluating: "En evaluation",
  shortlisted: "Preselectionne",
  rejected: "Rejete",
  accepted: "Accepte",
};

const categoryLabels = {
  formation: "Formation",
  technique: "Technique",
  softSkills: "Soft Skills",
  experience: "Expérience",
};

const categoryColors = {
  formation: "#2563eb",
  technique: "#7c3aed",
  softSkills: "#059669",
  experience: "#d97706",
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "10px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          color: "#94a3b8",
          fontWeight: "600",
          minWidth: "160px",
          textTransform: "uppercase",
          letterSpacing: "0.4px",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "500" }}>
        {value}
      </span>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        marginBottom: "16px",
      }}
    >
      <h3
        style={{
          fontSize: "12px",
          fontWeight: "700",
          color: "#64748b",
          marginBottom: "16px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Tag({ label, bg, color }) {
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "99px",
        background: bg,
        color,
        fontSize: "12px",
        fontWeight: "500",
      }}
    >
      {label}
    </span>
  );
}

function strVal(v) {
  if (!v) return "";
  if (typeof v === "object") return v.name || v.label || JSON.stringify(v);
  return String(v);
}

export default function CandidateDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [status, setStatus] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedTpl, setSelectedTpl] = useState("");
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const canWrite = user?.permissions?.candidates?.includes("write");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const c = await api.get("/candidates/" + id);
        setCandidate(c.data.candidate);
        setStatus(c.data.candidate.status);
      } catch (err) {
        console.error("Candidate error:", err);
      }
      try {
        const t = await api.get("/templates");
        setTemplates(t.data.templates || []);
        if (t.data.templates?.length > 0)
          setSelectedTpl(t.data.templates[0]._id);
      } catch (err) {
        console.log("Templates not found");
      }
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch("/candidates/" + id + "/status", { status: newStatus });
      setStatus(newStatus);
      setCandidate((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert("Erreur lors du changement de statut");
    }
  };

  const handleScore = async () => {
    if (!selectedTpl) return alert("Selectionnez un template de scoring");
    setScoring(true);
    try {
      const res = await api.post("/scoring/" + id + "/calculate", {
        templateId: selectedTpl,
      });
      setCandidate((prev) => ({ ...prev, scores: res.data.scores }));
      alert("Score calcule avec succes !");
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors du scoring");
    } finally {
      setScoring(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.post("/candidates/" + id + "/comments", {
        content: comment,
      });
      setCandidate((prev) => ({ ...prev, comments: res.data.comments }));
      setComment("");
    } catch (err) {
      alert("Erreur lors de l'ajout du commentaire");
    } finally {
      setSendingComment(false);
    }
  };

  const openCV = () => {
    if (candidate?.cv?.previewUrl) {
      window.open("http://localhost:3000" + candidate.cv.previewUrl, "_blank");
    } else if (candidate?.cv?.filePath) {
      window.open("http://localhost:3000/" + candidate.cv.filePath, "_blank");
    }
  };

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

  if (!candidate)
    return (
      <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>
        Candidat introuvable
      </div>
    );

  const c = candidate;

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", maxWidth: "960px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "white",
              color: "#64748b",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Retour
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: "700",
                color: "white",
              }}
            >
              {c.personalInfo?.firstName?.charAt(0)}
              {c.personalInfo?.lastName?.charAt(0)}
            </div>
            <div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                {c.personalInfo?.firstName} {c.personalInfo?.lastName}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "4px",
                }}
              >
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: "99px",
                    fontSize: "11px",
                    fontWeight: "600",
                    background: statusColors[status]?.bg,
                    color: statusColors[status]?.color,
                  }}
                >
                  {statusLabels[status]}
                </span>
                {c.tags?.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "2px 8px",
                      borderRadius: "99px",
                      background: "#f1f5f9",
                      color: "#475569",
                      fontSize: "11px",
                    }}
                  >
                    {strVal(tag)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => router.push("/candidates/" + id + "/edit")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              color: "#64748b",
              fontSize: "13px",
              fontWeight: "600",
              background: "white",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Modifier
          </button>
          {c.cv && (
            <button
              onClick={openCV}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #2563eb",
                color: "#2563eb",
                fontSize: "13px",
                fontWeight: "600",
                background: "white",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Voir CV
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "16px",
        }}
      >
        {/* Colonne gauche */}
        <div>
          <Card title="Informations Personnelles">
            <InfoRow label="Email" value={c.personalInfo?.email} />
            <InfoRow label="Telephone" value={c.personalInfo?.phone} />
            <InfoRow label="Adresse" value={c.personalInfo?.address} />
            <InfoRow label="LinkedIn" value={c.personalInfo?.linkedin} />
            <InfoRow label="GitHub" value={c.personalInfo?.github} />
          </Card>

          <Card title="Formation">
            <InfoRow label="Institution" value={c.education?.institution} />
            <InfoRow label="Diplome" value={c.education?.degree} />
            <InfoRow label="Specialite" value={c.education?.specialty} />
            <InfoRow
              label="Annee obtention"
              value={c.education?.graduationYear}
            />
            <InfoRow label="Niveau" value={c.education?.level} />
          </Card>

          {/* Disponibilité */}
          {c.availability &&
            (c.availability.startDate || c.availability.duration) && (
              <Card title="Disponibilite">
                <InfoRow
                  label="Date de debut"
                  value={
                    c.availability?.startDate
                      ? new Date(c.availability.startDate).toLocaleDateString(
                          "fr-FR",
                        )
                      : null
                  }
                />
                <InfoRow
                  label="Duree souhaitee"
                  value={
                    c.availability?.duration
                      ? c.availability.duration + " mois"
                      : null
                  }
                />
              </Card>
            )}

          {/* Compétences techniques */}
          {c.technicalSkills?.length > 0 && (
            <Card title="Competences Techniques">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {c.technicalSkills.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 12px",
                      borderRadius: "99px",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#2563eb",
                      }}
                    >
                      {strVal(s)}
                    </span>
                    {s.level && (
                      <span style={{ fontSize: "10px", color: "#64748b" }}>
                        — {s.level}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Langues */}
          {c.languages?.length > 0 && (
            <Card title="Langues">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {c.languages.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 12px",
                      borderRadius: "99px",
                      background: "#f5f3ff",
                      border: "1px solid #ddd6fe",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#7c3aed",
                      }}
                    >
                      {strVal(l)}
                    </span>
                    {l.level && (
                      <span style={{ fontSize: "10px", color: "#64748b" }}>
                        — {l.level}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Expériences */}
          {c.experiences?.length > 0 && (
            <Card title="Experiences Professionnelles">
              {c.experiences.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    marginBottom: "10px",
                    borderLeft: "3px solid #2563eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {ex.title || ex.position}
                    </p>
                    {ex.duration && (
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {ex.duration} mois
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#2563eb",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                  >
                    {ex.company}
                  </p>
                  {ex.description && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        lineHeight: "1.6",
                      }}
                    >
                      {ex.description}
                    </p>
                  )}
                </div>
              ))}
            </Card>
          )}

          {/* Projets */}
          {c.projects?.length > 0 && (
            <Card title="Projets Academiques et Personnels">
              {c.projects.map((p, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    marginBottom: "10px",
                    borderLeft: "3px solid #7c3aed",
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
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {p.name || p.title}
                    </p>
                    {p.githubUrl && (
                      <button
                        onClick={() => window.open(p.githubUrl, "_blank")}
                        style={{
                          fontSize: "11px",
                          color: "#2563eb",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        GitHub
                      </button>
                    )}
                  </div>
                  {p.description && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        lineHeight: "1.6",
                        marginBottom: "8px",
                      }}
                    >
                      {p.description}
                    </p>
                  )}
                  {p.technologies?.length > 0 && (
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}
                    >
                      {p.technologies.map((t, j) => (
                        <span
                          key={j}
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: "10px",
                            fontWeight: "500",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {/* Notes */}
          {c.notes && (
            <Card title="Notes internes">
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  lineHeight: "1.7",
                }}
              >
                {c.notes}
              </p>
            </Card>
          )}

          {/* Commentaires */}
          <Card title="Commentaires">
            {c.comments?.length === 0 && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  marginBottom: "16px",
                }}
              >
                Aucun commentaire
              </p>
            )}
            {c.comments?.map((cm, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  marginBottom: "8px",
                  borderLeft: "3px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#1e293b",
                    }}
                  >
                    {cm.userId?.firstName || "Utilisateur"}{" "}
                    {cm.userId?.lastName || ""}
                  </span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {new Date(cm.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "#64748b" }}>
                  {cm.content}
                </p>
              </div>
            ))}
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                rows={2}
                style={{
                  flex: 1,
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #e2e8f0",
                  fontSize: "13px",
                  fontFamily: "Poppins, sans-serif",
                  outline: "none",
                  resize: "vertical",
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={sendingComment || !comment.trim()}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    sendingComment || !comment.trim() ? "#93c5fd" : "#2563eb",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor:
                    sendingComment || !comment.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: "Poppins, sans-serif",
                  alignSelf: "flex-end",
                }}
              >
                Envoyer
              </button>
            </div>
          </Card>
        </div>

        {/* Colonne droite */}
        <div>
          <Card title="Score Global">
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                  background:
                    "conic-gradient(#2563eb " +
                    (c.scores?.global ?? 0) +
                    "%, #e2e8f0 0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "76px",
                    height: "76px",
                    borderRadius: "50%",
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#2563eb",
                  }}
                >
                  {c.scores?.global ?? 0}
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                Score sur 100
              </p>
              {c.scores?.calculatedAt && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginTop: "4px",
                  }}
                >
                  Calculé le{" "}
                  {new Date(c.scores.calculatedAt).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>

            {/* Score par catégorie */}
            {c.scores?.byCategory && (
              <div style={{ marginBottom: "16px" }}>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748b",
                    marginBottom: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Par Catégorie
                </p>
                {Object.entries(c.scores.byCategory).map(([key, val]) => (
                  <div key={key} style={{ marginBottom: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "3px",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {categoryLabels[key] || key}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: categoryColors[key] || "#2563eb",
                        }}
                      >
                        {val}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "6px",
                        background: "#f1f5f9",
                        borderRadius: "99px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: val + "%",
                          background: categoryColors[key] || "#2563eb",
                          borderRadius: "99px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Détail par KPI */}
            {c.scores?.byKPI?.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "16px",
                  marginBottom: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748b",
                    marginBottom: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Détail par KPI
                </p>
                {c.scores.byKPI.map((kpi, i) => (
                  <div key={i} style={{ marginBottom: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "3px",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {kpi.kpiName}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#2563eb",
                        }}
                      >
                        {kpi.pointsObtained}/{kpi.maxPoints}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "4px",
                        background: "#f1f5f9",
                        borderRadius: "99px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width:
                            (kpi.pointsObtained / kpi.maxPoints) * 100 + "%",
                          background: "#2563eb",
                          borderRadius: "99px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Calculer score */}
            {canWrite && (
              <div
                style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}
              >
                <select
                  value={selectedTpl}
                  onChange={(e) => setSelectedTpl(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    fontFamily: "Poppins, sans-serif",
                    marginBottom: "10px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                >
                  <option value="">-- Template de scoring --</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleScore}
                  disabled={scoring || !selectedTpl}
                  style={{
                    width: "100%",
                    padding: "9px",
                    borderRadius: "8px",
                    border: "none",
                    background: scoring || !selectedTpl ? "#93c5fd" : "#2563eb",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: scoring || !selectedTpl ? "not-allowed" : "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  {scoring ? "Calcul en cours..." : "Calculer le Score"}
                </button>
              </div>
            )}
          </Card>

          {/* Changer statut */}
          {canWrite && (
            <Card title="Changer le Statut">
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(key)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background:
                        status === key ? statusColors[key]?.bg : "#f8fafc",
                      color:
                        status === key ? statusColors[key]?.color : "#64748b",
                      fontSize: "12px",
                      fontWeight: status === key ? "700" : "500",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "Poppins, sans-serif",
                      borderLeft:
                        status === key
                          ? "3px solid " + statusColors[key]?.color
                          : "3px solid transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
