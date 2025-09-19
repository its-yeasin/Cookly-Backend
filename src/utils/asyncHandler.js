// Enhanced async error handler wrapper with better error context
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    // Add request context to error for better debugging
    error.requestUrl = req.originalUrl;
    error.requestMethod = req.method;
    error.requestTime = new Date().toISOString();

    // Add user context if available
    if (req.user) {
      error.userId = req.user.id;
    }

    // Log the error with context
    console.error(`🚨 Async Error in ${req.method} ${req.originalUrl}:`, {
      message: error.message,
      name: error.name,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });

    next(error);
  });
};

module.exports = asyncHandler;
