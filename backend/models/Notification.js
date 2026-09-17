const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop" }, // absent for non-workshop notifications (e.g. course purchases)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // recipient (student)
    type: {
      type: String,
      enum: ["live", "cancelled", "delayed", "reminder", "enrolled", "requested", "accepted", "rejected", "certificate"],
      required: true,
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
