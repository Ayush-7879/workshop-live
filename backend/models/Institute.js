const mongoose = require("mongoose");
const crypto = require("crypto");

// One institute = one separate space. Users, workshops and courses belong to exactly one.
// Students register with studentCode, admins (organizers) register with adminCode.
const instituteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    studentCode: { type: String, required: true, unique: true, trim: true },
    adminCode: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

instituteSchema.statics.generateCode = function (prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
};

module.exports = mongoose.model("Institute", instituteSchema);
