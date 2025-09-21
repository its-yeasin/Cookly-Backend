const mongoose = require("mongoose");
const config = require("./config");

const connectDB = async () => {
  try {
    if (process.env.NODE_ENV === "development") {
      // Set mongoose to not buffer commands when disconnected
      mongoose.set("bufferCommands", false);
    }

    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.log("📦 MongoDB not available - continuing without database");

    // In development, throw error to be handled by caller
    // In production, exit the process
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      // Re-throw the error so the caller can decide what to do
      throw error;
    }
  }
};

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  // Suppress verbose error logs in development when DB is not available
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Mongoose connection error:", err);
  }
});

mongoose.connection.on("disconnected", () => {
  // Only log in production
  if (process.env.NODE_ENV === "production") {
    console.log("⚠️ Mongoose disconnected");
  }
});

// Close connection on app termination
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔌 Mongoose connection closed due to app termination");
  process.exit(0);
});

module.exports = connectDB;
