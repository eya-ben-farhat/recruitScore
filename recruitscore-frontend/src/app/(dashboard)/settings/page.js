"use client";
import { useState, useRef, useEffect } from "react";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";

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

const roleLabels = {
  admin: "Administrateur",
  rh: "Responsable RH",
  manager: "Manager Technique",
  evaluator: "Évaluateur",
  reader: "Lecteur",
};

const permissionLabels = {
  candidates: "Candidats",
  scoring: "Scoring",
  tests: "Tests",
  reports: "Rapports",
};

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
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [notifNewCandidate, setNotifNewCandidate] = useState(false);
  const [notifScoreCalc, setNotifScoreCalc] = useState(false);
  const [notifTestResult, setNotifTestResult] = useState(false);

  const emailRef = useRef(null);
  const currentPwRef = useRef(null);
  const newPwRef = useRef(null);
  const confirmPwRef = useRef(null);

  useEffect(() => {
    // Priorité 1 : préférences du user connecté (depuis le store)
    if (user?.notificationPreferences) {
      setNotifNewCandidate(user.notificationPreferences.newCandidate ?? true);
      setNotifScoreCalc(user.notificationPreferences.scoreCalculated ?? true);
      setNotifTestResult(user.notificationPreferences.testResult ?? true);
      return;
    }

    // Priorité 2 : préférences sauvegardées localement (token expiré ou admin inactif)
    try {
      const saved = localStorage.getItem("notificationPreferences");
      if (saved) {
        const prefs = JSON.parse(saved);
        setNotifNewCandidate(prefs.newCandidate ?? true);
        setNotifScoreCalc(prefs.scoreCalculated ?? true);
        setNotifTestResult(prefs.testResult ?? true);
      }
    } catch {
      // localStorage non disponible — valeurs par défaut
      setNotifNewCandidate(true);
      setNotifScoreCalc(true);
      setNotifTestResult(true);
    }
  }, [user]);

  const showSuccessMsg = (msg) => {
    setSuccess(msg);
    setError("");
    setTimeout(() => setSuccess(""), 3000);
  };

  const showErrorMsg = (msg) => {
    setError(msg);
    setSuccess("");
    setTimeout(() => setError(""), 4000);
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setLoading("email");
    try {
      const email = emailRef.current.value;
      if (!email) return showErrorMsg("Email invalide");
      await api.put("/users/me/email", { email });
      setAuth({ ...user, email }, token);
      showSuccessMsg("Email mis à jour avec succès !");
    } catch (err) {
      showErrorMsg(
        err.response?.data?.message || "Erreur lors de la mise à jour",
      );
    } finally {
      setLoading("");
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    const currentPassword = currentPwRef.current.value;
    const newPassword = newPwRef.current.value;
    const confirmPassword = confirmPwRef.current.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return showErrorMsg("Tous les champs sont obligatoires");
    }
    if (newPassword !== confirmPassword) {
      return showErrorMsg("Les mots de passe ne correspondent pas");
    }
    if (newPassword.length < 8) {
      return showErrorMsg(
        "Le mot de passe doit contenir au moins 8 caractères",
      );
    }

    setLoading("password");
    try {
      await api.put("/users/me/password", { currentPassword, newPassword });
      showSuccessMsg("Mot de passe mis à jour avec succès !");
      currentPwRef.current.value = "";
      newPwRef.current.value = "";
      confirmPwRef.current.value = "";
    } catch (err) {
      showErrorMsg(
        err.response?.data?.message || "Mot de passe actuel incorrect",
      );
    } finally {
      setLoading("");
    }
  };

  const handleSaveNotifications = async () => {
    setLoading("notifications");

    // Sauvegarder localement immédiatement — indépendant du token
    const prefs = {
      newCandidate: notifNewCandidate,
      scoreCalculated: notifScoreCalc,
      testResult: notifTestResult,
    };
    localStorage.setItem("notificationPreferences", JSON.stringify(prefs));

    try {
      await api.put("/users/me/notifications", prefs);
      setAuth(
        {
          ...user,
          notificationPreferences: prefs,
        },
        token,
      );
      showSuccessMsg("Préférences de notifications sauvegardées !");
    } catch (err) {
      // Même si l'API échoue (token expiré), les prefs sont sauvegardées localement
      showErrorMsg(
        err.response?.data?.message || "Erreur lors de la sauvegarde",
      );
    } finally {
      setLoading("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogoutAll = async () => {
    if (
      !confirm("Voulez-vous vraiment vous déconnecter de tous les appareils ?")
    )
      return;
    try {
      await api.post("/auth/logout");
      useAuthStore.getState().logout();
      window.location.href = "/login";
    } catch (err) {
      showErrorMsg("Erreur lors de la déconnexion");
    }
  };

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", maxWidth: "720px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
          Paramètres
        </h2>
        <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
          Gérez votre compte et vos préférences
        </p>
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
          ✓ {success}
        </div>
      )}
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

      {/* Profil */}
      <Card title="Informations du Compte">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: "700",
              color: "white",
              flexShrink: 0,
            }}
          >
            {user?.firstName?.charAt(0) || "U"}
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}
            >
              {user?.firstName} {user?.lastName}
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
              {user?.email}
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: "6px",
                padding: "2px 10px",
                borderRadius: "99px",
                fontSize: "11px",
                fontWeight: "600",
                background: "#eff6ff",
                color: "#2563eb",
              }}
            >
              {roleLabels[user?.role] || user?.role}
            </span>
          </div>
        </div>

        <div
          style={{
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
            Mes Permissions
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            {Object.entries(user?.permissions || {}).map(([module, perms]) => (
              <div
                key={module}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                }}
              >
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  {permissionLabels[module] || module}
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
      </Card>

      {/* Changer Email */}
      <Card title="Changer l'Email">
        <form onSubmit={handleEmailUpdate}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Nouvel Email</label>
            <input
              ref={emailRef}
              type="email"
              defaultValue={user?.email}
              required
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading === "email"}
            style={{
              padding: "9px 20px",
              borderRadius: "8px",
              border: "none",
              background: loading === "email" ? "#93c5fd" : "#2563eb",
              color: "white",
              fontSize: "13px",
              fontWeight: "600",
              cursor: loading === "email" ? "not-allowed" : "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {loading === "email" ? "Mise à jour..." : "Mettre à jour l'email"}
          </button>
        </form>
      </Card>

      {/* Changer Mot de passe */}
      <Card title="Changer le Mot de Passe">
        <form onSubmit={handlePasswordUpdate}>
          <div style={{ marginBottom: "14px", position: "relative" }}>
            <label style={labelStyle}>Mot de passe actuel</label>
            <input
              ref={currentPwRef}
              type={showCurrentPw ? "text" : "password"}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
            <span
              onClick={() => setShowCurrentPw(!showCurrentPw)}
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
              {showCurrentPw ? "Masquer" : "Afficher"}
            </span>
          </div>
          <div style={{ marginBottom: "14px", position: "relative" }}>
            <label style={labelStyle}>Nouveau mot de passe</label>
            <input
              ref={newPwRef}
              type={showNewPw ? "text" : "password"}
              required
              placeholder="Minimum 8 caractères"
              style={inputStyle}
            />
            <span
              onClick={() => setShowNewPw(!showNewPw)}
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
              {showNewPw ? "Masquer" : "Afficher"}
            </span>
          </div>
          <div style={{ marginBottom: "16px", position: "relative" }}>
            <label style={labelStyle}>Confirmer le mot de passe</label>
            <input
              ref={confirmPwRef}
              type={showConfirmPw ? "text" : "password"}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
            <span
              onClick={() => setShowConfirmPw(!showConfirmPw)}
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
              {showConfirmPw ? "Masquer" : "Afficher"}
            </span>
          </div>
          <button
            type="submit"
            disabled={loading === "password"}
            style={{
              padding: "9px 20px",
              borderRadius: "8px",
              border: "none",
              background: loading === "password" ? "#93c5fd" : "#2563eb",
              color: "white",
              fontSize: "13px",
              fontWeight: "600",
              cursor: loading === "password" ? "not-allowed" : "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {loading === "password"
              ? "Mise à jour..."
              : "Changer le mot de passe"}
          </button>
        </form>
      </Card>

      {/* Notifications */}
      <Card title="Notifications">
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
          Choisissez les événements pour lesquels vous souhaitez être notifié.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {[
            {
              state: notifNewCandidate,
              setState: setNotifNewCandidate,
              label: "Nouvelle candidature reçue",
              desc: "Alerte dès qu'un nouveau candidat est ajouté",
            },
            {
              state: notifScoreCalc,
              setState: setNotifScoreCalc,
              label: "Score calculé",
              desc: "Alerte quand un score est calculé pour un candidat",
            },
            {
              state: notifTestResult,
              setState: setNotifTestResult,
              label: "Résultat de test disponible",
              desc: "Alerte quand un résultat de test est saisi",
            },
          ].map((n, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #f1f5f9",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  {n.label}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginTop: "2px",
                  }}
                >
                  {n.desc}
                </p>
              </div>
              <div
                onClick={() => n.setState(!n.state)}
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "99px",
                  background: n.state ? "#2563eb" : "#e2e8f0",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "white",
                    position: "absolute",
                    top: "3px",
                    left: n.state ? "23px" : "3px",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveNotifications}
          disabled={loading === "notifications"}
          style={{
            padding: "9px 20px",
            borderRadius: "8px",
            border: "none",
            background: loading === "notifications" ? "#93c5fd" : "#2563eb",
            color: "white",
            fontSize: "13px",
            fontWeight: "600",
            cursor: loading === "notifications" ? "not-allowed" : "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {loading === "notifications"
            ? "Sauvegarde..."
            : "Sauvegarder les notifications"}
        </button>
      </Card>

      {/* Sécurité */}
      <Card title="Sécurité">
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
          Gérez vos sessions actives et la sécurité de votre compte.
        </p>
        <div
          style={{
            background: "#f8fafc",
            borderRadius: "10px",
            padding: "14px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                Session actuelle
              </p>
              <p
                style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}
              >
                Connecté en tant que {roleLabels[user?.role] || user?.role}
              </p>
            </div>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: "99px",
                background: "#ecfdf5",
                color: "#059669",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              Active
            </span>
          </div>
        </div>
        <button
          onClick={handleLogoutAll}
          style={{
            padding: "9px 20px",
            borderRadius: "8px",
            border: "1px solid #ef4444",
            background: "white",
            color: "#ef4444",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Se déconnecter de tous les appareils
        </button>
      </Card>
    </div>
  );
}
