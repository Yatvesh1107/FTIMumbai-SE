const mongoose = require('mongoose');

const videoQuizAttemptSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoLecture',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['Passed', 'Failed'],
    default: 'Passed'
  },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId },
    questionText: String,
    selectedOption: String,
    correctAnswer: String,
    isCorrect: Boolean
  }],
  timeSpentSeconds: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('VideoQuizAttempt', videoQuizAttemptSchema);
