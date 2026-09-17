import React, { useState, useEffect, useCallback } from "react";
import api, { API_URL } from "../api/axios.js";

const TYPE_ICON = { pdf: "📄", video: "🎥", link: "🔗" };

function resolveUrl(url) {
  if (!url) return url;
  return url.startsWith("/uploads/") ? `${API_URL}${url}` : url;
}

export default function StudentMaterials({ workshopId }) {
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
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

  const startQuiz = (quiz) => {
    setActiveQuizId(quiz._id);
    setAnswers({});
    setError("");
  };

  const [justScored, setJustScored] = useState(null); // { quizId, score, total, earnedPoints }

  const submitQuiz = async (quiz) => {
    const answerArray = quiz.questions.map((q, i) => (answers[i] !== undefined ? answers[i] : -1));
    if (answerArray.includes(-1)) {
      setError("Please answer all questions before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post(`/quizzes/${quiz._id}/submit`, { answers: answerArray });
      // Show the score immediately from the submit response, without waiting on a reload.
      setQuizzes((prev) =>
        prev.map((q) =>
          q._id === quiz._id ? { ...q, attempted: true, myAttempt: data.attempt } : q
        )
      );
      setJustScored({ quizId: quiz._id, score: data.attempt.score, total: data.attempt.total, earnedPoints: data.earnedPoints });
      setActiveQuizId(null);
      load(); // background refresh to stay in sync with the server
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (resources.length === 0 && quizzes.length === 0) {
    return <p className="materials-empty">No materials or quizzes have been added for this workshop yet.</p>;
  }

  return (
    <div className="materials-panel">
      {resources.length > 0 && (
        <div className="materials-section">
          <strong>📚 Course Materials</strong>
          {resources.map((r) => (
            <div className="material-item" style={{ flexDirection: "column", alignItems: "stretch" }} key={r._id}>
              <a href={resolveUrl(r.url)} target="_blank" rel="noreferrer">
                {TYPE_ICON[r.type]} {r.title}
              </a>
              {r.type === "video" && r.url.startsWith("/uploads/") && (
                <video src={resolveUrl(r.url)} controls style={{ width: "100%", borderRadius: 10, marginTop: 8 }} />
              )}
            </div>
          ))}
        </div>
      )}

      {quizzes.length > 0 && (
        <div className="materials-section">
          <strong>📝 Quiz</strong>
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="material-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{quiz.title} ({quiz.questions.length} questions)</span>
                {quiz.attempted ? (
                  <span className="status-pill status-pill-success">
                    ✅ Scored {quiz.myAttempt.score}/{quiz.myAttempt.total}
                  </span>
                ) : activeQuizId !== quiz._id ? (
                  <button className="btn btn-primary" style={{ padding: "6px 14px", marginTop: 0 }} onClick={() => startQuiz(quiz)}>
                    Take Quiz
                  </button>
                ) : null}
              </div>

              {justScored && justScored.quizId === quiz._id && (
                <div className="quiz-result-banner">
                  🎉 You scored <strong>{justScored.score}/{justScored.total}</strong>
                  {justScored.earnedPoints ? ` — +${justScored.earnedPoints} points earned!` : ""}
                </div>
              )}

              {activeQuizId === quiz._id && !quiz.attempted && (
                <div style={{ marginTop: 10 }}>
                  {error && <div className="error-text">{error}</div>}
                  {quiz.questions.map((q, qIdx) => (
                    <div key={q._id || qIdx} className="quiz-question-block">
                      <p style={{ fontWeight: 600, marginBottom: 8 }}>
                        {qIdx + 1}. {q.text}
                      </p>
                      {q.options.map((opt, optIdx) => (
                        <label key={optIdx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={`quiz-${quiz._id}-q${qIdx}`}
                            checked={answers[qIdx] === optIdx}
                            onChange={() => setAnswers({ ...answers, [qIdx]: optIdx })}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ))}
                  <button className="btn btn-success" disabled={submitting} onClick={() => submitQuiz(quiz)}>
                    {submitting ? "Submitting..." : "Submit Quiz"}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveQuizId(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
