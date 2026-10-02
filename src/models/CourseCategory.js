const mongoose = require('mongoose');

const courseCategorySchema = new mongoose.Schema({
  slug: {
    type: String,
    required: [true, 'Course category slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens']
  },
  name: { type: String, required: [true, 'Course category name is required'], trim: true },
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

// All courses assigned to this category (single source of truth = Course.courseCategoryId)
courseCategorySchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'courseCategoryId'
});

courseCategorySchema.index({ enabled: 1, orderIndex: 1 });

module.exports = mongoose.model('CourseCategory', courseCategorySchema);