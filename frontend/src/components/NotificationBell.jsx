import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function NotificationBell({ onToast }) {
  const { socket } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifications((prev) => [{ ...notif, read: false }, ...prev]);
      if (onToast) onToast(notif);
    };
    socket.on("notification", handler);
    return () => socket.off("notification", handler);
  }, [socket, onToast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="bell-wrap">
      <button className="bell-btn" onClick={() => setOpen((o) => !o)}>
        🔔
        {unreadCount > 0 && <span className="bell-dot">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            <button onClick={markAllRead}>Mark all as read</button>
          </div>
          {notifications.length === 0 && (
            <div className="notif-empty">🔕 No notifications yet.</div>
          )}
          {notifications.map((n) => (
            <div key={n._id} className={`notif-item ${n.read ? "" : "unread"}`}>
              <span className={`type-${n.type}`}>
                {n.type === "live" && "🔴 LIVE"}
                {n.type === "cancelled" && "❌ CANCELLED"}
                {n.type === "delayed" && "⏰ DELAYED"}
                {n.type === "enrolled" && "✅ JOINED"}
                {n.type === "reminder" && "📌 REMINDER"}
                {n.type === "requested" && "🙋 NEW REQUEST"}
                {n.type === "accepted" && "✅ ACCEPTED"}
                {n.type === "rejected" && "❌ REJECTED"}
                {n.type === "certificate" && "🎓 CERTIFICATE"}
              </span>
              <div>{n.message}</div>
              <div style={{ color: "#999", fontSize: "0.72rem", marginTop: 4 }}>
                {new Date(n.createdAt).toLocaleString("en-IN")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
