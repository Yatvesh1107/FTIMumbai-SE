const express = require('express');
const router = express.Router();
const {
  getQuestions,
  createQuestion,
  getExamSchedules,
  createExamSchedule,
  submitExam
} = require('../controllers/examController');
const { uploadQuestionBankExcel } = require('../controllers/questionBankController');
const { protect, authorize } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');

// Questions
router.get('/questions/:courseId', protect, getQuestions);
router.post('/questions', protect, authorize('admin'), createQuestion);
router.post(
  '/questions/upload-excel',
  protect,
  authorize('admin'),
  upload.single('file'),
  handleMulterError,
  uploadQuestionBankExcel
);

// Schedules
router.get('/schedules/:courseId', protect, getExamSchedules);
router.post('/schedules', protect, authorize('admin'), createExamSchedule);

// Submit
router.post('/submit', protect, submitExam);

module.exports = router;
