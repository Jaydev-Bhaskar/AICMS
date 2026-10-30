/**
 * Scheduled jobs for AICMS
 * - Every hour: Check and mark SLA-breached complaints
 * - Every day at 8am: Send pending case reminder notifications
 */
const cron = require('node-cron');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const logger = require('./logger');

const startCronJobs = (io) => {
  // ── Every hour: update SLA breach flags ──────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const result = await Complaint.updateMany(
        {
          isActive: true,
          slaBreached: false,
          status: { $nin: ['Disposed', 'Closed', 'Rejected'] },
          expectedDisposalDate: { $lt: now },
        },
        { $set: { slaBreached: true } }
      );

      if (result.modifiedCount > 0) {
        logger.info(`SLA breach check: marked ${result.modifiedCount} cases as breached`);

        // Create a notification
        await Notification.create({
          title: 'SLA Breach Alert',
          message: `${result.modifiedCount} complaint(s) have exceeded their prescribed disposal timelines.`,
          type: 'sla_breach',
          severity: 'critical',
        });

        // Emit to admin room
        if (io) {
          io.to('admin_room').emit('sla_breach', { count: result.modifiedCount });
        }
      }
    } catch (err) {
      logger.error(`SLA cron error: ${err.message}`);
    }
  });

  // ── Every day at 08:00: pending case reminder ─────────────────────────────
  cron.schedule('0 8 * * *', async () => {
    try {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const count = await Complaint.countDocuments({
        isActive: true,
        status: 'Pending',
        receivedDate: { $lte: fifteenDaysAgo },
      });

      if (count > 0) {
        await Notification.create({
          title: 'Pending Case Reminder',
          message: `${count} case(s) have been in 'Pending' status for more than 15 days. Please review and take action.`,
          type: 'pending_reminder',
          severity: 'warning',
        });

        if (io) {
          io.to('admin_room').emit('pending_reminder', { count });
        }

        logger.info(`Daily reminder: ${count} pending cases over 15 days`);
      }
    } catch (err) {
      logger.error(`Pending reminder cron error: ${err.message}`);
    }
  });

  logger.info('Cron jobs started: SLA checker (hourly), Pending reminder (daily 08:00)');
};

module.exports = { startCronJobs };

