const mongoose = require("mongoose");

// A quiz belongs to a workshop. correctIndex is never sent to students before they submit.
const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    options: {
      type: [String],
      validate: (arr) => arr.length >= 2 && arr.length <= 6,
    },
    correctIndex: { type: Number, required: true },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true },
    title: { type: String, required: true, trim: true },
    questions: { type: [questionSchema], validate: (arr) => arr.length > 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
