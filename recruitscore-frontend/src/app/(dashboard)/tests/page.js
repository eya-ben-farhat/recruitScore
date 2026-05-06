"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";

const statusColors = {
  draft: { bg: "#f8fafc", color: "#64748b" },
  active: { bg: "#ecfdf5", color: "#059669" },
  closed: { bg: "#fef2f2", color: "#dc2626" },
};

const statusLabels = {
  draft: "Brouillon",
  active: "Actif",
  closed: "Fermé",
};

const difficultyColors = {
  easy: { bg: "#ecfdf5", color: "#059669" },
  medium: { bg: "#fffbeb", color: "#d97706" },
  hard: { bg: "#fef2f2", color: "#dc2626" },
  mixed: { bg: "#f5f3ff", color: "#7c3aed" },
};

const typeLabels = {
  qcm: "QCM",
  open: "Ouverte",
  practical: "Pratique",
  code: "Code",
};

const themeLabels = {
  algorithmique: "Algorithmique",
  web: "Web",
  DB: "Base de données",
  réseau: "Réseau",
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

export default function TestsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("tests");
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [bankStats, setBankStats] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalQ, setTotalQ] = useState(0);

  const [statusFilter, setStatusFilter] = useState("");
  const [pageT, setPageT] = useState(1);

  const [themeFilter, setThemeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [diffFilter, setDiffFilter] = useState("");
  const [pageQ, setPageQ] = useState(1);

  const [showTestModal, setShowTestModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editTest, setEditTest] = useState(null);
  const [editQuestion, setEditQuestion] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiForm, setAIForm] = useState({
    jobDescription: "",
    totalQuestions: 10,
    difficulty: "mixed",
  });
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState("");
  const [aiResult, setAIResult] = useState(null);
  const [error, setError] = useState("");

  const canWrite =
    (user?.role === "admin" || user?.role === "manager") &&
    user?.role !== "evaluator";
  const canDelete = user?.role === "admin";

  const emptyTest = {
    title: "",
    description: "",
    targetRole: "",
    duration: "",
    assignedCandidates: [],
    scoringTemplateId: "",
    generationCriteria: {
      totalQuestions: "",
      themes: [],
      difficulty: "mixed",
    },
  };
  const [testForm, setTestForm] = useState(emptyTest);

  const emptyQuestion = {
    type: "qcm",
    content: "",
    theme: "algorithmique",
    difficulty: "medium",
    targetSkill: "",
    points: "",
    explanation: "",
    programmingLanguage: "",
    options: [
      { label: "", isCorrect: false },
      { label: "", isCorrect: false },
    ],
  };
  const [questionForm, setQuestionForm] = useState(emptyQuestion);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageT, limit: 10 });
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.get("/tests?" + params);
      setTests(res.data.tests || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageQ, limit: 10 });
      if (themeFilter) params.append("theme", themeFilter);
      if (typeFilter) params.append("type", typeFilter);
      if (diffFilter) params.append("difficulty", diffFilter);
      const res = await api.get("/questions?" + params);
      setQuestions(res.data.questions || []);
      setTotalQ(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankStats = async () => {
    if (!["admin", "manager"].includes(user?.role)) return;
    try {
      const res = await api.get("/questions/stats");
      setBankStats(res.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await api.get("/candidates?limit=100");
      setCandidates(res.data.candidates || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/templates?limit=100");
      setTemplates(res.data.templates || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchCandidates();
    fetchBankStats();
    fetchTemplates();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (activeTab === "tests") fetchTests();
    if (activeTab === "questions") fetchQuestions();
  }, [
    token,
    activeTab,
    pageT,
    pageQ,
    statusFilter,
    themeFilter,
    typeFilter,
    diffFilter,
  ]);

  const openCreateTest = () => {
    setEditTest(null);
    setTestForm(emptyTest);
    setError("");
    setShowTestModal(true);
  };

  const openEditTest = (test) => {
    setEditTest(test);
    setTestForm({
      title: test.title,
      description: test.description || "",
      targetRole: test.targetRole || "",
      duration: test.duration || "",
      assignedCandidates: (test.assignedCandidates || []).map(
        (c) => c._id || c,
      ),
      scoringTemplateId:
        test.scoringTemplateId?._id || test.scoringTemplateId || "",
      generationCriteria: {
        totalQuestions: test.generationCriteria?.totalQuestions || "",
        themes: test.generationCriteria?.themes || [],
        difficulty: test.generationCriteria?.difficulty || "mixed",
      },
    });
    setError("");
    setShowTestModal(true);
  };

  const openDetailTest = async (test) => {
    try {
      const res = await api.get("/tests/" + test._id);
      setSelectedTest(res.data.test);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCandidate = (candidateId) => {
    setTestForm((prev) => ({
      ...prev,
      assignedCandidates: prev.assignedCandidates.includes(candidateId)
        ? prev.assignedCandidates.filter((id) => id !== candidateId)
        : [...prev.assignedCandidates, candidateId],
    }));
  };

  const handleGenerateWithAI = async () => {
    setAIError("");
    setAIResult(null);
    if (!aiForm.jobDescription || aiForm.jobDescription.trim().length < 10)
      return setAIError(
        "La description du poste doit faire au moins 10 caractères",
      );
    setAILoading(true);
    try {
      const res = await api.post("/ai/generate-test", {
        jobDescription: aiForm.jobDescription,
        totalQuestions: Number(aiForm.totalQuestions),
        difficulty: aiForm.difficulty,
      });
      setAIResult(res.data.data);
      fetchTests();
    } catch (err) {
      setAIError(err.response?.data?.message || "Erreur lors de la génération");
    } finally {
      setAILoading(false);
    }
  };

  const handleSaveTest = async () => {
    setError("");
    if (!testForm.title) return setError("Le titre est obligatoire");
    if (!testForm.generationCriteria.totalQuestions)
      return setError("Le nombre de questions est obligatoire");
    setSaving(true);
    try {
      const payload = {
        title: testForm.title,
        description: testForm.description,
        targetRole: testForm.targetRole,
        duration: testForm.duration ? Number(testForm.duration) : undefined,
        assignedCandidates: testForm.assignedCandidates || [],
        scoringTemplateId: testForm.scoringTemplateId || null,
        generationCriteria: {
          totalQuestions: Number(testForm.generationCriteria.totalQuestions),
          themes: testForm.generationCriteria.themes,
          difficulty: testForm.generationCriteria.difficulty,
        },
      };
      if (editTest) {
        await api.put("/tests/" + editTest._id, payload);
      } else {
        await api.post("/tests", payload);
      }
      setShowTestModal(false);
      fetchTests();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTest = async (id) => {
    try {
      await api.post("/tests/" + id + "/generate");
      fetchTests();
      if (selectedTest?._id === id) {
        const res = await api.get("/tests/" + id);
        setSelectedTest(res.data.test);
      }
      alert("Questions générées avec succès !");
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la génération");
    }
  };

  const handleChangeStatus = async (id, status) => {
    try {
      await api.patch("/tests/" + id + "/status", { status });
      fetchTests();
      if (selectedTest?._id === id) {
        const res = await api.get("/tests/" + id);
        setSelectedTest(res.data.test);
      }
    } catch (err) {
      alert(
        err.response?.data?.message || "Erreur lors du changement de statut",
      );
    }
  };

  const handleExportPDF = async (id) => {
    try {
      await api.post("/tests/" + id + "/export-pdf");
      const fileRes = await api.get("/tests/" + id + "/download-pdf", {
        responseType: "blob",
      });
      const blob = new Blob([fileRes.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute("download", `test_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'export PDF");
    }
  };

  const handleDeleteTest = async (id) => {
    if (!confirm("Supprimer ce test ?")) return;
    try {
      await api.delete("/tests/" + id);
      fetchTests();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const toggleTheme = (theme) => {
    const themes = testForm.generationCriteria.themes;
    setTestForm((prev) => ({
      ...prev,
      generationCriteria: {
        ...prev.generationCriteria,
        themes: themes.includes(theme)
          ? themes.filter((t) => t !== theme)
          : [...themes, theme],
      },
    }));
  };

  const openCreateQuestion = () => {
    setEditQuestion(null);
    setQuestionForm(emptyQuestion);
    setError("");
    setShowQuestionModal(true);
  };

  const openEditQuestion = (q) => {
    setEditQuestion(q);
    setQuestionForm({
      type: q.type,
      content: q.content,
      theme: q.theme,
      difficulty: q.difficulty,
      targetSkill: q.targetSkill || "",
      points: q.points,
      explanation: q.explanation || "",
      programmingLanguage: q.programmingLanguage || "",
      options:
        q.options?.length > 0
          ? q.options
          : [
              { label: "", isCorrect: false },
              { label: "", isCorrect: false },
            ],
    });
    setError("");
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    setError("");
    if (!questionForm.content) return setError("Le contenu est obligatoire");
    if (!questionForm.points) return setError("Les points sont obligatoires");
    if (questionForm.type === "qcm") {
      if (questionForm.options.filter((o) => o.label).length < 2)
        return setError("Au moins 2 options requises");
      if (!questionForm.options.some((o) => o.isCorrect))
        return setError("Au moins une réponse correcte requise");
    }
    if (questionForm.type === "code" && !questionForm.programmingLanguage)
      return setError("Le langage est obligatoire pour une question de code");

    setSaving(true);
    try {
      const payload = {
        type: questionForm.type,
        content: questionForm.content,
        theme: questionForm.theme,
        difficulty: questionForm.difficulty,
        targetSkill: questionForm.targetSkill || undefined,
        points: Number(questionForm.points),
        explanation: questionForm.explanation || undefined,
        programmingLanguage:
          questionForm.type === "code"
            ? questionForm.programmingLanguage
            : undefined,
        options:
          questionForm.type === "qcm"
            ? questionForm.options.filter((o) => o.label)
            : [],
      };
      if (editQuestion) {
        await api.put("/questions/" + editQuestion._id, payload);
      } else {
        await api.post("/questions", payload);
      }
      setShowQuestionModal(false);
      fetchQuestions();
      fetchBankStats();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleQuestion = async (id) => {
    try {
      await api.patch("/questions/" + id + "/toggle");
      fetchQuestions();
      fetchBankStats();
    } catch (err) {
      alert("Erreur");
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm("Supprimer cette question ?")) return;
    try {
      await api.delete("/questions/" + id);
      fetchQuestions();
      fetchBankStats();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const addOption = () =>
    setQuestionForm((prev) => ({
      ...prev,
      options: [...prev.options, { label: "", isCorrect: false }],
    }));
  const removeOption = (i) =>
    setQuestionForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== i),
    }));
  const updateOption = (i, field, value) => {
    const updated = [...questionForm.options];
    updated[i][field] = value;
    setQuestionForm((prev) => ({ ...prev, options: updated }));
  };

  const pagesT = Math.ceil(total / 10);
  const pagesQ = Math.ceil(totalQ / 10);

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
            Tests d'Évaluation
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            Gestion des tests et banque de questions
          </p>
        </div>
        {canWrite && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                setShowAIModal(true);
                setAIError("");
                setAIResult(null);
                setAIForm({
                  jobDescription: "",
                  totalQuestions: 10,
                  difficulty: "mixed",
                });
              }}
              style={{
                padding: "9px 18px",
                background: "#7c3aed",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Générer avec IA
            </button>
            <button
              onClick={
                activeTab === "tests" ? openCreateTest : openCreateQuestion
              }
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
              {activeTab === "tests" ? "+ Nouveau Test" : "+ Nouvelle Question"}
            </button>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "20px",
          background: "white",
          borderRadius: "12px",
          padding: "6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          width: "fit-content",
        }}
      >
        {[
          { key: "tests", label: "Tests" },
          ...(["admin", "manager"].includes(user?.role)
            ? [{ key: "questions", label: "Banque de Questions" }]
            : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === tab.key ? "#2563eb" : "transparent",
              color: activeTab === tab.key ? "white" : "#64748b",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== ONGLET TESTS ===== */}
      {activeTab === "tests" && (
        <>
          {/* Filtres */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px 20px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              marginBottom: "16px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPageT(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="active">Actif</option>
              <option value="closed">Fermé</option>
            </select>
          </div>

          {/* Liste tests */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {loading ? (
              <p
                style={{
                  color: "#94a3b8",
                  gridColumn: "span 3",
                  textAlign: "center",
                  padding: "40px",
                }}
              >
                Chargement...
              </p>
            ) : tests.length === 0 ? (
              <div
                style={{
                  gridColumn: "span 3",
                  textAlign: "center",
                  padding: "60px",
                  background: "white",
                  borderRadius: "12px",
                  color: "#94a3b8",
                }}
              >
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    marginBottom: "8px",
                  }}
                >
                  Aucun test créé
                </p>
                <p style={{ fontSize: "13px" }}>
                  Créez votre premier test d'évaluation
                </p>
              </div>
            ) : (
              tests.map((test) => (
                <div
                  key={test._id}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    borderTop:
                      "3px solid " +
                      (statusColors[test.status]?.color || "#e2e8f0"),
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
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#1e293b",
                        flex: 1,
                      }}
                    >
                      {test.title}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginLeft: "8px",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "99px",
                          fontSize: "10px",
                          fontWeight: "700",
                          background: statusColors[test.status]?.bg,
                          color: statusColors[test.status]?.color,
                        }}
                      >
                        {statusLabels[test.status]}
                      </span>
                      {/*  CHANGE 3: Badge IA */}
                      {test.generatedByAI && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            fontSize: "10px",
                            fontWeight: "700",
                            background: "#f5f3ff",
                            color: "#7c3aed",
                            marginLeft: "4px",
                          }}
                        >
                          IA
                        </span>
                      )}
                    </div>
                  </div>

                  {test.targetRole && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginBottom: "8px",
                      }}
                    >
                      {test.targetRole}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginBottom: "12px",
                    }}
                  >
                    <span>{test.questions?.length || 0} questions</span>
                    {test.totalPoints > 0 && (
                      <span>{test.totalPoints} pts</span>
                    )}
                    {test.duration && <span>{test.duration} min</span>}
                  </div>

                  {test.assignedCandidates?.length > 0 && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#2563eb",
                        marginBottom: "12px",
                        fontWeight: "500",
                      }}
                    >
                      {test.assignedCandidates.length} candidat
                      {test.assignedCandidates.length > 1 ? "s" : ""} assigné
                      {test.assignedCandidates.length > 1 ? "s" : ""}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      borderTop: "1px solid #f1f5f9",
                      paddingTop: "12px",
                    }}
                  >
                    <button
                      onClick={() => openDetailTest(test)}
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
                    {canWrite && test.status === "draft" && (
                      <button
                        onClick={() => openEditTest(test)}
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
                    {/* CHANGE 1: Générer only for non-AI tests, Activer for AI tests */}
                    {canWrite &&
                      test.status === "draft" &&
                      !test.generatedByAI && (
                        <button
                          onClick={() => handleGenerateTest(test._id)}
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
                          Générer
                        </button>
                      )}
                    {canWrite &&
                      test.status === "draft" &&
                      test.generatedByAI &&
                      test.questions?.length > 0 && (
                        <button
                          onClick={() => handleChangeStatus(test._id, "active")}
                          style={{
                            flex: 1,
                            padding: "6px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#ecfdf5",
                            color: "#059669",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          Activer
                        </button>
                      )}
                    {canWrite && test.status === "active" && (
                      <>
                        <button
                          onClick={() => handleExportPDF(test._id)}
                          style={{
                            flex: 1,
                            padding: "6px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#f5f3ff",
                            color: "#7c3aed",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleChangeStatus(test._id, "closed")}
                          style={{
                            flex: 1,
                            padding: "6px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#fef2f2",
                            color: "#dc2626",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          Fermer
                        </button>
                      </>
                    )}
                    {canDelete && test.status !== "active" && (
                      <button
                        onClick={() => handleDeleteTest(test._id)}
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
              ))
            )}
          </div>

          {/* Pagination tests */}
          {pagesT > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              <button
                onClick={() => setPageT((p) => Math.max(1, p - 1))}
                disabled={pageT === 1}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  fontSize: "12px",
                  cursor: pageT === 1 ? "not-allowed" : "pointer",
                  opacity: pageT === 1 ? 0.5 : 1,
                }}
              >
                Précédent
              </button>
              {Array.from({ length: pagesT }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPageT(p)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    border: p === pageT ? "none" : "1px solid #e2e8f0",
                    background: p === pageT ? "#2563eb" : "white",
                    color: p === pageT ? "white" : "#64748b",
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPageT((p) => Math.min(pagesT, p + 1))}
                disabled={pageT === pagesT}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  fontSize: "12px",
                  cursor: pageT === pagesT ? "not-allowed" : "pointer",
                  opacity: pageT === pagesT ? 0.5 : 1,
                }}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== ONGLET QUESTIONS ===== */}
      {activeTab === "questions" && (
        <>
          {/* Stats banque */}
          {bankStats && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              {[
                {
                  label: "Total Questions",
                  value: bankStats.total,
                  color: "#2563eb",
                },
                { label: "Actives", value: bankStats.active, color: "#059669" },
                {
                  label: "Inactives",
                  value: bankStats.inactive,
                  color: "#d97706",
                },
                {
                  label: "Thèmes",
                  value: bankStats.byTheme?.length || 0,
                  color: "#7c3aed",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    borderLeft: "4px solid " + s.color,
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Filtres questions */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px 20px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              marginBottom: "16px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <select
              value={themeFilter}
              onChange={(e) => {
                setThemeFilter(e.target.value);
                setPageQ(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Tous les thèmes</option>
              {Object.entries(themeLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPageQ(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Tous les types</option>
              {Object.entries(typeLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={diffFilter}
              onChange={(e) => {
                setDiffFilter(e.target.value);
                setPageQ(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontFamily: "Poppins, sans-serif",
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Toutes les difficultés</option>
              <option value="easy">Facile</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile</option>
            </select>
          </div>

          {/* Liste questions */}
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
                    "Question",
                    "Type",
                    "Thème",
                    "Difficulté",
                    "Points",
                    "Statut",
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
                ) : questions.length === 0 ? (
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
                      Aucune question trouvée
                    </td>
                  </tr>
                ) : (
                  questions.map((q, i) => (
                    <tr
                      key={q._id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: i % 2 === 0 ? "white" : "#fafafa",
                      }}
                    >
                      <td style={{ padding: "12px 16px", maxWidth: "300px" }}>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#1e293b",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {q.content}
                        </p>
                        {q.targetSkill && (
                          <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                            {q.targetSkill}
                          </p>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
                          {typeLabels[q.type]}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        {themeLabels[q.theme] || q.theme}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            fontSize: "11px",
                            fontWeight: "600",
                            background: difficultyColors[q.difficulty]?.bg,
                            color: difficultyColors[q.difficulty]?.color,
                          }}
                        >
                          {q.difficulty === "easy"
                            ? "Facile"
                            : q.difficulty === "medium"
                              ? "Moyen"
                              : "Difficile"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "#2563eb",
                        }}
                      >
                        {q.points} pts
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            fontSize: "11px",
                            fontWeight: "600",
                            background: q.isActive ? "#ecfdf5" : "#fef2f2",
                            color: q.isActive ? "#059669" : "#dc2626",
                          }}
                        >
                          {q.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {canWrite && (
                            <button
                              onClick={() => openEditQuestion(q)}
                              style={{
                                padding: "4px 10px",
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
                          )}
                          {canWrite && (
                            <button
                              onClick={() => handleToggleQuestion(q._id)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "none",
                                background: q.isActive ? "#fffbeb" : "#ecfdf5",
                                color: q.isActive ? "#d97706" : "#059669",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer",
                                fontFamily: "Poppins, sans-serif",
                              }}
                            >
                              {q.isActive ? "Désactiver" : "Activer"}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteQuestion(q._id)}
                              style={{
                                padding: "4px 8px",
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
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination questions */}
            {pagesQ > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "16px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  onClick={() => setPageQ((p) => Math.max(1, p - 1))}
                  disabled={pageQ === 1}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: "white",
                    color: "#64748b",
                    fontSize: "12px",
                    cursor: pageQ === 1 ? "not-allowed" : "pointer",
                    opacity: pageQ === 1 ? 0.5 : 1,
                  }}
                >
                  Précédent
                </button>
                {Array.from({ length: pagesQ }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPageQ(p)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: p === pageQ ? "none" : "1px solid #e2e8f0",
                      background: p === pageQ ? "#2563eb" : "white",
                      color: p === pageQ ? "white" : "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPageQ((p) => Math.min(pagesQ, p + 1))}
                  disabled={pageQ === pagesQ}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: "white",
                    color: "#64748b",
                    fontSize: "12px",
                    cursor: pageQ === pagesQ ? "not-allowed" : "pointer",
                    opacity: pageQ === pagesQ ? 0.5 : 1,
                  }}
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== MODAL CRÉATION/MODIFICATION TEST ===== */}
      {showTestModal && (
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
                {editTest ? "Modifier le Test" : "Nouveau Test"}
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
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
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>
                  Titre <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={testForm.title}
                  onChange={(e) =>
                    setTestForm({ ...testForm, title: e.target.value })
                  }
                  placeholder="Ex: Test Technique Dev Backend"
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={testForm.description}
                  onChange={(e) =>
                    setTestForm({ ...testForm, description: e.target.value })
                  }
                  placeholder="Description du test..."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Poste cible</label>
                <input
                  type="text"
                  value={testForm.targetRole}
                  onChange={(e) =>
                    setTestForm({ ...testForm, targetRole: e.target.value })
                  }
                  placeholder="Ex: dev backend"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Durée (minutes)</label>
                <input
                  type="number"
                  value={testForm.duration}
                  onChange={(e) =>
                    setTestForm({ ...testForm, duration: e.target.value })
                  }
                  placeholder="60"
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>
                  Assigner des candidats{" "}
                  <span style={{ color: "#64748b", fontWeight: "400" }}>
                    ({testForm.assignedCandidates.length} sélectionné
                    {testForm.assignedCandidates.length > 1 ? "s" : ""})
                  </span>
                </label>
                <div
                  style={{
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "8px",
                    maxHeight: "160px",
                    overflowY: "auto",
                    background: "white",
                  }}
                >
                  {candidates.map((c) => (
                    <label
                      key={c._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: "13px",
                        color: "#1e293b",
                        background: testForm.assignedCandidates.includes(c._id)
                          ? "#eff6ff"
                          : "white",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={testForm.assignedCandidates.includes(c._id)}
                        onChange={() => toggleCandidate(c._id)}
                        style={{
                          cursor: "pointer",
                          width: "14px",
                          height: "14px",
                        }}
                      />
                      <span
                        style={{
                          fontWeight: testForm.assignedCandidates.includes(
                            c._id,
                          )
                            ? "600"
                            : "400",
                        }}
                      >
                        {c.personalInfo?.firstName} {c.personalInfo?.lastName}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {c.personalInfo?.email}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Template de Scoring</label>
                <select
                  value={testForm.scoringTemplateId}
                  onChange={(e) =>
                    setTestForm({
                      ...testForm,
                      scoringTemplateId: e.target.value,
                    })
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">-- Template par défaut --</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                      {t.targetRole ? ` — ${t.targetRole}` : ""}
                      {t.isDefault ? " " : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Critères génération */}
              <div
                style={{
                  gridColumn: "span 2",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "14px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Critères de Génération Automatique
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      Nombre de questions{" "}
                      <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={testForm.generationCriteria.totalQuestions}
                      onChange={(e) =>
                        setTestForm((prev) => ({
                          ...prev,
                          generationCriteria: {
                            ...prev.generationCriteria,
                            totalQuestions: e.target.value,
                          },
                        }))
                      }
                      placeholder="10"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Difficulté</label>
                    <select
                      value={testForm.generationCriteria.difficulty}
                      onChange={(e) =>
                        setTestForm((prev) => ({
                          ...prev,
                          generationCriteria: {
                            ...prev.generationCriteria,
                            difficulty: e.target.value,
                          },
                        }))
                      }
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="mixed">Mixte</option>
                      <option value="easy">Facile</option>
                      <option value="medium">Moyen</option>
                      <option value="hard">Difficile</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={labelStyle}>
                      Thèmes (laisser vide pour tous)
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap",
                        marginTop: "4px",
                      }}
                    >
                      {Object.entries(themeLabels).map(([v, l]) => (
                        <label
                          key={v}
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
                            checked={testForm.generationCriteria.themes.includes(
                              v,
                            )}
                            onChange={() => toggleTheme(v)}
                            style={{
                              cursor: "pointer",
                              width: "14px",
                              height: "14px",
                            }}
                          />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>
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
                onClick={() => setShowTestModal(false)}
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
                onClick={handleSaveTest}
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
                  : editTest
                    ? "Mettre à jour"
                    : "Créer le Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DÉTAIL TEST ===== */}
      {showDetailModal && selectedTest && (
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
                alignItems: "flex-start",
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
                  {selectedTest.title}
                </h3>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "6px",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "99px",
                      fontSize: "11px",
                      fontWeight: "700",
                      background: statusColors[selectedTest.status]?.bg,
                      color: statusColors[selectedTest.status]?.color,
                    }}
                  >
                    {statusLabels[selectedTest.status]}
                  </span>
                  {/*  CHANGE 3: Badge IA in detail modal header */}
                  {selectedTest.generatedByAI && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "99px",
                        fontSize: "10px",
                        fontWeight: "700",
                        background: "#f5f3ff",
                        color: "#7c3aed",
                      }}
                    >
                      IA
                    </span>
                  )}
                  {selectedTest.targetRole && (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {selectedTest.targetRole}
                    </span>
                  )}
                </div>
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

            {/* Infos */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {[
                {
                  label: "Questions",
                  value: selectedTest.questions?.length || 0,
                },
                { label: "Total Points", value: selectedTest.totalPoints || 0 },
                {
                  label: "Durée",
                  value: selectedTest.duration
                    ? selectedTest.duration + " min"
                    : "—",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8fafc",
                    borderRadius: "8px",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginBottom: "4px",
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#1e293b",
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {selectedTest.assignedCandidates?.length > 0 && (
              <div
                style={{
                  background: "#eff6ff",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#2563eb",
                    fontWeight: "600",
                    marginBottom: "6px",
                  }}
                >
                  Candidats assignés ({selectedTest.assignedCandidates.length})
                </p>
                {selectedTest.assignedCandidates.map((c, i) => (
                  <p key={i} style={{ fontSize: "12px", color: "#1e293b" }}>
                    • {c.personalInfo?.firstName} {c.personalInfo?.lastName}
                  </p>
                ))}
                {selectedTest.scoringTemplateId && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#7c3aed",
                      marginTop: "8px",
                      fontWeight: "600",
                    }}
                  >
                    Template :{" "}
                    {selectedTest.scoringTemplateId.name ||
                      selectedTest.scoringTemplateId}
                  </p>
                )}
              </div>
            )}

            {/*  CHANGE 2: Buttons in detail modal */}
            {canWrite && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                }}
              >
                {selectedTest.status === "draft" &&
                  !selectedTest.generatedByAI && (
                    <button
                      onClick={() => handleGenerateTest(selectedTest._id)}
                      style={{
                        padding: "8px 16px",
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
                      Générer les Questions
                    </button>
                  )}
                {selectedTest.status === "draft" &&
                  selectedTest.generatedByAI &&
                  selectedTest.questions?.length > 0 && (
                    <button
                      onClick={() =>
                        handleChangeStatus(selectedTest._id, "active")
                      }
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#ecfdf5",
                        color: "#059669",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Activer le Test IA
                    </button>
                  )}
                {selectedTest.status === "active" && (
                  <>
                    <button
                      onClick={() => handleExportPDF(selectedTest._id)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#f5f3ff",
                        color: "#7c3aed",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Exporter PDF
                    </button>
                    <button
                      onClick={() =>
                        handleChangeStatus(selectedTest._id, "closed")
                      }
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "1px solid #ef4444",
                        background: "white",
                        color: "#ef4444",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Fermer le Test
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Questions */}
            {selectedTest.questions?.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Questions ({selectedTest.questions.length})
                </p>
                {selectedTest.questions.map((q, i) => {
                  const question = q.questionId;
                  if (!question) return null;
                  return (
                    <div
                      key={i}
                      style={{
                        border: "1px solid #f1f5f9",
                        borderRadius: "10px",
                        padding: "14px",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#94a3b8",
                            }}
                          >
                            Q{i + 1}
                          </span>
                          <span
                            style={{
                              padding: "1px 6px",
                              borderRadius: "99px",
                              background: "#f1f5f9",
                              color: "#475569",
                              fontSize: "10px",
                              fontWeight: "600",
                            }}
                          >
                            {typeLabels[question.type]}
                          </span>
                          <span
                            style={{
                              padding: "1px 6px",
                              borderRadius: "99px",
                              fontSize: "10px",
                              fontWeight: "600",
                              background:
                                difficultyColors[question.difficulty]?.bg,
                              color:
                                difficultyColors[question.difficulty]?.color,
                            }}
                          >
                            {question.difficulty === "easy"
                              ? "Facile"
                              : question.difficulty === "medium"
                                ? "Moyen"
                                : "Difficile"}
                          </span>
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                            {themeLabels[question.theme]}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "#2563eb",
                          }}
                        >
                          {q.points} pts
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#1e293b",
                          lineHeight: "1.6",
                        }}
                      >
                        {question.content}
                      </p>
                      {question.type === "qcm" &&
                        question.options?.length > 0 && (
                          <div style={{ marginTop: "8px" }}>
                            {question.options.map((opt, j) => (
                              <div
                                key={j}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  marginBottom: "4px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: "#94a3b8",
                                  }}
                                >
                                  {String.fromCharCode(65 + j)}.
                                </span>
                                <span
                                  style={{ fontSize: "12px", color: "#64748b" }}
                                >
                                  {opt.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      {question.type === "code" &&
                        question.programmingLanguage && (
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#7c3aed",
                              marginTop: "6px",
                              fontWeight: "500",
                            }}
                          >
                            Langage : {question.programmingLanguage}
                          </p>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL CRÉATION/MODIFICATION QUESTION ===== */}
      {showQuestionModal && (
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
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                {editQuestion ? "Modifier la Question" : "Nouvelle Question"}
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
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
                  Type <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={questionForm.type}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, type: e.target.value })
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="qcm">QCM</option>
                  <option value="open">Question Ouverte</option>
                  <option value="practical">Exercice Pratique</option>
                  <option value="code">Question de Code</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Thème <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={questionForm.theme}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, theme: e.target.value })
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {Object.entries(themeLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Difficulté <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={questionForm.difficulty}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      difficulty: e.target.value,
                    })
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="easy">Facile</option>
                  <option value="medium">Moyen</option>
                  <option value="hard">Difficile</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Points <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={questionForm.points}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, points: e.target.value })
                  }
                  placeholder="5"
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>
                  Contenu de la question{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  value={questionForm.content}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      content: e.target.value,
                    })
                  }
                  placeholder="Énoncé de la question..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div>
                <label style={labelStyle}>Compétence ciblée</label>
                <input
                  type="text"
                  value={questionForm.targetSkill}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      targetSkill: e.target.value,
                    })
                  }
                  placeholder="Ex: React, SQL..."
                  style={inputStyle}
                />
              </div>

              {questionForm.type === "code" && (
                <div>
                  <label style={labelStyle}>
                    Langage <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={questionForm.programmingLanguage}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        programmingLanguage: e.target.value,
                      })
                    }
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="sql">SQL</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              )}

              {questionForm.type === "qcm" && (
                <div style={{ gridColumn: "span 2" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <label style={labelStyle}>
                      Options <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addOption}
                      style={{
                        fontSize: "11px",
                        color: "#2563eb",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "700",
                      }}
                    >
                      + Ajouter
                    </button>
                  </div>
                  {questionForm.options.map((opt, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={opt.isCorrect}
                        onChange={(e) =>
                          updateOption(i, "isCorrect", e.target.checked)
                        }
                        title="Réponse correcte"
                        style={{
                          cursor: "pointer",
                          width: "16px",
                          height: "16px",
                          flexShrink: 0,
                        }}
                      />
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) =>
                          updateOption(i, "label", e.target.value)
                        }
                        placeholder={"Option " + (i + 1)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      {questionForm.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #fca5a5",
                            background: "#fef2f2",
                            color: "#ef4444",
                            fontSize: "12px",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Cochez les réponses correctes
                  </p>
                </div>
              )}

              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Explication de la réponse</label>
                <textarea
                  value={questionForm.explanation}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      explanation: e.target.value,
                    })
                  }
                  placeholder="Explication de la réponse correcte..."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
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
                onClick={() => setShowQuestionModal(false)}
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
                onClick={handleSaveQuestion}
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
                  : editQuestion
                    ? "Mettre à jour"
                    : "Créer la Question"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL GÉNÉRATION IA ===== */}
      {showAIModal && (
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
              maxWidth: "560px",
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
                  Générer un Test avec l'IA
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginTop: "4px",
                  }}
                >
                  Les questions générées sont ajoutées à la banque et un test
                  draft est créé
                </p>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
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

            {aiError && (
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
                {aiError}
              </div>
            )}

            {aiResult ? (
              <div>
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #6ee7b7",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#059669",
                      marginBottom: "8px",
                    }}
                  >
                    Test généré avec succès !
                  </p>
                  <p style={{ fontSize: "13px", color: "#1e293b" }}>
                    <strong>Titre :</strong> {aiResult.test?.title}
                  </p>
                  <p style={{ fontSize: "13px", color: "#1e293b" }}>
                    <strong>Poste :</strong> {aiResult.test?.targetRole}
                  </p>
                  <p style={{ fontSize: "13px", color: "#1e293b" }}>
                    <strong>Questions ajoutées à la banque :</strong>{" "}
                    {aiResult.questionsAdded}
                  </p>
                  <p style={{ fontSize: "13px", color: "#1e293b" }}>
                    <strong>Total points :</strong> {aiResult.totalPoints}
                  </p>
                  <p style={{ fontSize: "13px", color: "#1e293b" }}>
                    <strong>Thèmes :</strong> {aiResult.themes?.join(", ")}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "8px",
                      fontStyle: "italic",
                    }}
                  >
                    Le test apparaît dans la liste en statut "Brouillon".
                    Assignez des candidats et un template pour l'activer.
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowAIModal(false);
                      setAIResult(null);
                    }}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#2563eb",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    Voir les Tests
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Description du poste{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <textarea
                    value={aiForm.jobDescription}
                    onChange={(e) =>
                      setAIForm({ ...aiForm, jobDescription: e.target.value })
                    }
                    placeholder="Ex: Développeur backend Node.js avec expérience en MongoDB, API REST, et microservices. Maîtrise de Docker souhaitée..."
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginTop: "4px",
                    }}
                  >
                    Plus la description est précise, meilleures seront les
                    questions générées
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>Nombre de questions</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={aiForm.totalQuestions}
                      onChange={(e) =>
                        setAIForm({ ...aiForm, totalQuestions: e.target.value })
                      }
                      style={inputStyle}
                    />
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        marginTop: "4px",
                      }}
                    >
                      Max 30
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Difficulté</label>
                    <select
                      value={aiForm.difficulty}
                      onChange={(e) =>
                        setAIForm({ ...aiForm, difficulty: e.target.value })
                      }
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="mixed">Mixte</option>
                      <option value="easy">Facile</option>
                      <option value="medium">Moyen</option>
                      <option value="hard">Difficile</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "12px",
                    color: "#64748b",
                    lineHeight: "1.6",
                  }}
                >
                  <strong style={{ color: "#1e293b" }}>
                    Ce qui sera créé :
                  </strong>
                  <br />• {aiForm.totalQuestions} questions ajoutées à la banque
                  de questions
                  <br />• Un test en brouillon prêt à être assigné et activé
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                    borderTop: "1px solid #f1f5f9",
                    paddingTop: "16px",
                  }}
                >
                  <button
                    onClick={() => setShowAIModal(false)}
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
                    onClick={handleGenerateWithAI}
                    disabled={aiLoading}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: aiLoading ? "#c4b5fd" : "#7c3aed",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: aiLoading ? "not-allowed" : "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {aiLoading ? "Génération en cours..." : " Générer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
