const cron = require('node-cron');
const FeePayment = require('./models/FeePayment');
const Student = require('./models/Student');
const LiveSession = require('./models/LiveSession');
const Notification = require('./models/Notification');
const { createNotification } = require('./controllers/notificationController');

// Check if notification of this type exists today
async function NotificationExists(studentId, type, now) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const count = await Notification.countDocuments({
    studentId, type, createdAt: { $gte: todayStart }
  });
  return count > 0;
}

// Check if notification of this type exists within last N hours
async function NotificationExistsRecent(studentId, type, hours) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const count = await Notification.countDocuments({
    studentId, type, createdAt: { $gte: since }
  });
  return count > 0;
}

// Schedule: Every day at 9:00 AM IST
const scheduleFeeReminders = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running daily fee reminder check...');
    try {
      const now = new Date();
      const fees = await FeePayment.find({ remainingAmount: { $gt: 0 } }).populate('studentId', 'fullName enrollmentNo mobile');
      let notificationsCreated = 0;

      for (const fee of fees) {
        if (!fee.studentId || !fee.studentId._id) continue;
        const studentId = fee.studentId._id;

        for (const inst of fee.installments) {
          if (inst.status === 'paid') continue;

          const dueDate = new Date(inst.dueDate);
          const diffMs = dueDate - now;
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const balance = (inst.amount || 0) - (inst.paidAmount || 0);
          if (balance <= 0) continue;

          var amountStr = '\u20B9' + balance.toLocaleString('en-IN');

          // 1. Due in 7 days or less (approaching)
          if (diffDays > 0 && diffDays <= 7) {
            const alreadyNotified = await NotificationExists(studentId, 'fee_reminder', now);
            if (!alreadyNotified) {
              var dayWord = diffDays > 1 ? 'days' : 'day';
              await createNotification({
                recipientId: fee.userId || studentId,
                studentId: studentId,
                role: 'student',
                title: 'Payment Reminder',
                message: 'Your installment of ' + amountStr + ' is due in ' + diffDays + ' ' + dayWord + '. Please pay on time to avoid late fees.',
                type: 'fee_reminder',
                category: 'payment',
                priority: diffDays <= 3 ? 'high' : 'medium',
                link: '/student/fees',
                meta: { feeId: fee._id, amount: balance, dueDate: inst.dueDate, daysRemaining: diffDays },
                sendPush: true
              });
              notificationsCreated++;
            }
          }

          // 2. Overdue (past due date)
          if (diffDays <= 0) {
            const overdueDays = Math.abs(diffDays);
            const graceEnd = new Date(inst.dueDate);
            graceEnd.setDate(graceEnd.getDate() + (fee.gracePeriodDays || 3));
            const pastGrace = now > graceEnd;

            const notifType = pastGrace ? 'fee_critical' : 'fee_overdue';
            const priority = pastGrace ? 'high' : 'medium';

            const recentlyNotified = await NotificationExistsRecent(studentId, notifType, 24);
            if (!recentlyNotified) {
              var msg = pastGrace
                ? 'URGENT: Your payment of ' + amountStr + ' is overdue by ' + overdueDays + ' days. Your account may be locked soon. Pay immediately!'
                : 'Your payment of ' + amountStr + ' is overdue by ' + overdueDays + ' days. A late fee may apply. Please pay soon.';

              await createNotification({
                recipientId: fee.userId || studentId,
                studentId: studentId,
                role: 'student',
                title: pastGrace ? 'Payment Overdue - Action Required' : 'Payment Overdue',
                message: msg,
                type: notifType,
                category: 'payment',
                priority: priority,
                link: '/student/fees',
                meta: { feeId: fee._id, amount: balance, dueDate: inst.dueDate, overdueDays: overdueDays, pastGrace: pastGrace },
                sendPush: true
              });
              notificationsCreated++;
            }
          }
        }

        // 3. Account locked notification
        if (fee.isAppLocked) {
          const recentlyLocked = await NotificationExistsRecent(studentId, 'app_lock', 48);
          if (!recentlyLocked) {
            await createNotification({
              recipientId: fee.userId || studentId,
              studentId: studentId,
              role: 'student',
              title: 'Account Locked',
              message: 'Your account has been locked due to overdue payment. Please clear your dues to restore access.',
              type: 'app_lock',
              category: 'payment',
              priority: 'high',
              link: '/student/fees',
              meta: { feeId: fee._id },
              sendPush: true
            });
            notificationsCreated++;
          }
        }
      }

      console.log('[CRON] Fee reminder check complete. ' + notificationsCreated + ' notifications created.');
    } catch (err) {
      console.error('[CRON] Fee reminder error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[CRON] Fee reminder scheduler registered (daily 9:00 AM IST)');
};

// Live Session status auto-transition: Scheduled -> Live -> Completed
const scheduleLiveSessionStatus = () => {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      let updated = 0;

      // Scheduled -> Live: if current time >= startTime on scheduledDate
      const scheduledSessions = await LiveSession.find({ status: 'Scheduled' });
      for (const session of scheduledSessions) {
        const sessionStart = parseSessionDateTime(session.scheduledDate, session.startTime);
        if (now >= sessionStart) {
          session.status = 'Live';
          await session.save();
          updated++;
        }
      }

      // Live -> Completed: if current time >= endTime on scheduledDate
      const liveSessions = await LiveSession.find({ status: 'Live' });
      for (const session of liveSessions) {
        const sessionEnd = parseSessionDateTime(session.scheduledDate, session.endTime);
        if (now >= sessionEnd) {
          session.status = 'Completed';
          await session.save();
          updated++;
        }
      }

      if (updated > 0) {
        console.log('[CRON] Live session status updated: ' + updated + ' sessions');
      }
    } catch (err) {
      console.error('[CRON] Live session status error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[CRON] Live session status scheduler registered (every minute)');
};

function parseSessionDateTime(dateStr, timeStr) {
  const d = new Date(dateStr);
  const clean = (timeStr || '').trim().toUpperCase();

  let hours = 0;
  let minutes = 0;

  if (clean.includes('AM') || clean.includes('PM')) {
    const parts = clean.replace(/AM|PM/g, '').trim().split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    if (clean.includes('PM') && hours < 12) hours += 12;
    if (clean.includes('AM') && hours === 12) hours = 0;
  } else {
    const parts = clean.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  }

  d.setHours(hours, minutes, 0, 0);
  return d;
}

module.exports = { scheduleFeeReminders, scheduleLiveSessionStatus };
