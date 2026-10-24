const express = require("express");
const User = require("../models/User");
const Workshop = require("../models/Workshop");
const Certificate = require("../models/Certificate");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();

const EDITABLE_FIELDS = ["name", "college", "bio", "avatarUrl"];

function computeCompletion(user) {
  const checks = [
    !!user.name,
    !!user.college,
    !!user.bio,
    Array.isArray(user.skills) && user.skills.length > 0,
    Array.isArray(user.interests) && user.interests.length > 0,
    !!user.avatarUrl,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

// GET my profile: basic info + attended workshops + certificates + completion %
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const attendedWorkshops = await Workshop.find({ "attendedStudents.student": req.user.id })
      .select("title currentAt status")
      .sort({ currentAt: -1 });

    const certificates = await Certificate.find({ student: req.user.id }).sort({ issuedAt: -1 });

    res.json({
      user,
      attendedWorkshops,
      certificates,
      completion: computeCompletion(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ADMIN: see every student's details in one place (name, email, college, skills,
// points, workshops joined/attended, certificates earned)
router.get("/students", auth, adminOnly, async (req, res) => {
  try {
    const students = await User.find({ role: "student", institute: req.user.institute })
      .select("-password")
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      students.map(async (s) => {
        const [joinedCount, attendedCount, certificatesCount] = await Promise.all([
          Workshop.countDocuments({ enrolledStudents: s._id }),
          Workshop.countDocuments({ "attendedStudents.student": s._id }),
          Certificate.countDocuments({ student: s._id }),
        ]);
        return {
          id: s._id,
          name: s.name,
          email: s.email,
          college: s.college,
          bio: s.bio,
          skills: s.skills,
          interests: s.interests,
          avatarUrl: s.avatarUrl,
          points: s.points,
          joinedAt: s.createdAt,
          joinedCount,
          attendedCount,
          certificatesCount,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ADMIN: single student's full detail, including which workshops they attended
router.get("/students/:id", auth, adminOnly, async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "student", institute: req.user.institute }).select("-password");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const [attendedWorkshops, enrolledWorkshops, certificates] = await Promise.all([
      Workshop.find({ "attendedStudents.student": student._id }).select("title currentAt status"),
      Workshop.find({ enrolledStudents: student._id }).select("title currentAt status"),
      Certificate.find({ student: student._id }).sort({ issuedAt: -1 }),
    ]);

    res.json({
      student,
      enrolledWorkshops,
      attendedWorkshops,
      certificates,
      completion: computeCompletion(student),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT: update my own editable profile fields
router.put("/me", auth, async (req, res) => {
  try {
    const update = {};
    EDITABLE_FIELDS.forEach((f) => {
      if (typeof req.body[f] === "string") update[f] = req.body[f].trim();
    });
    if (Array.isArray(req.body.skills)) {
      update.skills = req.body.skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
    }
    if (Array.isArray(req.body.interests)) {
      update.interests = req.body.interests.map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
    }
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select("-password");
    res.json({ user, completion: computeCompletion(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
