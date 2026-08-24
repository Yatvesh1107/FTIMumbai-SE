const mongoose = require('mongoose');

const videoProgressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoLecture', required: true },
  watchedSeconds: { type: Number, default: 0 },
  watchPercentage: { type: Number, default: 0 },
  isWatched: { type: Boolean, default: false }, // true when watched >= 90%
  completedAt: { type: Date }
}, { timestamps: true });

videoProgressSchema.index({ studentId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('VideoProgress', videoProgressSchema);
