const express = require('express');
const router = express.Router();
const {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  updateEnquiryStatus,
  addFollowUp,
  convertEnquiry,
  deleteEnquiry
} = require('../controllers/enquiryController');
const { protect, authorize } = require('../middleware/auth');

// Public route (website enquiry form) - also accepts admin-created enquiries
router.post('/', createEnquiry);

// Protected routes (admin/receptionist)
router.get('/', protect, authorize('admin', 'receptionist'), getEnquiries);
router.get('/:id', protect, authorize('admin', 'receptionist'), getEnquiryById);
router.put('/:id', protect, authorize('admin', 'receptionist'), updateEnquiry);
router.put('/:id/status', protect, authorize('admin', 'receptionist'), updateEnquiryStatus);
router.post('/:id/followup', protect, authorize('admin', 'receptionist'), addFollowUp);
router.put('/:id/convert', protect, authorize('admin', 'receptionist'), convertEnquiry);
router.delete('/:id', protect, authorize('admin'), deleteEnquiry);

module.exports = router;
