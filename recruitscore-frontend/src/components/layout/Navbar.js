"use client";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";
import api from "@/lib/axios";

const roleLabels = {
  admin: "Administrateur",
  rh: "Responsable RH",
  manager: "Manager Technique",
  evaluator: "Evaluateur",
  reader: "Lecteur",
};

export default function Navbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    logout();
    router.push("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="welcome">
          Bonjour,{" "}
          <strong>
            {user?.firstName} {user?.lastName}
          </strong>
        </span>
      </div>

      <div className="navbar-right">
        <div className="user-info">
          <div className="user-avatar">
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </div>
          <div className="user-details">
            <span className="user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="user-role">{roleLabels[user?.role]}</span>
          </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>

      <style jsx>{`
        .navbar {
          height: 60px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          position: fixed;
          top: 0;
          left: 220px;
          right: 0;
          z-index: 99;
          box-shadow: 0 1px 4px #2563eb11;
        }

        .navbar-left .welcome {
          font-size: 13px;
          color: #64748b;
          font-family: "Poppins", sans-serif;
        }

        .navbar-left .welcome strong {
          color: #1e293b;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1e3a5f, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: white;
          font-family: "Poppins", sans-serif;
          text-transform: uppercase;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          font-family: "Poppins", sans-serif;
        }

        .user-role {
          font-size: 11px;
          color: #2563eb;
          font-family: "Poppins", sans-serif;
        }

        .logout-btn {
          padding: 7px 16px;
          border: 1px solid #2563eb;
          border-radius: 20px;
          background: transparent;
          color: #2563eb;
          font-size: 12px;
          font-weight: 600;
          font-family: "Poppins", sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #2563eb;
          color: white;
        }
      `}</style>
    </header>
  );
}
