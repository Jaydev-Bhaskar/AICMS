const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.get('/', authorize('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const users = await User.find().populate('bureau', 'name code').select('-password');
  res.json({ success: true, data: users });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('bureau', 'name code').select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user });
}));

router.put('/:id', authorize('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const { name, role, bureau, designation, phone, region, isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, role, bureau, designation, phone, region, isActive },
    { new: true, runValidators: true }
  ).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user });
}));

module.exports = router;

