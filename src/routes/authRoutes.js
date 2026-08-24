const express = require('express');
const router = express.Router();
const { login, getMe, registerUser, getUsers } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/register', protect, authorize('admin'), registerUser);
router.get('/users', protect, authorize('admin'), getUsers);

module.exports = router;
