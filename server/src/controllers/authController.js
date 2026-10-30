const User = require('../models/User');
const Bureau = require('../models/Bureau');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Private/Admin
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, bureau, designation, phone, region } = req.body;

  const user = await User.create({ name, email, password, role, bureau, designation, phone, region });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email }).select('+password').populate('bureau', 'name code');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Account is deactivated. Contact admin.' });
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = user.getSignedJwtToken();

  res.json({
    success: true,
    message: 'Login successful',
    token,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bureau: user.bureau,
      designation: user.designation,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
    },
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('bureau', 'name code fullName');
  res.json({ success: true, data: user });
});

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, designation } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone, designation }, { new: true, runValidators: true });
  res.json({ success: true, data: user });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = { register, login, getMe, updateProfile, changePassword };

