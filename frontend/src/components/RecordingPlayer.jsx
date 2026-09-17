import React, { useRef, useState } from "react";
import { API_URL } from "../api/axios.js";

function resolveUrl(url) {
  if (!url) return url;
  return url.startsWith("/uploads/") ? `${API_URL}${url}` : url;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RecordingPlayer({ recording }) {
  const videoRef = useRef(null);
  const [search, setSearch] = useState("");

  const seekTo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const isEmbeddable = /youtube\.com|youtu\.be|vimeo\.com/.test(recording.videoUrl);
  const chapters = (recording.chapters || []).filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {isEmbeddable ? (
        <p>
          🎥{" "}
          <a href={recording.videoUrl} target="_blank" rel="noreferrer">
            {recording.title} (opens in new tab)
          </a>
        </p>
      ) : (
        <video ref={videoRef} src={resolveUrl(recording.videoUrl)} controls style={{ width: "100%", borderRadius: 10 }} />
      )}

      {recording.chapters?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <input
            className="search-input"
            style={{ width: "100%", marginBottom: 8 }}
            placeholder="🔍 Search chapters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="chapter-list">
            {chapters.map((c, idx) => (
              <button key={idx} className="chapter-item" onClick={() => seekTo(c.timestampSeconds)} disabled={isEmbeddable}>
                <span className="chapter-time">{formatTime(c.timestampSeconds)}</span>
                {c.title}
              </button>
            ))}
            {chapters.length === 0 && <p className="materials-empty">No chapters match your search.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
