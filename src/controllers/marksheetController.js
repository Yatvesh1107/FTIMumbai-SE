const Marksheet = require('../models/Marksheet');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Admission = require('../models/Admission');
const ExamResult = require('../models/ExamResult');

const generateMarksheetNo = async () => {
  const count = await Marksheet.countDocuments();
  const year = new Date().getFullYear();
  return `MS-${year}-${String(count + 1).padStart(4, '0')}`;
};

// @desc    Auto-calculate marksheet data from Final Exams only
// @route   GET /api/marksheets/calculate/:studentId/:courseId
// @access  Private (Admin)
exports.calculateMarksheet = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    const [student, course, admission, examResults] = await Promise.all([
      Student.findById(studentId),
      Course.findById(courseId),
      Admission.findOne({ studentId, courseId }),
      ExamResult.find({ studentId, courseId })
    ]);

    if (!student || !course) {
      return res.status(404).json({ success: false, message: 'Student or Course not found' });
    }

    const sections = [];

    // Find best attempt across all exam results
    const best = examResults.length > 0
      ? examResults.reduce((b, r) => (r.percentage > b.percentage ? r : b), examResults[0])
      : null;

    // Only Final Exams count
    if (best) {
      // Derive actual totalPossibleMarks from score and percentage
      const totalPossibleMarks = best.percentage > 0
        ? Math.round((best.score / best.percentage) * 100)
        : best.totalQuestions;

      sections.push({
        name: 'Final Examination',
        maxMarks: totalPossibleMarks,
        obtainedMarks: best.score,
        weightage: 100,
        breakdown: `Best of ${examResults.length} attempt(s) — ${best.percentage}%`
      });
    }

    if (sections.length === 0) {
      return res.json({
        success: true, student, course, admission,
        sections: [],
        totalMaxMarks: 100, totalObtained: 0,
        percentage: 0, grade: 'F', result: 'Fail'
      });
    }

    // Use exam's own percentage directly (already calculated with proper negative marking)
    const percentage = best.percentage;

    let grade, result;
    if (percentage >= 90) { grade = 'A+'; result = 'Distinction'; }
    else if (percentage >= 80) { grade = 'A'; result = 'First Class'; }
    else if (percentage >= 70) { grade = 'B+'; result = 'First Class'; }
    else if (percentage >= 60) { grade = 'B'; result = 'Second Class'; }
    else if (percentage >= 50) { grade = 'C'; result = 'Pass'; }
    else if (percentage >= 33) { grade = 'D'; result = 'Pass'; }
    else { grade = 'F'; result = 'Fail'; }

    res.json({
      success: true, student, course, admission,
      sections,
      totalMaxMarks: sections[0].maxMarks,
      totalObtained: sections[0].obtainedMarks,
      percentage, grade, result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate / Issue Marksheet (auto-calc or manual override)
// @route   POST /api/marksheets/generate
// @access  Private (Admin)
exports.generateMarksheet = async (req, res) => {
  try {
    const {
      studentId, courseId, admissionId,
      sections, totalMaxMarks, totalObtained, percentage, grade, result,
      sessionFrom, sessionTo, remarks
    } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: 'Student ID and Course ID are required' });
    }

    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId);
    if (!student || !course) {
      return res.status(404).json({ success: false, message: 'Student or Course not found' });
    }

    // Check duplicate
    const existing = await Marksheet.findOne({ studentId, courseId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Marksheet already exists for this student & course. Delete the old one first.' });
    }

    const marksheetNo = await generateMarksheetNo();
    const marksheet = await Marksheet.create({
      studentId, courseId, admissionId,
      marksheetNo,
      studentName: student.fullName,
      courseName: course.name,
      courseCode: course.courseCode,
      sessionFrom: sessionFrom || null,
      sessionTo: sessionTo || null,
      sections: sections || [],
      totalMaxMarks: totalMaxMarks || 100,
      totalObtained: totalObtained || 0,
      percentage: percentage || 0,
      grade: grade || 'F',
      result: result || 'Fail',
      status: 'Draft',
      issuedDate: new Date(),
      generatedBy: req.user ? req.user._id : null,
      qrVerificationUrl: `https://ftimumbai.com/verify/marksheet/${marksheetNo}`
    });

    res.status(201).json({ success: true, message: 'Marksheet generated!', marksheet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Marksheet (admin edit / override)
// @route   PUT /api/marksheets/:id
// @access  Private (Admin)
exports.updateMarksheet = async (req, res) => {
  try {
    const { sections, totalMaxMarks, totalObtained, percentage, grade, result, remarks } = req.body;
    const marksheet = await Marksheet.findById(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ success: false, message: 'Marksheet not found' });
    }

    if (sections !== undefined) marksheet.sections = sections;
    if (totalMaxMarks !== undefined) marksheet.totalMaxMarks = totalMaxMarks;
    if (totalObtained !== undefined) marksheet.totalObtained = totalObtained;
    if (percentage !== undefined) marksheet.percentage = percentage;
    if (grade !== undefined) marksheet.grade = grade;
    if (result !== undefined) marksheet.result = result;
    if (remarks !== undefined) marksheet.remarks = remarks;

    await marksheet.save();
    res.json({ success: true, message: 'Marksheet updated!', marksheet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Publish Marksheet
// @route   POST /api/marksheets/:id/publish
// @access  Private (Admin)
exports.publishMarksheet = async (req, res) => {
  try {
    const marksheet = await Marksheet.findById(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ success: false, message: 'Marksheet not found' });
    }
    marksheet.status = 'Published';
    marksheet.publishedDate = new Date();
    marksheet.publishedBy = req.user ? req.user._id : null;
    await marksheet.save();
    res.json({ success: true, message: 'Marksheet published!', marksheet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Marksheet
// @route   DELETE /api/marksheets/:id
// @access  Private (Admin)
exports.deleteMarksheet = async (req, res) => {
  try {
    const marksheet = await Marksheet.findByIdAndDelete(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ success: false, message: 'Marksheet not found' });
    }
    res.json({ success: true, message: 'Marksheet deleted!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all marksheets (admin sees all, student sees own)
// @route   GET /api/marksheets
// @access  Private
exports.getMarksheets = async (req, res) => {
  try {
    const filter = {};
    if (req.user && req.user.role === 'student' && req.user.studentId) {
      filter.studentId = req.user.studentId;
    }

    const marksheets = await Marksheet.find(filter)
      .populate('studentId', 'fullName enrollmentNo mobile')
      .populate('courseId', 'name courseCode')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: marksheets.length, marksheets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single marksheet by ID
// @route   GET /api/marksheets/:id
// @access  Private
exports.getMarksheetById = async (req, res) => {
  try {
    const marksheet = await Marksheet.findById(req.params.id)
      .populate('studentId')
      .populate('courseId')
      .populate('admissionId');
    if (!marksheet) {
      return res.status(404).json({ success: false, message: 'Marksheet not found' });
    }
    res.json({ success: true, marksheet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Public Marksheet Verification
// @route   GET /api/marksheets/verify/:marksheetNo
// @access  Public
exports.verifyMarksheet = async (req, res) => {
  try {
    const marksheet = await Marksheet.findOne({ marksheetNo: req.params.marksheetNo })
      .populate('studentId', 'fullName enrollmentNo')
      .populate('courseId', 'name courseCode duration');

    if (!marksheet) {
      return res.status(404).json({ success: false, message: 'Invalid marksheet' });
    }
    res.json({ success: true, valid: true, marksheet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
