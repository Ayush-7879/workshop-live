const express = require("express");
const Workshop = require("../models/Workshop");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Certificate = require("../models/Certificate");
const { auth, adminOnly } = require("../middleware/auth");

const ATTEND_POINTS = 10;
const COMPLETION_BONUS_POINTS = 5;
// A student must maintain at least this overall attendance % (across every
// finished workshop they've enrolled in) before a new certificate unlocks.
const CERTIFICATE_ATTENDANCE_THRESHOLD = 80;

// a student's overall attendance % across every workshop that has already
// finished (live/completed) or been cancelled for them — mirrors routes/attendance.js
async function computeOverallAttendancePct(studentId) {
  const workshops = await Workshop.find({ enrolledStudents: studentId }).select("status attendedStudents");
  let finished = 0;
  let attended = 0;
  for (const w of workshops) {
    if (w.status === "live" || w.status === "completed") {
      finished += 1;
      if (w.attendedStudents.some((a) => a.student.toString() === studentId.toString())) attended += 1;
    }
  }
  if (finished === 0) return 100; // nothing to measure against yet — don't penalize
  return Math.round((attended / finished) * 100);
}

// issue a certificate + bonus points to everyone who actually attended, once a workshop is
// completed — but only if their overall attendance % meets the certificate threshold
async function issueCertificatesAndPoints(io, workshop) {
  for (const record of workshop.attendedStudents) {
    const studentId = record.student;
    const existing = await Certificate.findOne({ student: studentId, workshop: workshop._id });
    if (existing) continue;
    const student = await User.findById(studentId).select("name");
    if (!student) continue;

    const attendancePct = await computeOverallAttendancePct(studentId);
    if (attendancePct < CERTIFICATE_ATTENDANCE_THRESHOLD) {
      if (io) {
        await sendNotification(
          io,
          workshop,
          studentId,
          "certificate",
          `Almost there! Your overall attendance is ${attendancePct}% — reach ${CERTIFICATE_ATTENDANCE_THRESHOLD}% to unlock your certificate for "${workshop.title}".`
        );
      }
      continue;
    }

    const cert = await Certificate.create({
      student: studentId,
      workshop: workshop._id,
      workshopTitle: workshop.title,
      studentName: student.name,
      code: Certificate.generateCode(),
    });
    await User.findByIdAndUpdate(studentId, { $inc: { points: COMPLETION_BONUS_POINTS } });
    if (io) {
      await sendNotification(
        io,
        workshop,
        studentId,
        "certificate",
        `Your certificate for "${workshop.title}" is ready! (Code: ${cert.code})`
      );
    }
  }
}

const router = express.Router();

const POPULATE_FIELDS = [
  { path: "createdBy", select: "name email" },
  { path: "enrolledStudents", select: "name email" },
  { path: "pendingStudents", select: "name email" },
  { path: "attendedStudents.student", select: "name email" },
];

// helper: send one notification to one user + emit over socket
async function sendNotification(io, workshop, userId, type, message) {
  const notif = await Notification.create({
    workshop: workshop._id,
    user: userId,
    type,
    message,
  });
  io.to(`user:${userId}`).emit("notification", {
    _id: notif._id,
    workshopId: workshop._id,
    workshopTitle: workshop.title,
    type: notif.type,
    message: notif.message,
    createdAt: notif.createdAt,
  });
  return notif;
}

// helper: create + emit notifications to a list of student user ids
async function notifyStudents(io, workshop, studentIds, type, message) {
  const docs = studentIds.map((sid) => ({
    workshop: workshop._id,
    user: sid,
    type,
    message,
  }));
  if (docs.length === 0) return;
  const created = await Notification.insertMany(docs);
  created.forEach((n) => {
    io.to(`user:${n.user}`).emit("notification", {
      _id: n._id,
      workshopId: workshop._id,
      workshopTitle: workshop.title,
      type: n.type,
      message: n.message,
      createdAt: n.createdAt,
    });
  });
  // also broadcast to the workshop's own room (for anyone viewing it live)
  io.to(`workshop:${workshop._id}`).emit("workshop:update", {
    _id: workshop._id,
    status: workshop.status,
    statusMessage: workshop.statusMessage,
    currentAt: workshop.currentAt,
    meetLink: workshop.meetLink,
  });
}

// GET all workshops (any logged-in user)
router.get("/", auth, async (req, res) => {
  const workshops = await Workshop.find().sort({ currentAt: 1 }).populate(POPULATE_FIELDS);
  res.json(workshops);
});

// GET single workshop
router.get("/:id", auth, async (req, res) => {
  const workshop = await Workshop.findById(req.params.id).populate(POPULATE_FIELDS);
  if (!workshop) return res.status(404).json({ message: "Workshop not found" });
  res.json(workshop);
});

// CREATE workshop (admin only)
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { title, description, scheduledAt, meetLink, mode, location } = req.body;
    if (!title || !scheduledAt) {
      return res.status(400).json({ message: "Title and date/time are required" });
    }
    const workshop = await Workshop.create({
      title,
      description,
      scheduledAt,
      currentAt: scheduledAt,
      meetLink: meetLink || "",
      mode: ["online", "offline", "hybrid"].includes(mode) ? mode : "online",
      location: {
        address: location?.address || "",
        mapLink: location?.mapLink || "",
      },
      createdBy: req.user.id,
    });
    res.status(201).json(workshop);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// UPDATE workshop details (admin only) - title/description/meetLink/scheduledAt
router.put("/:id", auth, adminOnly, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });
    const { title, description, meetLink, scheduledAt, mode, location } = req.body;
    if (title !== undefined) workshop.title = title;
    if (description !== undefined) workshop.description = description;
    if (meetLink !== undefined) workshop.meetLink = meetLink;
    if (scheduledAt !== undefined) workshop.scheduledAt = scheduledAt;
    if (mode !== undefined && ["online", "offline", "hybrid"].includes(mode)) workshop.mode = mode;
    if (location !== undefined) {
      workshop.location = {
        address: location?.address || "",
        mapLink: location?.mapLink || "",
      };
    }
    await workshop.save();
    res.json(workshop);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// STUDENT: request to join a workshop (goes into pending list, admin must approve)
router.post("/:id/join", auth, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });

    const alreadyEnrolled = workshop.enrolledStudents.some((id) => id.toString() === req.user.id);
    const alreadyPending = workshop.pendingStudents.some((id) => id.toString() === req.user.id);
    if (alreadyEnrolled) {
      return res.status(400).json({ message: "You have already joined this workshop" });
    }
    if (alreadyPending) {
      return res.status(400).json({ message: "Your request is already pending approval" });
    }

    workshop.pendingStudents.push(req.user.id);
    await workshop.save();

    const io = req.app.get("io");

    // notify the admin who created this workshop about the new request
    await sendNotification(
      io,
      workshop,
      workshop.createdBy,
      "requested",
      `${req.user.name} requested to join "${workshop.title}".`
    );

    io.emit("workshop:list-update", { _id: workshop._id });

    const updated = await Workshop.findById(workshop._id).populate(POPULATE_FIELDS);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ADMIN: accept or reject a pending join request
router.patch("/:id/requests/:studentId", auth, adminOnly, async (req, res) => {
  try {
    const { action } = req.body; // "accept" | "reject"
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });

    const studentId = req.params.studentId;
    const wasPending = workshop.pendingStudents.some((id) => id.toString() === studentId);
    if (!wasPending) {
      return res.status(400).json({ message: "This request is no longer pending" });
    }

    workshop.pendingStudents = workshop.pendingStudents.filter((id) => id.toString() !== studentId);

    const io = req.app.get("io");

    if (action === "accept") {
      if (!workshop.enrolledStudents.some((id) => id.toString() === studentId)) {
        workshop.enrolledStudents.push(studentId);
      }
      await workshop.save();
      await User.findByIdAndUpdate(studentId, { $inc: { points: 2 } });
      await sendNotification(
        io,
        workshop,
        studentId,
        "accepted",
        `Your request to join "${workshop.title}" was accepted. See you there!`
      );
    } else {
      await workshop.save();
      await sendNotification(
        io,
        workshop,
        studentId,
        "rejected",
        `Your request to join "${workshop.title}" was declined by the admin.`
      );
    }

    io.emit("workshop:list-update", { _id: workshop._id });

    const updated = await Workshop.findById(workshop._id).populate(POPULATE_FIELDS);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// STUDENT: mark attendance (called when they click "Join Live")
router.post("/:id/attend", auth, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });

    const isEnrolled = workshop.enrolledStudents.some((id) => id.toString() === req.user.id);
    if (!isEnrolled) {
      return res.status(403).json({ message: "You are not enrolled in this workshop" });
    }
    if (workshop.status !== "live") {
      return res.status(400).json({ message: "Attendance can only be marked while the workshop is live" });
    }

    const alreadyAttended = workshop.attendedStudents.some((a) => a.student.toString() === req.user.id);
    if (!alreadyAttended) {
      workshop.attendedStudents.push({ student: req.user.id, joinedAt: new Date() });
      await workshop.save();
      await User.findByIdAndUpdate(req.user.id, { $inc: { points: ATTEND_POINTS } });
      const io = req.app.get("io");
      io.emit("workshop:list-update", { _id: workshop._id });
    }

    const updated = await Workshop.findById(workshop._id).populate(POPULATE_FIELDS);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ADMIN: change status -> go live / cancel / delay / mark completed / reset to scheduled
router.patch("/:id/status", auth, adminOnly, async (req, res) => {
  try {
    const { status, message, newTime, meetLink } = req.body;
    const allowed = ["scheduled", "live", "delayed", "cancelled", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });

    workshop.status = status;
    workshop.statusMessage = message || "";
    if (status === "delayed" && newTime) {
      workshop.currentAt = newTime;
      workshop.reminderSent = false;
    }
    if (status === "live" && meetLink) {
      workshop.meetLink = meetLink;
    }
    if (status === "scheduled") {
      workshop.statusMessage = "";
    }
    await workshop.save();

    const io = req.app.get("io");

    if (status === "completed") {
      await issueCertificatesAndPoints(io, workshop);
    }

    const studentIds = workshop.enrolledStudents.map((id) => id.toString());

    let notifType = null;
    let notifMessage = "";
    if (status === "live") {
      notifType = "live";
      notifMessage = `The "${workshop.title}" workshop is now LIVE! Click the link to join.`;
    } else if (status === "cancelled") {
      notifType = "cancelled";
      notifMessage = `The "${workshop.title}" workshop has been CANCELLED.${message ? " Reason: " + message : ""}`;
    } else if (status === "delayed") {
      notifType = "delayed";
      notifMessage = `The "${workshop.title}" workshop has been DELAYED.${message ? " Reason: " + message : ""}${
        newTime ? " New time: " + new Date(newTime).toLocaleString("en-IN") : ""
      }`;
    }

    if (notifType) {
      await notifyStudents(io, workshop, studentIds, notifType, notifMessage);
    } else {
      // still broadcast generic update (e.g. completed / reset to scheduled)
      io.to(`workshop:${workshop._id}`).emit("workshop:update", {
        _id: workshop._id,
        status: workshop.status,
        statusMessage: workshop.statusMessage,
        currentAt: workshop.currentAt,
        meetLink: workshop.meetLink,
      });
    }

    // broadcast to everyone so workshop lists refresh live (public room)
    io.emit("workshop:list-update", { _id: workshop._id });

    const updated = await Workshop.findById(workshop._id).populate(POPULATE_FIELDS);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE workshop (admin only)
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });
    await workshop.deleteOne();
    const io = req.app.get("io");
    io.emit("workshop:list-update", { _id: req.params.id, deleted: true });
    res.json({ message: "Workshop deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
