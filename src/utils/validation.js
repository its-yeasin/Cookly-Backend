const Joi = require("joi");

// Common validation schemas
const ingredientSchema = Joi.string().trim().min(1).max(50);

const ingredientsArraySchema = Joi.array()
  .items(ingredientSchema)
  .min(1)
  .max(20)
  .required();

const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
};

// User validation schemas
const userRegisterSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(6)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    }),
  preferences: Joi.object({
    dietaryRestrictions: Joi.array().items(
      Joi.string().valid(
        "vegetarian",
        "vegan",
        "gluten-free",
        "dairy-free",
        "nut-free",
        "low-carb",
        "keto",
        "paleo"
      )
    ),
    favoriteIngredients: Joi.array().items(ingredientSchema),
    dislikedIngredients: Joi.array().items(ingredientSchema),
    defaultPortions: Joi.number().integer().min(1).max(12).default(4),
  }).optional(),
});

const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const userUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  preferences: Joi.object({
    dietaryRestrictions: Joi.array().items(
      Joi.string().valid(
        "vegetarian",
        "vegan",
        "gluten-free",
        "dairy-free",
        "nut-free",
        "low-carb",
        "keto",
        "paleo"
      )
    ),
    favoriteIngredients: Joi.array().items(ingredientSchema),
    dislikedIngredients: Joi.array().items(ingredientSchema),
    defaultPortions: Joi.number().integer().min(1).max(12),
  }),
  avatar: Joi.string().uri(),
}).min(1);

// Recipe validation schemas
const generateRecipeSchema = Joi.object({
  ingredients: ingredientsArraySchema,
  servings: Joi.number().integer().min(1).max(20).default(4),
  dietaryRestrictions: Joi.array()
    .items(
      Joi.string().valid(
        "vegetarian",
        "vegan",
        "gluten-free",
        "dairy-free",
        "nut-free",
        "low-carb",
        "keto",
        "paleo"
      )
    )
    .default([]),
  cuisine: Joi.string().trim().max(50).default(""),
  mealType: Joi.string()
    .valid("breakfast", "lunch", "dinner", "snack", "dessert", "appetizer")
    .default("dinner"),
  difficulty: Joi.string().valid("easy", "medium", "hard").default("medium"),
  maxCookingTime: Joi.number().integer().min(1).max(480),
  saveToDatabase: Joi.boolean().default(true),
});

const searchByIngredientsSchema = Joi.object({
  ingredients: ingredientsArraySchema,
  limit: Joi.number().integer().min(1).max(50).default(10),
  skip: Joi.number().integer().min(0).default(0),
  minMatch: Joi.number().integer().min(1).default(1),
});

const rateRecipeSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(500).allow(""),
});

// Query validation schemas
const recipeQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  ingredients: Joi.string(),
  cuisine: Joi.string(),
  mealType: Joi.string().valid(
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "dessert",
    "appetizer"
  ),
  difficulty: Joi.string().valid("easy", "medium", "hard"),
  maxCookingTime: Joi.number().integer().min(1),
  isVegetarian: Joi.string().valid("true", "false"),
  isVegan: Joi.string().valid("true", "false"),
  isGlutenFree: Joi.string().valid("true", "false"),
  search: Joi.string().trim().max(100),
  sortBy: Joi.string()
    .valid("createdAt", "averageRating", "views", "title")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

// Validation middleware generator
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = {
  validate,
  schemas: {
    userRegisterSchema,
    userLoginSchema,
    userUpdateSchema,
    generateRecipeSchema,
    searchByIngredientsSchema,
    rateRecipeSchema,
    recipeQuerySchema,
  },
};
