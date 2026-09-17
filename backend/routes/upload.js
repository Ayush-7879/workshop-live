const express = require("express");
const { upload } = require("../middleware/upload");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Generic file upload used by materials (PDF/video), workshop banners, and profile avatars.
// Any logged-in user may upload; the caller decides what to do with the returned URL
// (e.g. only an admin route actually saves it onto a Resource/Workshop document).
router.post("/", auth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file received" });
    }
    const ext = req.file.originalname.split(".").pop().toLowerCase();
    let kind = "link";
    if (ext === "pdf") kind = "pdf";
    else if (["mp4", "webm", "mov", "mkv"].includes(ext)) kind = "video";
    else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) kind = "image";

    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      kind,
      size: req.file.size,
    });
  });
});

module.exports = router;
