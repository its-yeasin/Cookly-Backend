// Request timeout middleware to prevent hanging requests
const timeout = (duration = 30000) => {
  return (req, res, next) => {
    // Set timeout for the request
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error(
          `⏰ Request timeout: ${req.method} ${req.originalUrl} - ${duration}ms`
        );

        res.status(408).json({
          success: false,
          message:
            "Request timeout. The server took too long to respond. Please try again.",
          error: {
            type: "TimeoutError",
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method,
            timeout: duration,
          },
        });
      }
    }, duration);

    // Clear timeout when response finishes
    const originalSend = res.send;
    res.send = function (...args) {
      clearTimeout(timeoutId);
      return originalSend.apply(this, args);
    };

    const originalJson = res.json;
    res.json = function (...args) {
      clearTimeout(timeoutId);
      return originalJson.apply(this, args);
    };

    const originalEnd = res.end;
    res.end = function (...args) {
      clearTimeout(timeoutId);
      return originalEnd.apply(this, args);
    };

    // Clear timeout on response close or error
    res.on("close", () => clearTimeout(timeoutId));
    res.on("finish", () => clearTimeout(timeoutId));

    next();
  };
};

module.exports = timeout;
