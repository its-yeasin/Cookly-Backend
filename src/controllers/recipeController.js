const Recipe = require("../models/Recipe");
const User = require("../models/User");
const azureOpenAIService = require("../services/azureOpenAIService");
const { validationResult } = require("express-validator");
const config = require("../config/config");

// @desc    Generate a new recipe using Azure OpenAI
// @route   POST /api/recipes/generate
// @access  Private
const generateRecipe = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      ingredients,
      servings,
      dietaryRestrictions,
      cuisine,
      mealType,
      difficulty,
      maxCookingTime,
      saveToDatabase = true,
    } = req.body;

    // Generate recipe using Azure OpenAI
    const generatedRecipe = await azureOpenAIService.generateRecipe(
      ingredients,
      {
        servings: servings || config.defaultRecipePortions,
        dietaryRestrictions: dietaryRestrictions || [],
        cuisine: cuisine || "",
        mealType: mealType || "dinner",
        difficulty: difficulty || "medium",
        maxCookingTime,
      }
    );

    let savedRecipe = null;

    if (saveToDatabase) {
      try {
        // Create recipe in database with timeout handling
        savedRecipe = await Recipe.create({
          ...generatedRecipe,
          createdBy: req.user._id,
          isPublic: true,
        });

        // Populate creator info
        await savedRecipe.populate("createdBy", "name email");
      } catch (dbError) {
        // If database save fails, still return the generated recipe
        console.log(
          "📦 Database save failed - returning generated recipe only"
        );
        savedRecipe = null;
      }
    }

    res.status(201).json({
      success: true,
      message: "Recipe generated successfully",
      data: {
        recipe: savedRecipe || generatedRecipe,
      },
    });
  } catch (error) {
    console.error("Generate recipe error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate recipe",
    });
  }
};

// @desc    Save a recipe to user's collection
// @route   POST /api/recipes/:id/save
// @access  Private
const saveRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    const user = await User.findById(req.user._id);

    // Check if recipe is already saved
    if (user.savedRecipes.includes(recipe._id)) {
      return res.status(400).json({
        success: false,
        message: "Recipe already saved",
      });
    }

    // Add recipe to user's saved recipes
    user.savedRecipes.push(recipe._id);
    await user.save();

    // Add user to recipe's savedByUsers
    if (!recipe.savedByUsers.includes(user._id)) {
      recipe.savedByUsers.push(user._id);
      await recipe.save();
    }

    res.json({
      success: true,
      message: "Recipe saved successfully",
    });
  } catch (error) {
    console.error("Save recipe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save recipe",
    });
  }
};

// @desc    Remove recipe from user's collection
// @route   DELETE /api/recipes/:id/save
// @access  Private
const unsaveRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    const user = await User.findById(req.user._id);

    // Remove recipe from user's saved recipes
    user.savedRecipes = user.savedRecipes.filter(
      (recipeId) => recipeId.toString() !== recipe._id.toString()
    );
    await user.save();

    // Remove user from recipe's savedByUsers
    recipe.savedByUsers = recipe.savedByUsers.filter(
      (userId) => userId.toString() !== user._id.toString()
    );
    await recipe.save();

    res.json({
      success: true,
      message: "Recipe removed from saved recipes",
    });
  } catch (error) {
    console.error("Unsave recipe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove recipe",
    });
  }
};

// @desc    Get all recipes with filtering and pagination
// @route   GET /api/recipes
// @access  Public
const getRecipes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      ingredients,
      cuisine,
      mealType,
      difficulty,
      maxCookingTime,
      isVegetarian,
      isVegan,
      isGlutenFree,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = { isPublic: true };

    if (ingredients) {
      const ingredientList = ingredients.split(",").map((ing) => ing.trim());
      filter.inputIngredients = {
        $in: ingredientList.map((ing) => new RegExp(ing, "i")),
      };
    }

    if (cuisine) {
      filter.cuisine = new RegExp(cuisine, "i");
    }

    if (mealType) {
      filter.mealType = { $in: [mealType] };
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    if (maxCookingTime) {
      filter["cookingTime.total"] = { $lte: parseInt(maxCookingTime) };
    }

    if (isVegetarian === "true") {
      filter["dietaryInfo.isVegetarian"] = true;
    }

    if (isVegan === "true") {
      filter["dietaryInfo.isVegan"] = true;
    }

    if (isGlutenFree === "true") {
      filter["dietaryInfo.isGlutenFree"] = true;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const recipes = await Recipe.find(filter)
      .populate("createdBy", "name")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalRecipes = await Recipe.countDocuments(filter);
    const totalPages = Math.ceil(totalRecipes / parseInt(limit));

    res.json({
      success: true,
      data: {
        recipes,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecipes,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get recipes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recipes",
    });
  }
};

// @desc    Get recipes by ingredients
// @route   POST /api/recipes/search-by-ingredients
// @access  Public
const getRecipesByIngredients = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { ingredients, limit = 10, skip = 0, minMatch = 1 } = req.body;

    const recipes = await Recipe.findByIngredients(ingredients, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      minMatch: parseInt(minMatch),
    });

    res.json({
      success: true,
      data: {
        recipes,
        searchCriteria: {
          ingredients,
          minMatch: parseInt(minMatch),
        },
      },
    });
  } catch (error) {
    console.error("Get recipes by ingredients error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search recipes by ingredients",
    });
  }
};

// @desc    Get single recipe by ID
// @route   GET /api/recipes/:id
// @access  Public (with optional auth for user-specific data)
const getRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("ratings.user", "name");

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    // Check if recipe is public or user has access
    if (
      !recipe.isPublic &&
      (!req.user || recipe.createdBy._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied to private recipe",
      });
    }

    // Increment view count (but not for the creator)
    if (
      !req.user ||
      recipe.createdBy._id.toString() !== req.user._id.toString()
    ) {
      await recipe.incrementViews();
    }

    // Add user-specific data if authenticated
    let userData = {};
    if (req.user) {
      const user = await User.findById(req.user._id);
      userData.isSaved = user.savedRecipes.includes(recipe._id);
      userData.userRating = recipe.ratings.find(
        (rating) => rating.user._id.toString() === req.user._id.toString()
      );
    }

    res.json({
      success: true,
      data: {
        recipe,
        userData,
      },
    });
  } catch (error) {
    console.error("Get recipe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recipe",
    });
  }
};

// @desc    Get user's saved recipes
// @route   GET /api/recipes/saved
// @access  Private
const getSavedRecipes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const user = await User.findById(req.user._id).populate({
      path: "savedRecipes",
      populate: {
        path: "createdBy",
        select: "name",
      },
      options: {
        sort: sortOptions,
        skip: skip,
        limit: parseInt(limit),
      },
    });

    const totalSaved = user.savedRecipes.length;
    const totalPages = Math.ceil(totalSaved / parseInt(limit));

    res.json({
      success: true,
      data: {
        recipes: user.savedRecipes,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecipes: totalSaved,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get saved recipes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch saved recipes",
    });
  }
};

// @desc    Rate a recipe
// @route   POST /api/recipes/:id/rate
// @access  Private
const rateRecipe = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { rating, comment } = req.body;
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    // Check if user already rated this recipe
    const existingRatingIndex = recipe.ratings.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      recipe.ratings[existingRatingIndex].rating = rating;
      recipe.ratings[existingRatingIndex].comment = comment;
      recipe.ratings[existingRatingIndex].createdAt = new Date();
    } else {
      // Add new rating
      recipe.ratings.push({
        user: req.user._id,
        rating,
        comment,
      });
    }

    // Update average rating
    recipe.updateAverageRating();
    await recipe.save();

    await recipe.populate("ratings.user", "name");

    res.json({
      success: true,
      message:
        existingRatingIndex !== -1
          ? "Rating updated successfully"
          : "Rating added successfully",
      data: {
        averageRating: recipe.averageRating,
        totalRatings: recipe.totalRatings,
        userRating: recipe.ratings.find(
          (r) => r.user._id.toString() === req.user._id.toString()
        ),
      },
    });
  } catch (error) {
    console.error("Rate recipe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to rate recipe",
    });
  }
};

module.exports = {
  generateRecipe,
  saveRecipe,
  unsaveRecipe,
  getRecipes,
  getRecipesByIngredients,
  getRecipe,
  getSavedRecipes,
  rateRecipe,
};
