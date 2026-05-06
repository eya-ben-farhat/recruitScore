"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";

const stepLabels = ["Upload CVs", "Description du poste", "Résultats"];

export default function NLPSearchPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [jobDescription, setJobDescription] = useState("");
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [creatingProfile, setCreatingProfile] = useState(null);
  const [createdProfiles, setCreatedProfiles] = useState([]);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const valid = selected.filter(
      (f) =>
        f.type === "application/pdf" ||
        f.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    if (valid.length !== selected.length) {
      setError("Seuls les fichiers PDF et DOCX sont acceptés");
    } else {
      setError("");
    }
    setFiles(valid);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return setError("Uploadez au moins un CV");
    if (!jobDescription.trim()) return setError("Décrivez le poste recherché");
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("jobDescription", jobDescription);
      formData.append("topN", topN.toString());

      const res = await api.post("/nlp/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResults(res.data.results);
      setTotal(res.data.total);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (result) => {
    setCreatingProfile(result.fileName);
    try {
      const nameParts = (result.candidateName || "Inconnu Inconnu").split(" ");
      const firstName = nameParts[0] || "Inconnu";
      const lastName = nameParts.slice(1).join(" ") || "Inconnu";

      await api.post("/nlp/create-profile", {
        candidateData: {
          firstName,
          lastName,
          email: result.email,
          phone: result.phone,
          github: result.github,
          linkedin: result.linkedin,
          skills: result.skills,
          experienceYears: result.experienceYears,
          educationDegree: result.educationDegree,
          educationLevel: result.educationLevel,
          educationSpecialty: result.educationSpecialty,
          educationInstitution: result.educationInstitution,
          educationYear: result.educationYear,
          experiences: result.experiences,
          projects: result.projects,
        },
        filePath: result.filePath,
      });

      setCreatedProfiles((prev) => [...prev, result.fileName]);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la création");
    } finally {
      setCreatingProfile(null);
    }
  };

  const scoreColor = (score) => {
    if (score >= 70) return "#059669";
    if (score >= 50) return "#d97706";
    return "#ef4444";
  };

  const scoreBg = (score) => {
    if (score >= 70) return "#ecfdf5";
    if (score >= 50) return "#fffbeb";
    return "#fef2f2";
  };

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
          Recherche IA de CVs
        </h2>
        <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
          Sélection automatique des candidats les plus pertinents
        </p>
        <br></br>
        <p style={{ fontSize: "12px", color: "#b45309", lineHeight: "1.5" }}>
          L'analyse IA permet de traiter jusqu'à <strong>25 CV par jour</strong>
          . Au-delà, le service reprend automatiquement le lendemain.
        </p>
      </div>

      {/* Stepper */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "32px",
          background: "white",
          borderRadius: "12px",
          padding: "20px 24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {stepLabels.map((label, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", flex: 1 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background:
                    step > i + 1
                      ? "#059669"
                      : step === i + 1
                        ? "#2563eb"
                        : "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: step >= i + 1 ? "white" : "#94a3b8",
                  flexShrink: 0,
                }}
              >
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: step === i + 1 ? "700" : "500",
                  color: step === i + 1 ? "#1e293b" : "#94a3b8",
                }}
              >
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  background: step > i + 1 ? "#059669" : "#f1f5f9",
                  margin: "0 16px",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#dc2626",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* Étape 1 — Upload */}
      {step === 1 && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#1e293b",
              marginBottom: "8px",
            }}
          >
            Uploadez les CVs des candidats
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "#64748b",
              marginBottom: "24px",
            }}
          >
            Formats acceptés : PDF et DOCX. Vous pouvez sélectionner plusieurs
            fichiers.
          </p>

          {/* Zone upload */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "2px dashed #bfdbfe",
              borderRadius: "12px",
              padding: "48px 24px",
              cursor: "pointer",
              background: "#f8fafc",
              marginBottom: "20px",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                fontSize: "40px",
                marginBottom: "12px",
              }}
            >
              📄
            </div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#2563eb",
                marginBottom: "4px",
              }}
            >
              Cliquer pour sélectionner les CVs
            </p>
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>
              PDF, DOCX — Plusieurs fichiers possibles
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.docx"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>

          {/* Liste des fichiers */}
          {files.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#64748b",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                }}
              >
                {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné
                {files.length > 1 ? "s" : ""}
              </p>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    marginBottom: "6px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>
                    {f.name.endsWith(".pdf") ? "📕" : "📘"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#1e293b",
                      }}
                    >
                      {f.name}
                    </p>
                    <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {(f.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              if (files.length === 0)
                return setError("Uploadez au moins un CV");
              setError("");
              setStep(2);
            }}
            disabled={files.length === 0}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: files.length === 0 ? "#93c5fd" : "#2563eb",
              color: "white",
              fontSize: "13px",
              fontWeight: "600",
              cursor: files.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Étape 2 — Description poste */}
      {step === 2 && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#1e293b",
              marginBottom: "8px",
            }}
          >
            Décrivez le poste recherché
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "#64748b",
              marginBottom: "24px",
            }}
          >
            Soyez précis sur les compétences, l'expérience et les critères
            importants.
          </p>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: "#64748b",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              Description du poste *
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Ex: Développeur Backend Python avec 2 ans d'expérience minimum, maîtrise de Django et FastAPI, expérience avec MongoDB, GitHub obligatoire..."
              rows={6}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1.5px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                outline: "none",
                color: "#1e293b",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: "#64748b",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              Nombre de candidats à sélectionner
            </label>
            <input
              type="number"
              min={1}
              max={files.length}
              value={topN}
              onChange={(e) => setTopN(parseInt(e.target.value) || 1)}
              style={{
                width: "120px",
                padding: "9px 14px",
                borderRadius: "8px",
                border: "1.5px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                outline: "none",
                color: "#1e293b",
              }}
            />
            <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
              Sur {files.length} CV{files.length > 1 ? "s" : ""} uploadé
              {files.length > 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: "10px 20px",
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
              ← Retour
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading || !jobDescription.trim()}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background:
                  loading || !jobDescription.trim() ? "#93c5fd" : "#2563eb",
                color: "white",
                fontSize: "13px",
                fontWeight: "600",
                cursor:
                  loading || !jobDescription.trim() ? "not-allowed" : "pointer",
                fontFamily: "Poppins, sans-serif",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid white",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Analyse en cours...
                </>
              ) : (
                "Lancer l'analyse IA →"
              )}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Étape 3 — Résultats */}
      {step === 3 && (
        <div>
          {/* Résumé */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                {results.length} candidat{results.length > 1 ? "s" : ""}{" "}
                sélectionné{results.length > 1 ? "s" : ""}
              </p>
              <p
                style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}
              >
                Sur {total} CV{total > 1 ? "s" : ""} analysé
                {total > 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => {
                setStep(1);
                setFiles([]);
                setResults([]);
                setCreatedProfiles([]);
                setJobDescription("");
              }}
              style={{
                padding: "8px 16px",
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
              Nouvelle recherche
            </button>
          </div>

          {/* Liste résultats */}
          {results.map((result, i) => (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                marginBottom: "16px",
                borderLeft: `4px solid ${scoreColor(result.score)}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "14px" }}
                >
                  {/* Rang */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
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
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {result.candidateName || "Nom inconnu"}
                    </p>
                    <p style={{ fontSize: "12px", color: "#64748b" }}>
                      {result.fileName}
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div
                  style={{
                    padding: "6px 16px",
                    borderRadius: "99px",
                    background: scoreBg(result.score),
                    color: scoreColor(result.score),
                    fontSize: "18px",
                    fontWeight: "800",
                  }}
                >
                  {result.score}/100
                </div>
              </div>

              {/* Détails */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                {/* Points forts */}
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#059669",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                    }}
                  >
                    ✓ Points forts
                  </p>
                  {result.strengths?.map((s, j) => (
                    <div
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#059669",
                          flexShrink: 0,
                        }}
                      />
                      <p style={{ fontSize: "12px", color: "#1e293b" }}>{s}</p>
                    </div>
                  ))}
                </div>

                {/* Points faibles */}
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#ef4444",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                    }}
                  >
                    ✗ Points faibles
                  </p>
                  {result.weaknesses?.map((w, j) => (
                    <div
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#ef4444",
                          flexShrink: 0,
                        }}
                      />
                      <p style={{ fontSize: "12px", color: "#1e293b" }}>{w}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Infos extraites */}
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                }}
              >
                {result.experienceYears > 0 && (
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "99px",
                      background: "#fffbeb",
                      color: "#d97706",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {result.experienceYears} an
                    {result.experienceYears > 1 ? "s" : ""} d'expérience
                  </span>
                )}
                {result.education && (
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "99px",
                      background: "#f5f3ff",
                      color: "#7c3aed",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {result.education}
                  </span>
                )}
                {result.email && (
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "99px",
                      background: "#f1f5f9",
                      color: "#475569",
                      fontSize: "11px",
                    }}
                  >
                    {result.email}
                  </span>
                )}
              </div>

              {/* Compétences */}
              {result.skills?.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <p
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#64748b",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                    }}
                  >
                    Compétences détectées
                  </p>
                  <div
                    style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                  >
                    {result.skills.map((skill, j) => (
                      <span
                        key={j}
                        style={{
                          padding: "3px 10px",
                          borderRadius: "99px",
                          background: "#eff6ff",
                          color: "#2563eb",
                          fontSize: "11px",
                          fontWeight: "500",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bouton créer profil */}
              <div
                style={{
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "16px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                {createdProfiles.includes(result.fileName) ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "#ecfdf5",
                      color: "#059669",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    ✓ Profil créé
                    <button
                      onClick={() => router.push("/candidates")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "12px",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Voir les candidats
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCreateProfile(result)}
                    disabled={creatingProfile === result.fileName}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background:
                        creatingProfile === result.fileName
                          ? "#93c5fd"
                          : "#2563eb",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor:
                        creatingProfile === result.fileName
                          ? "not-allowed"
                          : "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {creatingProfile === result.fileName
                      ? "Création..."
                      : "Créer le profil candidat"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
