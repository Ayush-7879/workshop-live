import React, { useEffect } from "react";

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 6000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`toast ${toast.type}`}>
      <strong>{toast.workshopTitle}</strong>
      <div style={{ marginTop: 4 }}>{toast.message}</div>
    </div>
  );
}
