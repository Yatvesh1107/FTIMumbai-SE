const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true },
  agenda: { type: String, default: '' },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  meetLink: { type: String, required: true, trim: true }, // e.g. "https://meet.google.com/xyz-abcd-efg"
  scheduledDate: { type: Date, required: true },
  startTime: { type: String, required: true }, // e.g. "10:00 AM"
  endTime: { type: String, required: true },   // e.g. "11:30 AM"
  batchTiming: { type: String, default: 'All Batches' },
  status: { 
    type: String, 
    enum: ['Scheduled', 'Live', 'Completed', 'Cancelled'], 
    default: 'Scheduled' 
  }
}, { timestamps: true });

module.exports = mongoose.model('LiveSession', liveSessionSchema);
