const express = require("express");
const Course = require("../models/Course");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const { auth, adminOnly } = require("../middleware/auth");
const { createOrder, verifySignature, RAZORPAY_KEY_ID } = require("../utils/razorpay");

const router = express.Router();

// ADMIN: create a paid course
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { name, description, price } = req.body;
    if (!name || !price || Number(price) <= 0) {
      return res.status(400).json({ message: "Course name and a price greater than 0 are required" });
    }
    const course = await Course.create({
      name,
      description: description || "",
      price: Number(price),
      createdBy: req.user.id,
      institute: req.user.institute,
    });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET all courses (any logged-in user). Students also see whether they've already purchased each one.
router.get("/", auth, async (req, res) => {
  try {
    const courses = await Course.find({ institute: req.user.institute }).sort({ createdAt: -1 });
    if (req.user.role === "admin") return res.json(courses.map((c) => ({ ...c.toObject(), purchased: undefined })));

    const paidCourseIds = new Set(
      (await Payment.find({ student: req.user.id, status: "paid" }).select("course")).map((p) => p.course.toString())
    );
    const withStatus = courses.map((c) => ({ ...c.toObject(), purchased: paidCourseIds.has(c._id.toString()) }));
    res.json(withStatus);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// STUDENT: my purchased courses
router.get("/me/purchased", auth, async (req, res) => {
  const payments = await Payment.find({ student: req.user.id, status: "paid" }).populate("course");
  res.json(payments.map((p) => p.course).filter(Boolean));
});

// ADMIN: delete a course
router.delete("/:id", auth, adminOnly, async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, institute: req.user.institute });
  if (!course) return res.status(404).json({ message: "Course not found" });
  await course.deleteOne();
  res.json({ message: "Course deleted" });
});

// STUDENT: create a Razorpay order to buy a course
router.post("/:id/create-order", auth, async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, institute: req.user.institute });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const alreadyPaid = await Payment.findOne({ course: course._id, student: req.user.id, status: "paid" });
    if (alreadyPaid) return res.status(400).json({ message: "You already purchased this course" });

    const order = await createOrder({
      amountInRupees: course.price,
      receipt: `crs_${course._id}_${req.user.id}`.slice(0, 40),
      notes: { courseId: String(course._id), studentId: req.user.id },
    });

    await Payment.create({
      course: course._id,
      student: req.user.id,
      orderId: order.id,
      amount: course.price,
      status: "created",
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      courseName: course.name,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not start payment" });
  }
});

// STUDENT: verify the payment Razorpay returned to the browser
router.post("/:id/verify", auth, async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const valid = verifySignature({ orderId, paymentId, signature });
    if (!valid) {
      await Payment.findOneAndUpdate({ orderId }, { status: "failed" });
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const payment = await Payment.findOneAndUpdate(
      { orderId, course: req.params.id, student: req.user.id },
      { paymentId, signature, status: "paid" },
      { new: true }
    );
    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    const course = await Course.findOne({ _id: req.params.id, institute: req.user.institute });
    const io = req.app.get("io");
    if (io && course) {
      const notif = await Notification.create({
        user: req.user.id,
        type: "accepted",
        message: `Payment successful! You now have access to "${course.name}".`,
      });
      io.to(`user:${req.user.id}`).emit("notification", {
        _id: notif._id,
        type: notif.type,
        message: notif.message,
        createdAt: notif.createdAt,
      });
    }

    res.json({ message: "Payment verified — course unlocked!", course });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not verify payment" });
  }
});

module.exports = router;
