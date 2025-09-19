// Load environment variables FIRST
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/database");
const config = require("./src/config/config");
const errorHandler = require("./src/middleware/errorHandler");
const requestLogger = require("./src/middleware/requestLogger");
const timeout = require("./src/middleware/timeout");
const {
  sanitizeInputs,
  validateContentType,
  apiRateLimit,
} = require("./src/middleware/validation");

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION! Shutting down...");
  console.error("Error:", err.name, err.message);
  console.error("Stack:", err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("💥 UNHANDLED PROMISE REJECTION! Shutting down...");
  console.error("Error:", err.name, err.message);
  console.error("Stack:", err.stack);

  // Close server gracefully
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Connect to MongoDB
connectDB();

const app = express();

// Request logging and tracking
app.use(requestLogger);

// Request timeout (30 seconds for most requests)
app.use(timeout(30000));

// Security middleware
app.use(helmet());

// Input sanitization and validation
app.use(sanitizeInputs);
app.use(validateContentType);

// Configure CORS for Android app compatibility
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      // Allow all origins for development (you can restrict this in production)
      return callback(null, true);
    },
    credentials: false, // Set to false to avoid preflight issues with mobile apps
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "Pragma",
    ],
    exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

// Handle preflight requests explicitly
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma"
  );
  res.header("Access-Control-Max-Age", "86400");
  res.sendStatus(200);
});

// Rate limiting with enhanced error handling
app.use("/api/", apiRateLimit);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/recipes", require("./src/routes/recipes"));
app.use("/api/users", require("./src/routes/users"));

// Enhanced health check endpoint with comprehensive system status
app.get("/health", async (req, res) => {
  try {
    const healthStatus = {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: require("./package.json").version,
      services: {
        api: "healthy",
        database: "unknown",
        ai: "unknown",
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
          total:
            Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
        },
        cpu: process.cpuUsage(),
      },
    };

    // Check database connection
    try {
      const mongoose = require("mongoose");
      if (mongoose.connection.readyState === 1) {
        healthStatus.services.database = "connected";
      } else {
        healthStatus.services.database = "disconnected";
        healthStatus.status = "DEGRADED";
      }
    } catch (dbError) {
      healthStatus.services.database = "error";
      healthStatus.status = "DEGRADED";
    }

    // Check AI service
    try {
      if (config.azureOpenAI.apiKey && config.azureOpenAI.endpoint) {
        healthStatus.services.ai = "configured";
      } else {
        healthStatus.services.ai = "not_configured";
        healthStatus.status = "DEGRADED";
      }
    } catch (aiError) {
      healthStatus.services.ai = "error";
      healthStatus.status = "DEGRADED";
    }

    const statusCode = healthStatus.status === "OK" ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "ERROR",
      message: "Health check failed",
      timestamp: new Date().toISOString(),
      error: {
        type: error.name,
        message: error.message,
      },
    });
  }
});

// Test endpoint to verify API without database
app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working correctly",
    features: {
      authentication: "Ready",
      recipeGeneration: config.azureOpenAI.apiKey
        ? "Ready"
        : "Needs Azure OpenAI credentials",
      database: "Needs MongoDB connection",
      validation: "Ready",
      errorHandling: "Ready",
    },
    config: {
      hasEndpoint: !!config.azureOpenAI.endpoint,
      hasApiKey: !!config.azureOpenAI.apiKey,
      deploymentName: config.azureOpenAI.deploymentName,
      apiVersion: config.azureOpenAI.apiVersion,
    },
    timestamp: new Date().toISOString(),
  });
});

// Test recipe generation without authentication or database
app.post("/test-recipe", timeout(60000), async (req, res) => {
  try {
    const azureOpenAIService = require("./src/services/azureOpenAIService");
    const { ingredients = ["chicken", "rice", "vegetables"] } = req.body;

    console.log("🤖 Generating recipe with Azure OpenAI...");

    const recipe = await azureOpenAIService.generateRecipe(ingredients, {
      servings: 4,
      mealType: "dinner",
      difficulty: "medium",
    });

    console.log("✅ Recipe generated successfully");

    res.json({
      success: true,
      message: "Recipe generated successfully (test mode)",
      data: { recipe },
    });
  } catch (error) {
    console.error("❌ Recipe generation failed:", error.message);

    // Enhanced error response
    const statusCode = error.status || error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to generate test recipe",
      error: {
        type: error.name || "TestRecipeError",
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      },
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Cookly Backend API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      recipes: "/api/recipes",
      users: "/api/users",
      health: "/health",
    },
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Handle 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

const PORT = process.env.PORT || 5000;

// Store server instance for graceful shutdown
let server;

// Start server with error handling
try {
  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // Handle server errors
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error("❌ Server error:", err);
      process.exit(1);
    }
  });
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n📤 Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close((err) => {
      if (err) {
        console.error("❌ Error during server shutdown:", err);
        process.exit(1);
      }

      console.log("🔌 HTTP server closed");

      // Close database connection
      const mongoose = require("mongoose");
      mongoose.connection.close(() => {
        console.log("🔌 Database connection closed");
        console.log("✅ Graceful shutdown completed");
        process.exit(0);
      });
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
