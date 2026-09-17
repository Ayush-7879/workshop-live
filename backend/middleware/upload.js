const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXT = [".pdf", ".mp4", ".webm", ".mov", ".mkv", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MAX_SIZE = 200 * 1024 * 1024; // 200 MB — enough for short lecture videos

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase}-${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error("Unsupported file type"));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = { upload, UPLOAD_DIR };
