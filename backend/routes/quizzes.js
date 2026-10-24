const express = require("express");
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const Workshop = require("../models/Workshop");
const User = require("../models/User");
const { auth, adminOnly } = require("../middleware/auth");
const { scopedWorkshop } = require("../utils/scope");

const router = express.Router();

// ADMIN: create a quiz for a workshop
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { workshopId, title, questions } = req.body;
    if (!workshopId || !title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "workshopId, title and at least one question are required" });
    }
    for (const q of questions) {
      if (!q.text || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctIndex !== "number") {
        return res.status(400).json({ message: "Each question needs text, at least 2 options and a correct answer" });
      }
    }
    const workshop = await scopedWorkshop(req, workshopId);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });

    const quiz = await Quiz.create({ workshop: workshopId, title, questions, createdBy: req.user.id });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get the quiz(zes) for a workshop.
// Students get questions WITHOUT correct answers (unless they already submitted, then see full review).
router.get("/workshop/:workshopId", auth, async (req, res) => {
  try {
    if (!(await scopedWorkshop(req, req.params.workshopId, "_id"))) return res.json([]);
    const quizzes = await Quiz.find({ workshop: req.params.workshopId }).sort({ createdAt: -1 });
    if (req.user.role === "admin") {
      return res.json(quizzes);
    }

    const result = await Promise.all(
      quizzes.map(async (quiz) => {
        const attempt = await QuizAttempt.findOne({ quiz: quiz._id, student: req.user.id });
        if (attempt) {
          return { ...quiz.toObject(), attempted: true, myAttempt: attempt };
        }
        const safeQuiz = quiz.toObject();
        safeQuiz.questions = safeQuiz.questions.map((q) => ({
          _id: q._id,
          text: q.text,
          options: q.options,
        }));
        return { ...safeQuiz, attempted: false };
      })
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// STUDENT: submit answers for a quiz
router.post("/:id/submit", auth, async (req, res) => {
  try {
    const { answers } = req.body; // array of selected option indexes, in question order
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || !(await scopedWorkshop(req, quiz.workshop, "_id"))) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({ message: "Please answer all questions" });
    }

    const existing = await QuizAttempt.findOne({ quiz: quiz._id, student: req.user.id });
    if (existing) {
      return res.status(400).json({ message: "You have already submitted this quiz" });
    }

    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (q.correctIndex === answers[i]) score += 1;
    });

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: req.user.id,
      answers,
      score,
      total: quiz.questions.length,
    });

    // award points proportional to score (up to 20 points for a perfect score)
    const earnedPoints = Math.round((score / quiz.questions.length) * 20);
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: earnedPoints } });

    res.status(201).json({ attempt, quiz, earnedPoints });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "You have already submitted this quiz" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ADMIN: view all results for a quiz
router.get("/:id/results", auth, adminOnly, async (req, res) => {
  const quizForResults = await Quiz.findById(req.params.id).select("workshop");
  if (!quizForResults || !(await scopedWorkshop(req, quizForResults.workshop, "_id"))) {
    return res.status(404).json({ message: "Quiz not found" });
  }
  const attempts = await QuizAttempt.find({ quiz: req.params.id })
    .populate("student", "name email")
    .sort({ score: -1 });
  res.json(attempts);
});

// ADMIN: delete a quiz (and its attempts)
router.delete("/:id", auth, adminOnly, async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz || !(await scopedWorkshop(req, quiz.workshop, "_id"))) {
    return res.status(404).json({ message: "Quiz not found" });
  }
  await QuizAttempt.deleteMany({ quiz: quiz._id });
  await quiz.deleteOne();
  res.json({ message: "Quiz deleted" });
});

module.exports = router;
