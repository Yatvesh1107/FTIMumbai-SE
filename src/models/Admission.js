const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  admissionNo: { type: String, required: true, unique: true },
  
  // Batch & Timing Snapshot
  batchTiming: { 
    type: String, 
    default: 'Morning (10:00 AM - 12:00 PM)'
  },
  admissionDate: { type: Date, default: Date.now },
  joiningDate: { type: Date, required: true, default: Date.now },
  courseEndDate: { type: Date },
  
  // Fee Breakdown & Negotiation Validation
  standardCourseFee: { type: Number, required: true },
  agreedTotalFee: { type: Number, required: true },
  discountGiven: { type: Number, default: 0 },
  downPayment: { type: Number, required: true, default: 0 },
  totalPaid: { type: Number, default: 0 },
  totalBalance: { type: Number, required: true },
  
  // Statuses
  paymentStatus: { 
    type: String, 
    enum: ['paid', 'partial', 'overdue', 'pending'], 
    default: 'pending' 
  },
  academicStatus: {
    type: String,
    enum: ['ongoing', 'completed', 'certified', 'dropout'],
    default: 'ongoing'
  },
  remarks: { type: String, default: '' },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Admission', admissionSchema);
