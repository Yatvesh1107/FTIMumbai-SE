const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  role: { type: String, enum: ['all', 'admin', 'receptionist', 'student'] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['fee_reminder', 'app_lock', 'live_class', 'exam_scheduled', 'assignment', 'certificate', 'general'],
    default: 'general'
  },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
