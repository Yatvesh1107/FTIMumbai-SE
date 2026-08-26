const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },

  certificateNo: { type: String, required: true, unique: true, sparse: true },
  studentName: { type: String, required: true },
  enrollmentNo: { type: String, default: '' },
  courseName: { type: String, required: true },
  courseCode: { type: String, default: '' },

  grade: { type: String, required: true },
  percentage: { type: Number, default: 0 },
  result: { type: String, enum: ['Pass', 'Fail', 'Distinction', 'First Class', 'Second Class'], default: 'Pass' },

  status: { type: String, enum: ['Draft', 'Published', 'Revoked'], default: 'Draft' },
  issueDate: { type: Date, default: Date.now },
  publishedDate: { type: Date },

  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  remarks: { type: String, default: '' },
  qrVerificationUrl: { type: String, default: '' },
  pdfUrl: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
