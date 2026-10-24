const mongoose = require("mongoose");

// Learning material attached to a workshop: a PDF, a video or a link.
const resourceSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true },
    type: { type: String, enum: ["pdf", "video", "link"], required: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);
