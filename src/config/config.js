const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // Database
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/cookly",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "fallback-secret-key",
  jwtExpire: process.env.JWT_EXPIRE || "7d",

  // Azure OpenAI
  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview",
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-35-turbo",
  },

  // App Settings
  maxIngredients: parseInt(process.env.MAX_INGREDIENTS) || 20,
  defaultRecipePortions: parseInt(process.env.DEFAULT_RECIPE_PORTIONS) || 4,

  // Rate Limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
};

module.exports = config;
