const express = require("express");
const { body } = require("express-validator");
const {
  generateRecipe,
  saveRecipe,
  unsaveRecipe,
  getRecipes,
  getRecipesByIngredients,
  getRecipe,
  getSavedRecipes,
  rateRecipe,
} = require("../controllers/recipeController");
const { auth, optionalAuth } = require("../middleware/auth");
const config = require("../config/config");

const router = express.Router();

// Validation rules
const generateRecipeValidation = [
  body("ingredients")
    .isArray({ min: 1, max: config.maxIngredients })
    .withMessage(
      `Ingredients must be an array with 1-${config.maxIngredients} items`
    ),
  body("ingredients.*")
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each ingredient must be a string between 1-50 characters"),
  body("servings")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Servings must be between 1 and 20"),
  body("dietaryRestrictions")
    .optional()
    .isArray()
    .withMessage("Dietary restrictions must be an array"),
  body("cuisine")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Cuisine must be a string with max 50 characters"),
  body("mealType")
    .optional()
    .isIn(["breakfast", "lunch", "dinner", "snack", "dessert", "appetizer"])
    .withMessage("Invalid meal type"),
  body("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard"])
    .withMessage("Difficulty must be easy, medium, or hard"),
  body("maxCookingTime")
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage("Max cooking time must be between 1-480 minutes"),
];

const searchByIngredientsValidation = [
  body("ingredients")
    .isArray({ min: 1, max: config.maxIngredients })
    .withMessage(
      `Ingredients must be an array with 1-${config.maxIngredients} items`
    ),
  body("ingredients.*")
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each ingredient must be a string between 1-50 characters"),
  body("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  body("skip")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Skip must be a non-negative integer"),
  body("minMatch")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Min match must be at least 1"),
];

const rateRecipeValidation = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Comment must be a string with max 500 characters"),
];

// Routes
router.post("/generate", auth, generateRecipeValidation, generateRecipe);
router.post(
  "/search-by-ingredients",
  searchByIngredientsValidation,
  getRecipesByIngredients
);
router.get("/saved", auth, getSavedRecipes);
router.get("/", getRecipes);
router.get("/:id", optionalAuth, getRecipe);
router.post("/:id/save", auth, saveRecipe);
router.delete("/:id/save", auth, unsaveRecipe);
router.post("/:id/rate", auth, rateRecipeValidation, rateRecipe);

module.exports = router;
