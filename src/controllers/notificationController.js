const webPush = require('web-push');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');

// Configure VAPID (set these in .env in production)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:admin@ftimumbai.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// Helper: Send push notification to all user's subscriptions
const sendPushNotification = async (userId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({ userId, active: true });
    if (subscriptions.length === 0) return;

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.message,
      icon: '/FTI-logo.png',
      badge: '/FTI-logo.png',
      data: { link: payload.link || '/student/dashboard', type: payload.type }
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            notificationPayload
          );
        } catch (err) {
          // Subscription expired or invalid — deactivate
          if (err.statusCode === 404 || err.statusCode === 410) {
            await PushSubscription.findByIdAndUpdate(sub._id, { active: false });
          }
        }
      })
    );

    return results;
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
};

// Helper: Create notification + optionally push
exports.createNotification = async ({ recipientId, studentId, role, title, message, type, category, priority, link, meta, sendPush }) => {
  try {
    const notification = await Notification.create({
      recipientId, studentId, role: role || 'student',
      title, message,
      type: type || 'general',
      category: category || 'system',
      priority: priority || 'medium',
      link: link || '',
      meta: meta || {}
    });

    // Send push if enabled and VAPID configured
    if (sendPush && recipientId && VAPID_PUBLIC_KEY) {
      await sendPushNotification(recipientId, { title, message, link, type });
      notification.pushSent = true;
      notification.pushSentAt = new Date();
      await notification.save();
    }

    return notification;
  } catch (err) {
    console.error('Create notification error:', err.message);
    return null;
  }
};

// @desc    Get my notifications (bell dropdown)
// @route   GET /api/notifications/my
// @access  Private
exports.getMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const filter = {};

    if (req.user.role === 'student' && req.user.studentId) {
      filter.studentId = req.user.studentId;
    } else {
      // Admin/receptionist — get their own + role-based
      filter.$or = [
        { recipientId: req.user._id },
        { role: req.user.role },
        { role: 'all' }
      ];
    }

    if (req.query.type) filter.type = req.query.type;
    if (req.query.unread === 'true') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get unread count only
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const filter = { isRead: false };

    if (req.user.role === 'student' && req.user.studentId) {
      filter.studentId = req.user.studentId;
    } else {
      filter.$or = [
        { recipientId: req.user._id },
        { role: req.user.role },
        { role: 'all' }
      ];
    }

    const count = await Notification.countDocuments(filter);
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const filter = { isRead: false };
    if (req.user.role === 'student' && req.user.studentId) {
      filter.studentId = req.user.studentId;
    } else {
      filter.$or = [
        { recipientId: req.user._id },
        { role: req.user.role },
        { role: 'all' }
      ];
    }

    await Notification.updateMany(filter, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Dismiss notification (remind later)
// @route   PUT /api/notifications/:id/dismiss
// @access  Private
exports.dismissNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { dismissed: true, dismissedAt: new Date() },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Subscribe to push notifications
// @route   POST /api/notifications/subscribe
// @access  Private
exports.subscribePush = async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription' });
    }

    await PushSubscription.findOneAndUpdate(
      { userId: req.user._id, endpoint: subscription.endpoint },
      {
        userId: req.user._id,
        studentId: req.user.studentId || null,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: userAgent || '',
        active: true
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Push subscription saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unsubscribe from push
// @route   POST /api/notifications/unsubscribe
// @access  Private
exports.unsubscribePush = async (req, res) => {
  try {
    await PushSubscription.updateMany(
      { userId: req.user._id },
      { active: false }
    );
    res.json({ success: true, message: 'Push unsubscribed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all notifications (admin)
// @route   GET /api/notifications
// @access  Private (Admin)
exports.getAllNotifications = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.role) filter.role = req.query.role;
    if (req.query.unread === 'true') filter.isRead = false;

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter)
    ]);

    res.json({ success: true, notifications, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Broadcast notification (admin to all students/course)
// @route   POST /api/notifications/broadcast
// @access  Private (Admin)
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, type, priority, role } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message required' });
    }

    const notification = await Notification.create({
      title, message,
      type: type || 'general',
      category: 'system',
      priority: priority || 'medium',
      role: role || 'all'
    });

    res.status(201).json({ success: true, message: 'Broadcast sent!', notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    VAPID public key for frontend
// @route   GET /api/notifications/vapid-key
// @access  Private
exports.getVapidKey = async (req, res) => {
  res.json({ success: true, publicKey: VAPID_PUBLIC_KEY });
};
