import React, { useEffect, useState, useCallback } from "react";
import api, { API_URL } from "../api/axios.js";

function resolveUrl(url) {
  if (!url) return url;
  return url.startsWith("/uploads/") ? `${API_URL}${url}` : url;
}

function TagInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const v = draft.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  };

  const removeTag = (tag) => onChange(values.filter((t) => t !== tag));

  return (
    <div className="tag-input-block">
      <label>{label}</label>
      <div className="tag-row">
        {values.map((t) => (
          <span className="tag-chip" key={t}>
            {t}
            <button type="button" onClick={() => removeTag(t)}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="tag-add-row">
        <input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <button type="button" className="btn btn-secondary" onClick={addTag}>
          + Add
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ name: "", college: "", bio: "", avatarUrl: "", skills: [], interests: [] });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get("/profile/me");
    setData(data);
    setForm({
      name: data.user.name || "",
      college: data.user.college || "",
      bio: data.user.bio || "",
      avatarUrl: data.user.avatarUrl || "",
      skills: data.user.skills || [],
      interests: data.user.interests || [],
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uploadAvatar = async (file) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, avatarUrl: data.url }));
    } catch (err) {
      setError(err.response?.data?.message || "Could not upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data: res } = await api.put("/profile/me", form);
      setData((d) => ({ ...d, user: res.user, completion: res.completion }));
      setEditing(false);
      setSuccess("Profile updated!");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div>
        <div className="skeleton skeleton-hero" />
        <div className="skeleton skeleton-line" style={{ width: "60%" }} />
        <div className="skeleton skeleton-line" style={{ width: "40%" }} />
      </div>
    );
  }

  const { user, attendedWorkshops, certificates, completion } = data;
  const initial = user.name?.[0]?.toUpperCase() || "?";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Profile</h2>
          <p className="page-subtitle">Your info, skills, and everything you've achieved so far</p>
        </div>
        {!editing && (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      <div className="profile-header-card">
        <div className="profile-avatar-wrap">
          {form.avatarUrl ? (
            <img src={resolveUrl(form.avatarUrl)} alt={user.name} className="profile-avatar" />
          ) : (
            <div className="profile-avatar profile-avatar-fallback">{initial}</div>
          )}
          {editing && (
            <label className="avatar-upload-btn">
              {uploadingAvatar ? "Uploading..." : "📷 Change Photo"}
              <input type="file" accept="image/*" hidden onChange={(e) => uploadAvatar(e.target.files[0])} />
            </label>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div className="profile-name">{user.name}</div>
          <div className="profile-email">{user.email} · {user.role === "admin" ? "Admin" : "Student"}</div>
          <div className="completion-row">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${completion}%` }} />
            </div>
            <span className="completion-label">{completion}% profile complete</span>
          </div>
        </div>
      </div>

      {success && <div className="success-text">{success}</div>}
      {error && <div className="error-text">{error}</div>}

      {editing ? (
        <form onSubmit={save} className="card profile-edit-form">
          <label>Full Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <label>College / Institution</label>
          <input
            placeholder="e.g. IIT Delhi"
            value={form.college}
            onChange={(e) => setForm({ ...form, college: e.target.value })}
          />

          <label>Bio</label>
          <textarea
            rows={3}
            placeholder="A short line about yourself"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />

          <TagInput
            label="Skills"
            values={form.skills}
            onChange={(skills) => setForm({ ...form, skills })}
            placeholder="e.g. React (press Enter)"
          />
          <TagInput
            label="Interests"
            values={form.interests}
            onChange={(interests) => setForm({ ...form, interests })}
            placeholder="e.g. AI/ML (press Enter)"
          />

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button className="btn btn-success" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="card">
          <p className="workshop-desc">{user.bio || "No bio added yet."}</p>
          <div style={{ marginBottom: 10 }}>
            <strong>🎓 College: </strong>
            {user.college || "—"}
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>🛠 Skills</strong>
            <div className="badge-row" style={{ marginTop: 6 }}>
              {(user.skills || []).length === 0 && <span className="text-dim">No skills added yet.</span>}
              {(user.skills || []).map((s) => (
                <span className="badge-chip" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <strong>💡 Interests</strong>
            <div className="badge-row" style={{ marginTop: 6 }}>
              {(user.interests || []).length === 0 && <span className="text-dim">No interests added yet.</span>}
              {(user.interests || []).map((s) => (
                <span className="badge-chip" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="page-header" style={{ marginTop: 30 }}>
        <h3>📚 Attended Workshops ({attendedWorkshops.length})</h3>
      </div>
      {attendedWorkshops.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No workshops attended yet.</p>
        </div>
      ) : (
        <div className="student-table">
          <table>
            <thead>
              <tr>
                <th>Workshop</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendedWorkshops.map((w) => (
                <tr key={w._id}>
                  <td>{w.title}</td>
                  <td>{new Date(w.currentAt).toLocaleDateString("en-IN")}</td>
                  <td>{w.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="page-header" style={{ marginTop: 30 }}>
        <h3>🎓 Certificates ({certificates.length})</h3>
      </div>
      {certificates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎓</div>
          <p>No certificates yet — complete a workshop to earn one.</p>
        </div>
      ) : (
        <div className="badge-row">
          {certificates.map((c) => (
            <span className="badge-chip" key={c._id}>
              🏅 {c.workshopTitle}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
