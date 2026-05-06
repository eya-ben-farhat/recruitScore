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

const typeLabels = {
  numeric: "Numérique",
  boolean: "Booléen",
  choice: "Choix",
  range: "Range",
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

const emptyForm = {
  name: "",
  description: "",
  category: "formation",
  type: "numeric",
  weight: "",
  minThreshold: "",
  config: {
    min: "",
    max: "",
    truePoints: "",
    falsePoints: "",
    choices: [{ label: "", points: "" }],
    ranges: [{ from: "", to: "", points: "" }],
  },
};

export default function KPIsPage() {
  const user = useAuthStore((s) => s.user);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalWeight, setTotalWeight] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editKpi, setEditKpi] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const canWrite = user?.role === "admin" || user?.role === "manager";
  const canDelete = user?.role === "admin";

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const params = categoryFilter ? "?category=" + categoryFilter : "";
      const res = await api.get("/kpis" + params);
      setKpis(res.data.kpis || []);
      setTotalWeight(res.data.totalWeight || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [categoryFilter]);

  const openCreate = () => {
    setEditKpi(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (kpi) => {
    setEditKpi(kpi);
    setForm({
      name: kpi.name,
      description: kpi.description || "",
      category: kpi.category,
      type: kpi.type,
      weight: kpi.weight,
      minThreshold: kpi.minThreshold || "",
      config: {
        min: kpi.config?.min ?? "",
        max: kpi.config?.max ?? "",
        truePoints: kpi.config?.truePoints ?? "",
        falsePoints: kpi.config?.falsePoints ?? "",
        choices:
          kpi.config?.choices?.length > 0
            ? kpi.config.choices
            : [{ label: "", points: "" }],
        ranges:
          kpi.config?.ranges?.length > 0
            ? kpi.config.ranges
            : [{ from: "", to: "", points: "" }],
      },
    });
    setError("");
    setShowModal(true);
  };

  const handleToggle = async (id) => {
    try {
      await api.patch("/kpis/" + id + "/toggle");
      fetchKPIs();
    } catch (err) {
      alert("Erreur lors du changement de statut");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce KPI ?")) return;
    try {
      await api.delete("/kpis/" + id);
      fetchKPIs();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const buildConfig = () => {
    const { type, config } = form;
    if (type === "numeric")
      return { min: Number(config.min), max: Number(config.max) };
    if (type === "boolean")
      return {
        truePoints: Number(config.truePoints),
        falsePoints: Number(config.falsePoints),
      };
    if (type === "choice")
      return {
        choices: config.choices
          .filter((c) => c.label)
          .map((c) => ({ label: c.label, points: Number(c.points) })),
      };
    if (type === "range")
      return {
        ranges: config.ranges
          .filter((r) => r.from !== "")
          .map((r) => ({
            from: Number(r.from),
            to: Number(r.to),
            points: Number(r.points),
          })),
      };
    return {};
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        type: form.type,
        weight: Number(form.weight),
        minThreshold: form.minThreshold ? Number(form.minThreshold) : 0,
        config: buildConfig(),
      };
      if (editKpi) {
        await api.put("/kpis/" + editKpi._id, payload);
      } else {
        await api.post("/kpis", payload);
      }
      setShowModal(false);
      fetchKPIs();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field, value) => {
    setForm((prev) => ({
      ...prev,
      config: { ...prev.config, [field]: value },
    }));
  };

  const updateChoice = (i, field, value) => {
    const updated = [...form.config.choices];
    updated[i][field] = value;
    updateConfig("choices", updated);
  };

  const updateRange = (i, field, value) => {
    const updated = [...form.config.ranges];
    updated[i][field] = value;
    updateConfig("ranges", updated);
  };

  const grouped = ["formation", "technique", "softSkills", "experience"].reduce(
    (acc, cat) => {
      acc[cat] = kpis.filter((k) => k.category === cat);
      return acc;
    },
    {},
  );

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
            KPIs
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            Critères d'évaluation — Poids total actif :
            <span
              style={{
                fontWeight: "700",
                color:
                  totalWeight > 100
                    ? "#dc2626"
                    : totalWeight === 100
                      ? "#059669"
                      : "#d97706",
                marginLeft: "6px",
              }}
            >
              {totalWeight}%
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
              fontFamily: "Poppins, sans-serif",
              color: "#1e293b",
              outline: "none",
            }}
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(categoryLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
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
              + Nouveau KPI
            </button>
          )}
        </div>
      </div>

      {/* Barre poids total */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span
            style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}
          >
            Répartition du poids total
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: totalWeight === 100 ? "#059669" : "#d97706",
            }}
          >
            {totalWeight}/100%
          </span>
        </div>
        <div
          style={{
            height: "8px",
            background: "#f1f5f9",
            borderRadius: "99px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: Math.min(totalWeight, 100) + "%",
              background:
                totalWeight === 100
                  ? "#059669"
                  : totalWeight > 100
                    ? "#dc2626"
                    : "#2563eb",
              borderRadius: "99px",
              transition: "width 0.5s",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
          {Object.entries(categoryLabels).map(([cat, label]) => {
            const catWeight = kpis
              .filter((k) => k.category === cat && k.isActive)
              .reduce((s, k) => s + k.weight, 0);
            if (catWeight === 0) return null;
            return (
              <div
                key={cat}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: categoryColors[cat]?.color,
                  }}
                />
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {label}: <strong>{catWeight}%</strong>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPIs par catégorie */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          Chargement...
        </div>
      ) : kpis.length === 0 ? (
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
            Aucun KPI créé
          </p>
          <p style={{ fontSize: "13px" }}>
            Créez votre premier KPI pour commencer
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catKpis]) => {
          if (catKpis.length === 0 && categoryFilter) return null;
          if (catKpis.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    padding: "3px 12px",
                    borderRadius: "99px",
                    fontSize: "12px",
                    fontWeight: "700",
                    background: categoryColors[cat]?.bg,
                    color: categoryColors[cat]?.color,
                  }}
                >
                  {categoryLabels[cat]}
                </span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  {catKpis.length} KPI{catKpis.length > 1 ? "s" : ""}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "14px",
                }}
              >
                {catKpis.map((kpi) => (
                  <div
                    key={kpi._id}
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "20px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      borderTop:
                        "3px solid " + categoryColors[kpi.category]?.color,
                      opacity: kpi.isActive ? 1 : 0.6,
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
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#1e293b",
                            marginBottom: "4px",
                          }}
                        >
                          {kpi.name}
                        </p>
                        {kpi.description && (
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#94a3b8",
                              lineHeight: "1.5",
                            }}
                          >
                            {kpi.description}
                          </p>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "6px",
                          marginLeft: "10px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "18px",
                            fontWeight: "800",
                            color: categoryColors[kpi.category]?.color,
                          }}
                        >
                          {kpi.weight}%
                        </span>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: "10px",
                            fontWeight: "600",
                          }}
                        >
                          {typeLabels[kpi.type]}
                        </span>
                      </div>
                    </div>

                    {/* Barre de poids */}
                    <div
                      style={{
                        height: "4px",
                        background: "#f1f5f9",
                        borderRadius: "99px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: kpi.weight + "%",
                          background: categoryColors[kpi.category]?.color,
                          borderRadius: "99px",
                        }}
                      />
                    </div>

                    {/* Config */}
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginBottom: "12px",
                      }}
                    >
                      {kpi.type === "numeric" && (
                        <span>
                          Range : {kpi.config?.min} → {kpi.config?.max}
                        </span>
                      )}
                      {kpi.type === "boolean" && (
                        <span>
                          Oui: {kpi.config?.truePoints}pts / Non:{" "}
                          {kpi.config?.falsePoints}pts
                        </span>
                      )}
                      {kpi.type === "choice" && (
                        <span>
                          {kpi.config?.choices?.length} choix disponibles
                        </span>
                      )}
                      {kpi.type === "range" && (
                        <span>
                          {kpi.config?.ranges?.length} tranches définies
                        </span>
                      )}
                      {kpi.minThreshold > 0 && (
                        <span style={{ marginLeft: "8px" }}>
                          — Seuil min: {kpi.minThreshold}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {canWrite && (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          borderTop: "1px solid #f1f5f9",
                          paddingTop: "12px",
                        }}
                      >
                        <button
                          onClick={() => openEdit(kpi)}
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
                          Modifier
                        </button>
                        <button
                          onClick={() => handleToggle(kpi._id)}
                          style={{
                            flex: 1,
                            padding: "6px",
                            borderRadius: "6px",
                            border: "none",
                            background: kpi.isActive ? "#fffbeb" : "#ecfdf5",
                            color: kpi.isActive ? "#d97706" : "#059669",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {kpi.isActive ? "Désactiver" : "Activer"}
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(kpi._id)}
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
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Modal Création / Modification */}
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
              maxWidth: "580px",
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
                {editKpi ? "Modifier le KPI" : "Nouveau KPI"}
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {/* Nom */}
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>
                  Nom <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Niveau académique"
                  style={inputStyle}
                />
              </div>

              {/* Description */}
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Description du KPI..."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              {/* Catégorie */}
              <div>
                <label style={labelStyle}>
                  Catégorie <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {Object.entries(categoryLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label style={labelStyle}>
                  Type <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {Object.entries(typeLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Poids */}
              <div>
                <label style={labelStyle}>
                  Poids (%) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  placeholder="Ex: 20"
                  style={inputStyle}
                />
              </div>

              {/* Seuil minimum */}
              <div>
                <label style={labelStyle}>Seuil minimum</label>
                <input
                  type="number"
                  value={form.minThreshold}
                  onChange={(e) =>
                    setForm({ ...form, minThreshold: e.target.value })
                  }
                  placeholder="0"
                  style={inputStyle}
                />
              </div>

              {/* Config dynamique selon type */}
              {form.type === "numeric" && (
                <>
                  <div>
                    <label style={labelStyle}>Valeur Min</label>
                    <input
                      type="number"
                      value={form.config.min}
                      onChange={(e) => updateConfig("min", e.target.value)}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Valeur Max</label>
                    <input
                      type="number"
                      value={form.config.max}
                      onChange={(e) => updateConfig("max", e.target.value)}
                      placeholder="20"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {form.type === "boolean" && (
                <>
                  <div>
                    <label style={labelStyle}>Points si Oui</label>
                    <input
                      type="number"
                      value={form.config.truePoints}
                      onChange={(e) =>
                        updateConfig("truePoints", e.target.value)
                      }
                      placeholder="10"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Points si Non</label>
                    <input
                      type="number"
                      value={form.config.falsePoints}
                      onChange={(e) =>
                        updateConfig("falsePoints", e.target.value)
                      }
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {form.type === "choice" && (
                <div style={{ gridColumn: "span 2" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <label style={labelStyle}>Choix</label>
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig("choices", [
                          ...form.config.choices,
                          { label: "", points: "" },
                        ])
                      }
                      style={{
                        fontSize: "11px",
                        color: "#2563eb",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      + Ajouter
                    </button>
                  </div>
                  {form.config.choices.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <input
                        type="text"
                        value={c.label}
                        onChange={(e) =>
                          updateChoice(i, "label", e.target.value)
                        }
                        placeholder="Libellé (ex: Avancé)"
                        style={{ ...inputStyle, flex: 2 }}
                      />
                      <input
                        type="number"
                        value={c.points}
                        onChange={(e) =>
                          updateChoice(i, "points", e.target.value)
                        }
                        placeholder="Points"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      {form.config.choices.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateConfig(
                              "choices",
                              form.config.choices.filter((_, idx) => idx !== i),
                            )
                          }
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #fca5a5",
                            background: "#fef2f2",
                            color: "#ef4444",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {form.type === "range" && (
                <div style={{ gridColumn: "span 2" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <label style={labelStyle}>Tranches</label>
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig("ranges", [
                          ...form.config.ranges,
                          { from: "", to: "", points: "" },
                        ])
                      }
                      style={{
                        fontSize: "11px",
                        color: "#2563eb",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      + Ajouter
                    </button>
                  </div>
                  {form.config.ranges.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <input
                        type="number"
                        value={r.from}
                        onChange={(e) => updateRange(i, "from", e.target.value)}
                        placeholder="De"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        type="number"
                        value={r.to}
                        onChange={(e) => updateRange(i, "to", e.target.value)}
                        placeholder="À"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        type="number"
                        value={r.points}
                        onChange={(e) =>
                          updateRange(i, "points", e.target.value)
                        }
                        placeholder="Points"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      {form.config.ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateConfig(
                              "ranges",
                              form.config.ranges.filter((_, idx) => idx !== i),
                            )
                          }
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #fca5a5",
                            background: "#fef2f2",
                            color: "#ef4444",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Boutons modal */}
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
                disabled={saving || !form.name || !form.weight}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    saving || !form.name || !form.weight
                      ? "#93c5fd"
                      : "#2563eb",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor:
                    saving || !form.name || !form.weight
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {saving
                  ? "Sauvegarde..."
                  : editKpi
                    ? "Mettre à jour"
                    : "Créer le KPI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
