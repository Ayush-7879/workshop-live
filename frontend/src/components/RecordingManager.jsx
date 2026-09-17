import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import RecordingPlayer from "./RecordingPlayer.jsx";

export default function RecordingManager({ workshopId }) {
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sourceMode, setSourceMode] = useState("link");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", videoUrl: "" });
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get(`/recordings/workshop/${workshopId}`);
    setRecording(data);
    if (data) {
      setForm({ title: data.title, videoUrl: data.videoUrl });
      setChapters(data.chapters || []);
    }
    setLoading(false);
  }, [workshopId]);

  useEffect(() => {
    load();
  }, [load]);

  const addChapter = () => setChapters((prev) => [...prev, { title: "", timestampSeconds: 0 }]);
  const updateChapter = (idx, patch) =>
    setChapters((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const removeChapter = (idx) => setChapters((prev) => prev.filter((_, i) => i !== idx));

  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let videoUrl = form.videoUrl;
      if (sourceMode === "upload") {
        if (!uploadFile) {
          setError("Please choose a video file to upload");
          return;
        }
        setUploading(true);
        const formData = new FormData();
        formData.append("file", uploadFile);
        const { data } = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        videoUrl = data.url;
        setUploading(false);
      }
      if (!videoUrl) {
        setError("Please provide a video link or upload a file");
        return;
      }
      await api.post("/recordings", { workshopId, title: form.title, videoUrl, chapters });
      setEditing(false);
      load();
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.message || "Could not save recording");
    }
  };

  if (loading) return <div className="skeleton skeleton-line" style={{ width: "50%" }} />;

  return (
    <div className="card">
      <div className="materials-section-head">
        <h3 style={{ margin: 0 }}>🎬 Recording</h3>
        <button className="btn btn-secondary" onClick={() => setEditing((s) => !s)}>
          {editing ? "Cancel" : recording ? "Edit Recording" : "+ Add Recording"}
        </button>
      </div>

      {!editing && !recording && <p className="materials-empty">No recording uploaded for this workshop yet.</p>}
      {!editing && recording && <RecordingPlayer recording={recording} />}

      {editing && (
        <form onSubmit={save} className="quiz-builder" style={{ marginTop: 12 }}>
          {error && <div className="error-text">{error}</div>}
          <label>Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />

          <div className="source-toggle">
            <button type="button" className={sourceMode === "link" ? "active" : ""} onClick={() => setSourceMode("link")}>
              🔗 Paste a Link
            </button>
            <button type="button" className={sourceMode === "upload" ? "active" : ""} onClick={() => setSourceMode("upload")}>
              💻 Upload from Computer
            </button>
          </div>

          {sourceMode === "link" ? (
            <input
              placeholder="YouTube / Drive / any video link"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            />
          ) : (
            <input type="file" accept=".mp4,.webm,.mov,.mkv" onChange={(e) => setUploadFile(e.target.files[0] || null)} />
          )}

          <label style={{ marginTop: 10 }}>Chapters (optional)</label>
          {chapters.map((c, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input
                placeholder="Chapter title"
                value={c.title}
                onChange={(e) => updateChapter(idx, { title: e.target.value })}
                style={{ margin: 0, flex: 2 }}
              />
              <input
                type="number"
                placeholder="Seconds"
                value={c.timestampSeconds}
                onChange={(e) => updateChapter(idx, { timestampSeconds: e.target.value })}
                style={{ margin: 0, flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" style={{ margin: 0, padding: "6px 10px" }} onClick={() => removeChapter(idx)}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary" onClick={addChapter}>
            + Add Chapter
          </button>

          <div style={{ marginTop: 12 }}>
            <button className="btn btn-success" disabled={uploading}>
              {uploading ? "Uploading..." : "Save Recording"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
