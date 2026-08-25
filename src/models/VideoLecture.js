const mongoose = require('mongoose');

// Embedded MCQ Schema for Video Practice Quiz (same shape as StudyNote questions)
const videoQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  options: [{
    label: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    text: { type: String, required: true, trim: true }
  }],
  correctAnswer: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  },
  explanation: {
    type: String,
    default: ''
  }
}, { _id: true });

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
  // Attached Video Practice MCQs (Excel import or manual builder)
  questions: {
    type: [videoQuestionSchema],
    default: []
  },
  totalQuestions: { type: Number, default: 0 },
  totalAttempts: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('VideoLecture', videoLectureSchema);
