const express = require("express");
const Certificate = require("../models/Certificate");
const { auth } = require("../middleware/auth");

const router = express.Router();

// STUDENT: list my own certificates
router.get("/me", auth, async (req, res) => {
  const certs = await Certificate.find({ student: req.user.id }).sort({ issuedAt: -1 });
  res.json(certs);
});

// Anyone: verify a certificate by its code (e.g. for an employer to check authenticity)
router.get("/verify/:code", async (req, res) => {
  const cert = await Certificate.findOne({ code: req.params.code });
  if (!cert) return res.status(404).json({ valid: false, message: "Certificate not found" });
  res.json({
    valid: true,
    studentName: cert.studentName,
    workshopTitle: cert.workshopTitle,
    issuedAt: cert.issuedAt,
    code: cert.code,
  });
});

module.exports = router;
