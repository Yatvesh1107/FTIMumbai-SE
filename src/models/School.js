const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: [true, 'School slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens']
  },
  name: { type: String, required: [true, 'School name is required'], trim: true },
  navLabel: { type: String, required: [true, 'Nav label is required'], trim: true },
  enabled: { type: Boolean, default: true },
  poweredBy: { type: String, default: '', trim: true },
  eyebrow: { type: String, default: '', trim: true },
  headline: { type: String, default: '', trim: true },
  description: { type: String, default: '' },
  heroImage: { type: String, default: '' },
  featureIcon: {
    type: String,
    enum: ['Code2', 'Building2', 'Cpu', 'DraftingCompass', 'Truck'],
    default: 'Code2'
  },
  features: {
    type: [{ title: { type: String, trim: true } }],
    default: []
  },
  orderIndex: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// All courses assigned to this school (single source of truth = Course.schoolId)
schoolSchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'schoolId'
});

schoolSchema.index({ enabled: 1, orderIndex: 1 });

module.exports = mongoose.model('School', schoolSchema);