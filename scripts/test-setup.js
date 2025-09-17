#!/usr/bin/env node

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const config = require("../src/config/config");
const azureOpenAIService = require("../src/services/azureOpenAIService");

async function testSetup() {
  console.log("🧪 Testing Cookly Backend Setup...\n");

  // Test 1: Environment Variables
  console.log("1. Environment Variables:");
  console.log(`   ✓ Node Environment: ${config.nodeEnv}`);
  console.log(`   ✓ Port: ${config.port}`);
  console.log(
    `   ✓ MongoDB URI: ${config.mongodbUri ? "✓ Configured" : "❌ Missing"}`
  );
  console.log(
    `   ✓ JWT Secret: ${config.jwtSecret ? "✓ Configured" : "❌ Missing"}`
  );
  console.log(
    `   ✓ Azure OpenAI Endpoint: ${
      config.azureOpenAI.endpoint ? "✓ Configured" : "❌ Missing"
    }`
  );
  console.log(
    `   ✓ Azure OpenAI API Key: ${
      config.azureOpenAI.apiKey ? "✓ Configured" : "❌ Missing"
    }\n`
  );

  // Test 2: Azure OpenAI Connection
  console.log("2. Azure OpenAI Connection:");
  try {
    const testResult = await azureOpenAIService.testConnection();
    if (testResult.success) {
      console.log(`   ✅ ${testResult.message}`);
      console.log(`   Response: ${testResult.response}`);
    } else {
      console.log(`   ❌ ${testResult.message}`);
    }
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
  }

  console.log("\n🎉 Setup test completed!");
  console.log("\nNext steps:");
  console.log("1. Copy .env.example to .env and configure your credentials");
  console.log("2. Start MongoDB server");
  console.log('3. Run "yarn dev" to start the development server');
}

testSetup().catch(console.error);
