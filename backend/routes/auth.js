const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Institute = require("../models/Institute");

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

// Creating institutes is open to anyone, so keep it tighter: 5 per hour per IP
const instituteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many institutes created from this network. Please try again later." },
});

function makeToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, institute: user.institute },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Register (role: admin or student)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, instituteCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields (name, email, password)" });
    }
    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      return res.status(400).json({ message: "Invalid input" });
    }
    // Everyone joins an institute with its code. The student code makes a student,
    // the admin code makes an admin. The role is decided by the code, never by the client.
    if (typeof instituteCode !== "string" || !instituteCode.trim()) {
      return res.status(400).json({ message: "Institute code is required" });
    }
    const code = instituteCode.trim();
    const wantsAdmin = role === "admin";
    const institute = await Institute.findOne(wantsAdmin ? { adminCode: code } : { studentCode: code });
    if (!institute) {
      return res.status(403).json({
        message: wantsAdmin ? "Invalid admin code for this institute" : "Invalid institute code",
      });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    const user = await User.create({
      name,
      email,
      password,
      role: wantsAdmin ? "admin" : "student",
      institute: institute._id,
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

// Register a new institute: creates the institute, its two codes and its first admin.
// The admin then shares the student code with their students.
router.post("/register-institute", instituteLimiter, async (req, res) => {
  try {
    const { instituteName, name, email, password } = req.body;
    if (!instituteName || !name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }
    if ([instituteName, name, email, password].some((v) => typeof v !== "string")) {
      return res.status(400).json({ message: "Invalid input" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const cleanName = instituteName.trim();
    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({ message: "Institute name must be 2 to 80 characters" });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    if (await Institute.findOne({ name: cleanName })) {
      return res.status(400).json({ message: "An institute with this name already exists" });
    }
    const institute = await Institute.create({
      name: cleanName,
      studentCode: Institute.generateCode("STU"),
      adminCode: Institute.generateCode("ADM"),
    });
    const user = await User.create({
      name,
      email,
      password,
      role: "admin",
      institute: institute._id,
    });
    res.status(201).json({
      token: makeToken(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "That institute name or email is already taken" });
    }
    res.status(500).json({ message: "Server error" });
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
