const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['call', 'whatsapp', 'email', 'meeting', 'walk_in', 'other'],
    required: true
  },
  notes: { type: String, required: true },
  conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  nextFollowUpDate: { type: Date },
  date: { type: Date, default: Date.now }
}, { _id: true, timestamps: true });

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  courseInterest: { type: String, required: true, trim: true },

  source: {
    type: String,
    enum: ['website', 'walk_in', 'referral', 'social_media', 'phone', 'other'],
    default: 'website'
  },

  status: {
    type: String,
    enum: ['new', 'contacted', 'follow_up', 'converted', 'lost'],
    default: 'new'
  },

  followUps: [followUpSchema],

  convertedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  convertedAdmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String, default: '' },

  lastFollowUpDate: { type: Date },
  nextFollowUpDate: { type: Date },
  followUpCount: { type: Number, default: 0 }
}, { timestamps: true });

enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ mobile: 1 });
enquirySchema.index({ email: 1 });
enquirySchema.index({ nextFollowUpDate: 1, status: 1 });

module.exports = mongoose.model('Enquiry', enquirySchema);
