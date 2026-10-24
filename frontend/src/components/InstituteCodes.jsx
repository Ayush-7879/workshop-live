import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

function CodeRow({ label, hint, value, onCopy, onRegenerate, copied }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <strong>{label}</strong>
      <p className="text-dim" style={{ margin: "4px 0 10px" }}>{hint}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <code style={{ fontSize: "1.1rem", letterSpacing: 1, wordBreak: "break-all" }}>{value}</code>
        <button className="btn btn-primary" onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button className="btn" onClick={onRegenerate}>
          Generate new
        </button>
      </div>
    </div>
  );
}

export default function InstituteCodes() {
  const [institute, setInstitute] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/institute/me");
      setInstitute(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load institute details");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      window.prompt("Copy this code:", text);
    }
  };

  const regenerate = async (which) => {
    if (
      !window.confirm(
        `Generate a new ${which} code? The old one will stop working for new sign-ups. People already registered are not affected.`
      )
    )
      return;
    try {
      const { data } = await api.post("/institute/regenerate", { which });
      setInstitute(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate a new code");
    }
  };

  if (error) return <div className="error-text">{error}</div>;
  if (!institute) return <p className="text-dim">Loading...</p>;

  return (
    <div>
      <h3>{institute.name}</h3>
      <p className="text-dim">
        Share the student code with your students. They choose "Student" on the register page and enter it.
      </p>
      <CodeRow
        label="Student code"
        hint="Share this with your students."
        value={institute.studentCode}
        copied={copied === "student"}
        onCopy={() => copy("student", institute.studentCode)}
        onRegenerate={() => regenerate("student")}
      />
      <CodeRow
        label="Admin code"
        hint="Only share with people who should organize workshops in your institute."
        value={institute.adminCode}
        copied={copied === "admin"}
        onCopy={() => copy("admin", institute.adminCode)}
        onRegenerate={() => regenerate("admin")}
      />
    </div>
  );
}
