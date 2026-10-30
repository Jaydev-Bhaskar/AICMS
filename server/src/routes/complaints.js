const express = require('express');
const router = express.Router();
const {
  getComplaints, getComplaint, createComplaint,
  updateComplaint, addAction, deleteComplaint,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getComplaints)
  .post(createComplaint);

router.route('/:id')
  .get(getComplaint)
  .put(updateComplaint)
  .delete(authorize('superadmin', 'admin'), deleteComplaint);

router.post('/:id/actions', addAction);

module.exports = router;

