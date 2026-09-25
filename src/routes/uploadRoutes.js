const express = require('express');
const router = express.Router();
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/auth');

// @desc    Upload a single image (school hero / course card)
// @route   POST /api/uploads
// @access  Private (Admin / Receptionist)
router.post(
  '/',
  protect,
  authorize('admin', 'receptionist'),
  upload.single('image'),
  handleMulterError,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }
    res.status(201).json({
      success: true,
      url: `/uploads/${req.file.filename}`,
      message: 'Upload successful'
    });
  }
);

module.exports = router;