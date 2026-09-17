import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

function CertificateCard({ cert }) {
  return (
    <div className="certificate-card">
      <div className="certificate-border">
        <div className="certificate-seal">🏅</div>
        <div className="certificate-heading">Certificate of Completion</div>
        <div className="certificate-sub">This certifies that</div>
        <div className="certificate-name">{cert.studentName}</div>
        <div className="certificate-sub">has successfully completed</div>
        <div className="certificate-workshop">{cert.workshopTitle}</div>
        <div className="certificate-footer">
          <span>Issued: {new Date(cert.issuedAt).toLocaleDateString("en-IN")}</span>
          <span>Code: {cert.code}</span>
        </div>
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => window.print()}>
        🖨️ Print / Save as PDF
      </button>
    </div>
  );
}

export default function CertificatesView() {
  const [certs, setCerts] = useState([]);

  const load = useCallback(async () => {
    const { data } = await api.get("/certificates/me");
    setCerts(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (certs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎓</div>
        <p>No certificates yet — attend a workshop through to completion to earn one.</p>
      </div>
    );
  }

  return (
    <div className="certificate-grid">
      {certs.map((c) => (
        <CertificateCard key={c._id} cert={c} />
      ))}
    </div>
  );
}
