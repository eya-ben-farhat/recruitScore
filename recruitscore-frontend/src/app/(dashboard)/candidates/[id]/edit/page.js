"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/axios";

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

function Section({ title, children }) {
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
          fontSize: "13px",
          fontWeight: "700",
          color: "#1e293b",
          marginBottom: "20px",
          paddingBottom: "10px",
          borderBottom: "1px solid #f1f5f9",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </h3>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        {children}
      </div>
    </div>
  );
}

function DynamicSection({ title, items, onAdd, onRemove, renderItem }) {
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          paddingBottom: "10px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <h3
          style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#1e293b",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </h3>
        <button
          type="button"
          onClick={onAdd}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            border: "none",
            background: "#eff6ff",
            color: "#2563eb",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          + Ajouter
        </button>
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #f1f5f9",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "12px",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <p
              style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}
            >
              {title} {i + 1}
            </p>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                style={{
                  padding: "3px 10px",
                  borderRadius: "6px",
                  border: "1px solid #fca5a5",
                  background: "#fef2f2",
                  color: "#ef4444",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Supprimer
              </button>
            )}
          </div>
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  );
}

export default function EditCandidatePage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const formRef = useRef(null);

  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    linkedin: "",
    github: "",
  });
  const [formations, setFormations] = useState([
    { school: "", degree: "", specialty: "", graduationYear: "" },
  ]);
  const [experiences, setExperiences] = useState([
    { company: "", position: "", duration: "", description: "" },
  ]);
  const [projects, setProjects] = useState([
    { title: "", description: "", technologies: "" },
  ]);
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState("");
  const [availability, setAvailability] = useState({
    startDate: "",
    duration: "",
  });

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const res = await api.get("/candidates/" + id);
        const c = res.data.candidate;

        setPersonalInfo({
          firstName: c.personalInfo?.firstName || "",
          lastName: c.personalInfo?.lastName || "",
          email: c.personalInfo?.email || "",
          phone: c.personalInfo?.phone || "",
          address: c.personalInfo?.address || "",
          linkedin: c.personalInfo?.linkedin || "",
          github: c.personalInfo?.github || "",
        });

        setFormations([
          {
            school: c.education?.institution || "",
            degree: c.education?.degree || "",
            specialty: c.education?.specialty || "",
            graduationYear: c.education?.graduationYear || "",
          },
        ]);

        setExperiences(
          c.experiences?.length > 0
            ? c.experiences.map((ex) => ({
                company: ex.company || "",
                position: ex.title || "",
                duration: ex.duration || "",
                description: ex.description || "",
              }))
            : [{ company: "", position: "", duration: "", description: "" }],
        );

        setProjects(
          c.projects?.length > 0
            ? c.projects.map((p) => ({
                title: p.name || "",
                description: p.description || "",
                technologies: p.technologies?.join(", ") || "",
              }))
            : [{ title: "", description: "", technologies: "" }],
        );

        setSkills(
          c.technicalSkills
            ?.map((s) => (typeof s === "object" ? s.name : s))
            .join(", ") || "",
        );
        setLanguages(
          c.languages
            ?.map((l) => (typeof l === "object" ? l.name : l))
            .join(", ") || "",
        );
        setTags(c.tags || []);
        setNotes(c.notes || "");
        setAvailability({
          startDate: c.availability?.startDate
            ? c.availability.startDate.split("T")[0]
            : "",
          duration: c.availability?.duration || "",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    fetchCandidate();
  }, [id]);

  const updateItem = (setter, list, i, field, value) => {
    const updated = [...list];
    updated[i][field] = value;
    setter(updated);
  };

  const handleTagToggle = (tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.put("/candidates/" + id, {
        personalInfo: {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          email: personalInfo.email,
          phone: personalInfo.phone,
          address: personalInfo.address,
          linkedin: personalInfo.linkedin,
          github: personalInfo.github,
        },
        education: {
          institution: formations[0]?.school || "",
          degree: formations[0]?.degree || "",
          specialty: formations[0]?.specialty || "",
          graduationYear: formations[0]?.graduationYear
            ? Number(formations[0].graduationYear)
            : undefined,
        },
        technicalSkills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => ({ name: s })),
        languages: languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => ({ name: l })),
        tags,
        notes,
        availability: {
          startDate: availability.startDate || undefined,
          duration: availability.duration
            ? Number(availability.duration)
            : undefined,
        },
        experiences: experiences
          .filter((ex) => ex.company || ex.position)
          .map((ex) => ({
            title: ex.position,
            company: ex.company,
            duration: ex.duration ? Number(ex.duration) : undefined,
            description: ex.description,
          })),
        projects: projects
          .filter((p) => p.title)
          .map((p) => ({
            name: p.title,
            description: p.description,
            technologies:
              p.technologies
                ?.split(",")
                .map((t) => t.trim())
                .filter(Boolean) || [],
          })),
      });

      if (cvFile) {
        try {
          const cvFormData = new FormData();
          cvFormData.append("cv", cvFile);
          await api.post("/candidates/" + id + "/cv", cvFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (cvErr) {
          console.log("CV upload error:", cvErr.response?.data);
        }
      }

      setSuccess("Candidat mis à jour avec succès !");
      setTimeout(() => router.push("/candidates/" + id), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  if (fetching)
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

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", maxWidth: "800px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
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
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
            Modifier : {personalInfo.firstName} {personalInfo.lastName}
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            Modifiez les informations du candidat
          </p>
        </div>
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
          }}
        >
          {success}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
        {/* Informations Personnelles */}
        <Section title="Informations Personnelles">
          {[
            { label: "Prénom", field: "firstName", required: true },
            { label: "Nom", field: "lastName", required: true },
            { label: "Email", field: "email", required: true },
            { label: "Téléphone", field: "phone" },
            { label: "Adresse", field: "address" },
          ].map(({ label, field, required }) => (
            <div key={field}>
              <label style={labelStyle}>
                {label}{" "}
                {required && <span style={{ color: "#ef4444" }}>*</span>}
              </label>
              <input
                type={field === "email" ? "email" : "text"}
                value={personalInfo[field]}
                onChange={(e) =>
                  setPersonalInfo({ ...personalInfo, [field]: e.target.value })
                }
                style={inputStyle}
                required={required}
              />
            </div>
          ))}
          <div>
            <label style={labelStyle}>LinkedIn</label>
            <input
              type="text"
              value={personalInfo.linkedin}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, linkedin: e.target.value })
              }
              placeholder="https://linkedin.com/in/..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>GitHub</label>
            <input
              type="text"
              value={personalInfo.github}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, github: e.target.value })
              }
              placeholder="https://github.com/..."
              style={inputStyle}
            />
          </div>
        </Section>

        {/* Formations */}
        <DynamicSection
          title="Formation"
          items={formations}
          onAdd={() =>
            setFormations([
              ...formations,
              { school: "", degree: "", specialty: "", graduationYear: "" },
            ])
          }
          onRemove={(i) =>
            setFormations(formations.filter((_, idx) => idx !== i))
          }
          renderItem={(f, i) => (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>École / Université</label>
                <input
                  type="text"
                  value={f.school}
                  onChange={(e) =>
                    updateItem(
                      setFormations,
                      formations,
                      i,
                      "school",
                      e.target.value,
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Diplôme</label>
                <input
                  type="text"
                  value={f.degree}
                  onChange={(e) =>
                    updateItem(
                      setFormations,
                      formations,
                      i,
                      "degree",
                      e.target.value,
                    )
                  }
                  placeholder="Licence, Master..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Spécialité</label>
                <input
                  type="text"
                  value={f.specialty}
                  onChange={(e) =>
                    updateItem(
                      setFormations,
                      formations,
                      i,
                      "specialty",
                      e.target.value,
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Année d'obtention</label>
                <input
                  type="number"
                  value={f.graduationYear}
                  onChange={(e) =>
                    updateItem(
                      setFormations,
                      formations,
                      i,
                      "graduationYear",
                      e.target.value,
                    )
                  }
                  placeholder="2025"
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        />

        {/* Disponibilité */}
        <Section title="Disponibilité">
          <div>
            <label style={labelStyle}>Date de début</label>
            <input
              type="date"
              value={availability.startDate}
              onChange={(e) =>
                setAvailability({ ...availability, startDate: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Durée de stage souhaitée</label>
            <select
              value={availability.duration}
              onChange={(e) =>
                setAvailability({ ...availability, duration: e.target.value })
              }
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">-- Sélectionner --</option>
              <option value="1">1 mois</option>
              <option value="2">2 mois</option>
              <option value="3">3 mois</option>
              <option value="4">4 mois</option>
              <option value="6">6 mois</option>
            </select>
          </div>
        </Section>

        {/* Compétences et Langues */}
        <Section title="Compétences et Langues">
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Compétences (séparées par virgule)</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="React, Node.js..."
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Langues (séparées par virgule)</label>
            <input
              type="text"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="Français, Anglais..."
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Domaine / Tags</label>
            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
                marginTop: "4px",
              }}
            >
              {[
                "dev",
                "data",
                "cybersec",
                "design",
                "reseau",
                "mobile",
                "devops",
                "embedded",
              ].map((tag) => (
                <label
                  key={tag}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#1e293b",
                    fontWeight: "500",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={tags.includes(tag)}
                    onChange={() => handleTagToggle(tag)}
                    style={{ cursor: "pointer", width: "15px", height: "15px" }}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
        </Section>

        {/* Expériences */}
        <DynamicSection
          title="Expérience Professionnelle"
          items={experiences}
          onAdd={() =>
            setExperiences([
              ...experiences,
              { company: "", position: "", duration: "", description: "" },
            ])
          }
          onRemove={(i) =>
            setExperiences(experiences.filter((_, idx) => idx !== i))
          }
          renderItem={(ex, i) => (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>Entreprise</label>
                <input
                  type="text"
                  value={ex.company}
                  onChange={(e) =>
                    updateItem(
                      setExperiences,
                      experiences,
                      i,
                      "company",
                      e.target.value,
                    )
                  }
                  placeholder="Entreprise"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Poste</label>
                <input
                  type="text"
                  value={ex.position}
                  onChange={(e) =>
                    updateItem(
                      setExperiences,
                      experiences,
                      i,
                      "position",
                      e.target.value,
                    )
                  }
                  placeholder="Développeur..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Durée (en mois)</label>
                <input
                  type="number"
                  value={ex.duration}
                  onChange={(e) =>
                    updateItem(
                      setExperiences,
                      experiences,
                      i,
                      "duration",
                      e.target.value,
                    )
                  }
                  placeholder="6"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  value={ex.description}
                  onChange={(e) =>
                    updateItem(
                      setExperiences,
                      experiences,
                      i,
                      "description",
                      e.target.value,
                    )
                  }
                  placeholder="Description..."
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        />

        {/* Projets */}
        <DynamicSection
          title="Projet"
          items={projects}
          onAdd={() =>
            setProjects([
              ...projects,
              { title: "", description: "", technologies: "" },
            ])
          }
          onRemove={(i) => setProjects(projects.filter((_, idx) => idx !== i))}
          renderItem={(p, i) => (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>Titre</label>
                <input
                  type="text"
                  value={p.title}
                  onChange={(e) =>
                    updateItem(
                      setProjects,
                      projects,
                      i,
                      "title",
                      e.target.value,
                    )
                  }
                  placeholder="Nom du projet"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Technologies</label>
                <input
                  type="text"
                  value={p.technologies}
                  onChange={(e) =>
                    updateItem(
                      setProjects,
                      projects,
                      i,
                      "technologies",
                      e.target.value,
                    )
                  }
                  placeholder="React, Node.js..."
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={p.description}
                  onChange={(e) =>
                    updateItem(
                      setProjects,
                      projects,
                      i,
                      "description",
                      e.target.value,
                    )
                  }
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>
          )}
        />

        {/* CV */}
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
              fontSize: "13px",
              fontWeight: "700",
              color: "#1e293b",
              marginBottom: "20px",
              paddingBottom: "10px",
              borderBottom: "1px solid #f1f5f9",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            CV et Notes
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Remplacer le CV (PDF)</label>
              <div
                onClick={() => document.getElementById("cv-edit-input").click()}
                style={{
                  border: "2px dashed #e2e8f0",
                  borderRadius: "10px",
                  padding: "20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: cvFile ? "#eff6ff" : "#fafafa",
                }}
              >
                {cvFile ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#2563eb",
                        }}
                      >
                        {cvFile.name}
                      </p>
                      <p style={{ fontSize: "11px", color: "#64748b" }}>
                        {(cvFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCvFile(null);
                      }}
                      style={{
                        marginLeft: "12px",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        border: "1px solid #fca5a5",
                        background: "#fef2f2",
                        color: "#ef4444",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Cliquez pour remplacer le CV existant
                  </p>
                )}
              </div>
              <input
                id="cv-edit-input"
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => setCvFile(e.target.files[0] || null)}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Notes internes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observations, remarques..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: "10px 24px",
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
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "white",
              fontSize: "13px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {loading ? "Mise à jour..." : "Sauvegarder"}
          </button>
        </div>
      </form>
    </div>
  );
}
