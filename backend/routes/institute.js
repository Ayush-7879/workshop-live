const express = require("express");
const Institute = require("../models/Institute");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();

// ADMIN: see my institute's name and the codes to share (the student code goes to students)
router.get("/me", auth, adminOnly, async (req, res) => {
  const institute = await Institute.findById(req.user.institute);
  if (!institute) return res.status(404).json({ message: "Institute not found" });
  res.json({
    name: institute.name,
    studentCode: institute.studentCode,
    adminCode: institute.adminCode,
  });
});

// ADMIN: replace a code with a new one (for example if it was shared with the wrong people).
// People who already registered are not affected, only new registrations need the new code.
router.post("/regenerate", auth, adminOnly, async (req, res) => {
  const { which } = req.body;
  if (!["student", "admin"].includes(which)) {
    return res.status(400).json({ message: "which must be student or admin" });
  }
  const institute = await Institute.findById(req.user.institute);
  if (!institute) return res.status(404).json({ message: "Institute not found" });
  if (which === "student") institute.studentCode = Institute.generateCode("STU");
  else institute.adminCode = Institute.generateCode("ADM");
  await institute.save();
  res.json({
    name: institute.name,
    studentCode: institute.studentCode,
    adminCode: institute.adminCode,
  });
});

module.exports = router;
