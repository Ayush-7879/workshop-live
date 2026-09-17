import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import AdminMaterials from "../components/AdminMaterials.jsx";
import StudentMaterials from "../components/StudentMaterials.jsx";
import RecordingManager from "../components/RecordingManager.jsx";
import RecordingPlayer from "../components/RecordingPlayer.jsx";
import FeedbackForm from "../components/FeedbackForm.jsx";
import FeedbackResults from "../components/FeedbackResults.jsx";

const STATUS_LABEL = {
  scheduled: "Scheduled",
  live: "🔴 LIVE",
  delayed: "Delayed",
  cancelled: "Cancelled",
  completed: "Completed",
};

const MODE_LABEL = {
  online: "💻 Online",
  offline: "📍 In-Person",
  hybrid: "🔀 Hybrid",
};

export default function WorkshopDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [workshop, setWorkshop] = useState(null);
  const [recording, setRecording] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get(`/workshops/${id}`);
    setWorkshop(data);
    try {
      const { data: rec } = await api.get(`/recordings/workshop/${id}`);
      setRecording(rec);
    } catch (e) {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!workshop) {
    return <div className="skeleton skeleton-card" />;
  }

  const idOf = (entry) => entry?._id || entry;
  const isEnrolled = user && workshop.enrolledStudents.some((s) => idOf(s) === user.id);
  const isPending = user && workshop.pendingStudents.some((s) => idOf(s) === user.id);
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";
  const hasAttended =
    isStudent && workshop.attendedStudents.some((a) => idOf(a.student) === user.id);

  const requestToJoin = async () => {
    setJoining(true);
    setError("");
    try {
      await api.post(`/workshops/${id}/join`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not send join request");
    } finally {
      setJoining(false);
    }
  };

  const joinLive = async () => {
    try {
      await api.post(`/workshops/${id}/attend`);
    } catch (e) {
      // non-blocking
    }
    window.open(workshop.meetLink, "_blank", "noreferrer");
  };

  const mapSrc = workshop.location?.mapLink
    ? workshop.location.mapLink
    : workshop.location?.address
    ? `https://www.google.com/maps?q=${encodeURIComponent(workshop.location.address)}&output=embed`
    : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <span className={`badge ${workshop.status}`} style={{ marginBottom: 8, display: "inline-block" }}>
            {STATUS_LABEL[workshop.status]}
          </span>
          <h2>{workshop.title}</h2>
          <p className="page-subtitle">
            {MODE_LABEL[workshop.mode || "online"]} · Hosted by {workshop.createdBy?.name}
          </p>
        </div>
        {isAdmin && (
          <Link className="btn btn-secondary" to={`/admin?view=workshops`}>
            ⚙️ Manage in Dashboard
          </Link>
        )}
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        <div className="workshop-meta" style={{ marginBottom: 10 }}>
          <span>📅 {new Date(workshop.currentAt).toLocaleString("en-IN")}</span>
          <span>👥 {workshop.enrolledStudents.length} joined</span>
        </div>
        {workshop.description && <p className="workshop-desc">{workshop.description}</p>}
        {workshop.statusMessage && <div className="status-msg">ℹ️ {workshop.statusMessage}</div>}

        {(workshop.mode === "online" || workshop.mode === "hybrid") &&
          workshop.meetLink &&
          workshop.status !== "completed" &&
          workshop.status !== "cancelled" && (
            <p>
              <strong>💻 Online link: </strong>
              <a className="meet-link" href={workshop.meetLink} target="_blank" rel="noreferrer">
                {workshop.meetLink}
              </a>
            </p>
          )}

        {(workshop.mode === "offline" || workshop.mode === "hybrid") && workshop.location?.address && (
          <div style={{ marginTop: 12 }}>
            <strong>📍 Venue: </strong>
            {workshop.location.address}
            {mapSrc && (
              <iframe
                title="Venue map"
                src={mapSrc}
                width="100%"
                height="220"
                style={{ border: 0, borderRadius: "var(--radius-sm)", marginTop: 8 }}
                loading="lazy"
              />
            )}
          </div>
        )}

        {isStudent && (
          <div className="card-actions" style={{ marginTop: 14 }}>
            {isEnrolled && workshop.status === "live" && workshop.meetLink && (
              <button className="btn btn-success" onClick={joinLive}>
                🔴 Join Live
              </button>
            )}
            {!isEnrolled && !isPending && workshop.status !== "cancelled" && workshop.status !== "completed" && (
              <button className="btn btn-primary" disabled={joining} onClick={requestToJoin}>
                {joining ? "Sending request..." : "Request to Join"}
              </button>
            )}
            {isPending && <span className="status-pill status-pill-warning">🕓 Waiting for admin approval</span>}
            {isEnrolled && workshop.status === "scheduled" && (
              <span className="status-pill status-pill-success">✅ You're going</span>
            )}
          </div>
        )}
      </div>

      {(isEnrolled || isAdmin) && (
        <div className="card">
          <h3>📚 Materials &amp; Quiz</h3>
          {isAdmin ? <AdminMaterials workshopId={id} /> : <StudentMaterials workshopId={id} />}
        </div>
      )}

      {workshop.status === "completed" && (
        <>
          {isAdmin ? (
            <RecordingManager workshopId={id} />
          ) : (
            isEnrolled &&
            recording && (
              <div className="card">
                <h3>🎬 Recording</h3>
                <RecordingPlayer recording={recording} />
              </div>
            )
          )}

          {isAdmin ? (
            <div className="card">
              <h3>📝 Feedback Results</h3>
              <FeedbackResults workshopId={id} />
            </div>
          ) : (
            hasAttended && <FeedbackForm workshopId={id} />
          )}
        </>
      )}
    </div>
  );
}
