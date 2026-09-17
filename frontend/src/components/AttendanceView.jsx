import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

const STATUS_PILL = {
  attended: { label: "✅ Attended", cls: "status-pill-success" },
  missed: { label: "❌ Missed", cls: "status-pill-danger" },
  upcoming: { label: "🗓️ Upcoming", cls: "" },
  cancelled: { label: "🚫 Cancelled", cls: "status-pill-danger" },
};

export default function AttendanceView() {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/attendance/me");
    setData(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <p>Loading attendance...</p>;

  const { history, stats } = data;

  return (
    <div>
      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-num">{stats.totalJoined}</div>
          <div className="stat-label">Workshops Joined</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{stats.totalAttended}</div>
          <div className="stat-label">Attended</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{stats.totalMissed}</div>
          <div className="stat-label">Missed</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{stats.percentage}%</div>
          <div className="stat-label">Attendance Rate</div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>You haven't joined any workshops yet.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="student-table">
            <thead>
              <tr>
                <th>Workshop</th>
                <th>Host</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const pill = STATUS_PILL[h.attendanceStatus];
                return (
                  <tr key={h.workshopId}>
                    <td>{h.title}</td>
                    <td>{h.host || "—"}</td>
                    <td>{new Date(h.date).toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`status-pill ${pill.cls}`}>{pill.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
