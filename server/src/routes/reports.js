const express = require('express');
const router = express.Router();
const { getReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getReport);

module.exports = router;

