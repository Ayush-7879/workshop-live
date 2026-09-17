const mongoose = require("mongoose");

const recordingSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true, unique: true },
    title: { type: String, required: true, trim: true },
    videoUrl: { type: String, required: true, trim: true },
    chapters: [
      {
        title: { type: String, required: true, trim: true },
        timestampSeconds: { type: Number, required: true, min: 0 },
      },
    ],
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recording", recordingSchema);
