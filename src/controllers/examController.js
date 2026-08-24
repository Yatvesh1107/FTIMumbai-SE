const Question = require('../models/Question');
const ExamSchedule = require('../models/ExamSchedule');
const ExamResult = require('../models/ExamResult');
const Certificate = require('../models/Certificate');

// --- QUESTIONS ---

// @desc    Get Questions for a course
// @route   GET /api/exams/questions/:courseId
// @access  Private
exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ courseId: req.params.courseId });
    res.json({ success: true, count: questions.length, questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Question (Admin/Trainer)
// @route   POST /api/exams/questions
// @access  Private (Admin / Trainer)
exports.createQuestion = async (req, res) => {
  try {
    const { courseId, topic, questionText, options, marks, explanation } = req.body;

    if (!courseId || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Course, questionText, and at least 2 options are required'
      });
    }

    const question = await Question.create({
      courseId,
      topic: topic || 'General',
      questionText: questionText.trim(),
      options,
      marks: Number(marks) || 1,
      explanation: explanation || ''
    });

    res.status(201).json({ success: true, message: 'Question added to bank', question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- EXAM SCHEDULES ---

// @desc    Get Exam Schedules for a course
// @route   GET /api/exams/schedules/:courseId
// @access  Private
exports.getExamSchedules = async (req, res) => {
  try {
    const schedules = await ExamSchedule.find({ courseId: req.params.courseId, isActive: true })
      .populate('questions');

    // If student, check if already attempted
    let attemptsMap = {};
    if (req.user && req.user.studentId) {
      const results = await ExamResult.find({
        studentId: req.user.studentId,
        courseId: req.params.courseId
      });
      results.forEach(r => {
        attemptsMap[r.examScheduleId.toString()] = r;
      });
    }

    const formatted = schedules.map(s => ({
      ...s.toObject(),
      result: attemptsMap[s._id.toString()] || null
    }));

    res.json({ success: true, count: formatted.length, schedules: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Schedule an Exam (Admin/Trainer)
// @route   POST /api/exams/schedules
// @access  Private (Admin / Trainer)
exports.createExamSchedule = async (req, res) => {
  try {
    const {
      courseId,
      examTitle,
      description,
      durationMinutes,
      passingPercentage,
      examDate,
      startTime,
      endTime,
      questions
    } = req.body;

    if (!courseId || !examTitle || !examDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Course, examTitle, date, start time, and end time are required'
      });
    }

    // If questions array not provided, automatically pull questions from question bank
    let questionIds = questions;
    if (!questionIds || questionIds.length === 0) {
      const availableQuestions = await Question.find({ courseId }).limit(30);
      questionIds = availableQuestions.map(q => q._id);
    }

    const schedule = await ExamSchedule.create({
      courseId,
      examTitle: examTitle.trim(),
      description: description || '',
      durationMinutes: Number(durationMinutes) || 45,
      totalQuestions: questionIds.length,
      passingPercentage: Number(passingPercentage) || 40,
      questions: questionIds,
      examDate: new Date(examDate),
      startTime,
      endTime
    });

    res.status(201).json({ success: true, message: 'Exam scheduled successfully!', schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit Exam & Calculate Result Instantly
// @route   POST /api/exams/submit
// @access  Private (Student)
exports.submitExam = async (req, res) => {
  try {
    const { examScheduleId, answers } = req.body; // answers: [{ questionId, selectedOptionIndex }]

    if (!req.user || !req.user.studentId) {
      return res.status(400).json({ success: false, message: 'Student authorization required' });
    }

    const schedule = await ExamSchedule.findById(examScheduleId).populate('questions');
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }

    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    const evaluatedAnswers = [];

    for (let q of schedule.questions) {
      const studentAns = (answers || []).find(a => a.questionId.toString() === q._id.toString());
      if (!studentAns || studentAns.selectedOptionIndex === null || studentAns.selectedOptionIndex === undefined) {
        unattemptedCount++;
        evaluatedAnswers.push({
          questionId: q._id,
          selectedOptionIndex: -1,
          isCorrect: false
        });
      } else {
        const correctIndex = q.options.findIndex(opt => opt.isCorrect === true);
        const isCorrect = studentAns.selectedOptionIndex === correctIndex;
        if (isCorrect) correctCount++;
        else wrongCount++;

        evaluatedAnswers.push({
          questionId: q._id,
          selectedOptionIndex: studentAns.selectedOptionIndex,
          isCorrect
        });
      }
    }

    const total = schedule.questions.length || 1;
    const percentage = Math.round((correctCount / total) * 100);
    const isPass = percentage >= schedule.passingPercentage;
    let grade = 'Fail';
    if (percentage >= 85) grade = 'A+';
    else if (percentage >= 70) grade = 'A';
    else if (percentage >= 55) grade = 'B';
    else if (percentage >= 40) grade = 'C';

    const result = await ExamResult.create({
      studentId: req.user.studentId,
      courseId: schedule.courseId,
      examScheduleId: schedule._id,
      totalQuestions: total,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      unattempted: unattemptedCount,
      score: correctCount,
      percentage,
      grade,
      status: isPass ? 'Pass' : 'Fail',
      answers: evaluatedAnswers
    });

    res.json({
      success: true,
      message: isPass ? 'Congratulations! You passed the exam.' : 'Exam completed.',
      result
    });
  } catch (error) {
    console.error('Exam submit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
