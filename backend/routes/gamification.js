const express = require("express");
const User = require("../models/User");
const Workshop = require("../models/Workshop");
const QuizAttempt = require("../models/QuizAttempt");
const Certificate = require("../models/Certificate");
const { auth } = require("../middleware/auth");
const { computeBadges } = require("../utils/badges");

const router = express.Router();

async function buildProfile(userId) {
  const [attendedCount, perfectQuizzes, certificates, user] = await Promise.all([
    Workshop.countDocuments({ "attendedStudents.student": userId }),
    QuizAttempt.countDocuments({ student: userId, $expr: { $eq: ["$score", "$total"] } }),
    Certificate.countDocuments({ student: userId }),
    User.findById(userId).select("name points"),
  ]);
  const badges = computeBadges({
    points: user?.points || 0,
    attendedCount,
    perfectQuizzes,
    certificates,
  });
  return {
    name: user?.name,
    points: user?.points || 0,
    attendedCount,
    perfectQuizzes,
    certificates,
    badges,
  };
}

// STUDENT: my own gamification profile (points, badges, stats)
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await buildProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Leaderboard: top students by points (visible to everyone logged in)
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const topStudents = await User.find({ role: "student", institute: req.user.institute })
      .select("name email points")
      .sort({ points: -1 })
      .limit(20);

    const withBadges = await Promise.all(
      topStudents.map(async (s, idx) => {
        const [attendedCount, perfectQuizzes, certificates] = await Promise.all([
          Workshop.countDocuments({ "attendedStudents.student": s._id }),
          QuizAttempt.countDocuments({ student: s._id, $expr: { $eq: ["$score", "$total"] } }),
          Certificate.countDocuments({ student: s._id }),
        ]);
        return {
          rank: idx + 1,
          id: s._id,
          name: s.name,
          points: s.points,
          badges: computeBadges({ points: s.points, attendedCount, perfectQuizzes, certificates }),
        };
      })
    );

    res.json(withBadges);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
