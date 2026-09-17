const express = require("express");
const Workshop = require("../models/Workshop");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const { auth } = require("../middleware/auth");
const { createOrder, verifySignature, RAZORPAY_KEY_ID } = require("../utils/razorpay");

const router = express.Router();

// STUDENT: create a Razorpay order to pay for a paid workshop
router.post("/create-order", auth, async (req, res) => {
  try {
    const { workshopId } = req.body;
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });
    if (!workshop.isPaid) return res.status(400).json({ message: "This workshop is free — no payment needed" });

    const alreadyEnrolled = workshop.enrolledStudents.some((id) => id.toString() === req.user.id);
    if (alreadyEnrolled) return res.status(400).json({ message: "You have already joined this workshop" });

    const order = await createOrder({
      amountInRupees: workshop.price,
      receipt: `wk_${workshop._id}_${req.user.id}`.slice(0, 40),
      notes: { workshopId: String(workshop._id), studentId: req.user.id },
    });

    await Payment.create({
      workshop: workshop._id,
      student: req.user.id,
      orderId: order.id,
      amount: workshop.price,
      status: "created",
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      workshopTitle: workshop.title,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not start payment" });
  }
});

// STUDENT: verify the payment Razorpay returned to the browser, then enroll them
router.post("/verify", auth, async (req, res) => {
  try {
    const { orderId, paymentId, signature, workshopId } = req.body;
    if (!orderId || !paymentId || !signature || !workshopId) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const valid = verifySignature({ orderId, paymentId, signature });
    if (!valid) {
      await Payment.findOneAndUpdate({ orderId }, { status: "failed" });
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const payment = await Payment.findOneAndUpdate(
      { orderId, workshop: workshopId, student: req.user.id },
      { paymentId, signature, status: "paid" },
      { new: true }
    );
    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });

    if (!workshop.enrolledStudents.some((id) => id.toString() === req.user.id)) {
      workshop.enrolledStudents.push(req.user.id);
      workshop.pendingStudents = workshop.pendingStudents.filter((id) => id.toString() !== req.user.id);
      await workshop.save();
    }

    const io = req.app.get("io");
    if (io) {
      const notif = await Notification.create({
        workshop: workshop._id,
        user: req.user.id,
        type: "accepted",
        message: `Payment successful! You're enrolled in "${workshop.title}".`,
      });
      io.to(`user:${req.user.id}`).emit("notification", {
        _id: notif._id,
        workshopId: workshop._id,
        workshopTitle: workshop.title,
        type: notif.type,
        message: notif.message,
        createdAt: notif.createdAt,
      });
      io.emit("workshop:list-update", { _id: workshop._id });
    }

    res.json({ message: "Payment verified — you're enrolled!", workshop });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not verify payment" });
  }
});

// STUDENT: my own payment history
router.get("/me", auth, async (req, res) => {
  const payments = await Payment.find({ student: req.user.id }).populate("workshop", "title").sort({ createdAt: -1 });
  res.json(payments);
});

module.exports = router;
