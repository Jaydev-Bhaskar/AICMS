const express = require('express');
const router = express.Router();
const {
  getComplaints, getComplaint, createComplaint,
  updateComplaint, addAction, deleteComplaint,
  publicLodgeComplaint, publicTrackComplaint,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public Student & Stakeholder Grievance Endpoints
router.post('/public/lodge', publicLodgeComplaint);
router.get('/public/track/:caseId', publicTrackComplaint);

// Protected routes (AICTE officials and logged-in users)
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

