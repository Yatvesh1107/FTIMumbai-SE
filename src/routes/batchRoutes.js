const express = require('express');
const router = express.Router();
const {
  getBatches,
  getBatchesByCourse,
  createBatch,
  updateBatch,
  deleteBatch
} = require('../controllers/batchController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getBatches);
router.get('/course/:courseId', protect, getBatchesByCourse);
router.post('/', protect, authorize('admin'), createBatch);
router.put('/:id', protect, authorize('admin'), updateBatch);
router.delete('/:id', protect, authorize('admin'), deleteBatch);

module.exports = router;
