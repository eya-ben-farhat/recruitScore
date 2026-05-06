"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";

const roleLabels = {
  admin: "Administrateur",
  rh: "Responsable RH",
  manager: "Manager Technique",
  evaluator: "Évaluateur",
  reader: "Lecteur",
};

const roleColors = {
  admin: { bg: "#fef2f2", color: "#dc2626" },
  rh: { bg: "#eff6ff", color: "#2563eb" },
  manager: { bg: "#f5f3ff", color: "#7c3aed" },
  evaluator: { bg: "#fffbeb", color: "#d97706" },
  reader: { bg: "#f8fafc", color: "#64748b" },
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

const permissionLabels = {
  candidates: "Candidats",
  scoring: "Scoring",
  tests: "Tests",
  reports: "Rapports",
};

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emptyForm = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "rh",
  };
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      role: user.role,
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setError("");
    if (!form.firstName || !form.lastName || !form.email || !form.role) {
      return setError("Tous les champs obligatoires doivent être remplis");
    }
    if (!editUser && !form.password) {
      return setError(
        "Le mot de passe est obligatoire pour un nouvel utilisateur",
      );
    }

    setSaving(true);
    try {
      if (editUser) {
        const payload = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
        };
        await api.put("/users/" + editUser._id, payload);
        setSuccess("Utilisateur mis à jour avec succès !");
      } else {
        await api.post("/users", {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          role: form.role,
        });
        setSuccess("Utilisateur créé avec succès !");
      }
      setShowModal(false);
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch("/users/" + id + "/status");
      fetchUsers();
    } catch (err) {
      alert("Erreur lors du changement de statut");
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?._id || id === currentUser?.id) {
      return alert("Vous ne pouvez pas supprimer votre propre compte");
    }
    if (!confirm("Supprimer cet utilisateur ?")) return;
    try {
      await api.delete("/users/" + id);
      fetchUsers();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const roleStats = Object.keys(roleLabels).reduce((acc, role) => {
    acc[role] = users.filter((u) => u.role === role).length;
    return acc;
  }, {});

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
            Utilisateurs
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            {users.length} utilisateur{users.length > 1 ? "s" : ""} au total
          </p>
        </div>
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
          + Nouvel Utilisateur
        </button>
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

      {/* Stats par rôle */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {Object.entries(roleLabels).map(([role, label]) => (
          <div
            key={role}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "14px 16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              borderLeft: "4px solid " + roleColors[role]?.color,
            }}
          >
            <p
              style={{
                fontSize: "11px",
                color: "#64748b",
                fontWeight: "600",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontSize: "22px",
                fontWeight: "800",
                color: roleColors[role]?.color,
              }}
            >
              {roleStats[role] || 0}
            </p>
          </div>
        ))}
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
                "Utilisateur",
                "Email",
                "Rôle",
                "Permissions",
                "Statut",
                "Dernière connexion",
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
            ) : users.length === 0 ? (
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
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr
                  key={u._id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "white" : "#fafafa",
                    opacity: u.isActive ? 1 : 0.6,
                  }}
                >
                  {/* Utilisateur */}
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
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #1e3a5f, #2563eb)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "white",
                          flexShrink: 0,
                        }}
                      >
                        {u.firstName?.charAt(0)}
                        {u.lastName?.charAt(0)}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#1e293b",
                          }}
                        >
                          {u.firstName} {u.lastName}
                          {(u._id === currentUser?._id ||
                            u._id === currentUser?.id) && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#2563eb",
                                fontWeight: "600",
                                marginLeft: "6px",
                                background: "#eff6ff",
                                padding: "1px 6px",
                                borderRadius: "99px",
                              }}
                            >
                              Vous
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                          Créé le{" "}
                          {new Date(u.createdAt).toLocaleDateString("fr-FR")}
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
                    {u.email}
                  </td>

                  {/* Rôle */}
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "99px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: roleColors[u.role]?.bg,
                        color: roleColors[u.role]?.color,
                      }}
                    >
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>

                  {/* Permissions */}
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}
                    >
                      {Object.entries(u.permissions || {}).map(
                        ([module, perms]) =>
                          perms.length > 0 && (
                            <span
                              key={module}
                              style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: "#f1f5f9",
                                color: "#475569",
                                fontSize: "10px",
                                fontWeight: "500",
                              }}
                            >
                              {permissionLabels[module]}
                            </span>
                          ),
                      )}
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
                        background: u.isActive ? "#ecfdf5" : "#fef2f2",
                        color: u.isActive ? "#059669" : "#dc2626",
                      }}
                    >
                      {u.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>

                  {/* Dernière connexion */}
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    {u.lastLogin
                      ? new Date(u.lastLogin).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => openEdit(u)}
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
                        Modifier
                      </button>
                      {u._id !== currentUser?._id &&
                        u._id !== currentUser?.id && (
                          <>
                            <button
                              onClick={() => handleToggle(u._id)}
                              style={{
                                padding: "5px 12px",
                                borderRadius: "6px",
                                border: "none",
                                background: u.isActive ? "#fffbeb" : "#ecfdf5",
                                color: u.isActive ? "#d97706" : "#059669",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer",
                                fontFamily: "Poppins, sans-serif",
                              }}
                            >
                              {u.isActive ? "Désactiver" : "Activer"}
                            </button>
                            <button
                              onClick={() => handleDelete(u._id)}
                              style={{
                                padding: "5px 10px",
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
                          </>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
              maxWidth: "520px",
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
                {editUser ? "Modifier l'utilisateur" : "Nouvel Utilisateur"}
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
              <div>
                <label style={labelStyle}>
                  Prénom <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Nom <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>
                  Email <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {!editUser && (
                <div style={{ gridColumn: "span 2", position: "relative" }}>
                  <label style={labelStyle}>
                    Mot de passe <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Minimum 8 caractères"
                    style={inputStyle}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "34px",
                      fontSize: "11px",
                      color: "#2563eb",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </span>
                </div>
              )}

              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>
                  Rôle <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {Object.entries(roleLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aperçu permissions selon rôle */}
              <div
                style={{
                  gridColumn: "span 2",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "14px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748b",
                    marginBottom: "10px",
                    textTransform: "uppercase",
                  }}
                >
                  Permissions associées au rôle
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  {Object.entries(
                    {
                      admin: {
                        candidates: ["read", "write", "delete"],
                        scoring: ["read", "write"],
                        tests: ["read", "write", "delete"],
                        reports: ["read", "export"],
                      },
                      rh: {
                        candidates: ["read", "write"],
                        scoring: ["read"],
                        tests: ["read"],
                        reports: ["read", "export"],
                      },
                      manager: {
                        candidates: ["read"],
                        scoring: ["read", "write"],
                        tests: ["read", "write", "delete"],
                        reports: ["read"],
                      },
                      evaluator: {
                        candidates: ["read"],
                        scoring: ["read"],
                        tests: ["read"],
                        reports: [],
                      },
                      reader: {
                        candidates: ["read"],
                        scoring: [],
                        tests: [],
                        reports: ["read"],
                      },
                    }[form.role] || {},
                  ).map(([module, perms]) => (
                    <div
                      key={module}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {permissionLabels[module]}
                      </span>
                      <div style={{ display: "flex", gap: "3px" }}>
                        {perms.length === 0 ? (
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                            Aucun accès
                          </span>
                        ) : (
                          perms.map((p) => (
                            <span
                              key={p}
                              style={{
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "#eff6ff",
                                color: "#2563eb",
                                fontSize: "10px",
                                fontWeight: "600",
                              }}
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

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
                  : editUser
                    ? "Mettre à jour"
                    : "Créer l'utilisateur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
