const express = require('express');
const router = express.Router();
const {
  getCourseNotes,
  getStudyNoteById,
  createNote,
  submitStudyNoteQuiz,
  getStudyNoteTracking,
  getCourseAssignments,
  createAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  gradeAssignmentSubmission
} = require('../controllers/academicController');
const { protect, authorize } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');

// --- Study Notes Routes ---
router.get('/courses/:courseId/notes', protect, getCourseNotes);
router.get('/notes/:id', protect, getStudyNoteById);
router.post(
  '/notes',
  protect,
  authorize('admin'),
  upload.fields([
    { name: 'pdfFile', maxCount: 1 },
    { name: 'excelFile', maxCount: 1 }
  ]),
  handleMulterError,
  createNote
);
router.post('/notes/:id/quiz-submit', protect, submitStudyNoteQuiz);
router.get('/notes/:id/tracking', protect, authorize('admin'), getStudyNoteTracking);

// --- Assignments Routes ---
router.get('/courses/:courseId/assignments', protect, getCourseAssignments);
router.post(
  '/assignments',
  protect,
  authorize('admin'),
  upload.single('attachment'),
  handleMulterError,
  createAssignment
);
router.post(
  '/assignments/:id/submit',
  protect,
  upload.single('submissionFile'),
  handleMulterError,
  submitAssignment
);
router.get('/assignments/:id/submissions', protect, authorize('admin'), getAssignmentSubmissions);
router.post('/assignments/submissions/:submissionId/grade', protect, authorize('admin'), gradeAssignmentSubmission);

module.exports = router;
