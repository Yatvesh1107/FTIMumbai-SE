const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Admission = require('../models/Admission');

const generateCertificateNo = async () => {
  const count = await Certificate.countDocuments();
  const year = new Date().getFullYear();
  return `FTI/${year}/CERT/${String(count + 1).padStart(4, '0')}`;
};

// @desc    Auto-calculate certificate data from ExamResult
// @route   GET /api/certificates/calculate/:studentId/:courseId
// @access  Private (Admin)
exports.calculateCertificate = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const ExamResult = require('../models/ExamResult');

    const [student, course, examResults] = await Promise.all([
      Student.findById(studentId),
      Course.findById(courseId),
      ExamResult.find({ studentId, courseId })
    ]);

    if (!student || !course) {
      return res.status(404).json({ success: false, message: 'Student or Course not found' });
    }

    if (examResults.length === 0) {
      return res.json({
        success: true, grade: 'F', percentage: 0, result: 'Fail',
        examAttempts: 0, message: 'No exam attempts found'
      });
    }

    const best = examResults.reduce((b, r) => (r.percentage > b.percentage ? r : b), examResults[0]);

    let grade, result;
    if (best.percentage >= 90) { grade = 'A+'; result = 'Distinction'; }
    else if (best.percentage >= 80) { grade = 'A'; result = 'First Class'; }
    else if (best.percentage >= 70) { grade = 'B+'; result = 'First Class'; }
    else if (best.percentage >= 60) { grade = 'B'; result = 'Second Class'; }
    else if (best.percentage >= 50) { grade = 'C'; result = 'Pass'; }
    else if (best.percentage >= 33) { grade = 'D'; result = 'Pass'; }
    else { grade = 'F'; result = 'Fail'; }

    res.json({
      success: true, grade, percentage: best.percentage, result,
      examAttempts: examResults.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate / Issue Certificate
// @route   POST /api/certificates/generate
// @access  Private (Admin)
exports.generateCertificate = async (req, res) => {
  try {
    const { studentId, courseId, admissionId, grade, percentage, remarks } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: 'Student ID and Course ID are required' });
    }

    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId);

    if (!student || !course) {
      return res.status(404).json({ success: false, message: 'Student or Course not found' });
    }

    // Check if certificate already exists
    const existing = await Certificate.findOne({ studentId, courseId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already issued for this student & course',
        certificate: existing
      });
    }

    const certificateNo = await generateCertificateNo();
    const certificate = await Certificate.create({
      studentId: student._id,
      courseId: course._id,
      admissionId: admissionId || undefined,
      certificateNo,
      studentName: student.fullName,
      enrollmentNo: student.enrollmentNo || '',
      courseName: course.name,
      courseCode: course.courseCode || '',
      grade: grade || 'A',
      percentage: Number(percentage) || 0,
      result: grade === 'A+' ? 'Distinction' : grade === 'A' ? 'First Class' : 'Pass',
      status: 'Draft',
      issueDate: new Date(),
      generatedBy: req.user ? req.user._id : null,
      remarks: remarks || '',
      qrVerificationUrl: `https://ftimumbai.com/verify?cert=${certificateNo}`
    });

    res.status(201).json({
      success: true,
      message: 'Certificate successfully generated!',
      certificate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Publish Certificate
// @route   POST /api/certificates/:id/publish
// @access  Private (Admin)
exports.publishCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    certificate.status = 'Published';
    certificate.publishedDate = new Date();
    certificate.publishedBy = req.user ? req.user._id : null;
    await certificate.save();
    res.json({ success: true, message: 'Certificate published!', certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Certificate
// @route   PUT /api/certificates/:id
// @access  Private (Admin)
exports.updateCertificate = async (req, res) => {
  try {
    const { grade, percentage, result, remarks } = req.body;
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    if (grade !== undefined) certificate.grade = grade;
    if (percentage !== undefined) certificate.percentage = percentage;
    if (result !== undefined) certificate.result = result;
    if (remarks !== undefined) certificate.remarks = remarks;

    await certificate.save();
    res.json({ success: true, message: 'Certificate updated!', certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Certificate
// @route   DELETE /api/certificates/:id
// @access  Private (Admin)
exports.deleteCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndDelete(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    res.json({ success: true, message: 'Certificate deleted!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Certificates for Student or Admin
// @route   GET /api/certificates
// @access  Private
exports.getCertificates = async (req, res) => {
  try {
    const filter = {};
    if (req.user && req.user.role === 'student' && req.user.studentId) {
      filter.studentId = req.user.studentId;
    }

    const certificates = await Certificate.find(filter)
      .populate('studentId', 'fullName enrollmentNo mobile')
      .populate('courseId', 'name courseCode')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: certificates.length, certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single certificate by ID
// @route   GET /api/certificates/:id
// @access  Private
exports.getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('studentId')
      .populate('courseId')
      .populate('admissionId');
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    res.json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Public Certificate Verification
// @route   GET /api/certificates/verify/:certNo
// @access  Public
exports.verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateNo: req.params.certNo })
      .populate('studentId', 'fullName enrollmentNo')
      .populate('courseId', 'name courseCode duration');

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Invalid certificate or certificate not found' });
    }

    res.json({ success: true, valid: true, certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
