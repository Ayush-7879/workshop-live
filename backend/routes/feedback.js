const express = require("express");
const Feedback = require("../models/Feedback");
const Workshop = require("../models/Workshop");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();

// STUDENT: submit feedback for a workshop they attended (only once, after it's completed)
router.post("/", auth, async (req, res) => {
  try {
    const { workshopId, rating, feedback, improvement } = req.body;
    if (!workshopId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "workshopId and a rating (1-5) are required" });
    }
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });

    const attended = workshop.attendedStudents.some((a) => a.student.toString() === req.user.id);
    if (!attended) {
      return res.status(403).json({ message: "Only students who attended this workshop can leave feedback" });
    }

    const entry = await Feedback.findOneAndUpdate(
      { workshop: workshopId, student: req.user.id },
      { rating, feedback: feedback || "", improvement: improvement || "" },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// STUDENT: check if I've already left feedback for a workshop
router.get("/me/:workshopId", auth, async (req, res) => {
  const entry = await Feedback.findOne({ workshop: req.params.workshopId, student: req.user.id });
  res.json(entry || null);
});

// ADMIN: see all feedback + average rating for a workshop
router.get("/workshop/:workshopId", auth, adminOnly, async (req, res) => {
  const entries = await Feedback.find({ workshop: req.params.workshopId })
    .populate("student", "name email")
    .sort({ createdAt: -1 });
  const avgRating = entries.length
    ? Math.round((entries.reduce((sum, e) => sum + e.rating, 0) / entries.length) * 10) / 10
    : 0;
  res.json({ entries, avgRating, count: entries.length });
});

module.exports = router;
