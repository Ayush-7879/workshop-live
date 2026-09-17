// Badges are computed on the fly from a student's stats rather than stored,
// so the rules can change any time without a data migration.
function computeBadges({ points = 0, attendedCount = 0, perfectQuizzes = 0, certificates = 0 }) {
  const badges = [];
  if (attendedCount >= 1) badges.push({ id: "first-step", label: "🥇 First Workshop", desc: "Attended your first workshop" });
  if (attendedCount >= 5) badges.push({ id: "regular", label: "🔥 Regular Learner", desc: "Attended 5+ workshops" });
  if (attendedCount >= 10) badges.push({ id: "dedicated", label: "💎 Dedicated Learner", desc: "Attended 10+ workshops" });
  if (perfectQuizzes >= 1) badges.push({ id: "quiz-master", label: "🧠 Quiz Master", desc: "Scored 100% on a quiz" });
  if (certificates >= 1) badges.push({ id: "certified", label: "📜 Certified", desc: "Earned your first certificate" });
  if (points >= 100) badges.push({ id: "century", label: "⭐ Century Club", desc: "Earned 100+ points" });
  if (points >= 500) badges.push({ id: "legend", label: "🏆 Legend", desc: "Earned 500+ points" });
  return badges;
}

module.exports = { computeBadges };
