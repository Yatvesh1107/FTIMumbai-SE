const Question = require('../models/Question');
const ExamSchedule = require('../models/ExamSchedule');
const ExamResult = require('../models/ExamResult');
const ReExamRequest = require('../models/ReExamRequest');
const Admission = require('../models/Admission');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

// --- QUESTIONS ---

// @desc    Get Questions for a course (or all courses)
// @route   GET /api/exams/questions/:courseId
// @access  Private
exports.getQuestions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const filter = courseId && courseId !== 'All' ? { courseId } : {};
    const questions = await Question.find(filter)
      .populate('courseId', 'name courseCode')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: questions.length, questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Single Question (Admin)
// @route   POST /api/exams/questions
// @access  Private (Admin)
exports.createQuestion = async (req, res) => {
  try {
    const { courseId, topic, questionText, options, marks, explanation } = req.body;

    if (!courseId || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, Question Text, and at least 2 Options are required'
      });
    }

    const question = await Question.create({
      courseId,
      topic: topic || 'Core Subject',
      questionText: questionText.trim(),
      options,
      marks: Number(marks) || 1,
      explanation: explanation || '',
      isActive: true
    });

    res.status(201).json({ success: true, message: 'Question added successfully!', question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Students for Exam Targeting (by Course & optional Batch)
// @route   GET /api/exams/target-students
// @access  Private (Admin)
exports.getTargetStudents = async (req, res) => {
  try {
    const { courseId, batchId } = req.query;
    let filter = {};

    if (courseId && courseId !== 'All') {
      filter.courseId = courseId;
    }
    if (batchId && batchId !== 'All') {
      filter.batchId = batchId;
    }

    const admissions = await Admission.find(filter)
      .populate({
        path: 'studentId',
        select: 'fullName enrollmentNo mobile email status'
      })
      .populate('batchId', 'batchName batchCode timing')
      .sort({ createdAt: -1 });

    const students = admissions
      .filter(a => a.studentId)
      .map(a => ({
        studentId: a.studentId._id,
        fullName: a.studentId.fullName,
        enrollmentNo: a.studentId.enrollmentNo,
        mobile: a.studentId.mobile,
        email: a.studentId.email,
        batchName: a.batchId?.batchName || a.batchTiming || 'Unassigned Batch',
        batchCode: a.batchId?.batchCode || 'N/A',
        admissionNo: a.admissionNo
      }));

    res.json({ success: true, count: students.length, students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- EXAM SCHEDULES (MAGMA TIME-WINDOW & RE-EXAM ENGINE) ---

// @desc    Get Exam Schedules (Batch/Individual filtered for Students, All for Admin with Time-Window status)
// @route   GET /api/exams/schedules/:courseId
// @access  Private
exports.getExamSchedules = async (req, res) => {
  try {
    const { courseId } = req.params;
    let filter = {};

    let studentAdmission = null;
    if (req.user && req.user.studentId) {
      studentAdmission = await Admission.findOne({ studentId: req.user.studentId })
        .populate('courseId')
        .populate('batchId')
        .populate('studentId');

      if (studentAdmission) {
        filter.courseId = studentAdmission.courseId._id;

        const orConditions = [{ isAllBatches: true }];

        if (studentAdmission.batchId) {
          orConditions.push({ targetType: 'batch', batchId: studentAdmission.batchId._id });
        }

        orConditions.push({
          targetType: 'individual',
          targetStudentIds: studentAdmission.studentId._id
        });

        filter.$or = orConditions;
      }
    } else {
      if (courseId && courseId !== 'All') {
        filter.courseId = courseId;
      }
    }

    const schedules = await ExamSchedule.find(filter)
      .populate('courseId', 'name courseCode')
      .populate('batchId', 'batchName batchCode timing')
      .populate('targetStudentIds', 'fullName enrollmentNo')
      .populate('questions')
      .sort({ startDate: -1 });

    const now = new Date();

    // Attach student results & dynamic real-time status
    let resultsMap = {};
    let reExamMap = {};
    if (req.user && req.user.studentId) {
      const results = await ExamResult.find({ studentId: req.user.studentId });
      results.forEach(r => {
        resultsMap[r.examScheduleId.toString()] = r;
      });

      const reExams = await ReExamRequest.find({ studentId: req.user.studentId });
      reExams.forEach(re => {
        reExamMap[re.examScheduleId.toString()] = re;
      });
    }

    const schedulesWithResults = schedules.map(s => {
      const schObj = s.toObject();
      const resDoc = resultsMap[s._id.toString()] || null;
      const reReq = reExamMap[s._id.toString()] || null;

      let timeStatus = 'upcoming'; // upcoming | live | expired | completed | live_reexam | upcoming_reexam
      let activeStart = s.startDate;
      let activeEnd = s.endDate;

      if (resDoc && resDoc.reExamAllowed && resDoc.reExamStartDate && resDoc.reExamEndDate) {
        activeStart = resDoc.reExamStartDate;
        activeEnd = resDoc.reExamEndDate;
        if (now < new Date(resDoc.reExamStartDate)) {
          timeStatus = 'upcoming_reexam';
        } else if (now >= new Date(resDoc.reExamStartDate) && now <= new Date(resDoc.reExamEndDate)) {
          timeStatus = 'live_reexam';
        } else {
          timeStatus = 'expired_reexam';
        }
      } else if (resDoc && !resDoc.reExamAllowed) {
        timeStatus = 'completed';
      } else {
        if (now < new Date(s.startDate)) {
          timeStatus = 'upcoming';
        } else if (now >= new Date(s.startDate) && now <= new Date(s.endDate)) {
          timeStatus = 'live';
        } else {
          timeStatus = 'expired';
        }
      }

      return {
        ...schObj,
        result: resDoc,
        reExamRequest: reReq,
        timeStatus,
        effectiveStartDate: activeStart,
        effectiveEndDate: activeEnd
      };
    });

    res.json({
      success: true,
      count: schedules.length,
      studentBatch: studentAdmission?.batchId?.batchName || studentAdmission?.batchTiming || null,
      schedules: schedulesWithResults
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Exam Schedule with Batch / Individual targeting & Random Question Pool (Admin)
// @route   POST /api/exams/schedules
// @access  Private (Admin)
exports.createExamSchedule = async (req, res) => {
  try {
    const {
      courseId,
      batchId,
      targetType = 'batch',
      targetStudentIds = [],
      examTitle,
      examType,
      totalQuestions = 25,
      marksPerQuestion = 1,
      negativeMarks = 0,
      durationMinutes = 45,
      passingPercentage = 40,
      startDate,
      endDate,
      instructions
    } = req.body;

    if (!courseId || !examTitle || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, Exam Title, and End Date are required'
      });
    }

    if (targetType === 'individual' && (!targetStudentIds || targetStudentIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one individual student for this exam schedule.'
      });
    }

    // 1. Fetch Question Pool for this course
    const allCourseQuestions = await Question.find({ courseId });

    if (allCourseQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions available in the Question Bank for this course. Please upload or add questions first.'
      });
    }

    // 2. Resolve Batch details
    let isAllBatches = true;
    let finalBatchId = null;
    let batchNameSnapshot = 'All Batches';

    if (batchId && batchId !== 'All' && batchId !== 'all') {
      const batchDoc = await Batch.findById(batchId);
      if (batchDoc) {
        isAllBatches = false;
        finalBatchId = batchDoc._id;
        batchNameSnapshot = `${batchDoc.batchName} (${batchDoc.timing})`;
      }
    }

    // 3. Randomly select questions
    const numToPick = Math.min(Number(totalQuestions), allCourseQuestions.length);
    const shuffled = allCourseQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, numToPick).map(q => q._id);

    const calculatedTotalMarks = selectedQuestions.length * Number(marksPerQuestion);

    const schedule = await ExamSchedule.create({
      courseId,
      batchId: finalBatchId,
      targetType: targetType || 'batch',
      targetStudentIds: targetType === 'individual' ? targetStudentIds : [],
      isAllBatches: targetType === 'batch' ? isAllBatches : false,
      batchNameSnapshot: targetType === 'individual' ? `Individual (${targetStudentIds.length} Students)` : batchNameSnapshot,
      examTitle: examTitle.trim(),
      examType: examType || 'final_exam',
      totalQuestions: selectedQuestions.length,
      marksPerQuestion: Number(marksPerQuestion),
      negativeMarks: Number(negativeMarks) || 0,
      totalMarks: calculatedTotalMarks,
      durationMinutes: Number(durationMinutes) || 45,
      passingPercentage: Number(passingPercentage) || 40,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      instructions: instructions || 'Read all questions carefully. Assessment timer is running.',
      questions: selectedQuestions,
      createdBy: req.user._id,
      status: 'Active'
    });

    // Notify targeted students
    try {
      const course = await Course.findById(courseId).select('name');
      const courseName = course ? course.name : 'your course';
      let targetStudentIds = [];

      if (targetType === 'individual' && targetStudentIds.length > 0) {
        targetStudentIds = targetStudentIds;
      } else {
        const admFilter = { courseId };
        if (batchId && batchId !== 'All' && batchId !== 'all') {
          admFilter.batchId = finalBatchId;
        }
        const admissions = await Admission.find(admFilter).select('studentId');
        targetStudentIds = [...new Set(admissions.map(a => a.studentId.toString()))];
      }

      for (const sid of targetStudentIds) {
        await Notification.create({
          recipientId: sid,
          studentId: sid,
          role: 'student',
          title: 'New Exam Scheduled',
          message: 'Exam "' + examTitle.trim() + '" for "' + courseName + '" is now available. Duration: ' + (Number(durationMinutes) || 45) + ' mins, Total Marks: ' + calculatedTotalMarks + '.',
          type: 'exam_scheduled',
          category: 'academic',
          priority: 'high',
          link: '/student/exams',
          meta: { examScheduleId: schedule._id, courseId, examTitle: examTitle.trim() }
        });
      }
    } catch (nErr) {
      console.error('Exam schedule notification error:', nErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Exam scheduled successfully for ${schedule.batchNameSnapshot} with ${selectedQuestions.length} randomly selected questions!`,
      schedule
    });
  } catch (error) {
    console.error('Create exam schedule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit Exam Assessment (Student with Time-Window & Attempt Lock)
// @route   POST /api/exams/submit
// @access  Private (Student)
exports.submitExam = async (req, res) => {
  try {
    const { examScheduleId, answers } = req.body;

    if (!req.user || !req.user.studentId) {
      return res.status(400).json({ success: false, message: 'Student authorization required.' });
    }

    const schedule = await ExamSchedule.findById(examScheduleId).populate('questions');
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }

    const existingResult = await ExamResult.findOne({
      examScheduleId,
      studentId: req.user.studentId
    });

    if (existingResult && !existingResult.reExamAllowed) {
      return res.status(400).json({
        success: false,
        message: 'You have already completed this examination. Re-attempt is locked. Please request a Re-Exam from faculty.',
        result: existingResult
      });
    }

    const now = new Date();
    // Validate Time Window
    if (existingResult && existingResult.reExamAllowed && existingResult.reExamStartDate && existingResult.reExamEndDate) {
      if (now < new Date(existingResult.reExamStartDate) || now > new Date(existingResult.reExamEndDate)) {
        return res.status(400).json({
          success: false,
          message: 'Your Re-Exam time window is not active. Exam can only be submitted during the scheduled time window.'
        });
      }
    } else {
      if (now < new Date(schedule.startDate) || now > new Date(schedule.endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Exam schedule is not currently active.'
        });
      }
    }

    let correctCount = 0;
    let wrongCount = 0;
    let attemptedCount = 0;

    const answersMap = {};
    if (answers && Array.isArray(answers)) {
      answers.forEach(a => {
        answersMap[a.questionId.toString()] = a.selectedOptionIndex;
      });
    }

    const detailedAnswers = [];

    schedule.questions.forEach((q) => {
      const qIdStr = q._id.toString();
      const selectedIdx = answersMap[qIdStr];
      const correctOptionIndex = q.options.findIndex(opt => opt.isCorrect);

      let isCorrect = false;

      if (selectedIdx !== undefined && selectedIdx !== null && selectedIdx !== '') {
        attemptedCount++;
        if (Number(selectedIdx) === correctOptionIndex) {
          correctCount++;
          isCorrect = true;
        } else {
          wrongCount++;
        }
      }

      detailedAnswers.push({
        questionId: q._id,
        selectedOptionIndex: selectedIdx !== undefined && selectedIdx !== null ? Number(selectedIdx) : null,
        isCorrect
      });
    });

    const marksPerQ = schedule.marksPerQuestion || 1;
    const negMarks = schedule.negativeMarks || 0;

    const rawScore = (correctCount * marksPerQ) - (wrongCount * negMarks);
    const score = Math.max(0, rawScore);
    const totalPossibleMarks = schedule.totalMarks || (schedule.questions.length * marksPerQ);
    const percentage = Math.round((score / (totalPossibleMarks || 1)) * 100);

    const isPassed = percentage >= schedule.passingPercentage;
    const status = isPassed ? 'Pass' : 'Fail';

    let grade = 'F';
    if (percentage >= 85) grade = 'A+';
    else if (percentage >= 70) grade = 'A';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    const currentAttemptNumber = existingResult ? (existingResult.attemptNumber || 1) + 1 : 1;

    const result = await ExamResult.create({
      examScheduleId,
      studentId: req.user.studentId,
      courseId: schedule.courseId,
      score,
      totalQuestions: schedule.questions.length,
      attemptedQuestions: attemptedCount,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      unattempted: schedule.questions.length - attemptedCount,
      percentage,
      grade,
      status,
      attemptNumber: currentAttemptNumber,
      reExamAllowed: false,
      answers: detailedAnswers,
      submittedAt: new Date()
    });

    res.json({
      success: true,
      message: `Exam finished! You scored ${percentage}% (${status}) with Grade ${grade}`,
      result
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- MAGMA RE-EXAM ENGINE ---

// @desc    Admin Schedules a Re-Exam for a student (Exact Magma Flow)
// @route   POST /api/exams/re-exam/schedule
// @access  Private (Admin)
exports.scheduleStudentReExam = async (req, res) => {
  try {
    const {
      examScheduleId,
      studentId,
      reExamStartDate,
      reExamEndDate,
      reExamFee = 0,
      reExamRemarks
    } = req.body;

    if (!examScheduleId || !studentId || !reExamStartDate || !reExamEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Exam Schedule ID, Student ID, Start Date, and End Date are mandatory'
      });
    }

    const startDate = new Date(reExamStartDate);
    const endDate = new Date(reExamEndDate);

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Re-Exam End Date & Time must be after Start Date & Time'
      });
    }

    const existingResult = await ExamResult.findOne({ examScheduleId, studentId });
    const currentAttempt = existingResult ? (existingResult.attemptNumber || 1) + 1 : 2;

    const updatedResult = await ExamResult.findOneAndUpdate(
      { examScheduleId, studentId },
      {
        reExamAllowed: true,
        reExamAttemptNumber: currentAttempt,
        reExamStartDate: startDate,
        reExamEndDate: endDate,
        reExamFee: Number(reExamFee) || 0,
        reExamRemarks: reExamRemarks || `Re-Exam (Attempt #${currentAttempt}) scheduled by Faculty`
      },
      { upsert: true, new: true }
    );

    // Update any pending request to Approved
    await ReExamRequest.updateMany(
      { examScheduleId, studentId, status: 'Pending' },
      {
        status: 'Approved',
        adminRemarks: `Re-Exam scheduled for ${startDate.toLocaleString('en-IN')}`,
        actionedBy: req.user._id,
        actionedAt: new Date()
      }
    );

    // Notify student
    try {
      const scheduleDoc = await ExamSchedule.findById(examScheduleId).select('examTitle courseId');
      const courseDoc = scheduleDoc ? await Course.findById(scheduleDoc.courseId).select('name') : null;
      const courseName = courseDoc ? courseDoc.name : 'your course';
      const examName = scheduleDoc ? scheduleDoc.examTitle : 'your exam';

      await Notification.create({
        recipientId: studentId,
        studentId: studentId,
        role: 'student',
        title: 'Re-Exam Scheduled',
        message: 'Your re-exam "' + examName + '" for "' + courseName + '" (Attempt #' + currentAttempt + ') is scheduled from ' + startDate.toLocaleString('en-IN') + ' to ' + endDate.toLocaleString('en-IN') + '.',
        type: 'exam_scheduled',
        category: 'academic',
        priority: 'high',
        link: '/student/exams',
        meta: { examScheduleId, studentId, attemptNumber: currentAttempt }
      });
    } catch (nErr) {
      console.error('Re-exam notification error:', nErr.message);
    }

    res.json({
      success: true,
      message: `Re-Exam (Attempt #${currentAttempt}) scheduled successfully for the student from ${startDate.toLocaleString('en-IN')} to ${endDate.toLocaleString('en-IN')}!`,
      result: updatedResult
    });
  } catch (error) {
    console.error('Schedule student re-exam error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request a Re-Exam (Student)
// @route   POST /api/exams/re-exam/request
// @access  Private (Student)
exports.requestReExam = async (req, res) => {
  try {
    const { examScheduleId, reason } = req.body;

    if (!req.user || !req.user.studentId) {
      return res.status(400).json({ success: false, message: 'Student authorization required' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for re-exam request' });
    }

    const schedule = await ExamSchedule.findById(examScheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }

    const prevResult = await ExamResult.findOne({ examScheduleId, studentId: req.user.studentId });

    const existingReq = await ReExamRequest.findOne({
      examScheduleId,
      studentId: req.user.studentId,
      status: 'Pending'
    });

    if (existingReq) {
      return res.status(400).json({ success: false, message: 'Your re-exam request is already under review by faculty.' });
    }

    const reExamReq = await ReExamRequest.create({
      studentId: req.user.studentId,
      examScheduleId,
      courseId: schedule.courseId,
      previousScore: prevResult ? prevResult.score : 0,
      previousPercentage: prevResult ? prevResult.percentage : 0,
      reason: reason.trim(),
      status: 'Pending'
    });

    // Notify admin
    try {
      const studentDoc = await Student.findById(req.user.studentId).select('fullName enrollmentNo');
      const courseDoc = await Course.findById(schedule.courseId).select('name');
      const studentName = studentDoc ? studentDoc.fullName : 'A student';
      const courseName = courseDoc ? courseDoc.name : 'a course';

      await Notification.create({
        recipientId: null,
        studentId: req.user.studentId,
        role: 'admin',
        title: 'New Re-Exam Request',
        message: studentName + ' (' + (studentDoc?.enrollmentNo || 'N/A') + ') has requested a re-exam for "' + courseName + '". Reason: ' + reason.trim().substring(0, 100),
        type: 'exam_reminder',
        category: 'academic',
        priority: 'medium',
        link: '/admin/exams',
        meta: { reExamRequestId: reExamReq._id, studentId: req.user.studentId, examScheduleId }
      });
    } catch (nErr) {
      console.error('Re-exam request admin notification error:', nErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Re-Exam request submitted successfully! Awaiting faculty approval and scheduling.',
      reExamRequest: reExamReq
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Re-Exam Requests & Exam Submissions (Admin)
// @route   GET /api/exams/re-exam/requests
// @access  Private (Admin)
exports.getReExamRequests = async (req, res) => {
  try {
    const requests = await ReExamRequest.find()
      .populate('studentId', 'fullName enrollmentNo mobile email')
      .populate('examScheduleId', 'examTitle examType totalMarks durationMinutes startDate endDate')
      .populate('courseId', 'name courseCode')
      .populate('actionedBy', 'name email')
      .sort({ createdAt: -1 });

    const allResults = await ExamResult.find()
      .populate('studentId', 'fullName enrollmentNo mobile email')
      .populate('examScheduleId', 'examTitle examType totalMarks durationMinutes')
      .populate('courseId', 'name courseCode')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      requests,
      results: allResults
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
