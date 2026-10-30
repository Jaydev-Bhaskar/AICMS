const express = require('express');
const router = express.Router();
const {
  getInstitutions, getInstitution, createInstitution,
  updateInstitution, deleteInstitution,
} = require('../controllers/institutionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getInstitutions)
  .post(authorize('superadmin', 'admin'), createInstitution);

router.route('/:id')
  .get(getInstitution)
  .put(authorize('superadmin', 'admin'), updateInstitution)
  .delete(authorize('superadmin'), deleteInstitution);

module.exports = router;

