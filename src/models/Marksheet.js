const mongoose = require('mongoose');

const marksheetSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },

  marksheetNo: { type: String, unique: true, sparse: true },
  studentName: { type: String, required: true },
  courseName: { type: String, required: true },
  courseCode: { type: String, default: '' },

  // Academic Period
  sessionFrom: { type: Date },
  sessionTo: { type: Date },

  // Auto-calculated aggregate scores (base values, admin can override)
  sections: [{
    name: { type: String, required: true },       // e.g. "Video Quizzes", "Study Notes", "Final Exam"
    maxMarks: { type: Number, required: true },
    obtainedMarks: { type: Number, required: true },
    weightage: { type: Number, default: 0 },       // percentage weightage
    breakdown: { type: String, default: '' }        // e.g. "5 quizzes attempted"
  }],

  // Final aggregates
  totalMaxMarks: { type: Number, default: 100 },
  totalObtained: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  grade: { type: String, default: 'F' },
  result: { type: String, enum: ['Pass', 'Fail', 'Distinction', 'First Class', 'Second Class'], default: 'Fail' },

  // Status
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
  issuedDate: { type: Date, default: Date.now },
  publishedDate: { type: Date },

  // Generated/Published by
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Verification
  qrVerificationUrl: { type: String, default: '' },

  remarks: { type: String, default: '' }
}, { timestamps: true });

// Grade calculator
marksheetSchema.methods.calculateGrade = function () {
  const pct = this.percentage;
  if (pct >= 90) { this.grade = 'A+'; this.result = 'Distinction'; }
  else if (pct >= 80) { this.grade = 'A'; this.result = 'First Class'; }
  else if (pct >= 70) { this.grade = 'B+'; this.result = 'First Class'; }
  else if (pct >= 60) { this.grade = 'B'; this.result = 'Second Class'; }
  else if (pct >= 50) { this.grade = 'C'; this.result = 'Pass'; }
  else if (pct >= 33) { this.grade = 'D'; this.result = 'Pass'; }
  else { this.grade = 'F'; this.result = 'Fail'; }
};

module.exports = mongoose.model('Marksheet', marksheetSchema);
