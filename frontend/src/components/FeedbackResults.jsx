import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

export default function FeedbackResults({ workshopId }) {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get(`/feedback/workshop/${workshopId}`);
    setData(data);
  }, [workshopId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <div className="skeleton skeleton-line" style={{ width: "50%" }} />;

  if (data.count === 0) {
    return <p className="materials-empty">No feedback submitted yet.</p>;
  }

  return (
    <div>
      <div className="feedback-avg">
        <span className="feedback-avg-num">{data.avgRating}</span>
        <span className="star star-filled" style={{ fontSize: "1.3rem" }}>★</span>
        <span className="text-dim">({data.count} response{data.count === 1 ? "" : "s"})</span>
      </div>
      {data.entries.map((e) => (
        <div key={e._id} className="feedback-entry">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{e.student?.name || "Student"}</strong>
            <span>{"★".repeat(e.rating)}{"☆".repeat(5 - e.rating)}</span>
          </div>
          {e.feedback && <p style={{ margin: "6px 0 2px" }}>{e.feedback}</p>}
          {e.improvement && (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-dim)" }}>
              💡 Suggested improvement: {e.improvement}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
