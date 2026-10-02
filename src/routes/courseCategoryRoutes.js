const express = require('express');
const router = express.Router();
const {
  getCourseCategories,
  getCourseCategoryBySlug,
  createCourseCategory,
  updateCourseCategory,
  deleteCourseCategory
} = require('../controllers/courseCategoryController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getCourseCategories);
router.get('/:slug', getCourseCategoryBySlug);
router.post('/', protect, authorize('admin'), createCourseCategory);
router.put('/:id', protect, authorize('admin'), updateCourseCategory);
router.delete('/:id', protect, authorize('admin'), deleteCourseCategory);

module.exports = router;