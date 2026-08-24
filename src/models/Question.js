const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  topic: { type: String, trim: true, default: 'General' },
  questionText: { type: String, required: true, trim: true },
  options: [{
    optionText: { type: String, required: true, trim: true },
    isCorrect: { type: Boolean, required: true, default: false }
  }],
  marks: { type: Number, default: 1 },
  explanation: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
