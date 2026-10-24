const mongoose = require("mongoose");

// One rating and comment per student per workshop (enforced by the unique index below).
const feedbackSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, default: "", trim: true },
    improvement: { type: String, default: "", trim: true }, // "what should improve?"
  },
  { timestamps: true }
);

feedbackSchema.index({ workshop: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
