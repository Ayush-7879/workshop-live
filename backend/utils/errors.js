// Internal error text (database messages, stack hints) is only sent to the client outside production.
function errorDetail(err) {
  return process.env.NODE_ENV === "production" ? undefined : err.message;
}

// Final Express error handler: converts unexpected errors into JSON responses.
// Combined with express-async-errors, a rejected async route handler lands here instead of crashing the process.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.name === "CastError" || err.name === "ValidationError") {
    return res.status(400).json({ message: "Invalid request" });
  }
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(400).json({ message: "Invalid request body" });
  }
  console.error(err);
  res.status(500).json({ message: "Server error", error: errorDetail(err) });
}

module.exports = { errorDetail, errorHandler };
