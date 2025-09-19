const User = require("../models/User");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { name, email, password, preferences } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists with this email",
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    preferences: preferences || {},
  });

  // Generate token
  const token = generateToken(user._id);

  // Get user without password
  const userProfile = user.getPublicProfile();

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: userProfile,
      token,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  // Find user by email and include password for comparison
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: "Account is deactivated",
    });
  }

  // Compare password
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user._id);

  // Get user without password
  const userProfile = user.getPublicProfile();

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: userProfile,
      token,
    },
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate("savedRecipes");

  res.json({
    success: true,
    data: {
      user: user.getPublicProfile(),
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const allowedUpdates = ["name", "preferences", "avatar"];
  const updates = {};

  // Only allow certain fields to be updated
  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: {
      user: user.getPublicProfile(),
    },
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select("+password");

  // Verify current password
  const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordCorrect) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: "Password changed successfully",
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
