const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  enrollmentNo: { type: String, required: true, unique: true }, // e.g. FTI-2026-001
  
  // Personal Info
  fullName: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
  dob: { type: Date },
  bloodGroup: { type: String, default: '' },
  profilePhoto: { type: String, default: '' },
  
  // Contact Info
  mobile: { type: String, required: true, trim: true },
  whatsappMobile: { type: String, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  currentAddress: { type: String, required: true },
  permanentAddress: { type: String, default: '' },
  
  // Guardian Details
  guardianName: { type: String, default: '' },
  guardianRelation: { type: String, default: 'Parent' },
  guardianMobile: { type: String, default: '' },
  guardianOccupation: { type: String, default: '' },
  
  // Academic Background
  highestQualification: { type: String, default: '12th' },
  schoolOrCollege: { type: String, default: '' },
  passingYear: { type: Number },
  
  // Identity Proof
  idProofType: { type: String, enum: ['Aadhar Card', 'PAN Card', 'Voter ID', 'Passport', 'College ID', 'Other'], default: 'Aadhar Card' },
  idProofNumber: { type: String, default: '' },
  idProofDocumentUrl: { type: String, default: '' },
  
  // System App Lock & Status
  status: { 
    type: String, 
    enum: ['active', 'locked', 'completed', 'dropped'], 
    default: 'active' 
  },
  lockReason: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
