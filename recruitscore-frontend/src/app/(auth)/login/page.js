"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";
import api from "@/lib/axios";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      console.log("Response:", res.data);
      setAuth(res.data.user, res.data.token);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Email ou mot de passe incorrect",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="login-box">
        {/* LEFT SIDE */}
        <div className="left">
          <div className="brand">
            <span className="brand-name">RecruitScore</span>
          </div>
          <h1>
            BIENVENUE
            <br />
            SUR LA
            <br />
            PLATEFORME
          </h1>
          <p>
            Gérez et évaluez vos candidatures de stagiaires avec un système de
            scoring configurable et transparent.
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="right">
          <h2>Connexion</h2>
          <p className="subtitle">Accédez à votre espace de travail</p>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <span
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Masquer" : "Afficher"}
              </span>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <p className="footer-text">© 2026 Pixelium — RecruitScore</p>
        </div>
      </div>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap");

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .page {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f0f4f8;
          font-family: "Poppins", sans-serif;
        }

        .login-box {
          width: 720px;
          height: 460px;
          display: flex;
          border-radius: 8px;
          overflow: hidden;
          box-shadow:
            0 0 0 1.5px #2563eb,
            0 0 40px #2563eb33;
          position: relative;
        }

        .left {
          width: 55%;
          padding: 50px 40px;
          color: white;
          background: linear-gradient(
            135deg,
            #1e3a5f 0%,
            #1e40af 60%,
            #2563eb 100%
          );
          display: flex;
          flex-direction: column;
          justify-content: center;
          clip-path: polygon(0 0, 100% 0, 78% 100%, 0% 100%);
          z-index: 1;
        }

        .brand {
          margin-bottom: 28px;
        }

        .brand-name {
          font-size: 20px;
          font-weight: 700;
          color: white;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .left h1 {
          font-size: 30px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 16px;
        }

        .left p {
          font-size: 12px;
          color: #bfdbfe;
          line-height: 1.7;
        }

        .right {
          width: 55%;
          padding: 40px 45px 40px 65px;
          background: white;
          color: #1e293b;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          clip-path: polygon(12% 0, 100% 0, 100% 100%, 0% 100%);
        }

        .right h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
          color: #1e293b;
        }

        .subtitle {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 20px;
        }

        .error-msg {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #dc2626;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          margin-bottom: 16px;
        }

        .input-group {
          position: relative;
          margin-bottom: 24px;
        }

        input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid #cbd5e1;
          padding: 8px 70px 8px 0;
          color: #1e293b;
          outline: none;
          font-size: 13px;
          font-family: "Poppins", sans-serif;
        }

        input::placeholder {
          color: #94a3b8;
        }
        input:focus {
          border-bottom: 1.5px solid #2563eb;
        }

        .toggle-password {
          position: absolute;
          right: 4px;
          top: 7px;
          font-size: 11px;
          color: #2563eb;
          cursor: pointer;
          user-select: none;
          font-weight: 600;
        }

        .toggle-password:hover {
          color: #1d4ed8;
        }

        button {
          width: 100%;
          padding: 11px;
          border: none;
          border-radius: 25px;
          background: linear-gradient(90deg, #2563eb, #1d4ed8);
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          font-family: "Poppins", sans-serif;
          transition:
            box-shadow 0.3s,
            opacity 0.3s;
          margin-top: 4px;
        }

        button:hover:not(:disabled) {
          box-shadow: 0 0 18px #2563eb66;
        }
        button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .footer-text {
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}
