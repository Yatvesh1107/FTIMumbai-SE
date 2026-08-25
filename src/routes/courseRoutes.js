const express = require('express');
const router = express.Router();
const {
  getCourses,
  getMyEnrolledCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getCourses);
router.get('/my/enrolled', protect, getMyEnrolledCourses);
router.get('/:id', getCourseById);
router.post('/', protect, authorize('admin'), createCourse);
router.put('/:id', protect, authorize('admin'), updateCourse);
router.delete('/:id', protect, authorize('admin'), deleteCourse);

module.exports = router;
