const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require("../controllers/authController");
const { auth } = require("../middleware/auth");
const { authRateLimit } = require("../middleware/validation");

const router = express.Router();

// Validation rules
const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 5 })
    .withMessage("Password must be at least 5 characters long")
    // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("preferences.dietaryRestrictions")
    .optional()
    .isArray()
    .withMessage("Dietary restrictions must be an array"),
  body("preferences.favoriteIngredients")
    .optional()
    .isArray()
    .withMessage("Favorite ingredients must be an array"),
  body("preferences.dislikedIngredients")
    .optional()
    .isArray()
    .withMessage("Disliked ingredients must be an array"),
  body("preferences.defaultPortions")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Default portions must be between 1 and 12"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 5 })
    .withMessage("New password must be at least 5 characters long")
    // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

// Routes with rate limiting for auth endpoints
router.post("/register", authRateLimit, registerValidation, register);
router.post("/login", authRateLimit, loginValidation, login);
router.get("/me", auth, getMe);
router.put("/profile", auth, updateProfileValidation, updateProfile);
router.put("/change-password", auth, changePasswordValidation, changePassword);

module.exports = router;
