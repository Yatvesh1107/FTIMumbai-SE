const express = require('express');
const router = express.Router();
const {
  getSchools,
  getSchoolBySlug,
  createSchool,
  updateSchool,
  deleteSchool
} = require('../controllers/schoolController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getSchools);
router.get('/:slug', getSchoolBySlug);
router.post('/', protect, authorize('admin'), createSchool);
router.put('/:id', protect, authorize('admin'), updateSchool);
router.delete('/:id', protect, authorize('admin'), deleteSchool);

module.exports = router;