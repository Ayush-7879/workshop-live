const mongoose = require("mongoose");
const Workshop = require("../models/Workshop");

// Returns the workshop only if it belongs to the logged-in user's institute, otherwise null.
// Use it everywhere a route receives a workshop id, so one institute can never touch another's data.
async function scopedWorkshop(req, workshopId, select) {
  if (!mongoose.isValidObjectId(workshopId)) return null;
  const query = Workshop.findOne({ _id: workshopId, institute: req.user.institute });
  if (select) query.select(select);
  return query;
}

module.exports = { scopedWorkshop };
