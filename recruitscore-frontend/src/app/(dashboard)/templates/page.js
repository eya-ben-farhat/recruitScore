"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";

const categoryLabels = {
  formation: "Formation",
  technique: "Technique",
  softSkills: "Soft Skills",
  experience: "Expérience",
};

const categoryColors = {
  formation: { bg: "#eff6ff", color: "#2563eb" },
  technique: { bg: "#f5f3ff", color: "#7c3aed" },
  softSkills: { bg: "#ecfdf5", color: "#059669" },
  experience: { bg: "#fffbeb", color: "#d97706" },
};

const formulaLabels = {
  proportional: "Proportionnelle",
  binary: "Binaire",
  threshold: "Seuil",
  scale: "Barème",
};

const formulaDescriptions = {
  proportional: "(valeur - min) / (max - min) × 100",
  binary: "Oui → points_oui / Non → points_non",
  threshold: "valeur ≥ seuil → 100pts / sinon → 0pts",
  scale: "Selon tableau de choix ou tranches",
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

export default function TemplatesPage() {
  const user = useAuthStore((s) => s.user);
  const [templates, setTemplates] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editTemplate, setEditTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canWrite = user?.role === "admin" || user?.role === "manager";
  const canDelete = user?.role === "admin";

  const emptyForm = {
    name: "",
    description: "",
    targetRole: "",
    isDefault: false,
    kpis: [],
  };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [t, k] = await Promise.all([
        api.get("/templates"),
        api.get("/kpis"),
      ]);
      setTemplates(t.data.templates || []);
      setKpis(k.data.kpis || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditTemplate(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (template) => {
    setEditTemplate(template);
    setForm({
      name: template.name,
      description: template.description || "",
      targetRole: template.targetRole || "",
      isDefault: template.isDefault || false,
      kpis: template.kpis.map((k) => ({
        kpiId: k.kpiId?._id || k.kpiId,
        weight: k.weight,
        calculationRules: {
          formula: k.calculationRules?.formula || "proportional",
          minThreshold: k.calculationRules?.minThreshold || 0,
          bonus: k.calculationRules?.bonus || [],
          malus: k.calculationRules?.malus || [],
        },
      })),
    });
    setError("");
    setShowModal(true);
  };

  const openDetail = async (template) => {
    try {
      const res = await api.get("/templates/" + template._id);
      setSelectedTemplate(res.data.template);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.patch("/templates/" + id + "/default");
      fetchAll();
    } catch (err) {
      alert("Erreur lors du changement de template par défaut");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce template ?")) return;
    try {
      await api.delete("/templates/" + id);
      fetchAll();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const addKpiToForm = (kpiId) => {
    if (form.kpis.find((k) => k.kpiId === kpiId)) return;
    setForm((prev) => ({
      ...prev,
      kpis: [
        ...prev.kpis,
        {
          kpiId,
          weight: 0,
          calculationRules: {
            formula: "proportional",
            minThreshold: 0,
            bonus: [],
            malus: [],
          },
        },
      ],
    }));
  };

  const removeKpiFromForm = (kpiId) => {
    setForm((prev) => ({
      ...prev,
      kpis: prev.kpis.filter((k) => k.kpiId !== kpiId),
    }));
  };

  const updateKpiRule = (kpiId, field, value) => {
    setForm((prev) => ({
      ...prev,
      kpis: prev.kpis.map((k) =>
        k.kpiId === kpiId
          ? {
              ...k,
              calculationRules: { ...k.calculationRules, [field]: value },
            }
          : k,
      ),
    }));
  };

  const updateKpiWeight = (kpiId, value) => {
    setForm((prev) => ({
      ...prev,
      kpis: prev.kpis.map((k) =>
        k.kpiId === kpiId ? { ...k, weight: Number(value) } : k,
      ),
    }));
  };

  const totalWeight = form.kpis.reduce(
    (s, k) => s + (Number(k.weight) || 0),
    0,
  );

  const handleSave = async () => {
    setError("");
    if (!form.name) return setError("Le nom est obligatoire");
    if (form.kpis.length === 0) return setError("Ajoutez au moins un KPI");
    if (totalWeight !== 100)
      return setError(
        "Le total des poids doit être 100%. Actuel : " + totalWeight + "%",
      );

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        targetRole: form.targetRole,
        isDefault: form.isDefault,
        kpis: form.kpis.map((k) => ({
          kpiId: k.kpiId,
          weight: Number(k.weight),
          calculationRules: {
            formula: k.calculationRules.formula,
            minThreshold: Number(k.calculationRules.minThreshold) || 0,
            bonus: k.calculationRules.bonus || [],
            malus: k.calculationRules.malus || [],
          },
        })),
      };

      if (editTemplate) {
        await api.put("/templates/" + editTemplate._id, payload);
      } else {
        await api.post("/templates", payload);
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const getKpiById = (id) => kpis.find((k) => k._id === id);

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
            Templates de Scoring
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            Modèles d'évaluation par type de poste
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
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
            + Nouveau Template
          </button>
        )}
      </div>

      {/* Liste templates */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          Chargement...
        </div>
      ) : templates.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: "#94a3b8",
            background: "white",
            borderRadius: "12px",
          }}
        >
          <p
            style={{ fontSize: "15px", fontWeight: "600", marginBottom: "8px" }}
          >
            Aucun template créé
          </p>
          <p style={{ fontSize: "13px" }}>
            Créez votre premier template de scoring
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          {templates.map((t) => (
            <div
              key={t._id}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                borderTop: t.isDefault
                  ? "3px solid #2563eb"
                  : "3px solid #e2e8f0",
                opacity: t.isActive ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {t.name}
                    </p>
                    {t.isDefault && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "99px",
                          background: "#eff6ff",
                          color: "#2563eb",
                          fontSize: "10px",
                          fontWeight: "700",
                        }}
                      >
                        Par défaut
                      </span>
                    )}
                  </div>
                  {t.targetRole && (
                    <p style={{ fontSize: "12px", color: "#64748b" }}>
                      {t.targetRole}
                    </p>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#64748b",
                  }}
                >
                  {t.kpis?.length} KPI{t.kpis?.length > 1 ? "s" : ""}
                </span>
              </div>

              {t.description && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    marginBottom: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  {t.description}
                </p>
              )}

              {/* Répartition catégories */}
              <div style={{ marginBottom: "16px" }}>
                {Object.entries(t.categorySummary || {}).map(([cat, w]) => {
                  if (!w) return null;
                  return (
                    <div
                      key={cat}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          minWidth: "80px",
                        }}
                      >
                        {categoryLabels[cat]}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: "4px",
                          background: "#f1f5f9",
                          borderRadius: "99px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: w + "%",
                            background: categoryColors[cat]?.color,
                            borderRadius: "99px",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: categoryColors[cat]?.color,
                          minWidth: "35px",
                        }}
                      >
                        {w}%
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "12px",
                }}
              >
                <button
                  onClick={() => openDetail(t)}
                  style={{
                    flex: 1,
                    padding: "6px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: "white",
                    color: "#64748b",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Détail
                </button>
                {canWrite && (
                  <button
                    onClick={() => openEdit(t)}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      border: "1px solid #2563eb",
                      background: "white",
                      color: "#2563eb",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    Modifier
                  </button>
                )}
                {canWrite && !t.isDefault && (
                  <button
                    onClick={() => handleSetDefault(t._id)}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      border: "none",
                      background: "#eff6ff",
                      color: "#2563eb",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    Définir défaut
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(t._id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #fca5a5",
                      background: "#fef2f2",
                      color: "#ef4444",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Création/Modification */}
      {showModal && (
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
                {editTemplate ? "Modifier le Template" : "Nouveau Template"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
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

            {/* Infos générales */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>
                  Nom <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Template Dev Backend"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Poste cible</label>
                <input
                  type="text"
                  value={form.targetRole}
                  onChange={(e) =>
                    setForm({ ...form, targetRole: e.target.value })
                  }
                  placeholder="Ex: dev backend, data analyst..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Description..."
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#1e293b",
                    fontWeight: "500",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) =>
                      setForm({ ...form, isDefault: e.target.checked })
                    }
                    style={{ width: "15px", height: "15px", cursor: "pointer" }}
                  />
                  Définir comme template par défaut
                </label>
              </div>
            </div>

            {/* Ajouter KPIs */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <label style={labelStyle}>KPIs du template</label>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color:
                        totalWeight === 100
                          ? "#059669"
                          : totalWeight > 100
                            ? "#dc2626"
                            : "#d97706",
                    }}
                  >
                    Total: {totalWeight}/100%
                  </span>
                </div>
              </div>

              {/* Sélecteur KPI */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addKpiToForm(e.target.value);
                    e.target.value = "";
                  }
                }}
                style={{
                  ...inputStyle,
                  marginBottom: "16px",
                  cursor: "pointer",
                }}
              >
                <option value="">+ Ajouter un KPI...</option>
                {kpis
                  .filter(
                    (k) =>
                      k.isActive && !form.kpis.find((fk) => fk.kpiId === k._id),
                  )
                  .map((k) => (
                    <option key={k._id} value={k._id}>
                      [{categoryLabels[k.category]}] {k.name}
                    </option>
                  ))}
              </select>

              {/* Liste KPIs ajoutés */}
              {form.kpis.length === 0 && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#94a3b8",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  Aucun KPI ajouté — sélectionnez des KPIs ci-dessus
                </p>
              )}

              {form.kpis.map((fk, i) => {
                const kpi = getKpiById(fk.kpiId);
                if (!kpi) return null;
                return (
                  <div
                    key={fk.kpiId}
                    style={{
                      border: "1px solid #f1f5f9",
                      borderRadius: "10px",
                      padding: "16px",
                      marginBottom: "10px",
                      background: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            fontSize: "10px",
                            fontWeight: "700",
                            background: categoryColors[kpi.category]?.bg,
                            color: categoryColors[kpi.category]?.color,
                          }}
                        >
                          {categoryLabels[kpi.category]}
                        </span>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#1e293b",
                          }}
                        >
                          {kpi.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeKpiFromForm(fk.kpiId)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: "1px solid #fca5a5",
                          background: "#fef2f2",
                          color: "#ef4444",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "10px",
                      }}
                    >
                      {/* Poids */}
                      <div>
                        <label style={labelStyle}>Poids (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={fk.weight}
                          onChange={(e) =>
                            updateKpiWeight(fk.kpiId, e.target.value)
                          }
                          placeholder="Ex: 20"
                          style={inputStyle}
                        />
                      </div>

                      {/* Formule */}
                      <div>
                        <label style={labelStyle}>Formule de calcul</label>
                        <select
                          value={fk.calculationRules.formula}
                          onChange={(e) =>
                            updateKpiRule(fk.kpiId, "formula", e.target.value)
                          }
                          style={{ ...inputStyle, cursor: "pointer" }}
                        >
                          {Object.entries(formulaLabels).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Seuil minimum */}
                      <div>
                        <label style={labelStyle}>Seuil minimum</label>
                        <input
                          type="number"
                          value={fk.calculationRules.minThreshold}
                          onChange={(e) =>
                            updateKpiRule(
                              fk.kpiId,
                              "minThreshold",
                              e.target.value,
                            )
                          }
                          placeholder="0"
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {/* Description formule */}
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        marginTop: "8px",
                        fontStyle: "italic",
                      }}
                    >
                      Formule :{" "}
                      {formulaDescriptions[fk.calculationRules.formula]}
                    </p>

                    {/* Bonus/Malus */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                        marginTop: "10px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <label style={{ ...labelStyle, marginBottom: 0 }}>
                            Bonus
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              updateKpiRule(fk.kpiId, "bonus", [
                                ...fk.calculationRules.bonus,
                                { condition: "", points: "" },
                              ])
                            }
                            style={{
                              fontSize: "10px",
                              color: "#059669",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: "700",
                            }}
                          >
                            + Ajouter
                          </button>
                        </div>
                        {fk.calculationRules.bonus.map((b, bi) => (
                          <div
                            key={bi}
                            style={{
                              display: "flex",
                              gap: "4px",
                              marginBottom: "4px",
                            }}
                          >
                            <input
                              type="text"
                              value={b.condition}
                              onChange={(e) => {
                                const updated = [...fk.calculationRules.bonus];
                                updated[bi].condition = e.target.value;
                                updateKpiRule(fk.kpiId, "bonus", updated);
                              }}
                              placeholder="condition JS"
                              style={{
                                ...inputStyle,
                                fontSize: "11px",
                                flex: 2,
                              }}
                            />
                            <input
                              type="number"
                              value={b.points}
                              onChange={(e) => {
                                const updated = [...fk.calculationRules.bonus];
                                updated[bi].points = e.target.value;
                                updateKpiRule(fk.kpiId, "bonus", updated);
                              }}
                              placeholder="pts"
                              style={{
                                ...inputStyle,
                                fontSize: "11px",
                                flex: 1,
                              }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateKpiRule(
                                  fk.kpiId,
                                  "bonus",
                                  fk.calculationRules.bonus.filter(
                                    (_, idx) => idx !== bi,
                                  ),
                                )
                              }
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid #fca5a5",
                                background: "#fef2f2",
                                color: "#ef4444",
                                fontSize: "10px",
                                cursor: "pointer",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <label style={{ ...labelStyle, marginBottom: 0 }}>
                            Malus
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              updateKpiRule(fk.kpiId, "malus", [
                                ...fk.calculationRules.malus,
                                { condition: "", points: "" },
                              ])
                            }
                            style={{
                              fontSize: "10px",
                              color: "#dc2626",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: "700",
                            }}
                          >
                            + Ajouter
                          </button>
                        </div>
                        {fk.calculationRules.malus.map((m, mi) => (
                          <div
                            key={mi}
                            style={{
                              display: "flex",
                              gap: "4px",
                              marginBottom: "4px",
                            }}
                          >
                            <input
                              type="text"
                              value={m.condition}
                              onChange={(e) => {
                                const updated = [...fk.calculationRules.malus];
                                updated[mi].condition = e.target.value;
                                updateKpiRule(fk.kpiId, "malus", updated);
                              }}
                              placeholder="condition JS"
                              style={{
                                ...inputStyle,
                                fontSize: "11px",
                                flex: 2,
                              }}
                            />
                            <input
                              type="number"
                              value={m.points}
                              onChange={(e) => {
                                const updated = [...fk.calculationRules.malus];
                                updated[mi].points = e.target.value;
                                updateKpiRule(fk.kpiId, "malus", updated);
                              }}
                              placeholder="pts"
                              style={{
                                ...inputStyle,
                                fontSize: "11px",
                                flex: 1,
                              }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateKpiRule(
                                  fk.kpiId,
                                  "malus",
                                  fk.calculationRules.malus.filter(
                                    (_, idx) => idx !== mi,
                                  ),
                                )
                              }
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid #fca5a5",
                                background: "#fef2f2",
                                color: "#ef4444",
                                fontSize: "10px",
                                cursor: "pointer",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Boutons */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                borderTop: "1px solid #f1f5f9",
                paddingTop: "20px",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
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
                onClick={handleSave}
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
                {saving
                  ? "Sauvegarde..."
                  : editTemplate
                    ? "Mettre à jour"
                    : "Créer le Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail */}
      {showDetailModal && selectedTemplate && (
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
              maxWidth: "600px",
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
                  {selectedTemplate.name}
                </h3>
                {selectedTemplate.targetRole && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    {selectedTemplate.targetRole}
                  </p>
                )}
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

            {selectedTemplate.kpis.map((k, i) => {
              const kpi = k.kpiId;
              if (!kpi) return null;
              return (
                <div
                  key={i}
                  style={{
                    border: "1px solid #f1f5f9",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "99px",
                          fontSize: "10px",
                          fontWeight: "700",
                          background: categoryColors[kpi.category]?.bg,
                          color: categoryColors[kpi.category]?.color,
                        }}
                      >
                        {categoryLabels[kpi.category]}
                      </span>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#1e293b",
                        }}
                      >
                        {kpi.name}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: "#2563eb",
                      }}
                    >
                      {k.weight}%
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    <span>
                      Formule :{" "}
                      <strong>
                        {formulaLabels[k.calculationRules?.formula] ||
                          "Proportionnelle"}
                      </strong>
                    </span>
                    {k.calculationRules?.minThreshold > 0 && (
                      <span>
                        Seuil :{" "}
                        <strong>{k.calculationRules.minThreshold}</strong>
                      </span>
                    )}
                    {k.calculationRules?.bonus?.length > 0 && (
                      <span style={{ color: "#059669" }}>
                        +{k.calculationRules.bonus.length} bonus
                      </span>
                    )}
                    {k.calculationRules?.malus?.length > 0 && (
                      <span style={{ color: "#dc2626" }}>
                        -{k.calculationRules.malus.length} malus
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
