const express = require('express');
const router = express.Router();
const {
  generateCertificate,
  getCertificates,
  verifyCertificate
} = require('../controllers/certificateController');
const { protect, authorize } = require('../middleware/auth');

router.post('/generate', protect, authorize('admin'), generateCertificate);
router.get('/', protect, getCertificates);
router.get('/verify/:certNo', verifyCertificate);

module.exports = router;
