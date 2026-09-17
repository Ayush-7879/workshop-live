import React, { useState, useEffect, useCallback } from "react";
import api, { API_URL } from "../api/axios.js";

const TYPE_ICON = { pdf: "📄", video: "🎥", link: "🔗" };

function resolveUrl(url) {
  if (!url) return url;
  return url.startsWith("/uploads/") ? `${API_URL}${url}` : url;
}

export default function AdminMaterials({ workshopId }) {
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceForm, setResourceForm] = useState({ type: "pdf", title: "", url: "" });
  const [sourceMode, setSourceMode] = useState("link"); // "link" | "upload"
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState([{ text: "", options: ["", ""], correctIndex: 0 }]);
  const [resultsOpenId, setResultsOpenId] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [resRes, quizRes] = await Promise.all([
      api.get(`/resources/workshop/${workshopId}`),
      api.get(`/quizzes/workshop/${workshopId}`),
    ]);
    setResources(resRes.data);
    setQuizzes(quizRes.data);
  }, [workshopId]);

  useEffect(() => {
    load();
  }, [load]);

  const addResource = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let url = resourceForm.url;
      if (sourceMode === "upload") {
        if (!uploadFile) {
          setError("Please choose a file to upload");
          return;
        }
        setUploading(true);
        const formData = new FormData();
        formData.append("file", uploadFile);
        const { data } = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        url = data.url;
        setUploading(false);
      }
      if (!url) {
        setError("Please provide a URL or upload a file");
        return;
      }
      await api.post("/resources", { workshopId, type: resourceForm.type, title: resourceForm.title, url });
      setResourceForm({ type: "pdf", title: "", url: "" });
      setUploadFile(null);
      setShowResourceForm(false);
      load();
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.message || "Could not add resource");
    }
  };

  const deleteResource = async (id) => {
    if (!confirm("Remove this material?")) return;
    await api.delete(`/resources/${id}`);
    load();
  };

  const updateQuestion = (idx, patch) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };
  const updateOption = (qIdx, optIdx, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const options = [...q.options];
        options[optIdx] = value;
        return { ...q, options };
      })
    );
  };
  const addOption = (qIdx) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx && q.options.length < 6 ? { ...q, options: [...q.options, ""] } : q))
    );
  };
  const addQuestion = () => {
    setQuestions((prev) => [...prev, { text: "", options: ["", ""], correctIndex: 0 }]);
  };
  const removeQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const createQuiz = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/quizzes", { workshopId, title: quizTitle, questions });
      setQuizTitle("");
      setQuestions([{ text: "", options: ["", ""], correctIndex: 0 }]);
      setShowQuizForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create quiz");
    }
  };

  const deleteQuiz = async (id) => {
    if (!confirm("Delete this quiz and all its results?")) return;
    await api.delete(`/quizzes/${id}`);
    load();
  };

  const viewResults = async (quizId) => {
    if (resultsOpenId === quizId) {
      setResultsOpenId(null);
      return;
    }
    const { data } = await api.get(`/quizzes/${quizId}/results`);
    setResults(data);
    setResultsOpenId(quizId);
  };

  return (
    <div className="materials-panel">
      {error && <div className="error-text">{error}</div>}

      <div className="materials-section">
        <div className="materials-section-head">
          <strong>📚 Course Materials</strong>
          <button className="btn btn-secondary" style={{ padding: "6px 12px", marginTop: 0 }} onClick={() => setShowResourceForm((s) => !s)}>
            {showResourceForm ? "Cancel" : "+ Add Material"}
          </button>
        </div>

        {showResourceForm && (
          <form onSubmit={addResource} className="inline-form">
            <select
              value={resourceForm.type}
              onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
            >
              <option value="pdf">📄 PDF</option>
              <option value="video">🎥 Video</option>
              <option value="link">🔗 Link</option>
            </select>
            <input
              placeholder="Title (e.g. Session 1 Slides)"
              value={resourceForm.title}
              onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
              required
            />

            <div className="source-toggle">
              <button
                type="button"
                className={sourceMode === "link" ? "active" : ""}
                onClick={() => setSourceMode("link")}
              >
                🔗 Paste a Link
              </button>
              <button
                type="button"
                className={sourceMode === "upload" ? "active" : ""}
                onClick={() => setSourceMode("upload")}
              >
                💻 Upload from Computer
              </button>
            </div>

            {sourceMode === "link" ? (
              <input
                placeholder="URL (Google Drive / YouTube / any link)"
                value={resourceForm.url}
                onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                required={sourceMode === "link"}
              />
            ) : (
              <input
                type="file"
                accept=".pdf,.mp4,.webm,.mov,.mkv,image/*"
                onChange={(e) => setUploadFile(e.target.files[0] || null)}
              />
            )}

            <button className="btn btn-success" disabled={uploading}>
              {uploading ? "Uploading..." : "Add"}
            </button>
          </form>
        )}

        {resources.length === 0 && !showResourceForm && (
          <p className="materials-empty">No materials added yet.</p>
        )}
        {resources.map((r) => (
          <div className="material-item" key={r._id}>
            <a href={resolveUrl(r.url)} target="_blank" rel="noreferrer">
              {TYPE_ICON[r.type]} {r.title} {r.url.startsWith("/uploads/") && <span className="badge-tiny">uploaded</span>}
            </a>
            <button className="btn btn-secondary" style={{ padding: "4px 10px", marginTop: 0 }} onClick={() => deleteResource(r._id)}>
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="materials-section">
        <div className="materials-section-head">
          <strong>📝 Quiz</strong>
          {quizzes.length === 0 && (
            <button className="btn btn-secondary" style={{ padding: "6px 12px", marginTop: 0 }} onClick={() => setShowQuizForm((s) => !s)}>
              {showQuizForm ? "Cancel" : "+ Create Quiz"}
            </button>
          )}
        </div>

        {showQuizForm && (
          <form onSubmit={createQuiz} className="quiz-builder">
            <input
              placeholder="Quiz title (e.g. Session 1 Quiz)"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              required
            />
            {questions.map((q, qIdx) => (
              <div className="quiz-question-block" key={qIdx}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={{ marginBottom: 8 }}
                    placeholder={`Question ${qIdx + 1}`}
                    value={q.text}
                    onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                    required
                  />
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "6px 10px", marginTop: -8 }}
                      onClick={() => removeQuestion(qIdx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {q.options.map((opt, optIdx) => (
                  <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name={`correct-${qIdx}`}
                      checked={q.correctIndex === optIdx}
                      onChange={() => updateQuestion(qIdx, { correctIndex: optIdx })}
                    />
                    <input
                      style={{ marginBottom: 6 }}
                      placeholder={`Option ${optIdx + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                      required
                    />
                  </div>
                ))}
                {q.options.length < 6 && (
                  <button type="button" className="btn btn-secondary" style={{ padding: "5px 10px" }} onClick={() => addOption(qIdx)}>
                    + Option
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addQuestion}>
              + Add Question
            </button>
            <div>
              <button className="btn btn-primary">Save Quiz</button>
            </div>
          </form>
        )}

        {quizzes.map((quiz) => (
          <div key={quiz._id} className="material-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>📝 {quiz.title} ({quiz.questions.length} questions)</span>
              <span>
                <button className="btn btn-secondary" style={{ padding: "6px 10px", marginTop: 0 }} onClick={() => viewResults(quiz._id)}>
                  {resultsOpenId === quiz._id ? "Hide Results" : "View Results"}
                </button>
                <button className="btn btn-secondary" style={{ padding: "6px 10px", marginTop: 0 }} onClick={() => deleteQuiz(quiz._id)}>
                  🗑
                </button>
              </span>
            </div>
            {resultsOpenId === quiz._id && (
              <table className="student-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={3}>No submissions yet.</td>
                    </tr>
                  )}
                  {results.map((r) => (
                    <tr key={r._id}>
                      <td>{r.student?.name}</td>
                      <td>{r.student?.email}</td>
                      <td>
                        {r.score} / {r.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
