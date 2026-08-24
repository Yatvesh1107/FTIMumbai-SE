const Question = require('../models/Question');
const ExamSchedule = require('../models/ExamSchedule');
const ExamResult = require('../models/ExamResult');
const Course = require('../models/Course');

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

// --- EXAM SCHEDULES (MAGMA STYLE) ---

// @desc    Get Exam Schedules for a course
// @route   GET /api/exams/schedules/:courseId
// @access  Private
exports.getExamSchedules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const filter = courseId && courseId !== 'All' ? { courseId } : {};
    const schedules = await ExamSchedule.find(filter)
      .populate('courseId', 'name courseCode')
      .populate('questions')
      .sort({ startDate: -1 });

    // If student, attach their exam result
    let resultsMap = {};
    if (req.user && req.user.studentId) {
      const results = await ExamResult.find({ studentId: req.user.studentId });
      results.forEach(r => {
        resultsMap[r.examScheduleId.toString()] = r;
      });
    }

    const schedulesWithResults = schedules.map(s => ({
      ...s.toObject(),
      result: resultsMap[s._id.toString()] || null
    }));

    res.json({ success: true, count: schedules.length, schedules: schedulesWithResults });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Exam Schedule with Random Question Pool Selection (Admin - Magma Style)
// @route   POST /api/exams/schedules
// @access  Private (Admin)
exports.createExamSchedule = async (req, res) => {
  try {
    const {
      courseId,
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

    // 1. Fetch Question Pool for this course
    const allCourseQuestions = await Question.find({ courseId });

    if (allCourseQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions available in the Question Bank for this course. Please upload or add questions first.'
      });
    }

    // 2. Randomly select questions (up to totalQuestions requested)
    const numToPick = Math.min(Number(totalQuestions), allCourseQuestions.length);
    const shuffled = allCourseQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, numToPick).map(q => q._id);

    const calculatedTotalMarks = selectedQuestions.length * Number(marksPerQuestion);

    const schedule = await ExamSchedule.create({
      courseId,
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

    res.status(201).json({
      success: true,
      message: `Exam scheduled successfully with ${selectedQuestions.length} randomly selected questions!`,
      schedule
    });
  } catch (error) {
    console.error('Create exam schedule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit Exam Assessment (Student)
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

    let correctCount = 0;
    let wrongCount = 0;
    let attemptedCount = 0;

    const answersMap = {};
    if (answers && Array.isArray(answers)) {
      answers.forEach(a => {
        answersMap[a.questionId.toString()] = a.selectedOptionIndex;
      });
    }

    schedule.questions.forEach((q) => {
      const qIdStr = q._id.toString();
      const selectedIdx = answersMap[qIdStr];

      if (selectedIdx !== undefined && selectedIdx !== null && selectedIdx !== '') {
        attemptedCount++;
        const correctOptionIndex = q.options.findIndex(opt => opt.isCorrect);

        if (Number(selectedIdx) === correctOptionIndex) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
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

    const result = await ExamResult.findOneAndUpdate(
      { examScheduleId, studentId: req.user.studentId },
      {
        courseId: schedule.courseId,
        score,
        totalQuestions: schedule.questions.length,
        attemptedQuestions: attemptedCount,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        percentage,
        grade,
        status,
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

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
