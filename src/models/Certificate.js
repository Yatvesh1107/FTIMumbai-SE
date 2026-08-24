const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  certificateNo: { type: String, required: true, unique: true }, // e.g. FTI/2026/0452
  studentName: { type: String, required: true },
  courseName: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  grade: { type: String, required: true },
  percentage: { type: Number },
  qrVerificationUrl: { type: String, default: '' },
  pdfUrl: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
