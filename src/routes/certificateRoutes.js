const express = require('express');
const router = express.Router();
const {
  calculateCertificate,
  generateCertificate,
  publishCertificate,
  updateCertificate,
  deleteCertificate,
  getCertificates,
  getCertificateById,
  verifyCertificate
} = require('../controllers/certificateController');
const { protect, authorize } = require('../middleware/auth');

router.get('/calculate/:studentId/:courseId', protect, authorize('admin'), calculateCertificate);
router.get('/verify/:certNo', verifyCertificate);
router.get('/', protect, getCertificates);
router.get('/:id', protect, getCertificateById);
router.post('/generate', protect, authorize('admin'), generateCertificate);
router.post('/:id/publish', protect, authorize('admin'), publishCertificate);
router.put('/:id', protect, authorize('admin'), updateCertificate);
router.delete('/:id', protect, authorize('admin'), deleteCertificate);

module.exports = router;
