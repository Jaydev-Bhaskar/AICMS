const express = require('express');
const router = express.Router();
const { getOverview, getRecentComplaints, getOverlapAlerts, getSlaAlerts } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/overview', getOverview);
router.get('/recent-complaints', getRecentComplaints);
router.get('/overlap-alerts', getOverlapAlerts);
router.get('/sla-alerts', getSlaAlerts);

module.exports = router;

