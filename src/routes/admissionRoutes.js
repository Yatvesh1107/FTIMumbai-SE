const express = require('express');
const router = express.Router();
const {
  createAdmission,
  searchStudentsWithAdmissions,
  getAdmissions,
  getAdmissionById
} = require('../controllers/admissionController');
const { protect, authorize } = require('../middleware/auth');

router.get('/student/search', protect, authorize('admin', 'receptionist'), searchStudentsWithAdmissions);
router.post('/', protect, authorize('admin', 'receptionist'), createAdmission);
router.get('/', protect, authorize('admin', 'receptionist'), getAdmissions);
router.get('/:id', protect, getAdmissionById);

module.exports = router;
