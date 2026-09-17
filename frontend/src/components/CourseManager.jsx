import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get("/courses");
    setCourses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createCourse = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/courses", form);
      setForm({ name: "", description: "", price: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create course");
    }
  };

  const removeCourse = async (id) => {
    if (!confirm("Delete this course? Students who already paid will keep their access record, but the course listing will disappear.")) return;
    await api.delete(`/courses/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>💰 Paid Courses</h2>
          <p className="page-subtitle">Standalone paid courses students can buy directly (separate from live workshops)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "✕ Close" : "+ New Course"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3>Create New Course</h3>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={createCourse}>
            <label>Course Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label>Price (₹)</label>
            <input
              type="number"
              min="1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <button className="btn btn-success">Create Course</button>
          </form>
        </div>
      )}

      {loading && <div className="skeleton skeleton-card" />}

      {!loading && courses.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <p>No paid courses yet — click "+ New Course" to add one.</p>
        </div>
      )}

      {!loading &&
        courses.map((c) => (
          <div className="card" key={c._id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="workshop-title">{c.name}</div>
                <div className="workshop-meta">
                  <span>💰 ₹{c.price}</span>
                </div>
                {c.description && <p className="workshop-desc">{c.description}</p>}
              </div>
              <button className="btn btn-secondary" onClick={() => removeCourse(c._id)}>
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
