const express = require("express");
const { errorDetail } = require("../utils/errors");
const Resource = require("../models/Resource");
const Workshop = require("../models/Workshop");
const { auth, adminOnly } = require("../middleware/auth");
const { isSafeUrl } = require("../utils/validate");
const { scopedWorkshop } = require("../utils/scope");

const router = express.Router();

// ADMIN: add a resource (PDF link, video link, or generic link) to a workshop
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { workshopId, type, title, url } = req.body;
    if (!workshopId || !type || !title || !url) {
      return res.status(400).json({ message: "workshopId, type, title and url are all required" });
    }
    if (!["pdf", "video", "link"].includes(type)) {
      return res.status(400).json({ message: "Invalid resource type" });
    }
    if (!isSafeUrl(url)) {
      return res.status(400).json({ message: "Link must start with http:// or https://" });
    }
    const workshop = await scopedWorkshop(req, workshopId);
    if (!workshop) return res.status(404).json({ message: "Workshop not found" });

    const resource = await Resource.create({
      workshop: workshopId,
      type,
      title,
      url,
      addedBy: req.user.id,
    });
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: errorDetail(err) });
  }
});

// Get all resources for a workshop (any logged-in user; frontend hides for non-enrolled)
router.get("/workshop/:workshopId", auth, async (req, res) => {
  if (!(await scopedWorkshop(req, req.params.workshopId, "_id"))) return res.json([]);
  const resources = await Resource.find({ workshop: req.params.workshopId }).sort({ createdAt: -1 });
  res.json(resources);
});

// ADMIN: delete a resource
router.delete("/:id", auth, adminOnly, async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource || !(await scopedWorkshop(req, resource.workshop, "_id"))) {
    return res.status(404).json({ message: "Resource not found" });
  }
  await resource.deleteOne();
  res.json({ message: "Resource deleted" });
});

module.exports = router;
