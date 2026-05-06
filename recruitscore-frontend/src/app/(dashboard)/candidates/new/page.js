"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

function Field({ label, name, type = "text", placeholder, full, required }) {
  return (
    <div style={{ gridColumn: full ? "span 2" : "span 1" }}>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder || label}
        required={required}
        style={inputStyle}
      />
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

export default function NewCandidatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const formRef = useRef(null);

  const [formations, setFormations] = useState([
    { school: "", degree: "", level: "", specialty: "", graduationYear: "" },
  ]);
  const [experiences, setExperiences] = useState([
    {
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      duration: "",
      description: "",
    },
  ]);
  const [projects, setProjects] = useState([
    { title: "", description: "", technologies: "", githubUrl: "" },
  ]);
  const [skills, setSkills] = useState([{ name: "", level: "" }]);
  const [languages, setLanguages] = useState([{ name: "", level: "" }]);

  const updateItem = (setter, list, i, field, value) => {
    const updated = [...list];
    updated[i][field] = value;
    setter(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = Object.fromEntries(new FormData(formRef.current));

    try {
      const selectedTags = Array.from(
        formRef.current.querySelectorAll('input[name="tags"]:checked'),
      ).map((el) => el.value);

      const res = await api.post("/candidates", {
        personalInfo: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          birthDate: data.birthDate || undefined,
          address: data.address,
          linkedin: data.linkedin,
          github: data.github,
        },
        education: {
          institution: formations[0]?.school || "",
          degree: formations[0]?.degree || "",
          level: formations[0]?.level || "",
          specialty: formations[0]?.specialty || "",
          graduationYear: formations[0]?.graduationYear
            ? Number(formations[0].graduationYear)
            : undefined,
        },
        technicalSkills: skills
          .filter((s) => s.name)
          .map((s) => ({
            name: s.name,
            level: s.level || undefined,
          })),
        languages: languages
          .filter((l) => l.name)
          .map((l) => ({
            name: l.name,
            level: l.level || undefined,
          })),
        tags: selectedTags,
        notes: data.notes || "",
        availability: {
          startDate: data.startDate || undefined,
          duration: data.duration ? Number(data.duration) : undefined,
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
            githubUrl: p.githubUrl || undefined,
            technologies:
              p.technologies
                ?.split(",")
                .map((t) => t.trim())
                .filter(Boolean) || [],
          })),
      });

      // 2. Upload CV séparément si présent
      if (cvFile && res.data.candidate?._id) {
        try {
          const cvFormData = new FormData();
          cvFormData.append("cv", cvFile);
          await api.post(
            "/candidates/" + res.data.candidate._id + "/cv",
            cvFormData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
        } catch (cvErr) {
          console.log("CV upload error:", cvErr.response?.data);
        }
      }

      // 3. Calcul automatique du score avec template par défaut
      try {
        await api.post("/scoring/" + res.data.candidate._id + "/calculate", {});
      } catch (scoreErr) {
        console.log("Score auto non calculé:", scoreErr.response?.data);
      }

      router.push("/candidates");
    } catch (err) {
      console.log("Erreur:", err.response?.data);
      setError(err.response?.data?.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

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
            Nouveau Candidat
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            Remplissez les informations du candidat
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

      <form ref={formRef} onSubmit={handleSubmit}>
        {/* Informations Personnelles */}
        <Section title="Informations Personnelles">
          <Field label="Prénom" name="firstName" required />
          <Field label="Nom" name="lastName" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Téléphone" name="phone" />
          <Field label="Date de naissance" name="birthDate" type="date" />
          <Field label="Adresse" name="address" />
          <Field
            label="LinkedIn"
            name="linkedin"
            placeholder="https://linkedin.com/in/..."
          />
          <Field
            label="GitHub"
            name="github"
            placeholder="https://github.com/..."
          />
        </Section>

        {/* Formations */}
        <DynamicSection
          title="Formation"
          items={formations}
          onAdd={() =>
            setFormations([
              ...formations,
              {
                school: "",
                degree: "",
                level: "",
                specialty: "",
                graduationYear: "",
              },
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
                  placeholder="École / Université"
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
                  placeholder="Licence, Master, Ingénieur..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Niveau</label>
                <select
                  value={f.level}
                  onChange={(e) =>
                    updateItem(
                      setFormations,
                      formations,
                      i,
                      "level",
                      e.target.value,
                    )
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="Bac">Bac</option>
                  <option value="Bac+1">Bac+1</option>
                  <option value="Bac+2">Bac+2</option>
                  <option value="Bac+3">Bac+3 (Licence)</option>
                  <option value="Bac+4">Bac+4 (Master 1)</option>
                  <option value="Bac+5">Bac+5 (Master / Ingénieur)</option>
                  <option value="Bac+8">Bac+8 (Doctorat)</option>
                </select>
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
                  placeholder="Génie Logiciel..."
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
          <Field
            label="Date de début disponible"
            name="startDate"
            type="date"
          />
          <div style={{ gridColumn: "span 1" }}>
            <label style={labelStyle}>Durée de stage souhaitée (mois)</label>
            <select
              name="duration"
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

        {/* Compétences Techniques */}
        <DynamicSection
          title="Compétence Technique"
          items={skills}
          onAdd={() => setSkills([...skills, { name: "", level: "" }])}
          onRemove={(i) => setSkills(skills.filter((_, idx) => idx !== i))}
          renderItem={(s, i) => (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>Compétence</label>
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) =>
                    updateItem(setSkills, skills, i, "name", e.target.value)
                  }
                  placeholder="React, Node.js, Python..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Niveau</label>
                <select
                  value={s.level}
                  onChange={(e) =>
                    updateItem(setSkills, skills, i, "level", e.target.value)
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>
            </div>
          )}
        />

        {/* Langues */}
        <DynamicSection
          title="Langue"
          items={languages}
          onAdd={() => setLanguages([...languages, { name: "", level: "" }])}
          onRemove={(i) =>
            setLanguages(languages.filter((_, idx) => idx !== i))
          }
          renderItem={(l, i) => (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>Langue</label>
                <input
                  type="text"
                  value={l.name}
                  onChange={(e) =>
                    updateItem(
                      setLanguages,
                      languages,
                      i,
                      "name",
                      e.target.value,
                    )
                  }
                  placeholder="Français, Anglais, Arabe..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Niveau</label>
                <select
                  value={l.level}
                  onChange={(e) =>
                    updateItem(
                      setLanguages,
                      languages,
                      i,
                      "level",
                      e.target.value,
                    )
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="A1">A1 — Débutant</option>
                  <option value="A2">A2 — Elémentaire</option>
                  <option value="B1">B1 — Intermédiaire</option>
                  <option value="B2">B2 — Intermédiaire avancé</option>
                  <option value="C1">C1 — Avancé</option>
                  <option value="C2">C2 — Maîtrise</option>
                </select>
              </div>
            </div>
          )}
        />

        {/* Tags */}
        <Section title="Domaine">
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Tags / Domaine</label>
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
                    name="tags"
                    value={tag}
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
              {
                company: "",
                position: "",
                startDate: "",
                endDate: "",
                duration: "",
                description: "",
              },
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
                  placeholder="Nom de l'entreprise"
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
                  placeholder="Développeur, Stagiaire..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date de début</label>
                <input
                  type="date"
                  value={ex.startDate}
                  onChange={(e) =>
                    updateItem(
                      setExperiences,
                      experiences,
                      i,
                      "startDate",
                      e.target.value,
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date de fin</label>
                <input
                  type="date"
                  value={ex.endDate}
                  onChange={(e) =>
                    updateItem(
                      setExperiences,
                      experiences,
                      i,
                      "endDate",
                      e.target.value,
                    )
                  }
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
                  placeholder="Brève description..."
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
              { title: "", description: "", technologies: "", githubUrl: "" },
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
                <label style={labelStyle}>Titre du projet</label>
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
                <label style={labelStyle}>
                  Technologies (séparées par virgule)
                </label>
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
              <div>
                <label style={labelStyle}>URL GitHub</label>
                <input
                  type="text"
                  value={p.githubUrl}
                  onChange={(e) =>
                    updateItem(
                      setProjects,
                      projects,
                      i,
                      "githubUrl",
                      e.target.value,
                    )
                  }
                  placeholder="https://github.com/..."
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
                  placeholder="Description du projet..."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>
          )}
        />

        {/* CV et Notes */}
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
              <label style={labelStyle}>CV (PDF)</label>
              <div
                onClick={() => document.getElementById("cv-input").click()}
                style={{
                  border: "2px dashed #e2e8f0",
                  borderRadius: "10px",
                  padding: "24px",
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
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#64748b",
                        fontWeight: "500",
                      }}
                    >
                      Cliquez pour uploader le CV
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        marginTop: "4px",
                      }}
                    >
                      PDF uniquement — max 5MB
                    </p>
                  </div>
                )}
              </div>
              <input
                id="cv-input"
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => setCvFile(e.target.files[0] || null)}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Notes internes</label>
              <textarea
                name="notes"
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
            type="reset"
            onClick={() => {
              setCvFile(null);
              setFormations([
                {
                  school: "",
                  degree: "",
                  level: "",
                  specialty: "",
                  graduationYear: "",
                },
              ]);
              setExperiences([
                {
                  company: "",
                  position: "",
                  startDate: "",
                  endDate: "",
                  duration: "",
                  description: "",
                },
              ]);
              setProjects([
                { title: "", description: "", technologies: "", githubUrl: "" },
              ]);
              setSkills([{ name: "", level: "" }]);
              setLanguages([{ name: "", level: "" }]);
            }}
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
            Effacer
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
            {loading ? "Création en cours..." : "Créer le Candidat"}
          </button>
        </div>
      </form>
    </div>
  );
}
