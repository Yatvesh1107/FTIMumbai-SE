const express = require('express');
const router = express.Router();
const {
  getMarksheets,
  getMarksheetById,
  calculateMarksheet,
  generateMarksheet,
  updateMarksheet,
  publishMarksheet,
  deleteMarksheet,
  verifyMarksheet
} = require('../controllers/marksheetController');
const { protect, authorize } = require('../middleware/auth');

router.get('/calculate/:studentId/:courseId', protect, authorize('admin'), calculateMarksheet);
router.get('/verify/:marksheetNo', verifyMarksheet);
router.get('/', protect, getMarksheets);
router.get('/:id', protect, getMarksheetById);
router.post('/generate', protect, authorize('admin'), generateMarksheet);
router.put('/:id', protect, authorize('admin'), updateMarksheet);
router.post('/:id/publish', protect, authorize('admin'), publishMarksheet);
router.delete('/:id', protect, authorize('admin'), deleteMarksheet);

module.exports = router;
