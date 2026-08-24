const express = require('express');
const router = express.Router();
const {
  collectFee,
  getStudentFees,
  getAllFees,
  checkOverdueAndLock,
  unlockOverride,
  getReceiptByNo
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/auth');

router.post('/collect', protect, authorize('admin', 'receptionist'), collectFee);
router.get('/', protect, authorize('admin', 'receptionist'), getAllFees);
router.get('/student/:studentId', protect, getStudentFees);
router.get('/receipt/:receiptNo', protect, getReceiptByNo);
router.post('/check-overdue-lock', protect, authorize('admin'), checkOverdueAndLock);
router.post('/unlock-override/:studentId', protect, authorize('admin'), unlockOverride);

module.exports = router;
