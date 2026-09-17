const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

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
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields (name, email, password)" });
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
    const user = await User.findOne({ email: (email || "").toLowerCase() });
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
