const { AzureOpenAI } = require("openai");
const config = require("../config/config");

class AzureOpenAIService {
  constructor() {
    this.client = null;
    this.deploymentName = config.azureOpenAI.deploymentName;
    this.initialize();
  }

  initialize() {
    try {
      if (!config.azureOpenAI.endpoint || !config.azureOpenAI.apiKey) {
        console.warn(
          "⚠️ Azure OpenAI credentials not configured. Recipe generation will not work."
        );
        return;
      }

      this.client = new AzureOpenAI({
        endpoint: config.azureOpenAI.endpoint,
        apiKey: config.azureOpenAI.apiKey,
        apiVersion: config.azureOpenAI.apiVersion,
      });

      console.log("✅ Azure OpenAI service initialized");
    } catch (error) {
      console.error(
        "❌ Failed to initialize Azure OpenAI service:",
        error.message
      );
    }
  }

  async generateRecipe(ingredients, options = {}) {
    try {
      if (!this.client) {
        throw new Error("Azure OpenAI service not initialized");
      }

      const {
        servings = config.defaultRecipePortions,
        dietaryRestrictions = [],
        cuisine = "",
        mealType = "dinner",
        difficulty = "medium",
        maxCookingTime = null,
      } = options;

      // Build the prompt
      const prompt = this.buildRecipePrompt(ingredients, {
        servings,
        dietaryRestrictions,
        cuisine,
        mealType,
        difficulty,
        maxCookingTime,
      });

      console.log("🤖 Generating recipe with Azure OpenAI...");

      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          {
            role: "system",
            content:
              "You are a professional chef and recipe creator. Generate detailed, practical recipes based on the given ingredients and requirements. Always respond with valid JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response received from Azure OpenAI");
      }

      const generatedText = response.choices[0].message.content;

      // Parse the JSON response
      const recipe = this.parseRecipeResponse(generatedText);

      // Add metadata
      recipe.inputIngredients = ingredients;
      recipe.servings = servings;
      recipe.generatedBy = "azure-openai";
      recipe.generationPrompt = prompt;

      console.log("✅ Recipe generated successfully");
      return recipe;
    } catch (error) {
      console.error("❌ Error generating recipe:", error.message);
      throw new Error(`Failed to generate recipe: ${error.message}`);
    }
  }

  buildRecipePrompt(ingredients, options) {
    const {
      servings,
      dietaryRestrictions,
      cuisine,
      mealType,
      difficulty,
      maxCookingTime,
    } = options;

    let prompt = `Create a detailed recipe using these ingredients: ${ingredients.join(
      ", "
    )}.

Requirements:
- Servings: ${servings}
- Meal type: ${mealType}
- Difficulty: ${difficulty}`;

    if (dietaryRestrictions.length > 0) {
      prompt += `\n- Dietary restrictions: ${dietaryRestrictions.join(", ")}`;
    }

    if (cuisine) {
      prompt += `\n- Cuisine style: ${cuisine}`;
    }

    if (maxCookingTime) {
      prompt += `\n- Maximum cooking time: ${maxCookingTime} minutes`;
    }

    prompt += `

Please respond with a JSON object in this exact format:
{
  "title": "Recipe Name",
  "description": "Brief description of the dish",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "quantity",
      "unit": "unit of measurement"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "description": "Step description",
      "duration": "time estimate"
    }
  ],
  "cookingTime": {
    "prep": 15,
    "cook": 30,
    "total": 45
  },
  "difficulty": "easy|medium|hard",
  "cuisine": "cuisine type",
  "mealType": ["breakfast|lunch|dinner|snack|dessert|appetizer"],
  "dietaryInfo": {
    "isVegetarian": false,
    "isVegan": false,
    "isGlutenFree": false,
    "isDairyFree": false,
    "isNutFree": false,
    "isLowCarb": false
  },
  "nutritionalInfo": {
    "calories": 400,
    "protein": 25,
    "carbs": 45,
    "fat": 15,
    "fiber": 8
  },
  "tags": ["tag1", "tag2"]
}

Make sure the recipe is practical, delicious, and uses the provided ingredients as the main components. Add additional common ingredients as needed to create a complete recipe.`;

    return prompt;
  }

  parseRecipeResponse(responseText) {
    try {
      // Clean up the response text
      let cleanedResponse = responseText.trim();

      // Remove any markdown code blocks
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, "");
      cleanedResponse = cleanedResponse.replace(/```\s*/g, "");

      // Try to parse JSON
      const recipe = JSON.parse(cleanedResponse);

      // Validate required fields
      if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
        throw new Error("Missing required recipe fields");
      }

      // Ensure arrays are properly formatted
      if (!Array.isArray(recipe.ingredients)) {
        throw new Error("Ingredients must be an array");
      }

      if (!Array.isArray(recipe.instructions)) {
        throw new Error("Instructions must be an array");
      }

      // Set defaults for missing optional fields
      recipe.description = recipe.description || "";
      recipe.difficulty = recipe.difficulty || "medium";
      recipe.cuisine = recipe.cuisine || "";
      recipe.mealType = Array.isArray(recipe.mealType)
        ? recipe.mealType
        : [recipe.mealType || "dinner"];
      recipe.tags = recipe.tags || [];

      recipe.cookingTime = recipe.cookingTime || { prep: 0, cook: 0, total: 0 };
      recipe.dietaryInfo = recipe.dietaryInfo || {};
      recipe.nutritionalInfo = recipe.nutritionalInfo || {};

      return recipe;
    } catch (error) {
      console.error("❌ Error parsing recipe response:", error.message);
      console.error("Response text:", responseText);

      // Return a fallback recipe structure
      return this.getFallbackRecipe(responseText);
    }
  }

  getFallbackRecipe(responseText) {
    return {
      title: "Generated Recipe",
      description: "A delicious recipe generated from your ingredients.",
      ingredients: [
        {
          name: "Main ingredients",
          amount: "As needed",
          unit: "",
        },
      ],
      instructions: [
        {
          stepNumber: 1,
          description:
            responseText || "Combine ingredients and cook as desired.",
          duration: "As needed",
        },
      ],
      cookingTime: {
        prep: 15,
        cook: 30,
        total: 45,
      },
      difficulty: "medium",
      cuisine: "",
      mealType: ["dinner"],
      dietaryInfo: {
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        isNutFree: false,
        isLowCarb: false,
      },
      nutritionalInfo: {},
      tags: ["generated"],
    };
  }

  async testConnection() {
    try {
      if (!this.client) {
        return { success: false, message: "Azure OpenAI not initialized" };
      }

      // Simple test request
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          {
            role: "user",
            content: 'Say "Hello from Azure OpenAI!"',
          },
        ],
        max_tokens: 50,
        temperature: 0.1,
      });

      if (response.choices && response.choices.length > 0) {
        return {
          success: true,
          message: "Azure OpenAI connection successful",
          response: response.choices[0].message.content,
        };
      } else {
        return { success: false, message: "No response from Azure OpenAI" };
      }
    } catch (error) {
      return {
        success: false,
        message: `Azure OpenAI connection failed: ${error.message}`,
      };
    }
  }
}

// Create singleton instance
const azureOpenAIService = new AzureOpenAIService();

module.exports = azureOpenAIService;
