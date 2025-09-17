const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Recipe title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    ingredients: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        amount: {
          type: String,
          required: true,
          trim: true,
        },
        unit: {
          type: String,
          trim: true,
        },
      },
    ],
    inputIngredients: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    instructions: [
      {
        stepNumber: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
          required: true,
          trim: true,
        },
        duration: {
          type: String, // e.g., "5 minutes", "30 seconds"
          trim: true,
        },
      },
    ],
    cookingTime: {
      prep: {
        type: Number, // in minutes
        default: 0,
      },
      cook: {
        type: Number, // in minutes
        default: 0,
      },
      total: {
        type: Number, // in minutes
        default: 0,
      },
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    servings: {
      type: Number,
      required: [true, "Number of servings is required"],
      min: [1, "Servings must be at least 1"],
      max: [20, "Servings cannot exceed 20"],
    },
    cuisine: {
      type: String,
      trim: true,
    },
    mealType: [
      {
        type: String,
        enum: ["breakfast", "lunch", "dinner", "snack", "dessert", "appetizer"],
        default: ["dinner"],
      },
    ],
    dietaryInfo: {
      isVegetarian: {
        type: Boolean,
        default: false,
      },
      isVegan: {
        type: Boolean,
        default: false,
      },
      isGlutenFree: {
        type: Boolean,
        default: false,
      },
      isDairyFree: {
        type: Boolean,
        default: false,
      },
      isNutFree: {
        type: Boolean,
        default: false,
      },
      isLowCarb: {
        type: Boolean,
        default: false,
      },
    },
    nutritionalInfo: {
      calories: Number,
      protein: Number, // in grams
      carbs: Number, // in grams
      fat: Number, // in grams
      fiber: Number, // in grams
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    generatedBy: {
      type: String,
      enum: ["azure-openai", "user", "admin"],
      default: "azure-openai",
    },
    generationPrompt: {
      type: String,
      select: false, // Don't include in queries by default
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    savedByUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
recipeSchema.index({ createdBy: 1 });
recipeSchema.index({ inputIngredients: 1 });
recipeSchema.index({ tags: 1 });
recipeSchema.index({ averageRating: -1 });
recipeSchema.index({ createdAt: -1 });
recipeSchema.index({
  "ingredients.name": "text",
  title: "text",
  description: "text",
});

// Calculate total cooking time before saving
recipeSchema.pre("save", function (next) {
  if (
    this.cookingTime.prep !== undefined &&
    this.cookingTime.cook !== undefined
  ) {
    this.cookingTime.total = this.cookingTime.prep + this.cookingTime.cook;
  }
  next();
});

// Update average rating when ratings change
recipeSchema.methods.updateAverageRating = function () {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    this.totalRatings = 0;
  } else {
    const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
    this.averageRating = sum / this.ratings.length;
    this.totalRatings = this.ratings.length;
  }
};

// Increment view count
recipeSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Static method to find recipes by ingredients
recipeSchema.statics.findByIngredients = function (ingredients, options = {}) {
  const {
    limit = 10,
    skip = 0,
    sortBy = "createdAt",
    sortOrder = -1,
    minMatch = 1,
  } = options;

  return this.aggregate([
    {
      $match: {
        inputIngredients: {
          $in: ingredients.map((ing) => new RegExp(ing, "i")),
        },
        isPublic: true,
      },
    },
    {
      $addFields: {
        matchCount: {
          $size: {
            $filter: {
              input: "$inputIngredients",
              cond: {
                $in: ["$$this", ingredients.map((ing) => new RegExp(ing, "i"))],
              },
            },
          },
        },
      },
    },
    {
      $match: {
        matchCount: { $gte: minMatch },
      },
    },
    {
      $sort: {
        matchCount: -1,
        [sortBy]: sortOrder,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);
};

module.exports = mongoose.model("Recipe", recipeSchema);
