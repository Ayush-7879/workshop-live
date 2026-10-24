const Institute = require("../models/Institute");
const User = require("../models/User");
const Workshop = require("../models/Workshop");
const Course = require("../models/Course");

// Runs on every start, does nothing once everything has an institute.
// Existing users, workshops and courses (created before institutes existed) are moved
// into one default institute so nothing is lost.
async function migrateToInstitutes() {
  const [orphanUsers, orphanWorkshops, orphanCourses] = await Promise.all([
    User.countDocuments({ institute: { $exists: false } }),
    Workshop.countDocuments({ institute: { $exists: false } }),
    Course.countDocuments({ institute: { $exists: false } }),
  ]);
  if (orphanUsers + orphanWorkshops + orphanCourses === 0) return;

  const name = process.env.DEFAULT_INSTITUTE_NAME || "INTechGenius";
  let institute = await Institute.findOne({ name });
  if (!institute) {
    const adminCode = process.env.ADMIN_INVITE_CODE || Institute.generateCode("ADM");
    const studentCode = process.env.DEFAULT_STUDENT_CODE || Institute.generateCode("STU");
    institute = await Institute.create({ name, adminCode, studentCode });
    console.log(`Created default institute "${name}" (codes can be listed with: npm run institutes)`);
  }

  const filter = { institute: { $exists: false } };
  const set = { $set: { institute: institute._id } };
  await Promise.all([
    User.updateMany(filter, set),
    Workshop.updateMany(filter, set),
    Course.updateMany(filter, set),
  ]);
  console.log(
    `Moved ${orphanUsers} users, ${orphanWorkshops} workshops, ${orphanCourses} courses into "${name}"`
  );
}

module.exports = { migrateToInstitutes };
