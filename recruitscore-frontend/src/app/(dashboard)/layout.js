"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { initAuth, user, isReady } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace("/login");
    }
  }, [isReady, user]);

  if (!isReady) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f0f4f8",
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
  }

  if (!user) return null;

  return (
    <div style={{ display: "flex", background: "#f0f4f8", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ marginLeft: "220px", flex: 1 }}>
        <Navbar />
        <main style={{ marginTop: "60px", padding: "28px", color: "#1e293b" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
