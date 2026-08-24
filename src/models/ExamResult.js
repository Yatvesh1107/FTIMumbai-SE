const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  examScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSchedule', required: true },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  wrongAnswers: { type: Number, required: true },
  unattempted: { type: Number, default: 0 },
  score: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String, default: 'Pass' }, // A+, A, B, C, Fail
  status: { type: String, enum: ['Pass', 'Fail'], required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOptionIndex: Number,
    isCorrect: Boolean
  }],
  attemptedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ExamResult', examResultSchema);
