import React, { useEffect, useState, useCallback, useMemo } from "react";
import api, { API_URL } from "../api/axios.js";

function resolveUrl(url) {
  if (!url) return url;
  return url.startsWith("/uploads/") ? `${API_URL}${url}` : url;
}

function StudentDetailPanel({ studentId, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    api.get(`/profile/students/${studentId}`).then(({ data }) => {
      if (active) setData(data);
    });
    return () => {
      active = false;
    };
  }, [studentId]);

  if (!data) return <div className="skeleton skeleton-card" style={{ marginTop: 12 }} />;

  const { student, enrolledWorkshops, attendedWorkshops, certificates, completion } = data;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="profile-header-card" style={{ boxShadow: "none", border: "none", padding: 0, marginBottom: 14 }}>
          {student.avatarUrl ? (
            <img src={resolveUrl(student.avatarUrl)} alt={student.name} className="profile-avatar" />
          ) : (
            <div className="profile-avatar profile-avatar-fallback">{student.name?.[0]?.toUpperCase() || "?"}</div>
          )}
          <div>
            <div className="profile-name">{student.name}</div>
            <div className="profile-email">{student.email}</div>
            <div className="completion-row">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${completion}%` }} />
              </div>
              <span className="completion-label">{completion}% profile complete</span>
            </div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onClose}>
          ✕ Close
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong>🎓 College: </strong>
        {student.college || "—"}
      </div>
      {student.bio && <p className="workshop-desc">{student.bio}</p>}

      <div className="badge-row" style={{ marginBottom: 10 }}>
        {(student.skills || []).map((s) => (
          <span className="badge-chip" key={s}>
            {s}
          </span>
        ))}
        {(student.skills || []).length === 0 && <span className="text-dim">No skills added.</span>}
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-num">{student.points}</div>
          <div className="stat-label">Points</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{enrolledWorkshops.length}</div>
          <div className="stat-label">Joined</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{attendedWorkshops.length}</div>
          <div className="stat-label">Attended</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{certificates.length}</div>
          <div className="stat-label">Certificates</div>
        </div>
      </div>

      <strong>Enrolled Workshops</strong>
      {enrolledWorkshops.length === 0 ? (
        <p className="materials-empty">Not enrolled in any workshop yet.</p>
      ) : (
        <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
          {enrolledWorkshops.map((w) => (
            <li key={w._id}>
              {w.title} — <span className="text-dim">{new Date(w.currentAt).toLocaleDateString("en-IN")} ({w.status})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("points"); // points | name | attendedCount
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/profile/students");
    setStudents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...students];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.college || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "attendedCount") list.sort((a, b) => b.attendedCount - a.attendedCount);
    else list.sort((a, b) => b.points - a.points);
    return list;
  }, [students, search, sortBy]);

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  return (
    <div>
      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-num">{students.length}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{students.filter((s) => s.attendedCount > 0).length}</div>
          <div className="stat-label">Active (Attended ≥1)</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{students.reduce((sum, s) => sum + s.certificatesCount, 0)}</div>
          <div className="stat-label">Certificates Issued</div>
        </div>
      </div>

      <div className="toolbar-row">
        <input
          className="search-input"
          placeholder="🔍 Search by name, email or college..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: "auto", margin: 0 }}>
          <option value="points">Sort by Points</option>
          <option value="name">Sort by Name</option>
          <option value="attendedCount">Sort by Attendance</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧑‍🎓</div>
          <p>No students found.</p>
        </div>
      ) : (
        <div className="student-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>College</th>
                <th>Points</th>
                <th>Joined</th>
                <th>Attended</th>
                <th>Certificates</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <tr>
                    <td>{idx + 1}</td>
                    <td>
                      <span className="avatar-circle">{s.name?.[0]?.toUpperCase() || "?"}</span> {s.name}
                    </td>
                    <td>{s.email}</td>
                    <td>{s.college || "—"}</td>
                    <td>{s.points}</td>
                    <td>{s.joinedCount}</td>
                    <td>{s.attendedCount}</td>
                    <td>{s.certificatesCount}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "5px 12px", marginTop: 0 }}
                        onClick={() => setOpenId(openId === s.id ? null : s.id)}
                      >
                        {openId === s.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {openId === s.id && (
                    <tr>
                      <td colSpan={9} style={{ padding: 0, border: "none" }}>
                        <StudentDetailPanel studentId={s.id} onClose={() => setOpenId(null)} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
