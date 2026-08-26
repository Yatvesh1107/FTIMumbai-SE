const express = require('express');
const router = express.Router();
const {
  getCourseVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  getVideoDetail,
  submitVideoQuiz,
  updateVideoProgress,
  getLiveSessions,
  getMyLiveSessions,
  createLiveSession,
  updateLiveSession,
  deleteLiveSession,
  checkGoogleAuth,
  getGoogleAuthUrl,
  saveGoogleToken,
  unlinkGoogleAuth,
  generateMeetLink
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
router.put(
  '/videos/:videoId',
  protect,
  authorize('admin'),
  uploadVideoFiles.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  handleVideoUploadError,
  updateVideo
);
router.delete('/videos/:videoId', protect, authorize('admin'), deleteVideo);
router.get('/videos/:videoId/detail', protect, getVideoDetail);
router.post('/videos/:videoId/quiz-submit', protect, submitVideoQuiz);
router.post('/videos/:videoId/progress', protect, updateVideoProgress);

// Google Meet OAuth
router.get('/google/auth-status', protect, authorize('admin'), checkGoogleAuth);
router.get('/google/auth-url', protect, authorize('admin'), getGoogleAuthUrl);
router.post('/google/save-token', protect, authorize('admin'), saveGoogleToken);
router.post('/google/unlink', protect, authorize('admin'), unlinkGoogleAuth);
router.post('/google/generate-meet', protect, authorize('admin'), generateMeetLink);

// Live Sessions
router.get('/courses/:courseId/live-sessions', protect, getLiveSessions);
router.get('/live/my', protect, getMyLiveSessions);
router.post('/live-sessions', protect, authorize('admin'), createLiveSession);
router.put('/live-sessions/:sessionId', protect, authorize('admin'), updateLiveSession);
router.delete('/live-sessions/:sessionId', protect, authorize('admin'), deleteLiveSession);

module.exports = router;
