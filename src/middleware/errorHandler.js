const config = require("../config/config");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details for debugging
  console.error("🚨 Error occurred:");
  console.error("- URL:", req.originalUrl);
  console.error("- Method:", req.method);
  console.error("- IP:", req.ip);
  console.error("- User Agent:", req.get("User-Agent"));
  console.error("- Error:", err.name, "-", err.message);

  if (config.nodeEnv === "development") {
    console.error("- Stack:", err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = `Resource not found with id: ${err.value}`;
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${
      field.charAt(0).toUpperCase() + field.slice(1)
    } '${value}' already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid authentication token. Please log in again.";
    error = { message, statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Authentication token has expired. Please log in again.";
    error = { message, statusCode: 401 };
  }

  // Multer errors (file upload)
  if (err.name === "MulterError") {
    let message = "File upload error";
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size too large. Maximum allowed size is 10MB.";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files uploaded.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field.";
    }
    error = { message, statusCode: 400 };
  }

  // Azure OpenAI errors
  if (
    err.message &&
    (err.message.includes("Azure OpenAI") || err.message.includes("OpenAI"))
  ) {
    error = {
      message: "AI service is temporarily unavailable. Please try again later.",
      statusCode: 503,
    };
  }

  // Rate limiting errors
  if (err.status === 429 || err.statusCode === 429) {
    error = {
      message: "Too many requests. Please slow down and try again later.",
      statusCode: 429,
    };
  }

  // MongoDB connection errors
  if (err.name === "MongoError" || err.name === "MongooseError") {
    error = {
      message: "Database connection error. Please try again later.",
      statusCode: 503,
    };
  }

  // Network timeout errors
  if (
    err.code === "ECONNRESET" ||
    err.code === "ETIMEDOUT" ||
    err.code === "ENOTFOUND"
  ) {
    error = {
      message:
        "Network connection error. Please check your internet connection and try again.",
      statusCode: 503,
    };
  }

  // PayloadTooLargeError
  if (err.type === "entity.too.large") {
    error = {
      message:
        "Request payload too large. Please reduce the size of your request.",
      statusCode: 413,
    };
  }

  // SyntaxError (JSON parsing)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    error = {
      message: "Invalid JSON format in request body.",
      statusCode: 400,
    };
  }

  // CORS errors
  if (err.message && err.message.includes("CORS")) {
    error = {
      message:
        "Cross-origin request blocked. Please check your request headers.",
      statusCode: 403,
    };
  }

  // Handle specific HTTP status codes
  if (err.statusCode || err.status) {
    const statusCode = err.statusCode || err.status;
    switch (statusCode) {
      case 400:
        error.message =
          error.message || "Bad request. Please check your input.";
        break;
      case 401:
        error.message = error.message || "Unauthorized. Please authenticate.";
        break;
      case 403:
        error.message =
          error.message ||
          "Forbidden. You don't have permission to access this resource.";
        break;
      case 404:
        error.message = error.message || "Resource not found.";
        break;
      case 409:
        error.message = error.message || "Conflict. Resource already exists.";
        break;
      case 422:
        error.message =
          error.message || "Unprocessable entity. Please check your input.";
        break;
      case 500:
        error.message =
          error.message || "Internal server error. Please try again later.";
        break;
      case 502:
        error.message = error.message || "Bad gateway. Please try again later.";
        break;
      case 503:
        error.message =
          error.message ||
          "Service temporarily unavailable. Please try again later.";
        break;
      case 504:
        error.message =
          error.message || "Gateway timeout. Please try again later.";
        break;
    }
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message =
    error.message || "An unexpected error occurred. Please try again later.";

  // Prepare error response
  const errorResponse = {
    success: false,
    message,
    error: {
      type: err.name || "UnknownError",
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
    },
  };

  // Add stack trace in development mode
  if (config.nodeEnv === "development") {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err;
  }

  // Add request ID if available (for tracking)
  if (req.id) {
    errorResponse.error.requestId = req.id;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
