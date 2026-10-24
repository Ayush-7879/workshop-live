import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterInstitute() {
  const { registerInstitute } = useAuth();
  const navigate = useNavigate();
  const [instituteName, setInstituteName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerInstitute(instituteName, name, email, password);
      navigate("/admin?view=institute");
    } catch (err) {
      setError(err.response?.data?.message || "Could not register the institute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <h1>Set up your institute 🏫</h1>
        <p>
          Create your own space on Workshop Live. You get a private code to share with your students,
          and only your institute sees your workshops and students.
        </p>
        <div className="feature-list">
          <div className="feature-item">
            <span className="dot">1</span> Register your institute and admin account
          </div>
          <div className="feature-item">
            <span className="dot">2</span> Copy your student code from the dashboard
          </div>
          <div className="feature-item">
            <span className="dot">3</span> Share it, and students register with it
          </div>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="form-box">
          <h2>Register your institute</h2>
          <p className="form-sub">You become the institute admin</p>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={submit}>
            <label>Institute name</label>
            <input value={instituteName} onChange={(e) => setInstituteName(e.target.value)} required maxLength={80} />
            <label>Your full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Creating institute..." : "Create institute"}
            </button>
          </form>
          <p className="switch-link">
            Joining an existing institute? <Link to="/register">Register with a code</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
