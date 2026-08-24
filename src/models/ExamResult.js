const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  examScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSchedule', required: true },
  attemptNumber: { type: Number, default: 1 },
  totalQuestions: { type: Number, required: true },
  attemptedQuestions: { type: Number, default: 0 },
  correctAnswers: { type: Number, required: true },
  wrongAnswers: { type: Number, required: true },
  unattempted: { type: Number, default: 0 },
  score: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String, default: 'Pass' },
  status: { type: String, enum: ['Pass', 'Fail'], required: true },
  
  // Magma Re-Exam Window Fields
  reExamAllowed: { type: Boolean, default: false },
  reExamAttemptNumber: { type: Number, default: 1 },
  reExamStartDate: { type: Date },
  reExamEndDate: { type: Date },
  reExamFee: { type: Number, default: 0 },
  reExamRemarks: { type: String, default: '' },
  
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOptionIndex: Number,
    isCorrect: Boolean
  }],
  submittedAt: { type: Date, default: Date.now },
  attemptedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ExamResult', examResultSchema);
