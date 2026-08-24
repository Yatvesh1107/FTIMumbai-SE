const mongoose = require('mongoose');

// Embedded Question Schema for Chapter Practice Quiz
const studyNoteQuestionSchema = new mongoose.Schema({
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

// Study Note Schema
const studyNoteSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  chapterTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    maxlength: 1000
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: String,
    default: 'PDF'
  },
  // Attached Chapter Practice MCQs (Parsed from Excel or added manually)
  questions: {
    type: [studyNoteQuestionSchema],
    default: []
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  orderIndex: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['Active', 'Archived'],
    default: 'Active'
  }
}, { timestamps: true });

module.exports = mongoose.model('StudyNote', studyNoteSchema);
