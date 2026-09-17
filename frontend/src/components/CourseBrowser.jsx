import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function CourseBrowser() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get("/courses");
    setCourses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buyCourse = async (course) => {
    setPayingId(course._id);
    setError("");
    try {
      const { data: order } = await api.post(`/courses/${course._id}/create-order`);
      if (!window.Razorpay) {
        setError("Payment gateway failed to load. Please check your internet connection and try again.");
        setPayingId(null);
        return;
      }
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Workshop Live",
        description: order.courseName,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            await api.post(`/courses/${course._id}/verify`, {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            load();
          } catch (err) {
            setError(err.response?.data?.message || "Payment verification failed");
          } finally {
            setPayingId(null);
          }
        },
        modal: { ondismiss: () => setPayingId(null) },
        theme: { color: "#5b5ff0" },
        prefill: { name: user.name, email: user.email },
      });
      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setPayingId(null);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || "Could not start payment");
      setPayingId(null);
    }
  };

  if (loading) return <div className="skeleton skeleton-card" />;

  return (
    <div>
      {error && <div className="error-text">{error}</div>}

      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <p>No paid courses available right now.</p>
        </div>
      ) : (
        <div className="workshop-grid">
          {courses.map((c) => (
            <div className="card" key={c._id}>
              <div className="workshop-title">{c.name}</div>
              <div className="workshop-meta">
                <span>💰 ₹{c.price}</span>
              </div>
              {c.description && <p className="workshop-desc">{c.description}</p>}
              <div className="card-actions">
                {c.purchased ? (
                  <span className="status-pill status-pill-success">✅ Purchased</span>
                ) : (
                  <button className="btn btn-primary" disabled={payingId === c._id} onClick={() => buyCourse(c)}>
                    {payingId === c._id ? "Processing..." : `💳 Pay ₹${c.price} & Unlock`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
