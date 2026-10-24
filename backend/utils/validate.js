// Links entered by admins are rendered as <a href> / <video src> for students.
// Only allow http(s) URLs, or files uploaded to this server, so "javascript:" links are rejected.
function isSafeUrl(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (v.startsWith("/uploads/")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Empty is allowed for optional fields.
function isOptionalSafeUrl(value) {
  return value === undefined || value === null || value === "" || isSafeUrl(value);
}

module.exports = { isSafeUrl, isOptionalSafeUrl };
