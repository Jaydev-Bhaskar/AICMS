const express = require('express');
const router = express.Router();
const { register, studentRegister, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/student-register', studentRegister);
router.post('/register', protect, authorize('superadmin', 'admin'), register);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;

