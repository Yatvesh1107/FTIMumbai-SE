const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true },
  agenda: { type: String, default: '' },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  meetLink: { type: String, required: true, trim: true },
  scheduledDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  batchTiming: { type: String, default: 'All Batches' },
  status: {
    type: String,
    enum: ['Scheduled', 'Live', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  targetType: {
    type: String,
    enum: ['all', 'batch', 'individual'],
    default: 'all'
  },
  targetBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  targetStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
}, { timestamps: true });

liveSessionSchema.index({ courseId: 1, scheduledDate: -1 });
liveSessionSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model('LiveSession', liveSessionSchema);
