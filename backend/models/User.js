const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// An account. `institute` ties the user to one institute, and `role` is decided at registration by which institute code was used.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", index: true },
    role: { type: String, enum: ["admin", "student"], default: "student" },
    points: { type: Number, default: 0 },
    college: { type: String, default: "", trim: true },
    bio: { type: String, default: "", trim: true },
    skills: [{ type: String, trim: true }],
    interests: [{ type: String, trim: true }],
    avatarUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

// Hash the password whenever it is set or changed, never store it in plain text.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
