const express = require("express");
const { validate, schemas } = require("../utils/validation");
const User = require("../models/User");
const { auth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// @desc    Get user profile by ID
// @route   GET /api/users/:id
// @access  Public (with optional auth for enhanced data)
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -email")
      .populate(
        "savedRecipes",
        "title description averageRating cookingTime.total"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.createdAt,
          totalSavedRecipes: user.savedRecipes.length,
          // Only show saved recipes if viewing own profile
          ...(req.user &&
            req.user._id.toString() === user._id.toString() && {
              savedRecipes: user.savedRecipes,
            }),
        },
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
    });
  }
};

// Routes
router.get("/:id", optionalAuth, getUserProfile);

module.exports = router;
