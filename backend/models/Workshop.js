const mongoose = require("mongoose");

const workshopSchema = new mongoose.Schema(
  {
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scheduledAt: { type: Date, required: true }, // original planned date/time
    currentAt: { type: Date, required: true }, // effective date/time (changes on delay)
    meetLink: { type: String, default: "" }, // Zoom / Google Meet link
    mode: { type: String, enum: ["online", "offline", "hybrid"], default: "online" },
    location: {
      address: { type: String, default: "", trim: true },
      mapLink: { type: String, default: "", trim: true }, // optional custom Google Maps link
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "delayed", "cancelled", "completed"],
      default: "scheduled",
    },
    statusMessage: { type: String, default: "" }, // e.g. delay reason / cancel reason
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // approved students
    pendingStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // waiting for admin approval
    attendedStudents: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    reminderSent: { type: Boolean, default: false }, // "starting soon" reminder already sent
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workshop", workshopSchema);
