const Complaint = require('../models/Complaint');
const Institution = require('../models/Institution');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Generate reports with various filters
// @route   GET /api/reports
// @access  Private
const getReport = asyncHandler(async (req, res) => {
  const { type, bureauId, region, institutionId, dateFrom, dateTo, period = 'monthly' } = req.query;

  const dateFilter = {};
  if (dateFrom) dateFilter.$gte = new Date(dateFrom);
  if (dateTo) dateFilter.$lte = new Date(dateTo);

  const baseFilter = { isActive: true };
  if (Object.keys(dateFilter).length) baseFilter.receivedDate = dateFilter;
  if (bureauId) baseFilter.assignedBureau = bureauId;
  if (region) baseFilter.region = region;
  if (institutionId) baseFilter.institution = institutionId;

  switch (type) {
    case 'bureau_wise': {
      const data = await Complaint.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: { bureau: '$assignedBureau', status: '$status' },
            count: { $sum: 1 },
          },
        },
        { $lookup: { from: 'bureaus', localField: '_id.bureau', foreignField: '_id', as: 'bureau' } },
        { $unwind: { path: '$bureau', preserveNullAndEmpty: true } },
        {
          $group: {
            _id: { bureauId: '$_id.bureau', bureauName: '$bureau.name', bureauCode: '$bureau.code' },
            statuses: { $push: { status: '$_id.status', count: '$count' } },
            total: { $sum: '$count' },
          },
        },
        { $sort: { total: -1 } },
      ]);
      return res.json({ success: true, type, data });
    }

    case 'region_wise': {
      const data = await Complaint.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: { region: '$region', status: '$status' },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.region',
            statuses: { $push: { status: '$_id.status', count: '$count' } },
            total: { $sum: '$count' },
          },
        },
        { $sort: { total: -1 } },
      ]);
      return res.json({ success: true, type, data });
    }

    case 'institution_wise': {
      const data = await Complaint.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: '$institution',
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            disposed: { $sum: { $cond: [{ $in: ['$status', ['Disposed', 'Closed']] }, 1, 0] } },
            slaBreached: { $sum: { $cond: ['$slaBreached', 1, 0] } },
          },
        },
        { $lookup: { from: 'institutions', localField: '_id', foreignField: '_id', as: 'institution' } },
        { $unwind: '$institution' },
        { $sort: { total: -1 } },
        { $limit: 50 },
      ]);
      return res.json({ success: true, type, data });
    }

    case 'ageing': {
      const now = new Date();
      const data = await Complaint.aggregate([
        { $match: { ...baseFilter, status: { $nin: ['Disposed', 'Closed', 'Rejected'] } } },
        {
          $addFields: {
            ageInDays: { $divide: [{ $subtract: [now, '$receivedDate'] }, 86400000] },
          },
        },
        {
          $bucket: {
            groupBy: '$ageInDays',
            boundaries: [0, 7, 15, 30, 60, 90, 180],
            default: '180+',
            output: { count: { $sum: 1 }, cases: { $push: '$caseId' } },
          },
        },
      ]);
      return res.json({ success: true, type, data });
    }

    case 'disposal_rate': {
      const groupFormat = period === 'monthly' ? '%Y-%m' : period === 'weekly' ? '%G-W%V' : '%Y';
      const data = await Complaint.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: { period: { $dateToString: { format: groupFormat, date: '$receivedDate' } } },
            total: { $sum: 1 },
            disposed: { $sum: { $cond: [{ $in: ['$status', ['Disposed', 'Closed']] }, 1, 0] } },
          },
        },
        {
          $addFields: {
            disposalRate: { $multiply: [{ $divide: ['$disposed', '$total'] }, 100] },
          },
        },
        { $sort: { '_id.period': 1 } },
      ]);
      return res.json({ success: true, type, data });
    }

    case 'overlap': {
      const data = await Complaint.find({
        ...baseFilter,
        overlapFlags: { $exists: true, $not: { $size: 0 } },
      })
        .populate('institution', 'name aicteId')
        .populate('assignedBureau', 'name code')
        .populate('overlapFlags', 'caseId status assignedBureau')
        .select('caseId status category institution assignedBureau overlapFlags receivedDate isOverlapReviewed')
        .sort({ receivedDate: -1 });
      return res.json({ success: true, type, count: data.length, data });
    }

    default:
      return res.status(400).json({ success: false, message: 'Invalid report type' });
  }
});

module.exports = { getReport };

