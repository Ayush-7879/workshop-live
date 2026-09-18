import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Sidebar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  if (!user) return null;

  const dashboardPath = user.role === "admin" ? "/admin" : "/student";
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Workshops/Students/Paid Courses/Leaderboard/Attendance/Certificates/
  // Recordings are already switchable as in-page tabs once you're on the
  // dashboard (see AdminDashboard.jsx / StudentDashboard.jsx) — listing
  // them again here just duplicated the same links twice on one screen.
  // The sidebar now only carries the one entry point into each dashboard
  // plus Profile, which isn't available anywhere else.
  const links =
    user.role === "admin"
      ? [
          { to: dashboardPath, label: "Workshops", icon: "🏠", end: true },
          { to: "/profile", label: "Profile", icon: "👤" },
        ]
      : [
          { to: dashboardPath, label: "Dashboard", icon: "🏠", end: true },
          { to: "/profile", label: "Profile", icon: "👤" },
        ];

  // On phones the sidebar becomes a compact navbar: the first two links stay
  // visible, everything else (including Profile) moves into a "⋮" dropdown
  // so nothing ever gets clipped mid-item.
  const primaryLinks = links.slice(0, 2);
  const overflowLinks = links.slice(2);

  const renderLink = (l, onClick) => (
    <NavLink
      key={l.label}
      to={l.to}
      end={l.end}
      onClick={onClick}
      className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
    >
      <span className="sidebar-icon">{l.icon}</span>
      <span>{l.label}</span>
    </NavLink>
  );

  return (
    <aside className="sidebar">
      {/* Compact mobile navbar: primary links + a "more" menu */}
      <nav className="sidebar-links-mobile">
        {primaryLinks.map((l) => renderLink(l))}
        <button
          type="button"
          className="sidebar-more-btn"
          onClick={() => setMoreOpen((o) => !o)}
          aria-haspopup="true"
          aria-expanded={moreOpen}
          aria-label="More menu"
        >
          ⋮
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className="sidebar-more-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="sidebar-more-menu" role="menu">
            {overflowLinks.map((l) => renderLink(l, () => setMoreOpen(false)))}
            <button
              className="theme-toggle"
              onClick={() => {
                toggleTheme();
                setMoreOpen(false);
              }}
            >
              {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>
        </>
      )}

      {/* Full sidebar: unchanged on tablet/desktop */}
      <nav className="sidebar-links">{links.map((l) => renderLink(l))}</nav>
      <button className="theme-toggle theme-toggle-desktop" onClick={toggleTheme} title="Toggle dark mode">
        {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>
    </aside>
  );
}
