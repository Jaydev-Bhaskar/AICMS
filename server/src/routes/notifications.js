const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    $or: [{ recipients: { $size: 0 } }, { recipients: req.user._id }],
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('complaint', 'caseId status')
    .populate('institution', 'name aicteId');

  const unreadCount = notifications.filter(
    (n) => !n.readBy.some((r) => String(r.user) === String(req.user._id))
  ).length;

  res.json({ success: true, unreadCount, data: notifications });
}));

router.put('/:id/read', asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, {
    $addToSet: { readBy: { user: req.user._id } },
  });
  res.json({ success: true, message: 'Marked as read' });
}));

router.put('/mark-all-read', asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipients: req.user._id, 'readBy.user': { $ne: req.user._id } },
    { $addToSet: { readBy: { user: req.user._id } } }
  );
  res.json({ success: true, message: 'All notifications marked as read' });
}));

module.exports = router;

