const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");

const router = express.Router();

// Max 20 login/register attempts per IP every 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});
router.use(authLimiter);

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function makeToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Register (role: admin or student)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, adminCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields (name, email, password)" });
    }
    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      return res.status(400).json({ message: "Invalid input" });
    }
    // Admin accounts need the invite code from the ADMIN_INVITE_CODE env var.
    // If the variable is not set, nobody can register as admin.
    if (role === "admin") {
      const expected = process.env.ADMIN_INVITE_CODE;
      if (!expected || typeof adminCode !== "string" || !safeEqual(adminCode, expected)) {
        return res.status(403).json({ message: "Invalid admin invite code" });
      }
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    const user = await User.create({
      name,
      email,
      password,
      role: role === "admin" ? "admin" : "student",
    });
    const token = makeToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: "Invalid email or password" });
    const token = makeToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
