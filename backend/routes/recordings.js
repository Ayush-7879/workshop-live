const express = require("express");
const Recording = require("../models/Recording");
const Workshop = require("../models/Workshop");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();

// ADMIN: add or replace the recording for a (usually completed) workshop
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { workshopId, title, videoUrl, chapters } = req.body;
    if (!workshopId || !title || !videoUrl) {
      return res.status(400).json({ message: "workshopId, title and videoUrl are required" });
    }
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });

    const cleanChapters = Array.isArray(chapters)
      ? chapters
          .filter((c) => c.title && c.timestampSeconds !== undefined)
          .map((c) => ({ title: c.title, timestampSeconds: Number(c.timestampSeconds) || 0 }))
      : [];

    const recording = await Recording.findOneAndUpdate(
      { workshop: workshopId },
      { title, videoUrl, chapters: cleanChapters, addedBy: req.user.id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(recording);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get the recording for one workshop (enrolled students + admin)
router.get("/workshop/:workshopId", auth, async (req, res) => {
  const recording = await Recording.findOne({ workshop: req.params.workshopId });
  res.json(recording || null);
});

// STUDENT/ADMIN: the recording library — every recording for workshops I'm enrolled in
// (admins see all), with optional ?q= search across workshop title / recording title / chapters
router.get("/", auth, async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();

    let workshopFilter = {};
    if (req.user.role !== "admin") {
      workshopFilter = { enrolledStudents: req.user.id };
    }
    const workshops = await Workshop.find(workshopFilter).select("title currentAt status");
    const workshopIds = workshops.map((w) => w._id);
    const workshopMap = new Map(workshops.map((w) => [w._id.toString(), w]));

    let recordings = await Recording.find({ workshop: { $in: workshopIds } }).sort({ createdAt: -1 });

    const enriched = recordings
      .map((r) => ({
        _id: r._id,
        title: r.title,
        videoUrl: r.videoUrl,
        chapters: r.chapters,
        workshop: workshopMap.get(r.workshop.toString()),
      }))
      .filter((r) => r.workshop);

    const filtered = q
      ? enriched.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.workshop.title.toLowerCase().includes(q) ||
            r.chapters.some((c) => c.title.toLowerCase().includes(q))
        )
      : enriched;

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ADMIN: delete a recording
router.delete("/:id", auth, adminOnly, async (req, res) => {
  const recording = await Recording.findById(req.params.id);
  if (!recording) return res.status(404).json({ message: "Recording not found" });
  await recording.deleteOne();
  res.json({ message: "Recording deleted" });
});

module.exports = router;
