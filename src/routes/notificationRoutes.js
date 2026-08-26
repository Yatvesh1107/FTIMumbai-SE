const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  dismissNotification,
  subscribePush,
  unsubscribePush,
  getAllNotifications,
  broadcastNotification,
  getVapidKey
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

// Push subscription
router.post('/subscribe', protect, subscribePush);
router.post('/unsubscribe', protect, unsubscribePush);
router.get('/vapid-key', protect, getVapidKey);

// My notifications (student or role-based)
router.get('/my', protect, getMyNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/mark-all-read', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);
router.put('/:id/dismiss', protect, dismissNotification);
router.delete('/:id', protect, deleteNotification);

// Admin — all notifications + broadcast
router.get('/', protect, authorize('admin'), getAllNotifications);
router.post('/broadcast', protect, authorize('admin'), broadcastNotification);

module.exports = router;
