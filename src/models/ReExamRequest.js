const mongoose = require('mongoose');

const reExamRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  examScheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamSchedule',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  previousScore: {
    type: Number,
    default: 0
  },
  previousPercentage: {
    type: Number,
    default: 0
  },
  reason: {
    type: String,
    required: [true, 'Please provide a reason for re-exam request'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  actionedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  actionedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('ReExamRequest', reExamRequestSchema);
