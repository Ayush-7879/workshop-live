import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(name, email, password, role, adminCode);
      navigate(user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <h1>Join Workshop Live 🚀</h1>
        <p>
          Sign up as an admin to organize workshops, or as a student to join
          the workshops you like — one app for both.
        </p>
        <div className="feature-list">
          <div className="feature-item">
            <span className="dot">👩‍🏫</span> Admin: create, go live, delay, cancel
          </div>
          <div className="feature-item">
            <span className="dot">🙋</span> Student: join workshops and get live updates
          </div>
          <div className="feature-item">
            <span className="dot">🔔</span> A notification for every status change
          </div>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="form-box">
          <h2>Create account</h2>
          <p className="form-sub">Get started in 30 seconds</p>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={submit}>
            <label>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <label>I am a</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="admin">Admin (Workshop organizer)</option>
            </select>
            {role === "admin" && (
              <>
                <label>Admin invite code</label>
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  autoComplete="off"
                  required
                />
              </>
            )}
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>
          <p className="switch-link">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
