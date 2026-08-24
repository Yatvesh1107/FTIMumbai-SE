const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Course name is required'], 
    unique: true, 
    trim: true 
  },
  courseCode: { 
    type: String, 
    required: [true, 'Course code is required'], 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  category: { 
    type: String, 
    required: true, 
    default: 'General' 
  },
  description: { type: String, trim: true },
  thumbnail: { type: String, default: '' },
  duration: { type: String, default: '3 Months' }, // e.g. "3 Months", "6 Months"
  durationInDays: { type: Number, default: 90 },
  
  // Dynamic Pricing Engine
  standardFee: { 
    type: Number, 
    required: [true, 'Standard MRP Course Fee is required'], 
    min: [0, 'Fee cannot be negative'] 
  },
  minFloorFee: { 
    type: Number, 
    required: [true, 'Minimum Floor Fee (negotiation bottom limit) is required'], 
    min: [0, 'Floor fee cannot be negative'] 
  },
  
  certificateTemplateKey: { type: String, default: 'standard_fti' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  totalStudents: { type: Number, default: 0 }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate Max Allowed Discount dynamically
courseSchema.virtual('maxAllowedDiscount').get(function () {
  return Math.max(0, (this.standardFee || 0) - (this.minFloorFee || 0));
});

module.exports = mongoose.model('Course', courseSchema);
