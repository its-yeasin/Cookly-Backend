// Load environment variables FIRST
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/database");
const config = require("./src/config/config");
const errorHandler = require("./src/middleware/errorHandler");

// Connect to MongoDB
connectDB();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/recipes", require("./src/routes/recipes"));
app.use("/api/users", require("./src/routes/users"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Cookly Backend is running",
    timestamp: new Date().toISOString(),
  });
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
app.post("/test-recipe", async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: error.message,
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
