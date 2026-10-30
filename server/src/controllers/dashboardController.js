const Complaint = require('../models/Complaint');
const Institution = require('../models/Institution');
const Bureau = require('../models/Bureau');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard overview stats
// @route   GET /api/dashboard/overview
// @access  Private
const getOverview = asyncHandler(async (req, res) => {
  const { bureauId } = req.query;
  const filter = { isActive: true };
  if (bureauId) filter.assignedBureau = bureauId;

  const [total, pending, underProcess, disposed, transferred, escalated, slaBreached, overlapCount] =
    await Promise.all([
      Complaint.countDocuments(filter),
      Complaint.countDocuments({ ...filter, status: 'Pending' }),
      Complaint.countDocuments({ ...filter, status: 'Under Process' }),
      Complaint.countDocuments({ ...filter, status: { $in: ['Disposed', 'Closed'] } }),
      Complaint.countDocuments({ ...filter, status: 'Transferred' }),
      Complaint.countDocuments({ ...filter, status: 'Escalated' }),
      Complaint.countDocuments({ ...filter, slaBreached: true, status: { $nin: ['Disposed', 'Closed', 'Rejected'] } }),
      Complaint.countDocuments({
        ...filter,
        $or: [
          { overlapFlags: { $exists: true, $not: { $size: 0 } } },
          { 'overlapRelationships.0': { $exists: true } },
        ],
      }),
    ]);

  // Get trends (last 14 days)
  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const trendData = await Complaint.aggregate([
    { $match: { ...filter, receivedDate: { $gte: twoWeeksAgo } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$receivedDate' } },
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  // Bureau-wise workload
  const bureauWorkload = await Complaint.aggregate([
    { $match: { ...filter, status: { $nin: ['Disposed', 'Closed', 'Rejected'] } } },
    { $group: { _id: '$assignedBureau', count: { $sum: 1 } } },
    { $lookup: { from: 'bureaus', localField: '_id', foreignField: '_id', as: 'bureau' } },
    { $unwind: { path: '$bureau', preserveNullAndEmpty: true } },
    { $project: { bureauName: '$bureau.name', bureauCode: '$bureau.code', count: 1 } },
    { $sort: { count: -1 } },
  ]);

  // Category distribution
  const categoryDistribution = await Complaint.aggregate([
    { $match: filter },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Region-wise
  const regionDistribution = await Complaint.aggregate([
    { $match: filter },
    { $group: { _id: '$region', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Priority breakdown
  const priorityBreakdown = await Complaint.aggregate([
    { $match: filter },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      stats: { total, pending, underProcess, disposed, transferred, escalated, slaBreached, overlapCount },
      trendData,
      bureauWorkload,
      categoryDistribution,
      regionDistribution,
      priorityBreakdown,
    },
  });
});

// @desc    Get recent complaints for dashboard
// @route   GET /api/dashboard/recent-complaints
// @access  Private
const getRecentComplaints = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const complaints = await Complaint.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('institution', 'name aicteId region')
    .populate('assignedBureau', 'name code')
    .populate('assignedOfficer', 'name email')
    .select('caseId status category priority receivedDate complainantName institution assignedBureau slaBreached overlapFlags');

  res.json({ success: true, data: complaints });
});

// @desc    Get overlap alerts summary
// @route   GET /api/dashboard/overlap-alerts
// @access  Private
const getOverlapAlerts = asyncHandler(async (req, res) => {
  const alerts = await Complaint.find({
    isActive: true,
    overlapFlags: { $exists: true, $not: { $size: 0 } },
    isOverlapReviewed: false,
  })
    .populate('institution', 'name aicteId region')
    .populate('assignedBureau', 'name code')
    .populate('overlapFlags', 'caseId status assignedBureau')
    .select('caseId status category institution assignedBureau overlapFlags receivedDate')
    .sort({ receivedDate: -1 })
    .limit(20);

  res.json({ success: true, count: alerts.length, data: alerts });
});

// @desc    Get SLA breach summary
// @route   GET /api/dashboard/sla-alerts
// @access  Private
const getSlaAlerts = asyncHandler(async (req, res) => {
  const now = new Date();
  const soonThreshold = new Date(now);
  soonThreshold.setDate(soonThreshold.getDate() + 3);

  const [breached, dueSoon] = await Promise.all([
    Complaint.find({
      isActive: true,
      slaBreached: true,
      status: { $nin: ['Disposed', 'Closed', 'Rejected'] },
    })
      .populate('institution', 'name aicteId')
      .populate('assignedBureau', 'name code')
      .select('caseId status expectedDisposalDate receivedDate institution assignedBureau')
      .sort({ expectedDisposalDate: 1 })
      .limit(20),
    Complaint.find({
      isActive: true,
      slaBreached: false,
      expectedDisposalDate: { $gte: now, $lte: soonThreshold },
      status: { $nin: ['Disposed', 'Closed', 'Rejected'] },
    })
      .populate('institution', 'name aicteId')
      .populate('assignedBureau', 'name code')
      .select('caseId status expectedDisposalDate institution assignedBureau')
      .sort({ expectedDisposalDate: 1 })
      .limit(10),
  ]);

  res.json({ success: true, data: { breached, dueSoon } });
});

module.exports = { getOverview, getRecentComplaints, getOverlapAlerts, getSlaAlerts };

