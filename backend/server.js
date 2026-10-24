require("dotenv").config();
const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const instituteRoutes = require("./routes/institute");
const workshopRoutes = require("./routes/workshops");
const notificationRoutes = require("./routes/notifications");
const resourceRoutes = require("./routes/resources");
const quizRoutes = require("./routes/quizzes");
const attendanceRoutes = require("./routes/attendance");
const gamificationRoutes = require("./routes/gamification");
const certificateRoutes = require("./routes/certificates");
const uploadRoutes = require("./routes/upload");
const profileRoutes = require("./routes/profile");
const courseRoutes = require("./routes/courses");
const feedbackRoutes = require("./routes/feedback");
const recordingRoutes = require("./routes/recordings");
const Workshop = require("./models/Workshop");
const Notification = require("./models/Notification");
const { migrateToInstitutes } = require("./utils/migrateInstitutes");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "*";

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
});

app.set("io", io);

// Render sits behind a proxy; needed so rate limiting sees the real client IP
app.set("trust proxy", 1);
// crossOriginResourcePolicy off so the Vercel frontend can load files from /uploads
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => res.send("Workshop API is running ✅"));
app.use("/api/auth", authRoutes);
app.use("/api/institute", instituteRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/recordings", recordingRoutes);

// Socket.io auth: client sends JWT token on connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.institute) return next(new Error("Please log in again"));
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const { id, institute } = socket.user;
  socket.join(`user:${id}`); // personal room for this user's notifications
  socket.join(`institute:${institute}`); // live workshop list updates, per institute only
  console.log(`🔌 Socket connected: user ${id}`);

  socket.on("workshop:watch", async (workshopId) => {
    try {
      // only allow watching workshops of the user's own institute
      const ok = await Workshop.exists({ _id: workshopId, institute });
      if (ok) socket.join(`workshop:${workshopId}`);
    } catch (err) {
      /* invalid id: ignore */
    }
  });

  socket.on("workshop:unwatch", (workshopId) => {
    socket.leave(`workshop:${workshopId}`);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: user ${id}`);
  });
});

// Smart reminders: every minute, check for scheduled workshops starting within
// the next 30 minutes and notify their enrolled students once.
const REMINDER_WINDOW_MS = 30 * 60 * 1000;

async function checkUpcomingReminders() {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + REMINDER_WINDOW_MS);
    const dueWorkshops = await Workshop.find({
      status: "scheduled",
      reminderSent: false,
      currentAt: { $gte: now, $lte: soon },
    });

    for (const workshop of dueWorkshops) {
      if (workshop.enrolledStudents.length > 0) {
        const message = `Reminder: "${workshop.title}" starts at ${new Date(workshop.currentAt).toLocaleString(
          "en-IN"
        )} — don't miss it!`;
        const docs = workshop.enrolledStudents.map((sid) => ({
          workshop: workshop._id,
          user: sid,
          type: "reminder",
          message,
        }));
        const created = await Notification.insertMany(docs);
        created.forEach((n) => {
          io.to(`user:${n.user}`).emit("notification", {
            _id: n._id,
            workshopId: workshop._id,
            workshopTitle: workshop.title,
            type: n.type,
            message: n.message,
            createdAt: n.createdAt,
          });
        });
      }
      workshop.reminderSent = true;
      await workshop.save();
    }
  } catch (err) {
    console.error("Reminder check failed:", err.message);
  }
}

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  try {
    await migrateToInstitutes();
  } catch (err) {
    console.error("Institute migration failed:", err.message);
  }
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  setInterval(checkUpcomingReminders, 60 * 1000);
  checkUpcomingReminders();
});
