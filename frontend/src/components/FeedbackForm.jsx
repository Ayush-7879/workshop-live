import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

export default function FeedbackForm({ workshopId }) {
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [improvement, setImprovement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get(`/feedback/me/${workshopId}`);
    setExisting(data);
    if (data) {
      setRating(data.rating);
      setFeedback(data.feedback);
      setImprovement(data.improvement);
    }
    setLoading(false);
  }, [workshopId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError("Please select a star rating");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/feedback", { workshopId, rating, feedback, improvement });
      setSuccess(true);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="skeleton skeleton-line" style={{ width: "60%" }} />;

  return (
    <div className="card">
      <h3>📝 Workshop Feedback</h3>
      {success && <div className="success-text">Thanks — your feedback has been recorded!</div>}
      {error && <div className="error-text">{error}</div>}
      <form onSubmit={submit}>
        <label>How would you rate this workshop?</label>
        <div className="star-row">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`star ${n <= rating ? "star-filled" : ""}`} onClick={() => setRating(n)}>
              ★
            </span>
          ))}
        </div>
        <label>Your feedback</label>
        <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What did you like?" />
        <label>What should improve?</label>
        <textarea
          rows={3}
          value={improvement}
          onChange={(e) => setImprovement(e.target.value)}
          placeholder="Any suggestions for next time?"
        />
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : existing ? "Update Feedback" : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}
