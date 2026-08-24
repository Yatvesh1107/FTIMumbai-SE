const VideoLecture = require('../models/VideoLecture');
const VideoProgress = require('../models/VideoProgress');
const LiveSession = require('../models/LiveSession');
const Course = require('../models/Course');
const { compressVideo } = require('../utils/videoProcessor');
const path = require('path');
const fs = require('fs');

// --- VIDEO LECTURES ---

// @desc    Get all video lectures for a course
// @route   GET /api/lms/courses/:courseId/videos
// @access  Private
exports.getCourseVideos = async (req, res) => {
  try {
    const { courseId } = req.params;
    const videos = await VideoLecture.find({ courseId, isActive: true }).sort({ orderIndex: 1, createdAt: 1 });

    // If user is a student, attach their progress
    let progressMap = {};
    if (req.user && req.user.studentId) {
      const progresses = await VideoProgress.find({
        studentId: req.user.studentId,
        courseId
      });
      progresses.forEach(p => {
        progressMap[p.videoId.toString()] = {
          watchedSeconds: p.watchedSeconds,
          watchPercentage: p.watchPercentage,
          isWatched: p.isWatched,
          completedAt: p.completedAt
        };
      });
    }

    const videosWithProgress = videos.map(v => ({
      ...v.toObject(),
      progress: progressMap[v._id.toString()] || {
        watchedSeconds: 0,
        watchPercentage: 0,
        isWatched: false
      }
    }));

    res.json({
      success: true,
      count: videos.length,
      videos: videosWithProgress
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create / Upload Video Lecture with Compression (Admin)
// @route   POST /api/lms/videos
// @access  Private (Admin)
exports.createVideo = async (req, res) => {
  try {
    const {
      courseId,
      moduleTitle,
      title,
      description,
      videoUrl,
      durationInSeconds,
      orderIndex,
      resources
    } = req.body;

    const hasUploadedVideo = req.files && req.files['video'];
    if (!courseId || !moduleTitle || !title || (!videoUrl && !hasUploadedVideo)) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, moduleTitle, title, and video (upload or URL) are required'
      });
    }

    let finalVideoUrl = videoUrl ? videoUrl.trim() : '';
    let finalThumbnailUrl = '';
    let calculatedDuration = Number(durationInSeconds) || 600;

    // Handle uploaded thumbnail
    if (req.files && req.files['thumbnail']) {
      finalThumbnailUrl = `/uploads/thumbnails/${req.files['thumbnail'][0].filename}`;
    }

    // Handle uploaded video file with compression
    if (hasUploadedVideo) {
      const uploadedFile = req.files['video'][0];
      const inputPath = uploadedFile.path;
      const compressedFileName = 'compressed-' + Date.now() + '-' + path.basename(uploadedFile.filename, path.extname(uploadedFile.filename)) + '.mp4';

      console.log('Compressing uploaded video:', uploadedFile.filename);
      const meta = await compressVideo(inputPath, compressedFileName);
      finalVideoUrl = meta.url;
      if (meta.durationInSeconds > 0) {
        calculatedDuration = meta.durationInSeconds;
      }
    }

    const video = await VideoLecture.create({
      courseId,
      moduleTitle: moduleTitle.trim(),
      title: title.trim(),
      description: description || '',
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbnailUrl,
      durationInSeconds: calculatedDuration,
      orderIndex: Number(orderIndex) || 1,
      resources: resources ? (typeof resources === 'string' ? JSON.parse(resources) : resources) : []
    });

    res.status(201).json({
      success: true,
      message: 'Video lecture successfully created and compressed for streaming!',
      video
    });
  } catch (error) {
    console.error('Video upload controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Video Watch Progress (Student)
// @route   POST /api/lms/videos/:videoId/progress
// @access  Private (Student)
exports.updateVideoProgress = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { watchedSeconds, durationInSeconds } = req.body;

    if (!req.user || !req.user.studentId) {
      return res.status(400).json({ success: false, message: 'Only students can record progress.' });
    }

    const video = await VideoLecture.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const duration = durationInSeconds || video.durationInSeconds || 1;
    const seconds = Number(watchedSeconds) || 0;
    const watchPercentage = Math.min(100, Math.round((seconds / duration) * 100));
    const isWatched = watchPercentage >= 90;

    const progress = await VideoProgress.findOneAndUpdate(
      { studentId: req.user.studentId, videoId },
      {
        courseId: video.courseId,
        watchedSeconds: seconds,
        watchPercentage,
        isWatched,
        ...(isWatched ? { completedAt: new Date() } : {})
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- LIVE SESSIONS (GOOGLE MEET) ---

// @desc    Get Live Sessions for a course
// @route   GET /api/lms/courses/:courseId/live-sessions
// @access  Private
exports.getLiveSessions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const sessions = await LiveSession.find({ courseId })
      .populate('trainerId', 'name email')
      .sort({ scheduledDate: -1, startTime: -1 });

    res.json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Schedule a Live GMeet Class (Admin)
// @route   POST /api/lms/live-sessions
// @access  Private (Admin)
exports.createLiveSession = async (req, res) => {
  try {
    const {
      courseId,
      title,
      agenda,
      meetLink,
      scheduledDate,
      startTime,
      endTime,
      batchTiming
    } = req.body;

    if (!courseId || !title || !meetLink || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Course, title, GMeet link, date, start time, and end time are required'
      });
    }

    const session = await LiveSession.create({
      courseId,
      title: title.trim(),
      agenda,
      trainerId: req.user._id,
      meetLink: meetLink.trim(),
      scheduledDate: new Date(scheduledDate),
      startTime,
      endTime,
      batchTiming: batchTiming || 'All Batches',
      status: 'Scheduled'
    });

    res.status(201).json({ success: true, message: 'Live class scheduled successfully!', session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
