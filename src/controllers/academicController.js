const StudyNote = require('../models/StudyNote');
const StudyNoteAttempt = require('../models/StudyNoteAttempt');
const { Assignment, AssignmentSubmission } = require('../models/Assignment');
const Student = require('../models/Student');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// --- STUDY NOTES ---

// @desc    Get all study notes for a course
// @route   GET /api/academics/courses/:courseId/notes
// @access  Private
exports.getCourseNotes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const notes = await StudyNote.find({ courseId, status: 'Active' }).sort({ orderIndex: 1, createdAt: 1 });

    let attemptsMap = {};
    if (req.user && req.user.studentId) {
      const attempts = await StudyNoteAttempt.find({
        studentId: req.user.studentId,
        courseId
      });
      attempts.forEach(att => {
        attemptsMap[att.studyNoteId.toString()] = {
          score: att.score,
          totalQuestions: att.totalQuestions,
          percentage: att.percentage,
          status: att.status,
          completedAt: att.completedAt
        };
      });
    }

    const notesWithAttempts = notes.map(n => ({
      ...n.toObject(),
      totalQuestions: n.questions ? n.questions.length : 0,
      userAttempt: attemptsMap[n._id.toString()] || null
    }));

    res.json({ success: true, count: notes.length, notes: notesWithAttempts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single study note with attached MCQs
// @route   GET /api/academics/notes/:id
// @access  Private
exports.getStudyNoteById = async (req, res) => {
  try {
    const note = await StudyNote.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Study note not found' });
    }

    let userAttempt = null;
    if (req.user && req.user.studentId) {
      userAttempt = await StudyNoteAttempt.findOne({
        studyNoteId: note._id,
        studentId: req.user.studentId
      });
    }

    res.json({ success: true, note, userAttempt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload Study Note with PDF & Optional Excel MCQs (Admin)
// @route   POST /api/academics/notes
// @access  Private (Admin)
exports.createNote = async (req, res) => {
  try {
    const {
      courseId,
      chapterTitle,
      title,
      description,
      fileUrl,
      orderIndex,
      manualQuestions
    } = req.body;

    if (!courseId || !chapterTitle || !title) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, Chapter Title, and Title are required'
      });
    }

    let finalFileUrl = fileUrl ? fileUrl.trim() : '';
    let finalFileSize = 'PDF';

    if (req.files && req.files['pdfFile'] && req.files['pdfFile'].length > 0) {
      const pdf = req.files['pdfFile'][0];
      finalFileUrl = `/uploads/study-notes/${pdf.filename}`;
      finalFileSize = `${(pdf.size / (1024 * 1024)).toFixed(1)} MB PDF`;
    } else if (req.file) {
      finalFileUrl = `/uploads/study-notes/${req.file.filename}`;
      finalFileSize = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB PDF`;
    }

    if (!finalFileUrl) {
      return res.status(400).json({
        success: false,
        message: 'PDF file upload or URL is required'
      });
    }

    let questions = [];

    if (req.files && req.files['excelFile'] && req.files['excelFile'].length > 0) {
      const excel = req.files['excelFile'][0];
      try {
        const workbook = XLSX.readFile(excel.path, { cellDates: true, cellNF: true, cellText: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        rawData.forEach((row) => {
          const qText = (row['Question'] || row['question'] || row['Question Text'] || '').toString().trim();
          if (!qText) return;

          const optA = (row['Option A'] || row['OptionA'] || row['A'] || '').toString().trim();
          const optB = (row['Option B'] || row['OptionB'] || row['B'] || '').toString().trim();
          const optC = (row['Option C'] || row['OptionC'] || row['C'] || '').toString().trim();
          const optD = (row['Option D'] || row['OptionD'] || row['D'] || '').toString().trim();

          if (!optA || !optB) return;

          const options = [
            { label: 'A', text: optA },
            { label: 'B', text: optB }
          ];
          if (optC) options.push({ label: 'C', text: optC });
          if (optD) options.push({ label: 'D', text: optD });

          const rawAns = (row['Correct Answer'] || row['Answer'] || row['Correct'] || 'A').toString().trim().toUpperCase();
          const validAns = ['A', 'B', 'C', 'D'].includes(rawAns) ? rawAns : 'A';
          const explanation = (row['Explanation'] || row['explanation'] || '').toString().trim();

          questions.push({
            question: qText,
            options,
            correctAnswer: validAns,
            explanation
          });
        });

        if (fs.existsSync(excel.path)) fs.unlinkSync(excel.path);
      } catch (e) {
        console.error('Error parsing MCQs Excel in Study Note:', e);
      }
    } else if (manualQuestions) {
      try {
        const parsed = typeof manualQuestions === 'string' ? JSON.parse(manualQuestions) : manualQuestions;
        if (Array.isArray(parsed)) questions = parsed;
      } catch (e) {
        console.error('Manual questions parse error:', e);
      }
    }

    const note = await StudyNote.create({
      courseId,
      chapterTitle: chapterTitle.trim(),
      title: title.trim(),
      description: description || '',
      fileUrl: finalFileUrl,
      fileSize: finalFileSize,
      questions,
      totalQuestions: questions.length,
      orderIndex: Number(orderIndex) || 1
    });

    res.status(201).json({
      success: true,
      message: `Study note created successfully with ${questions.length} practice MCQs!`,
      note
    });
  } catch (error) {
    console.error('Create study note error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit Student Chapter Practice Quiz Attempt (Student)
// @route   POST /api/academics/notes/:id/quiz-submit
// @access  Private (Student)
exports.submitStudyNoteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, timeSpentSeconds } = req.body;

    if (!req.user || !req.user.studentId) {
      return res.status(400).json({ success: false, message: 'Student authentication required.' });
    }

    const note = await StudyNote.findById(id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Study note not found' });
    }

    const totalQuestions = note.questions.length;
    if (totalQuestions === 0) {
      return res.status(400).json({ success: false, message: 'No questions in this study note.' });
    }

    let score = 0;
    const evaluatedAnswers = [];

    note.questions.forEach((q) => {
      const qIdStr = q._id.toString();
      const submittedOption = answers ? (answers[qIdStr] || '').toUpperCase() : '';
      const isCorrect = submittedOption === q.correctAnswer;

      if (isCorrect) score += 1;

      evaluatedAnswers.push({
        questionId: q._id,
        questionText: q.question,
        selectedOption: submittedOption,
        correctAnswer: q.correctAnswer,
        isCorrect
      });
    });

    const percentage = Math.round((score / totalQuestions) * 100);
    const status = percentage >= 40 ? 'Passed' : 'Failed';

    const attempt = await StudyNoteAttempt.findOneAndUpdate(
      { studyNoteId: id, studentId: req.user.studentId },
      {
        courseId: note.courseId,
        score,
        totalQuestions,
        percentage,
        status,
        answers: evaluatedAnswers,
        timeSpentSeconds: Number(timeSpentSeconds) || 0,
        completedAt: new Date()
      },
      { upsert: true, new: true }
    );

    const allAttempts = await StudyNoteAttempt.find({ studyNoteId: id });
    const avgScore = Math.round(
      allAttempts.reduce((acc, curr) => acc + curr.percentage, 0) / (allAttempts.length || 1)
    );
    await StudyNote.findByIdAndUpdate(id, {
      totalAttempts: allAttempts.length,
      averageScore: avgScore
    });

    res.json({
      success: true,
      message: `Practice Quiz Complete! You scored ${score}/${totalQuestions} (${percentage}%)`,
      attempt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Student Tracking for a Study Note (Admin)
// @route   GET /api/academics/notes/:id/tracking
// @access  Private (Admin)
exports.getStudyNoteTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await StudyNote.findById(id).populate('courseId', 'name courseCode');
    if (!note) {
      return res.status(404).json({ success: false, message: 'Study note not found' });
    }

    const attempts = await StudyNoteAttempt.find({ studyNoteId: id })
      .populate({
        path: 'studentId',
        select: 'enrollmentNo personalDetails.fullName personalDetails.mobile personalDetails.email status'
      })
      .sort({ completedAt: -1 });

    res.json({
      success: true,
      note,
      count: attempts.length,
      attempts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- ASSIGNMENTS (MAGMA STYLE) ---

// @desc    Get assignments for a course
// @route   GET /api/academics/courses/:courseId/assignments
// @access  Private
exports.getCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const assignments = await Assignment.find({ courseId }).sort({ dueDate: 1 });

    let submissionMap = {};
    if (req.user && req.user.studentId) {
      const submissions = await AssignmentSubmission.find({
        studentId: req.user.studentId
      });
      submissions.forEach(s => {
        submissionMap[s.assignmentId.toString()] = s;
      });
    }

    const list = assignments.map(a => ({
      ...a.toObject(),
      submission: submissionMap[a._id.toString()] || null
    }));

    res.json({ success: true, count: list.length, assignments: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Assignment with PDF Material & Questions (Admin - Magma Style)
// @route   POST /api/academics/assignments
// @access  Private (Admin)
exports.createAssignment = async (req, res) => {
  try {
    const {
      courseId,
      title,
      instructions,
      totalMarks,
      estimatedHours,
      dueDate,
      materialTitle,
      materialUrl,
      questions
    } = req.body;

    if (!courseId || !title || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, title, and due date are required'
      });
    }

    let finalMaterialUrl = materialUrl || '';
    if (req.file) {
      finalMaterialUrl = `/uploads/assignments/${req.file.filename}`;
    }

    let parsedQuestions = [];
    if (questions) {
      try {
        parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;
      } catch (e) {
        console.error('Error parsing assignment questions:', e);
      }
    }

    const assignment = await Assignment.create({
      courseId,
      title: title.trim(),
      instructions: instructions ? instructions.trim() : '',
      totalMarks: Number(totalMarks) || 50,
      estimatedHours: Number(estimatedHours) || 2,
      dueDate: new Date(dueDate),
      material: finalMaterialUrl ? { title: materialTitle || 'Task Handout PDF', pdfUrl: finalMaterialUrl } : undefined,
      questions: parsedQuestions
    });

    res.status(201).json({
      success: true,
      message: 'Assignment published successfully!',
      assignment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit Assignment with File / Deliverable Link (Student)
// @route   POST /api/academics/assignments/:id/submit
// @access  Private (Student)
exports.submitAssignment = async (req, res) => {
  try {
    const { submissionFileUrl, submissionNotes, answers } = req.body;

    if (!req.user || !req.user.studentId) {
      return res.status(400).json({ success: false, message: 'Student authorization required' });
    }

    let finalUrl = submissionFileUrl || '';
    if (req.file) {
      finalUrl = `/uploads/assignments/${req.file.filename}`;
    }

    if (!finalUrl) {
      return res.status(400).json({ success: false, message: 'Submission link / file is required' });
    }

    let parsedAnswers = [];
    if (answers) {
      try {
        parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
      } catch (e) {
        console.error('Error parsing answers:', e);
      }
    }

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignmentId: req.params.id, studentId: req.user.studentId },
      {
        submissionFileUrl: finalUrl,
        submissionNotes: submissionNotes || '',
        answers: parsedAnswers,
        submittedAt: new Date(),
        status: 'Submitted'
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Assignment submitted successfully!', submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Submissions for an Assignment (Admin)
// @route   GET /api/academics/assignments/:id/submissions
// @access  Private (Admin)
exports.getAssignmentSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id).populate('courseId', 'name courseCode');
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const submissions = await AssignmentSubmission.find({ assignmentId: id })
      .populate({
        path: 'studentId',
        select: 'enrollmentNo personalDetails.fullName personalDetails.mobile personalDetails.email'
      })
      .sort({ submittedAt: -1 });

    res.json({ success: true, assignment, count: submissions.length, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Grade Assignment Submission (Admin)
// @route   POST /api/academics/assignments/submissions/:submissionId/grade
// @access  Private (Admin)
exports.gradeAssignmentSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { obtainedMarks, facultyFeedback } = req.body;

    const submission = await AssignmentSubmission.findByIdAndUpdate(
      submissionId,
      {
        obtainedMarks: Number(obtainedMarks),
        facultyFeedback: facultyFeedback || '',
        status: 'Graded',
        gradedAt: new Date()
      },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.json({ success: true, message: 'Submission graded successfully!', submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
