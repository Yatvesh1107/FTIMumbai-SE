const mongoose = require('mongoose');

// Schema for Reading Material PDF attached to Assignment
const assignmentMaterialSchema = new mongoose.Schema({
  title: { type: String, default: 'Assignment Reference Document' },
  pdfUrl: { type: String, required: true }
}, { _id: false });

// Schema for Problem Statements / Questions attached to Assignment
const assignmentQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  correctAnswer: { type: String, default: '', trim: true },
  marks: { type: Number, default: 10 }
}, { _id: true });

// Main Assignment Schema
const assignmentSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  instructions: {
    type: String,
    default: '',
    maxlength: 2000
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 50
  },
  estimatedHours: {
    type: Number,
    default: 2
  },
  material: assignmentMaterialSchema,
  questions: [assignmentQuestionSchema],
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Draft', 'Archived'],
    default: 'Active'
  }
}, { timestamps: true });

// Student Submission & Progress Tracking Schema (Magma style)
const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  submissionUrl: {
    type: String,
    required: true,
    trim: true
  },
  submissionNotes: {
    type: String,
    default: ''
  },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId },
    questionText: String,
    studentAnswer: String
  }],
  obtainedMarks: {
    type: Number,
    default: null
  },
  facultyFeedback: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Submitted', 'Graded', 'Resubmission_Requested'],
    default: 'Submitted'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  gradedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = {
  Assignment: mongoose.model('Assignment', assignmentSchema),
  AssignmentSubmission: mongoose.model('AssignmentSubmission', assignmentSubmissionSchema)
};
