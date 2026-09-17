const express = require("express");
const Notification = require("../models/Notification");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get logged-in user's notifications (history)
router.get("/", auth, async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .populate("workshop", "title status currentAt meetLink");
  res.json(notifications);
});

// Mark one as read
router.patch("/:id/read", auth, async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { read: true },
    { new: true }
  );
  if (!notif) return res.status(404).json({ message: "Notification not found" });
  res.json(notif);
});

// Mark all as read
router.patch("/read-all", auth, async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.json({ message: "All marked as read" });
});

module.exports = router;
