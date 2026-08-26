const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  role: { type: String, enum: ['all', 'admin', 'receptionist', 'student'], default: 'student' },

  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'fee_reminder', 'fee_overdue', 'fee_critical', 'payment_success',
      'app_lock', 'live_class', 'exam_scheduled', 'exam_reminder',
      'assignment', 'certificate', 'general',
      'birthday', 'admission_welcome', 'account_status'
    ],
    default: 'general'
  },
  category: { type: String, enum: ['payment', 'academic', 'system', 'social'], default: 'system' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },

  link: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  isRead: { type: Boolean, default: false },
  readAt: { type: Date },

  // Push tracking
  pushSent: { type: Boolean, default: false },
  pushSentAt: { type: Date },

  // For dismissal tracking (remind later)
  dismissed: { type: Boolean, default: false },
  dismissedAt: { type: Date }
}, { timestamps: true });

// Indexes for fast queries
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ studentId: 1, isRead: 1 });
notificationSchema.index({ role: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
