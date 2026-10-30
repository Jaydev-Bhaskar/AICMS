const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['overlap_alert', 'sla_breach', 'pending_reminder', 'escalation', 'assignment', 'system'],
      required: true,
    },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, readAt: { type: Date, default: Date.now } }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

