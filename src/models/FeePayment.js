const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema({
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  
  totalFee: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  nextDueDate: { type: Date, default: null },
  
  // Installments Breakdown
  installments: [{
    installmentNo: { type: Number, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidAmount: { type: Number, default: 0 },
    paidDate: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'overdue', 'paid', 'partially_paid'], 
      default: 'pending' 
    },
    fine: { type: Number, default: 0 }
  }],
  
  // Transactions History
  transactions: [{
    receiptNo: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMode: { 
      type: String, 
      enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'], 
      required: true 
    },
    transactionRef: { type: String, default: '' },
    paymentDate: { type: Date, default: Date.now },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String, default: '' }
  }],
  
  // Reminders Log
  remindersSent: [{
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['WhatsApp', 'SMS', 'Email', 'System'], default: 'WhatsApp' },
    message: { type: String },
    status: { type: String, enum: ['Sent', 'Failed'], default: 'Sent' }
  }],
  
  // Overdue Lock Config
  gracePeriodDays: { type: Number, default: 3 },
  isAppLocked: { type: Boolean, default: false },
  lockDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
