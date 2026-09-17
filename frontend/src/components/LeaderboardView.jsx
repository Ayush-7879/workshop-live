import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function LeaderboardView() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [myProfile, setMyProfile] = useState(null);

  const load = useCallback(async () => {
    const requests = [api.get("/gamification/leaderboard")];
    if (user.role === "student") requests.push(api.get("/gamification/me"));
    const results = await Promise.all(requests);
    setLeaders(results[0].data);
    if (results[1]) setMyProfile(results[1].data);
  }, [user.role]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {myProfile && (
        <div className="stat-row">
          <div className="stat-tile">
            <div className="stat-num">{myProfile.points}</div>
            <div className="stat-label">My Points</div>
          </div>
          <div className="stat-tile">
            <div className="stat-num">{myProfile.attendedCount}</div>
            <div className="stat-label">Workshops Attended</div>
          </div>
          <div className="stat-tile">
            <div className="stat-num">{myProfile.certificates}</div>
            <div className="stat-label">Certificates</div>
          </div>
          <div className="stat-tile">
            <div className="stat-num">{myProfile.badges.length}</div>
            <div className="stat-label">Badges Earned</div>
          </div>
        </div>
      )}

      {myProfile?.badges.length > 0 && (
        <div className="card">
          <strong>🏅 My Badges</strong>
          <div className="badge-row">
            {myProfile.badges.map((b) => (
              <span key={b.id} className="badge-chip" title={b.desc}>
                {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table className="student-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Points</th>
              <th>Badges</th>
            </tr>
          </thead>
          <tbody>
            {leaders.length === 0 && (
              <tr>
                <td colSpan={4}>No students on the leaderboard yet.</td>
              </tr>
            )}
            {leaders.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.rank === 1 && "🥇"}
                  {l.rank === 2 && "🥈"}
                  {l.rank === 3 && "🥉"}
                  {l.rank > 3 && `#${l.rank}`}
                </td>
                <td>
                  <span className="avatar-circle">{l.name?.[0]?.toUpperCase()}</span> {l.name}
                </td>
                <td>{l.points}</td>
                <td>{l.badges.map((b) => b.label).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
