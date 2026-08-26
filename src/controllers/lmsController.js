const VideoLecture = require('../models/VideoLecture');
const VideoProgress = require('../models/VideoProgress');
const VideoQuizAttempt = require('../models/VideoQuizAttempt');
const LiveSession = require('../models/LiveSession');
const Course = require('../models/Course');
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { createNotification } = require('../controllers/notificationController');
const googleMeetHelper = require('../utils/googleMeetHelper');
const { compressVideo } = require('../utils/videoProcessor');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Parse MCQs from an uploaded Excel sheet (same columns as Study Notes)
const parseQuestionsFromExcel = (excelPath) => {
  const questions = [];
  try {
    const workbook = XLSX.readFile(excelPath, { cellDates: true, cellNF: true, cellText: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    rawData.forEach((row) => {
      const qText = (row['Question'] || row['question'] || row['Question Text'] || '').toString().trim();
      if (!qText) return;

      const optA = (row['Option A'] || row['OptionA'] || row['A'] || '').toString().trim();
      const optB = (row['Option B'] || row['OptionB'] || row['B'] || '').toString().trim();
      const optC = (row['Option C'] || row['OptionC'] || row['C'] || '').toString().trim();
      const optD = (row['Option D'] || row['OptionD'] || row['D'] || '').toString().trim();

      if (!optA || !optB) return;

      const options = [
        { label: 'A', text: optA },
        { label: 'B', text: optB }
      ];
      if (optC) options.push({ label: 'C', text: optC });
      if (optD) options.push({ label: 'D', text: optD });

      const rawAns = (row['Correct Answer'] || row['Answer'] || row['Correct'] || 'A').toString().trim().toUpperCase();
      const validAns = ['A', 'B', 'C', 'D'].includes(rawAns) ? rawAns : 'A';
      const explanation = (row['Explanation'] || row['explanation'] || '').toString().trim();

      questions.push({ question: qText, options, correctAnswer: validAns, explanation });
    });

    if (fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
  } catch (e) {
    console.error('Error parsing MCQs Excel in Video Lecture:', e);
  }
  return questions;
};

// Resolve incoming questions from excelFile or manualQuestions payload
const resolveIncomingQuestions = (req, currentCount) => {
  if (req.files && req.files['excelFile'] && req.files['excelFile'].length > 0) {
    return parseQuestionsFromExcel(req.files['excelFile'][0].path);
  }
  if (req.body.manualQuestions !== undefined) {
    try {
      const parsed = typeof req.body.manualQuestions === 'string'
        ? JSON.parse(req.body.manualQuestions)
        : req.body.manualQuestions;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Manual questions parse error:', e);
      return null;
    }
  }
  if (req.body.clearQuestions === 'true') return [];
  return null; // No change requested
};

// --- VIDEO LECTURES ---

// @desc    Get all video lectures for a course
// @route   GET /api/lms/courses/:courseId/videos
// @access  Private
exports.getCourseVideos = async (req, res) => {
  try {
    const { courseId } = req.params;
    const videos = await VideoLecture.find({ courseId, isActive: true }).sort({ orderIndex: 1, createdAt: 1 });

    // If user is a student, attach their watch progress + quiz attempt summary
    let progressMap = {};
    let attemptMap = {};
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

      const attempts = await VideoQuizAttempt.find({
        studentId: req.user.studentId,
        courseId
      });
      attempts.forEach(att => {
        attemptMap[att.videoId.toString()] = {
          score: att.score,
          totalQuestions: att.totalQuestions,
          percentage: att.percentage,
          status: att.status,
          completedAt: att.completedAt
        };
      });
    }

    const videosWithProgress = videos.map(v => ({
      ...v.toObject(),
      totalQuestions: v.questions ? v.questions.length : 0,
      questions: undefined, // Keep list payload light — details come from the detail endpoint
      progress: progressMap[v._id.toString()] || {
        watchedSeconds: 0,
        watchPercentage: 0,
        isWatched: false
      },
      userAttempt: attemptMap[v._id.toString()] || null
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

    // Resolve attached practice MCQs (Excel import or manual builder)
    let questions = resolveIncomingQuestions(req, 0) || [];

    const video = await VideoLecture.create({
      courseId,
      moduleTitle: moduleTitle.trim(),
      title: title.trim(),
      description: description || '',
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbnailUrl,
      durationInSeconds: calculatedDuration,
      orderIndex: Number(orderIndex) || 1,
      resources: resources ? (typeof resources === 'string' ? JSON.parse(resources) : resources) : [],
      questions,
      totalQuestions: questions.length
    });

    // Notify enrolled students
    try {
      const courseDoc = await Course.findById(courseId).select('name');
      const courseName = courseDoc ? courseDoc.name : 'your course';
      const admissions = await Admission.find({ courseId }).select('studentId');
      const studentIds = [...new Set(admissions.map(a => a.studentId.toString()))];

      for (const sid of studentIds) {
        await createNotification({
          recipientId: sid,
          studentId: sid,
          role: 'student',
          title: 'New Video Lecture Added',
          message: 'A new video "' + title.trim() + '" has been added to "' + courseName + '" (' + moduleTitle.trim() + ').',
          type: 'general',
          category: 'academic',
          priority: 'medium',
          link: '/student/videos',
          meta: { videoId: video._id, courseId },
          sendPush: true
        });
      }
    } catch (nErr) {
      console.error('Video upload notification error:', nErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Video lecture uploaded successfully with ${questions.length} practice MCQs!`,
      video
    });
  } catch (error) {
    console.error('Video upload controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Video Lecture (Admin) — optional new file gets re-compressed
// @route   PUT /api/lms/videos/:videoId
// @access  Private (Admin)
exports.updateVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { moduleTitle, title, description, videoUrl, orderIndex, isActive } = req.body;

    const video = await VideoLecture.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video lecture not found' });
    }

    const hasNewVideo = req.files && req.files['video'];
    const hasNewThumbnail = req.files && req.files['thumbnail'];

    // If switching from uploaded file to external URL, ensure URL provided when no new file
    if (!hasNewVideo && videoUrl === undefined && !video.videoUrl.startsWith('/uploads')) {
      return res.status(400).json({ success: false, message: 'A video file or video URL is required' });
    }

    let finalVideoUrl = video ? video.videoUrl : '';
    let finalDuration = video.durationInSeconds;

    // New video file: compress it, then clean up BOTH the new raw file and old stored file
    if (hasNewVideo) {
      const uploadedFile = req.files['video'][0];
      const inputPath = uploadedFile.path;
      const compressedFileName = 'compressed-' + Date.now() + '-' + path.basename(uploadedFile.filename, path.extname(uploadedFile.filename)) + '.mp4';

      console.log('Re-compressing updated video:', uploadedFile.filename);
      const meta = await compressVideo(inputPath, compressedFileName);
      finalVideoUrl = meta.url;
      if (meta.durationInSeconds > 0) {
        finalDuration = meta.durationInSeconds;
      }

      // Remove previously stored local file (external URLs are untouched)
      if (video.videoUrl && video.videoUrl.startsWith('/uploads')) {
        const oldPath = path.join(__dirname, '..', '..', video.videoUrl);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { console.error('Old video cleanup failed:', e.message); }
        }
      }
    } else if (videoUrl !== undefined && videoUrl.trim() !== '') {
      // Switching to an external URL — remove stored local file
      if (video.videoUrl && video.videoUrl.startsWith('/uploads')) {
        const oldPath = path.join(__dirname, '..', '..', video.videoUrl);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { console.error('Old video cleanup failed:', e.message); }
        }
      }
      finalVideoUrl = videoUrl.trim();
    }

    // Thumbnail replacement
    let finalThumbnailUrl = video.thumbnailUrl || '';
    if (hasNewThumbnail) {
      if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads')) {
        const oldThumb = path.join(__dirname, '..', '..', video.thumbnailUrl);
        if (fs.existsSync(oldThumb)) {
          try { fs.unlinkSync(oldThumb); } catch (e) { console.error('Old thumbnail cleanup failed:', e.message); }
        }
      }
      finalThumbnailUrl = `/uploads/thumbnails/${req.files['thumbnail'][0].filename}`;
    }

    const updates = {};
    if (moduleTitle !== undefined) updates.moduleTitle = moduleTitle.trim();
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (orderIndex !== undefined) updates.orderIndex = Number(orderIndex) || video.orderIndex;
    if (isActive !== undefined) updates.isActive = isActive === 'true' || isActive === true;

    // Replace practice MCQs only when new ones are supplied
    const incomingQuestions = resolveIncomingQuestions(req, video.questions.length);
    if (incomingQuestions !== null) {
      updates.questions = incomingQuestions;
      updates.totalQuestions = incomingQuestions.length;
    }

    const updated = await VideoLecture.findByIdAndUpdate(
      videoId,
      {
        ...updates,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        durationInSeconds: finalDuration
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Video lecture updated successfully!',
      video: updated
    });
  } catch (error) {
    console.error('Video update controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Video Lecture (Admin) — removes DB record + physical files
// @route   DELETE /api/lms/videos/:videoId
// @access  Private (Admin)
exports.deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await VideoLecture.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video lecture not found' });
    }

    // Delete stored local files (external URLs are untouched)
    if (video.videoUrl && video.videoUrl.startsWith('/uploads')) {
      const videoPath = path.join(__dirname, '..', '..', video.videoUrl);
      if (fs.existsSync(videoPath)) {
        try { fs.unlinkSync(videoPath); } catch (e) { console.error('Video file cleanup failed:', e.message); }
      }
    }
    if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads')) {
      const thumbPath = path.join(__dirname, '..', '..', video.thumbnailUrl);
      if (fs.existsSync(thumbPath)) {
        try { fs.unlinkSync(thumbPath); } catch (e) { console.error('Thumbnail cleanup failed:', e.message); }
      }
    }

    await VideoProgress.deleteMany({ videoId });
    await VideoLecture.findByIdAndDelete(videoId);

    res.json({ success: true, message: 'Video lecture deleted successfully!' });
  } catch (error) {
    console.error('Video delete controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single video lecture with attached MCQs (Student/Admin)
// @route   GET /api/lms/videos/:videoId/detail
// @access  Private
exports.getVideoDetail = async (req, res) => {
  try {
    const video = await VideoLecture.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video lecture not found' });
    }

    let userAttempt = null;
    if (req.user && req.user.studentId) {
      userAttempt = await VideoQuizAttempt.findOne({
        videoId: video._id,
        studentId: req.user.studentId
      });
    }

    res.json({
      success: true,
      video: { ...video.toObject(), totalQuestions: video.questions.length },
      userAttempt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit Student Video Practice Quiz Attempt (Student)
// @route   POST /api/lms/videos/:videoId/quiz-submit
// @access  Private (Student)
exports.submitVideoQuiz = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { answers, timeSpentSeconds } = req.body;

    if (!req.user || !req.user.studentId) {
      return res.status(400).json({ success: false, message: 'Student authentication required.' });
    }

    const video = await VideoLecture.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video lecture not found' });
    }

    const totalQuestions = video.questions.length;
    if (totalQuestions === 0) {
      return res.status(400).json({ success: false, message: 'No questions attached to this video.' });
    }

    let score = 0;
    const evaluatedAnswers = [];

    video.questions.forEach((q) => {
      const qIdStr = q._id.toString();
      const submittedOption = answers ? (answers[qIdStr] || '').toUpperCase() : '';
      const isCorrect = submittedOption === q.correctAnswer;

      if (isCorrect) score += 1;

      evaluatedAnswers.push({
        questionId: q._id,
        questionText: q.question,
        selectedOption: submittedOption,
        correctAnswer: q.correctAnswer,
        isCorrect
      });
    });

    const percentage = Math.round((score / totalQuestions) * 100);
    const status = percentage >= 40 ? 'Passed' : 'Failed';

    const attempt = await VideoQuizAttempt.findOneAndUpdate(
      { videoId, studentId: req.user.studentId },
      {
        courseId: video.courseId,
        score,
        totalQuestions,
        percentage,
        status,
        answers: evaluatedAnswers,
        timeSpentSeconds: Number(timeSpentSeconds) || 0,
        completedAt: new Date()
      },
      { upsert: true, new: true }
    );

    const allAttempts = await VideoQuizAttempt.find({ videoId });
    const avgScore = Math.round(
      allAttempts.reduce((acc, curr) => acc + curr.percentage, 0) / (allAttempts.length || 1)
    );
    await VideoLecture.findByIdAndUpdate(videoId, {
      totalAttempts: allAttempts.length,
      averageScore: avgScore
    });

    res.json({
      success: true,
      message: `Practice Quiz Complete! You scored ${score}/${totalQuestions} (${percentage}%)`,
      attempt
    });
  } catch (error) {
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

// @desc    Get all Live Sessions for a course (Admin)
// @route   GET /api/lms/courses/:courseId/live-sessions
// @access  Private
exports.getLiveSessions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const sessions = await LiveSession.find({ courseId })
      .populate('trainerId', 'name email')
      .populate('targetBatches', 'name')
      .populate('targetStudents', 'fullName enrollmentNo')
      .sort({ scheduledDate: -1, startTime: -1 });

    res.json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get my live sessions (Student — targeted)
// @route   GET /api/lms/live/my
// @access  Private (Student)
exports.getMyLiveSessions = async (req, res) => {
  try {
    const studentId = req.user.studentId || req.user._id;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Find student's enrolled courses via Admission
    const admissions = await Admission.find({ studentId, status: { $ne: 'cancelled' } }).select('courseId batchId');
    const enrolledCourseIds = admissions.map(a => a.courseId.toString());
    const enrolledBatchIds = admissions.map(a => a.batchId).filter(Boolean).map(b => b.toString());

    const sessions = await LiveSession.find({
      courseId: { $in: enrolledCourseIds },
      status: { $in: ['Scheduled', 'Live'] },
      $or: [
        { targetType: 'all' },
        { targetType: 'batch', targetBatches: { $in: enrolledBatchIds } },
        { targetType: 'individual', targetStudents: studentId }
      ]
    })
      .populate('courseId', 'name')
      .populate('trainerId', 'name')
      .sort({ scheduledDate: 1, startTime: 1 });

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
      courseId, title, agenda, meetLink,
      scheduledDate, startTime, endTime, batchTiming,
      targetType, targetBatches, targetStudents, autoGenerateLink
    } = req.body;

    if (!courseId || !title || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Course, title, date, start time, and end time are required'
      });
    }

    let finalMeetLink = meetLink ? meetLink.trim() : '';

    // Auto-generate link if requested and Google is authorized
    if (autoGenerateLink === 'true' && !finalMeetLink && googleMeetHelper.isAuthorized()) {
      try {
        finalMeetLink = await googleMeetHelper.createMeetLink({
          title: title.trim(),
          agenda: agenda || '',
          date: scheduledDate,
          startTime,
          endTime
        });
      } catch (e) {
        console.error('Auto generate meet link failed:', e.message);
      }
    }

    if (!finalMeetLink) {
      return res.status(400).json({
        success: false,
        message: 'Google Meet link is required (paste manually or link Google account for auto-generation)'
      });
    }

    const session = await LiveSession.create({
      courseId,
      title: title.trim(),
      agenda: agenda || '',
      trainerId: req.user._id,
      meetLink: finalMeetLink,
      scheduledDate: new Date(scheduledDate),
      startTime,
      endTime,
      batchTiming: batchTiming || 'All Batches',
      targetType: targetType || 'all',
      targetBatches: targetBatches || [],
      targetStudents: targetStudents || [],
      status: 'Scheduled'
    });

    // Send notifications to targeted students
    try {
      const course = await Course.findById(courseId).select('name');
      const courseName = course ? course.name : 'your course';
      let targetStudentIds = [];

      if (targetType === 'individual' && targetStudents && targetStudents.length > 0) {
        targetStudentIds = targetStudents;
      } else {
        const filter = { courseId };
        if (targetType === 'batch' && targetBatches && targetBatches.length > 0) {
          filter.batchId = { $in: targetBatches };
        }
        const admissions = await Admission.find(filter).select('studentId');
        targetStudentIds = [...new Set(admissions.map(a => a.studentId.toString()))];
      }

      for (const sid of targetStudentIds) {
        await createNotification({
          recipientId: sid,
          studentId: sid,
          role: 'student',
          title: 'New Live Session Scheduled',
          message: 'A live session "' + title.trim() + '" for "' + courseName + '" is scheduled on ' + new Date(scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' at ' + startTime + '.',
          type: 'live_class',
          category: 'academic',
          priority: 'high',
          link: '/student/live-classes',
          meta: { liveSessionId: session._id, courseId },
          sendPush: true
        });
      }
    } catch (nErr) {
      console.error('Live session notification error:', nErr.message);
    }

    res.status(201).json({ success: true, message: 'Live class scheduled successfully!', session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Live Session (Admin)
// @route   PUT /api/lms/live-sessions/:sessionId
// @access  Private (Admin)
exports.updateLiveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await LiveSession.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const allowed = ['title', 'agenda', 'meetLink', 'scheduledDate', 'startTime', 'endTime', 'batchTiming', 'status', 'targetType', 'targetBatches', 'targetStudents'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (updates.scheduledDate) updates.scheduledDate = new Date(updates.scheduledDate);

    const updated = await LiveSession.findByIdAndUpdate(sessionId, updates, { new: true })
      .populate('courseId', 'name')
      .populate('trainerId', 'name email')
      .populate('targetBatches', 'name')
      .populate('targetStudents', 'fullName enrollmentNo');

    res.json({ success: true, message: 'Session updated!', session: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Live Session (Admin)
// @route   DELETE /api/lms/live-sessions/:sessionId
// @access  Private (Admin)
exports.deleteLiveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await LiveSession.findByIdAndDelete(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, message: 'Session deleted!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check Google Meet auth status (Admin)
// @route   GET /api/lms/google/auth-status
// @access  Private (Admin)
exports.checkGoogleAuth = async (req, res) => {
  try {
    res.json({ isLinked: googleMeetHelper.isAuthorized() });
  } catch (error) {
    res.json({ isLinked: false });
  }
};

// @desc    Get Google OAuth URL (Admin)
// @route   GET /api/lms/google/auth-url
// @access  Private (Admin)
exports.getGoogleAuthUrl = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({ success: false, message: 'Google OAuth not configured on server' });
    }
    const url = googleMeetHelper.getAuthUrl();
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save Google OAuth token (Admin)
// @route   POST /api/lms/google/save-token
// @access  Private (Admin)
exports.saveGoogleToken = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Auth code required' });
    await googleMeetHelper.saveTokens(code);
    res.json({ success: true, message: 'Google account linked successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save token: ' + error.message });
  }
};

// @desc    Unlink Google account (Admin)
// @route   POST /api/lms/google/unlink
// @access  Private (Admin)
exports.unlinkGoogleAuth = async (req, res) => {
  try {
    googleMeetHelper.unlinkAuth();
    res.json({ success: true, message: 'Google account unlinked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Auto-generate Google Meet link (Admin)
// @route   POST /api/lms/google/generate-meet
// @access  Private (Admin)
exports.generateMeetLink = async (req, res) => {
  try {
    if (!googleMeetHelper.isAuthorized()) {
      return res.status(400).json({ success: false, message: 'Google account not linked' });
    }
    const { title, agenda, date, startTime, endTime } = req.body;
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Date, start time, and end time required' });
    }
    const link = await googleMeetHelper.createMeetLink({ title, agenda, date, startTime, endTime });
    res.json({ success: true, link });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate link: ' + error.message });
  }
};
