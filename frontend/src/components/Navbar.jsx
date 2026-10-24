import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

export default function Navbar({ onToast }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="navbar">
      <Link to="/" className="brand">
        <span className="logo-badge">🎓</span>
        Workshop Live
      </Link>
      <div className="links">
        {user ? (
          <>
            <span className="user-chip">
              {user.name} · {user.role === "admin" ? "Admin" : "Student"}
            </span>
            <NotificationBell onToast={onToast} />
            <button
              className="logout-btn"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/login">
              Login
            </Link>
            <Link className="nav-link" to="/register">
              Register
            </Link>
            <Link className="nav-link" to="/register-institute">
              For institutes
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
