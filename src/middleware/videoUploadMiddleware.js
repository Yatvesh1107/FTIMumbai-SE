const multer = require('multer');
const path = require('path');
const fs = require('fs');

const baseUploadDir = path.join(__dirname, '..', '..', 'uploads');
const thumbnailDir = path.join(baseUploadDir, 'thumbnails');
const videoDir = path.join(baseUploadDir, 'videos');

[thumbnailDir, videoDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
      cb(null, thumbnailDir);
    } else if (file.fieldname === 'video') {
      cb(null, videoDir);
    } else {
      cb(null, baseUploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const prefix = file.fieldname === 'thumbnail' ? 'thumb-' : 'raw-video-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'thumbnail') {
    const allowedImages = /jpeg|jpg|png|gif|webp/i;
    const isImage = allowedImages.test(path.extname(file.originalname)) || allowedImages.test(file.mimetype);
    if (isImage) cb(null, true);
    else cb(new Error('Only image files (jpg, png, webp) are allowed for thumbnails'), false);
  } else if (file.fieldname === 'video') {
    const allowedVideos = /mp4|mkv|webm|avi|mov|wmv|flv/i;
    const isVideo = allowedVideos.test(path.extname(file.originalname)) || allowedVideos.test(file.mimetype);
    if (isVideo) cb(null, true);
    else cb(new Error('Only video files (mp4, mkv, webm, mov, avi) are allowed'), false);
  } else {
    cb(null, true);
  }
};

const uploadVideoFiles = multer({
  storage,
  limits: { fileSize: 350 * 1024 * 1024 }, // 350MB max upload
  fileFilter
});

const handleVideoUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Video file too large (Max 350MB).' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = {
  uploadVideoFiles,
  handleVideoUploadError
};
