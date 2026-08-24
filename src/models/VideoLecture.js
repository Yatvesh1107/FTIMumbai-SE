const mongoose = require('mongoose');

const videoLectureSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  moduleTitle: { type: String, required: true, trim: true }, // e.g. "Module 1: Fundamentals"
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  videoUrl: { type: String, required: true },
  thumbnailUrl: { type: String, default: '' },
  durationInSeconds: { type: Number, default: 0 },
  orderIndex: { type: Number, default: 1 },
  resources: [{
    title: { type: String, required: true },
    fileUrl: { type: String, required: true }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('VideoLecture', videoLectureSchema);
