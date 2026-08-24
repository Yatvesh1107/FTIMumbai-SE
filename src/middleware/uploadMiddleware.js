const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const baseUploadDir = path.join(__dirname, '..', '..', 'uploads');
const studyNotesDir = path.join(baseUploadDir, 'study-notes');
const assignmentsDir = path.join(baseUploadDir, 'assignments');
const excelDir = path.join(baseUploadDir, 'excel');

[baseUploadDir, studyNotesDir, assignmentsDir, excelDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const url = req.originalUrl || req.baseUrl || '';
    if (url.includes('study-notes') || url.includes('notes')) {
      cb(null, studyNotesDir);
    } else if (url.includes('assignments')) {
      cb(null, assignmentsDir);
    } else if (url.includes('questions') || url.includes('excel') || url.includes('question-bank')) {
      cb(null, excelDir);
    } else {
      cb(null, baseUploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - PDF, Excel (xlsx, xls), CSV, text
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];
  const allowedExts = ['.pdf', '.xlsx', '.xls', '.csv', '.txt', '.jpg', '.jpeg', '.png', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Excel (xlsx/xls), CSV, and Images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 60 * 1024 * 1024 } // 60MB max
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError
};
