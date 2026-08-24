const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const Course = require('../models/Course');
const ExamResult = require('../models/ExamResult');

const generateCertificateNo = async () => {
  const count = await Certificate.countDocuments();
  const year = new Date().getFullYear();
  return `FTI/${year}/CERT/${String(count + 1).padStart(4, '0')}`;
};

// @desc    Generate / Issue Certificate
// @route   POST /api/certificates/generate
// @access  Private (Admin)
exports.generateCertificate = async (req, res) => {
  try {
    const { studentId, courseId, grade, percentage } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: 'Student ID and Course ID are required' });
    }

    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId);

    if (!student || !course) {
      return res.status(404).json({ success: false, message: 'Student or Course not found' });
    }

    // Check if certificate already exists
    let certificate = await Certificate.findOne({ studentId, courseId });
    if (certificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already issued for this student & course',
        certificate
      });
    }

    const certificateNo = await generateCertificateNo();
    certificate = await Certificate.create({
      studentId: student._id,
      courseId: course._id,
      certificateNo,
      studentName: student.fullName,
      courseName: course.name,
      issueDate: new Date(),
      grade: grade || 'A',
      percentage: Number(percentage) || 85,
      qrVerificationUrl: `https://ftimumbai.com/verify?cert=${certificateNo}`
    });

    res.status(201).json({
      success: true,
      message: 'Certificate successfully generated & issued!',
      certificate
    });
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
      .populate('studentId')
      .populate('courseId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: certificates.length, certificates });
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
