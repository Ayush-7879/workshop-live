const express = require("express");
const { errorDetail } = require("../utils/errors");
const Workshop = require("../models/Workshop");
const { auth } = require("../middleware/auth");

const router = express.Router();

// STUDENT: see my own attendance across every workshop I've joined
router.get("/me", auth, async (req, res) => {
  try {
    const workshops = await Workshop.find({ enrolledStudents: req.user.id })
      .select("title status currentAt attendedStudents createdBy")
      .populate("createdBy", "name")
      .sort({ currentAt: -1 });

    const history = workshops.map((w) => {
      const record = w.attendedStudents.find((a) => a.student.toString() === req.user.id);
      let attendanceStatus = "upcoming";
      if (w.status === "live" || w.status === "completed") {
        attendanceStatus = record ? "attended" : "missed";
      } else if (w.status === "cancelled") {
        attendanceStatus = "cancelled";
      }
      return {
        workshopId: w._id,
        title: w.title,
        host: w.createdBy?.name || "",
        date: w.currentAt,
        status: w.status,
        attendanceStatus,
        joinedAt: record ? record.joinedAt : null,
      };
    });

    const finishedWorkshops = history.filter((h) => h.attendanceStatus === "attended" || h.attendanceStatus === "missed");
    const attendedCount = history.filter((h) => h.attendanceStatus === "attended").length;
    const percentage = finishedWorkshops.length
      ? Math.round((attendedCount / finishedWorkshops.length) * 100)
      : 0;

    res.json({
      history,
      stats: {
        totalJoined: history.length,
        totalAttended: attendedCount,
        totalMissed: finishedWorkshops.length - attendedCount,
        percentage,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: errorDetail(err) });
  }
});

module.exports = router;
