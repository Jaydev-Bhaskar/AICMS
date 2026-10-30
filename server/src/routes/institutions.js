const express = require('express');
const router = express.Router();
const {
  getInstitutions, getInstitution, createInstitution,
  updateInstitution, deleteInstitution,
} = require('../controllers/institutionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public read endpoints for student dropdown & profile view
router.get('/', getInstitutions);
router.get('/:id', getInstitution);

// Protected endpoints for modifications
router.use(protect);
router.post('/', authorize('superadmin', 'admin'), createInstitution);
router.put('/:id', authorize('superadmin', 'admin'), updateInstitution);
router.delete('/:id', authorize('superadmin'), deleteInstitution);

module.exports = router;

