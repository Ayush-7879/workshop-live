const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true },
    paymentId: { type: String, default: "" },
    signature: { type: String, default: "" },
    amount: { type: Number, required: true }, // in rupees
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
