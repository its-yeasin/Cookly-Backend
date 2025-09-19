const crypto = require("crypto");

// Request ID and logging middleware
const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.id = crypto.randomBytes(8).toString("hex");

  // Add request ID to response headers
  res.setHeader("X-Request-ID", req.id);

  // Log request start
  const startTime = Date.now();
  console.log(`📥 [${req.id}] ${req.method} ${req.originalUrl} - Started`);

  // Log request details in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `📋 [${req.id}] Headers:`,
      JSON.stringify(req.headers, null, 2)
    );
    if (req.body && Object.keys(req.body).length > 0) {
      // Don't log sensitive data
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = "[HIDDEN]";
      if (safeBody.currentPassword) safeBody.currentPassword = "[HIDDEN]";
      if (safeBody.newPassword) safeBody.newPassword = "[HIDDEN]";
      console.log(`📋 [${req.id}] Body:`, JSON.stringify(safeBody, null, 2));
    }
  }

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;
    console.log(
      `📤 [${req.id}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );

    // Log error responses in detail
    if (res.statusCode >= 400) {
      console.error(
        `❌ [${req.id}] Error Response:`,
        JSON.stringify(data, null, 2)
      );
    }

    return originalJson.call(this, data);
  };

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    console.log(
      `📤 [${req.id}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );

    return originalSend.call(this, data);
  };

  next();
};

module.exports = requestLogger;
