import React, { useEffect, useState } from "react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function formatCountdown(ms) {
  if (ms <= 0) return "starting now";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

export default function DashboardHero({ user, workshop, onJoinLive }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = getGreeting();

  if (!workshop) {
    return (
      <div className="hero-card hero-idle">
        <div className="hero-greeting">
          {greeting}, {user.name.split(" ")[0]}. 👋
        </div>
        <div className="hero-sub">No upcoming workshops on your calendar right now — go explore and join one!</div>
      </div>
    );
  }

  const target = new Date(workshop.currentAt).getTime();
  const diff = target - now;
  const isLive = workshop.status === "live";

  // Circular progress: how "close" we are within a rolling 24h window before start.
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const clamped = Math.min(Math.max(diff, 0), WINDOW_MS);
  const progressPct = isLive ? 100 : Math.round(((WINDOW_MS - clamped) / WINDOW_MS) * 100);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="hero-card">
      <div className="hero-text">
        <div className="hero-greeting">
          {greeting}, {user.name.split(" ")[0]}. 👋
        </div>
        <div className="hero-sub">
          {isLive ? (
            <>
              🔴 <strong>{workshop.title}</strong> is LIVE right now!
            </>
          ) : (
            <>
              Your workshop <strong>"{workshop.title}"</strong>{" "}
              {diff > 0 ? `starts in ${formatCountdown(diff)}` : "is starting shortly"}.
            </>
          )}
        </div>
        {isLive && workshop.meetLink && (
          <button className="btn hero-join-btn" onClick={() => onJoinLive(workshop)}>
            🔴 Join Live Now
          </button>
        )}
      </div>
      <div className="hero-ring-wrap">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" className="hero-ring-track" />
          <circle
            cx="50"
            cy="50"
            r="42"
            className="hero-ring-fill"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="hero-ring-label">{isLive ? "LIVE" : `${progressPct}%`}</div>
      </div>
    </div>
  );
}
