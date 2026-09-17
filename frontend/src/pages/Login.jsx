import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <h1>Workshop Live 🎓</h1>
        <p>
          Manage all your workshops in one place — go live, delay or cancel
          them, and students get an instant real-time update every time.
        </p>
        <div className="feature-list">
          <div className="feature-item">
            <span className="dot">🔴</span> Instant live notifications
          </div>
          <div className="feature-item">
            <span className="dot">⏰</span> Delay/cancel updates bina refresh
          </div>
          <div className="feature-item">
            <span className="dot">🔗</span> One-click Zoom/Meet join
          </div>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="form-box">
          <h2>Welcome back</h2>
          <p className="form-sub">Login to your account</p>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={submit}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          <p className="switch-link">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
