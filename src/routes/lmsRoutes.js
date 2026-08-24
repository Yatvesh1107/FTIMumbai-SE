const express = require('express');
const router = express.Router();
const {
  getCourseVideos,
  createVideo,
  updateVideoProgress,
  getLiveSessions,
  createLiveSession
} = require('../controllers/lmsController');
const { protect, authorize } = require('../middleware/auth');
const { uploadVideoFiles, handleVideoUploadError } = require('../middleware/videoUploadMiddleware');

// Videos
router.get('/courses/:courseId/videos', protect, getCourseVideos);
router.post(
  '/videos',
  protect,
  authorize('admin'),
  uploadVideoFiles.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  handleVideoUploadError,
  createVideo
);
router.post('/videos/:videoId/progress', protect, updateVideoProgress);

// Live Sessions
router.get('/courses/:courseId/live-sessions', protect, getLiveSessions);
router.post('/live-sessions', protect, authorize('admin'), createLiveSession);

module.exports = router;
