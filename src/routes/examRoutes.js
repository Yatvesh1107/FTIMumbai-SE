const express = require('express');
const router = express.Router();
const {
  getQuestions,
  createQuestion,
  getTargetStudents,
  getExamSchedules,
  createExamSchedule,
  submitExam,
  requestReExam,
  getReExamRequests,
  approveReExamRequest,
  grantDirectReExam
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

// Schedules & Student Targeting
router.get('/target-students', protect, authorize('admin'), getTargetStudents);
router.get('/schedules/:courseId', protect, getExamSchedules);
router.post('/schedules', protect, authorize('admin'), createExamSchedule);

// Exam Submission
router.post('/submit', protect, submitExam);

// Re-Exam Engine (Magma Flow)
router.post('/re-exam/request', protect, requestReExam);
router.get('/re-exam/requests', protect, authorize('admin'), getReExamRequests);
router.post('/re-exam/schedule', protect, authorize('admin'), require('../controllers/examController').scheduleStudentReExam);

module.exports = router;
