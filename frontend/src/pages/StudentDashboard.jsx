import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import StudentMaterials from "../components/StudentMaterials.jsx";
import AttendanceView from "../components/AttendanceView.jsx";
import LeaderboardView from "../components/LeaderboardView.jsx";
import CertificatesView from "../components/CertificatesView.jsx";
import DashboardHero from "../components/DashboardHero.jsx";
import RecordingLibrary from "../components/RecordingLibrary.jsx";
import CourseBrowser from "../components/CourseBrowser.jsx";

const STATUS_LABEL = {
  scheduled: "Scheduled",
  live: "🔴 LIVE NOW",
  delayed: "Delayed",
  cancelled: "Cancelled",
  completed: "Completed",
};

function formatWhen(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function StudentDashboard() {
  const { user, socket } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get("tab") || "all"); // all | joined | attendance | courses | leaderboard | certificates | recordings
  const [search, setSearch] = useState("");
  const [joining, setJoining] = useState(null);
  const [materialsOpenId, setMaterialsOpenId] = useState(null);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && t !== tab) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeTab = (t) => {
    setTab(t);
    setSearchParams(t === "all" ? {} : { tab: t });
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
    socket.on("workshop:update", refresh);
    return () => {
      socket.off("workshop:list-update", refresh);
      socket.off("workshop:update", refresh);
    };
  }, [socket, load]);

  const join = async (id) => {
    setJoining(id);
    try {
      await api.post(`/workshops/${id}/join`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not send join request");
    } finally {
      setJoining(null);
    }
  };

  const joinLive = async (w) => {
    try {
      await api.post(`/workshops/${w._id}/attend`);
    } catch (err) {
      // non-blocking: even if attendance marking fails, still let them open the link
    }
    window.open(w.meetLink, "_blank", "noreferrer");
  };

  const idOf = (entry) => entry?._id || entry;
  const isEnrolled = (w) => w.enrolledStudents.some((s) => idOf(s) === user.id);
  const isPending = (w) => w.pendingStudents.some((s) => idOf(s) === user.id);

  const filtered = useMemo(() => {
    let list = tab === "joined" ? workshops.filter(isEnrolled) : workshops;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (w) => w.title.toLowerCase().includes(q) || (w.description || "").toLowerCase().includes(q)
      );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshops, tab, search, user.id]);

  const liveNowCount = workshops.filter((w) => isEnrolled(w) && w.status === "live").length;
  const joinedCount = workshops.filter(isEnrolled).length;
  const pendingCount = workshops.filter(isPending).length;

  const heroWorkshop = useMemo(() => {
    const upcoming = workshops
      .filter((w) => isEnrolled(w) && (w.status === "live" || w.status === "scheduled" || w.status === "delayed"))
      .sort((a, b) => new Date(a.currentAt) - new Date(b.currentAt));
    return upcoming[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshops, user.id]);

  return (
    <div>
      <DashboardHero user={user} workshop={heroWorkshop} onJoinLive={joinLive} />

      <div className="page-header">
        <div>
          <h2>Student Dashboard</h2>
          <p className="page-subtitle">Browse workshops, join them, and get live updates</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-num">{workshops.length}</div>
          <div className="stat-label">Available Workshops</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{joinedCount}</div>
          <div className="stat-label">Joined</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{pendingCount}</div>
          <div className="stat-label">Pending Requests</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{liveNowCount}</div>
          <div className="stat-label">Live Right Now</div>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="tabs-wrap">
          <div className="tabs" ref={tabsRef}>
            <button className={tab === "all" ? "active" : ""} onClick={() => changeTab("all")}>
              All Workshops
            </button>
            <button className={tab === "joined" ? "active" : ""} onClick={() => changeTab("joined")}>
              My Joined Workshops
            </button>
            <button className={tab === "attendance" ? "active" : ""} onClick={() => changeTab("attendance")}>
              📋 My Attendance
            </button>
            <button className={tab === "courses" ? "active" : ""} onClick={() => changeTab("courses")}>
              💰 Paid Courses
            </button>
            <button className={tab === "leaderboard" ? "active" : ""} onClick={() => changeTab("leaderboard")}>
              🏆 Leaderboard
            </button>
            <button className={tab === "certificates" ? "active" : ""} onClick={() => changeTab("certificates")}>
              🎓 Certificates
            </button>
            <button className={tab === "recordings" ? "active" : ""} onClick={() => changeTab("recordings")}>
              🎬 Recordings
            </button>
          </div>
          {tabsScrollable && (
            <span className="tabs-scroll-hint" aria-hidden="true">
              ›
            </span>
          )}
        </div>
        {tab === "all" || tab === "joined" ? (
          <input
            className="search-input"
            placeholder="🔍 Search workshops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        ) : null}
      </div>

      {tab === "attendance" ? (
        <AttendanceView />
      ) : tab === "courses" ? (
        <CourseBrowser />
      ) : tab === "leaderboard" ? (
        <LeaderboardView />
      ) : tab === "certificates" ? (
        <CertificatesView />
      ) : tab === "recordings" ? (
        <RecordingLibrary />
      ) : (
        <>
      {loading && (
        <div className="workshop-grid">
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>{tab === "joined" ? "You haven't joined any workshops yet." : "No workshops found."}</p>
        </div>
      )}

      {!loading && (
      <div className="workshop-grid">
        {filtered.map((w) => {
          const enrolled = isEnrolled(w);
          const pending = isPending(w);
          const hostInitial = w.createdBy?.name?.[0]?.toUpperCase() || "A";
          return (
            <div className={`card card-accent-${w.status}`} key={w._id}>
              <span className={`badge ${w.status}`}>{STATUS_LABEL[w.status]}</span>
              <div className="workshop-title">{w.title}</div>
              <div className="workshop-meta">
                <span>📅 {formatWhen(w.currentAt)}</span>
                {w.mode && w.mode !== "online" && <span>{w.mode === "offline" ? "📍 In-Person" : "🔀 Hybrid"}</span>}
              </div>
              {w.createdBy?.name && (
                <div className="host-row">
                  <span className="avatar-circle">{hostInitial}</span>
                  <span>Hosted by {w.createdBy.name}</span>
                </div>
              )}
              {w.description && <p className="workshop-desc">{w.description}</p>}
              {w.statusMessage && <div className="status-msg">ℹ️ {w.statusMessage}</div>}

              <div className="card-actions">
                {!enrolled && !pending && w.status !== "cancelled" && w.status !== "completed" && (
                  <button className="btn btn-primary" disabled={joining === w._id} onClick={() => join(w._id)}>
                    {joining === w._id ? "Sending request..." : "Request to Join"}
                  </button>
                )}
                {pending && (
                  <span className="status-pill status-pill-warning">🕓 Waiting for admin approval</span>
                )}
                {enrolled && w.status === "live" && w.meetLink && (
                  <button className="btn btn-success" onClick={() => joinLive(w)}>
                    🔴 Join Live
                  </button>
                )}
                {enrolled && w.status === "scheduled" && (
                  <span className="status-pill status-pill-success">✅ You're going</span>
                )}
                {enrolled && w.status === "delayed" && (
                  <span className="status-pill status-pill-warning">⏰ Waiting for new time</span>
                )}
                {enrolled && w.status === "cancelled" && (
                  <span className="status-pill status-pill-danger">Cancelled</span>
                )}
                {enrolled && w.status === "completed" && (
                  <span className="status-pill">🎉 Completed</span>
                )}
              </div>

              {enrolled && (
                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                    onClick={() => setMaterialsOpenId(materialsOpenId === w._id ? null : w._id)}
                  >
                    📚 {materialsOpenId === w._id ? "Hide" : "View"} Materials &amp; Quiz
                  </button>
                  {materialsOpenId === w._id && <StudentMaterials workshopId={w._id} />}
                </div>
              )}
              <Link to={`/workshop/${w._id}`} className="view-details-link">
                🔎 View Full Details
              </Link>
            </div>
          );
        })}
      </div>
      )}
      </>
      )}
    </div>
  );
}
