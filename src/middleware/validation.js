// Input validation and sanitization middleware
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

// Sanitize inputs to prevent NoSQL injection
const sanitizeInputs = (req, res, next) => {
  try {
    // Sanitize query params
    if (req.query) {
      req.query = mongoSanitize.sanitize(req.query);
    }

    // Sanitize body
    if (req.body) {
      req.body = mongoSanitize.sanitize(req.body);
    }

    // Sanitize params
    if (req.params) {
      req.params = mongoSanitize.sanitize(req.params);
    }

    next();
  } catch (error) {
    console.error("Input sanitization error:", error);
    res.status(400).json({
      success: false,
      message: "Invalid input format",
      error: {
        type: "ValidationError",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// Validate content type for POST/PUT requests
const validateContentType = (req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.get("Content-Type");

    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: "Content-Type header is required",
        error: {
          type: "ValidationError",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (
      !contentType.includes("application/json") &&
      !contentType.includes("multipart/form-data")
    ) {
      return res.status(415).json({
        success: false,
        message:
          "Unsupported Media Type. Only application/json and multipart/form-data are supported.",
        error: {
          type: "UnsupportedMediaTypeError",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  next();
};

// Rate limiting for different endpoints
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message:
        message || "Too many requests from this IP, please try again later.",
      error: {
        type: "RateLimitError",
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil(windowMs / 1000),
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(
        `🚫 Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`
      );
      res.status(429).json({
        success: false,
        message:
          message || "Too many requests from this IP, please try again later.",
        error: {
          type: "RateLimitError",
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil(windowMs / 1000),
        },
      });
    },
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  "Too many authentication attempts. Please try again later."
);

const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  "Too many API requests. Please slow down."
);

const aiRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 requests
  "Too many AI generation requests. Please wait before generating more recipes."
);

module.exports = {
  sanitizeInputs,
  validateContentType,
  authRateLimit,
  apiRateLimit,
  aiRateLimit,
};
