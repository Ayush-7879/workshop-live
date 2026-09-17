import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Sidebar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  if (!user) return null;

  const dashboardPath = user.role === "admin" ? "/admin" : "/student";
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const links =
    user.role === "admin"
      ? [
          { to: dashboardPath, label: "Workshops", icon: "🏠", end: true },
          { to: `${dashboardPath}?view=students`, label: "Students", icon: "👥" },
          { to: `${dashboardPath}?view=courses`, label: "Paid Courses", icon: "💰" },
          { to: `${dashboardPath}?view=leaderboard`, label: "Leaderboard", icon: "🏆" },
          { to: "/profile", label: "Profile", icon: "👤" },
        ]
      : [
          { to: dashboardPath, label: "Dashboard", icon: "🏠", end: true },
          { to: `${dashboardPath}?tab=joined`, label: "My Workshops", icon: "📚" },
          { to: `${dashboardPath}?tab=attendance`, label: "Attendance", icon: "📋" },
          { to: `${dashboardPath}?tab=courses`, label: "Paid Courses", icon: "💰" },
          { to: `${dashboardPath}?tab=leaderboard`, label: "Leaderboard", icon: "🏆" },
          { to: `${dashboardPath}?tab=certificates`, label: "Certificates", icon: "🎓" },
          { to: `${dashboardPath}?tab=recordings`, label: "Recordings", icon: "🎬" },
          { to: "/profile", label: "Profile", icon: "👤" },
        ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-links">
        {links.map((l) => (
          <NavLink
            key={l.label}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span className="sidebar-icon">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark mode">
        {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>
    </aside>
  );
}
