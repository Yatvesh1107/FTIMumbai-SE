const mongoose = require('mongoose');

const examScheduleSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  examTitle: {
    type: String,
    required: true,
    trim: true
  },
  examType: {
    type: String,
    enum: ['weekly', 'trial_mcq', 'final_mcq'],
    default: 'final_mcq'
  },
  totalQuestions: {
    type: Number,
    required: true,
    default: 25
  },
  marksPerQuestion: {
    type: Number,
    default: 1
  },
  negativeMarks: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    default: 25
  },
  durationMinutes: {
    type: Number,
    required: true,
    default: 45
  },
  passingPercentage: {
    type: Number,
    required: true,
    default: 40
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  instructions: {
    type: String,
    default: 'Read all questions carefully. There is a countdown timer for the assessment.'
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  status: {
    type: String,
    enum: ['Active', 'Draft', 'Completed', 'Cancelled'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
