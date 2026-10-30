const express = require('express');
const router = express.Router();
const { getOverlapAlerts, getPairwise, reviewOverlap, rescan } = require('../controllers/overlapController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getOverlapAlerts);
router.get('/pairwise', getPairwise);
router.put('/:complaintId/review', reviewOverlap);
router.post('/:complaintId/rescan', authorize('superadmin', 'admin', 'rb_officer', 'pgrc_officer'), rescan);

module.exports = router;

