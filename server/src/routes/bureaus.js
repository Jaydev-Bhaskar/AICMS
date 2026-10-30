const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Bureau = require('../models/Bureau');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const bureaus = await Bureau.find({ isActive: true }).populate('head', 'name email');
  res.json({ success: true, data: bureaus });
}));

router.post('/', authorize('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const bureau = await Bureau.create(req.body);
  res.status(201).json({ success: true, data: bureau });
}));

router.put('/:id', authorize('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const bureau = await Bureau.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!bureau) return res.status(404).json({ success: false, message: 'Bureau not found' });
  res.json({ success: true, data: bureau });
}));

module.exports = router;

