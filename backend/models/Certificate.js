const mongoose = require("mongoose");
const crypto = require("crypto");

// Proof of completion. Issued automatically when a workshop is completed and the student's attendance is high enough; `code` is what the public verify endpoint looks up.
const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true },
    workshopTitle: { type: String, required: true },
    studentName: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

certificateSchema.index({ student: 1, workshop: 1 }, { unique: true });

certificateSchema.statics.generateCode = function () {
  return "WS-" + crypto.randomBytes(4).toString("hex").toUpperCase();
};

module.exports = mongoose.model("Certificate", certificateSchema);
