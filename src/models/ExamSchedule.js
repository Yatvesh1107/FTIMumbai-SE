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
    enum: ['normal_exam', 'final_exam'],
    default: 'final_exam'
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
    default: 'Read all questions carefully. The timer starts automatically once you click Start.'
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
