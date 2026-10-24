const mongoose = require("mongoose");

// Connects to MongoDB using MONGO_URI. The app cannot work without a database, so a failure stops the process.
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
