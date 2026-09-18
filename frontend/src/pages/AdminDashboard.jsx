import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import AdminMaterials from "../components/AdminMaterials.jsx";
import LeaderboardView from "../components/LeaderboardView.jsx";
import StudentDirectory from "../components/StudentDirectory.jsx";
import CourseManager from "../components/CourseManager.jsx";

const STATUS_LABEL = {
  scheduled: "Scheduled",
  live: "🔴 LIVE",
  delayed: "Delayed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export default function AdminDashboard() {
  const { socket } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    meetLink: "",
    mode: "online",
    location: { address: "", mapLink: "" },
  });
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null); // which workshop's action panel is open
  const [actionType, setActionType] = useState(null); // "live" | "delay" | "cancel"
  const [actionInput, setActionInput] = useState({ message: "", newTime: "", meetLink: "" });
  const [studentsOpenId, setStudentsOpenId] = useState(null);
  const [materialsOpenId, setMaterialsOpenId] = useState(null);
  const [requestBusy, setRequestBusy] = useState(null); // studentId currently being accepted/rejected
  const [view, setView] = useState(searchParams.get("view") || "workshops"); // workshops | students | courses | leaderboard

  useEffect(() => {
    const v = searchParams.get("view");
    if (v && v !== view) setView(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeView = (v) => {
    setView(v);
    setSearchParams(v === "workshops" ? {} : { view: v });
  };

  // Mobile tab bar scrolls horizontally — show a small "more tabs" hint
  // arrow while there's more content to the right, hide it once scrolled
  // to the end so it doesn't look like a stray button.
  const tabsRef = useRef(null);
  const [tabsScrollable, setTabsScrollable] = useState(false);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const check = () => {
      setTabsScrollable(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  const load = useCallback(async () => {
    const { data } = await api.get("/workshops");
    setWorkshops(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("workshop:list-update", refresh);
    return () => socket.off("workshop:list-update", refresh);
  }, [socket, load]);

  const createWorkshop = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/workshops", form);
      setForm({
        title: "",
        description: "",
        scheduledAt: "",
        meetLink: "",
        mode: "online",
        location: { address: "", mapLink: "" },
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create workshop");
    }
  };

  const openAction = (id, type) => {
    setActionId(id);
    setActionType(type);
    setActionInput({ message: "", newTime: "", meetLink: "" });
  };

  const closeAction = () => {
    setActionId(null);
    setActionType(null);
  };

  const submitAction = async () => {
    try {
      const status = actionType === "live" ? "live" : actionType === "delay" ? "delayed" : "cancelled";
      const payload = { status, message: actionInput.message };
      if (actionType === "delay") payload.newTime = actionInput.newTime;
      if (actionType === "live") payload.meetLink = actionInput.meetLink;
      await api.patch(`/workshops/${actionId}/status`, payload);
      closeAction();
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update status");
    }
  };

  const quickStatus = async (id, status) => {
    await api.patch(`/workshops/${id}/status`, { status });
    load();
  };

  const removeWorkshop = async (id) => {
    if (!confirm("Are you sure you want to delete this workshop?")) return;
    await api.delete(`/workshops/${id}`);
    load();
  };

  const respondToRequest = async (workshopId, studentId, action) => {
    setRequestBusy(studentId);
    try {
      await api.patch(`/workshops/${workshopId}/requests/${studentId}`, { action });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not process this request");
    } finally {
      setRequestBusy(null);
    }
  };

  const liveCount = workshops.filter((w) => w.status === "live").length;
  const scheduledCount = workshops.filter((w) => w.status === "scheduled").length;
  const totalStudents = workshops.reduce((sum, w) => sum + w.enrolledStudents.length, 0);
  const totalPending = workshops.reduce((sum, w) => sum + w.pendingStudents.length, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="page-subtitle">Manage your workshops and send real-time updates to students</p>
        </div>
        {view === "workshops" && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "✕ Close" : "+ New Workshop"}
          </button>
        )}
      </div>

      <div className="tabs-wrap">
        <div className="tabs" ref={tabsRef}>
          <button className={view === "workshops" ? "active" : ""} onClick={() => changeView("workshops")}>
            Workshops
          </button>
          <button className={view === "students" ? "active" : ""} onClick={() => changeView("students")}>
            👥 Students
          </button>
          <button className={view === "courses" ? "active" : ""} onClick={() => changeView("courses")}>
            💰 Paid Courses
          </button>
          <button className={view === "leaderboard" ? "active" : ""} onClick={() => changeView("leaderboard")}>
            🏆 Leaderboard
          </button>
        </div>
        {tabsScrollable && (
          <span className="tabs-scroll-hint" aria-hidden="true">
            ›
          </span>
        )}
      </div>

      {view === "students" && <StudentDirectory />}
      {view === "courses" && <CourseManager />}
      {view === "leaderboard" && <LeaderboardView />}

      {view === "workshops" && (
      <>
      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-num">{workshops.length}</div>
          <div className="stat-label">Total Workshops</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{liveCount}</div>
          <div className="stat-label">Live Now</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{scheduledCount}</div>
          <div className="stat-label">Scheduled</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{totalStudents}</div>
          <div className="stat-label">Total Joins</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{totalPending}</div>
          <div className="stat-label">Pending Requests</div>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3>Create New Workshop</h3>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={createWorkshop}>
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <label>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <label>Date &amp; Time</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              required
            />
            <label>Mode</label>
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="online">💻 Online</option>
              <option value="offline">📍 In-Person (Offline)</option>
              <option value="hybrid">🔀 Hybrid (Online + In-Person)</option>
            </select>

            {(form.mode === "online" || form.mode === "hybrid") && (
              <>
                <label>Meet / Zoom Link (you can add this later too)</label>
                <input
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={form.meetLink}
                  onChange={(e) => setForm({ ...form, meetLink: e.target.value })}
                />
              </>
            )}

            {(form.mode === "offline" || form.mode === "hybrid") && (
              <>
                <label>Venue Address</label>
                <input
                  placeholder="e.g. Room 204, Tech Building, ABC College"
                  value={form.location.address}
                  onChange={(e) => setForm({ ...form, location: { ...form.location, address: e.target.value } })}
                />
                <label>Custom Google Maps embed link (optional)</label>
                <input
                  placeholder="Leave blank to auto-generate from the address above"
                  value={form.location.mapLink}
                  onChange={(e) => setForm({ ...form, location: { ...form.location, mapLink: e.target.value } })}
                />
              </>
            )}

            <button className="btn btn-success">Create Workshop</button>
          </form>
        </div>
      )}

      {loading && (
        <>
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </>
      )}

      {!loading && workshops.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          <p>No workshops yet — click "+ New Workshop" to get started.</p>
        </div>
      )}

      {workshops.map((w) => {
        const attendedCount = w.attendedStudents.length;
        const attendancePct = w.enrolledStudents.length
          ? Math.round((attendedCount / w.enrolledStudents.length) * 100)
          : 0;
        const attendedIds = new Set(w.attendedStudents.map((a) => a.student?._id || a.student));

        return (
          <div className="card" key={w._id}>
            <span className={`badge ${w.status}`}>{STATUS_LABEL[w.status]}</span>
            <div className="workshop-title">{w.title}</div>
            <div className="workshop-meta">
              <span>📅 {new Date(w.currentAt).toLocaleString("en-IN")}</span>
              <span>👥 {w.enrolledStudents.length} joined</span>
              {w.pendingStudents.length > 0 && <span>🕓 {w.pendingStudents.length} pending</span>}
              {(w.status === "live" || w.status === "completed") && (
                <span>✅ {attendedCount} attended ({attendancePct}%)</span>
              )}
              {w.mode && w.mode !== "online" && <span>{w.mode === "offline" ? "📍 In-Person" : "🔀 Hybrid"}</span>}
              <Link to={`/workshop/${w._id}`}>🔎 View Full Details</Link>
            </div>
            {w.description && <p>{w.description}</p>}
            {w.meetLink && w.status !== "completed" && w.status !== "cancelled" && (
              <p>
                <a className="meet-link" href={w.meetLink} target="_blank" rel="noreferrer">
                  🔗 {w.meetLink}
                </a>
              </p>
            )}
            {w.statusMessage && <div className="status-msg">ℹ️ {w.statusMessage}</div>}

            {w.pendingStudents.length > 0 && (
              <div className="status-msg" style={{ marginTop: 10 }}>
                <strong>Join Requests</strong>
                {w.pendingStudents.map((s) => (
                  <div
                    key={s._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 8,
                      gap: 8,
                    }}
                  >
                    <span>
                      {s.name} <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>({s.email})</span>
                    </span>
                    <span>
                      <button
                        className="btn btn-success"
                        style={{ padding: "6px 12px", marginTop: 0 }}
                        disabled={requestBusy === s._id}
                        onClick={() => respondToRequest(w._id, s._id, "accept")}
                      >
                        ✓ Accept
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "6px 12px", marginTop: 0 }}
                        disabled={requestBusy === s._id}
                        onClick={() => respondToRequest(w._id, s._id, "reject")}
                      >
                        ✕ Reject
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {w.enrolledStudents.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setStudentsOpenId(studentsOpenId === w._id ? null : w._id)}
                >
                  👥 {studentsOpenId === w._id ? "Hide" : "View"} Joined Students ({w.enrolledStudents.length})
                </button>
                {studentsOpenId === w._id && (
                  <div className="status-msg" style={{ marginTop: 8, padding: 0 }}>
                    <table className="student-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Email</th>
                          {(w.status === "live" || w.status === "completed") && <th>Attendance</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {w.enrolledStudents.map((s, idx) => (
                          <tr key={s._id}>
                            <td>{idx + 1}</td>
                            <td>
                              <span className="avatar-circle">{s.name?.[0]?.toUpperCase() || "?"}</span> {s.name}
                            </td>
                            <td>{s.email}</td>
                            {(w.status === "live" || w.status === "completed") && (
                              <td>
                                {attendedIds.has(s._id) ? (
                                  <span style={{ color: "var(--success)", fontWeight: 600 }}>✅ Attended</span>
                                ) : (
                                  <span style={{ color: "var(--text-dim)" }}>— Not attended</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(w.status === "live" || w.status === "completed") && (
                      <div style={{ padding: "10px 14px", fontSize: "0.82rem", color: "var(--text-dim)" }}>
                        {attendedCount} of {w.enrolledStudents.length} attended ({attendancePct}%)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setMaterialsOpenId(materialsOpenId === w._id ? null : w._id)}
              >
                📚 {materialsOpenId === w._id ? "Hide" : "Manage"} Materials &amp; Quiz
              </button>
              {materialsOpenId === w._id && <AdminMaterials workshopId={w._id} />}
            </div>

            {actionId === w._id ? (
              <div className="status-msg" style={{ marginTop: 10 }}>
                {actionType === "live" && (
                  <>
                    <label>Meet / Zoom Link (update if needed)</label>
                    <input
                      placeholder={w.meetLink || "https://meet.google.com/xxx-xxxx-xxx"}
                      value={actionInput.meetLink}
                      onChange={(e) => setActionInput({ ...actionInput, meetLink: e.target.value })}
                    />
                  </>
                )}
                {actionType === "delay" && (
                  <>
                    <label>New Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={actionInput.newTime}
                      onChange={(e) => setActionInput({ ...actionInput, newTime: e.target.value })}
                    />
                  </>
                )}
                <label>{actionType === "cancel" ? "Reason for cancellation" : "Message for students (optional)"}</label>
                <input
                  value={actionInput.message}
                  onChange={(e) => setActionInput({ ...actionInput, message: e.target.value })}
                  placeholder="e.g. Trainer is unavailable"
                />
                <button className="btn btn-primary" onClick={submitAction}>
                  Confirm &amp; Notify Students
                </button>
                <button className="btn btn-secondary" onClick={closeAction}>
                  Cancel
                </button>
              </div>
            ) : w.status === "completed" ? (
              <div>
                <span className="status-pill" style={{ marginRight: 8 }}>🏁 Session ended — live link closed</span>
                <button className="btn btn-secondary" onClick={() => quickStatus(w._id, "scheduled")}>
                  🔄 Re-schedule
                </button>
                <button className="btn btn-secondary" onClick={() => removeWorkshop(w._id)}>
                  🗑 Delete
                </button>
              </div>
            ) : (
              <div>
                <button className="btn btn-success" onClick={() => openAction(w._id, "live")} disabled={w.status === "cancelled"}>
                  🔴 Go Live
                </button>
                <button className="btn btn-warning" onClick={() => openAction(w._id, "delay")} disabled={w.status === "cancelled"}>
                  ⏰ Delay
                </button>
                <button className="btn btn-danger" onClick={() => openAction(w._id, "cancel")} disabled={w.status === "cancelled"}>
                  ❌ Cancel
                </button>
                {w.status !== "scheduled" && w.status !== "cancelled" && (
                  <button className="btn btn-secondary" onClick={() => quickStatus(w._id, "scheduled")}>
                    🔄 Reset to Scheduled
                  </button>
                )}
                {w.status === "live" && (
                  <button className="btn btn-secondary" onClick={() => quickStatus(w._id, "completed")}>
                    ✅ Mark Completed
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => removeWorkshop(w._id)}>
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
      </>
      )}
    </div>
  );
}
