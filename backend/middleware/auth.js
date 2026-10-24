const jwt = require("jsonwebtoken");

// Verifies the Bearer token and exposes the caller as req.user ({ id, role, name, institute }).
// Every institute-scoped query reads req.user.institute, which comes from the signed token and not from the request body.
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.institute) {
      // token from before institutes existed
      return res.status(401).json({ message: "Please log in again" });
    }
    req.user = decoded; // { id, role, name, institute }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Use after auth() on routes only institute admins may call.
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
}

module.exports = { auth, adminOnly };
