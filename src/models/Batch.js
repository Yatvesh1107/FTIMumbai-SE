const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required'],
    index: true
  },
  batchName: {
    type: String,
    required: [true, 'Batch Name is required'],
    trim: true
  },
  batchCode: {
    type: String,
    required: [true, 'Batch Code is required'],
    trim: true,
    uppercase: true
  },
  timing: {
    type: String,
    required: [true, 'Batch Timing is required'],
    trim: true // e.g. "09:00 AM - 11:00 AM" or "Morning (10:00 AM - 12:00 PM)"
  },
  days: {
    type: String,
    default: 'Mon - Fri',
    trim: true // e.g. "Mon - Fri" or "Sat - Sun (Weekend)"
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  maxCapacity: {
    type: Number,
    default: 30
  },
  status: {
    type: String,
    enum: ['Active', 'Upcoming', 'Completed', 'Archived'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
