const Question = require('../models/Question');
const Course = require('../models/Course');
const XLSX = require('xlsx');
const fs = require('fs');

// @desc    Upload Question Bank from Excel/CSV
// @route   POST /api/exams/questions/upload-excel
// @access  Private (Admin)
exports.uploadQuestionBankExcel = async (req, res) => {
  try {
    const { courseId, topic: defaultTopic } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel (.xlsx/.xls) or CSV file is required' });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath, { cellDates: true, cellNF: true, cellText: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawData || rawData.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: 'Uploaded spreadsheet is empty.' });
    }

    const parsedQuestions = [];
    const errors = [];

    rawData.forEach((row, index) => {
      // Find question text
      const qText = row['Question'] || row['question'] || row['Question Text'] || row['questionText'] || row['QuestionDescription'];
      if (!qText || !qText.toString().trim()) {
        return; // skip blank row
      }

      // Find options
      const optA = (row['Option A'] || row['OptionA'] || row['Option 1'] || row['A'] || '').toString().trim();
      const optB = (row['Option B'] || row['OptionB'] || row['Option 2'] || row['B'] || '').toString().trim();
      const optC = (row['Option C'] || row['OptionC'] || row['Option 3'] || row['C'] || '').toString().trim();
      const optD = (row['Option D'] || row['OptionD'] || row['Option 4'] || row['D'] || '').toString().trim();

      if (!optA || !optB) {
        errors.push(`Row ${index + 2}: Missing Option A or Option B.`);
        return;
      }

      // Find correct answer
      const rawAns = (row['Correct Answer'] || row['Answer'] || row['Correct'] || row['correctAnswer'] || row['Ans'] || 'A').toString().trim().toUpperCase();

      const options = [
        { optionText: optA, isCorrect: rawAns === 'A' || rawAns === '1' || rawAns === optA.toUpperCase() },
        { optionText: optB, isCorrect: rawAns === 'B' || rawAns === '2' || rawAns === optB.toUpperCase() }
      ];

      if (optC) {
        options.push({ optionText: optC, isCorrect: rawAns === 'C' || rawAns === '3' || rawAns === optC.toUpperCase() });
      }
      if (optD) {
        options.push({ optionText: optD, isCorrect: rawAns === 'D' || rawAns === '4' || rawAns === optD.toUpperCase() });
      }

      // Ensure at least one option marked correct (default to first option if none matched)
      if (!options.some(o => o.isCorrect)) {
        options[0].isCorrect = true;
      }

      const topic = row['Topic'] || row['topic'] || row['Subject'] || defaultTopic || 'General';
      const marks = Number(row['Marks'] || row['marks']) || 1;
      const explanation = (row['Explanation'] || row['explanation'] || row['Remarks'] || '').toString().trim();

      parsedQuestions.push({
        courseId,
        topic: topic.toString().trim(),
        questionText: qText.toString().trim(),
        options,
        marks,
        explanation
      });
    });

    // Cleanup uploaded file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (parsedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions found in file.',
        errors
      });
    }

    // Bulk insert into MongoDB
    const inserted = await Question.insertMany(parsedQuestions);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} questions into ${course.name} Question Bank!`,
      count: inserted.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Question Bank Excel Upload Error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
