import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import RecordingPlayer from "./RecordingPlayer.jsx";

export default function RecordingLibrary() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async (q) => {
    setLoading(true);
    const { data } = await api.get("/recordings", { params: q ? { q } : {} });
    setRecordings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div>
      <input
        className="search-input"
        style={{ width: "100%", marginBottom: 16 }}
        placeholder="🔍 Search recordings by workshop, title or chapter..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <div className="skeleton skeleton-card" />}

      {!loading && recordings.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <p>No recordings available yet.</p>
        </div>
      )}

      {!loading &&
        recordings.map((r) => (
          <div className="card" key={r._id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="workshop-title" style={{ marginBottom: 0 }}>{r.title}</div>
                <div className="text-dim" style={{ fontSize: "0.85rem" }}>
                  From: <Link to={`/workshop/${r.workshop._id}`}>{r.workshop.title}</Link>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setOpenId(openId === r._id ? null : r._id)}>
                {openId === r._id ? "Hide" : "▶ Watch"}
              </button>
            </div>
            {openId === r._id && (
              <div style={{ marginTop: 12 }}>
                <RecordingPlayer recording={r} />
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
