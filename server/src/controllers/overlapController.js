const Complaint = require('../models/Complaint');
const asyncHandler = require('../utils/asyncHandler');
const { getPairwiseReport, rescanComplaint } = require('../utils/overlapDetection');
const Notification = require('../models/Notification');

// @desc    Get all unreviewed overlap alerts (enhanced with relationship types)
// @route   GET /api/overlaps
// @access  Private
const getOverlapAlerts = asyncHandler(async (req, res) => {
  const { type, reviewStatus = 'PENDING' } = req.query;

  const match = {
    isActive: true,
    'overlapRelationships.0': { $exists: true },
  };

  if (reviewStatus !== 'ALL') {
    match['overlapRelationships.reviewStatus'] = reviewStatus;
  }
  if (type) {
    match['overlapRelationships.relationshipType'] = type;
  }

  const complaints = await Complaint.find(match)
    .populate('institution', 'name aicteId region')
    .populate('assignedBureau', 'name code')
    .populate({
      path: 'overlapRelationships.relatedComplaint',
      select: 'caseId status assignedBureau category',
      populate: { path: 'assignedBureau', select: 'code name' },
    })
    .select('caseId status category receivedDate institution assignedBureau overlapRelationships isOverlapReviewed')
    .sort({ receivedDate: -1 })
    .limit(100);

  // Aggregate stats
  const stats = { DUPLICATE: 0, RELATED: 0, SAME_INST_DIFF_ISSUE: 0, CONFLICTING_ACTION: 0, total: 0 };
  for (const c of complaints) {
    for (const r of (c.overlapRelationships || [])) {
      if (r.reviewStatus === 'PENDING') {
        stats[r.relationshipType] = (stats[r.relationshipType] || 0) + 1;
        stats.total++;
      }
    }
  }

  res.json({ success: true, count: complaints.length, stats, data: complaints });
});

// @desc    Get pairwise NLP evidence report between two complaints
// @route   GET /api/overlaps/pairwise?a=:idA&b=:idB
// @access  Private
const getPairwise = asyncHandler(async (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) {
    return res.status(400).json({ success: false, message: 'Both complaint IDs (a, b) are required' });
  }
  const report = await getPairwiseReport(a, b);
  if (!report) {
    return res.status(404).json({ success: false, message: 'One or both complaints not found' });
  }
  res.json({ success: true, data: report });
});

// @desc    Human review — confirm / reject / defer an overlap relationship
// @route   PUT /api/overlaps/:complaintId/review
// @access  Private
const reviewOverlap = asyncHandler(async (req, res) => {
  const { relatedComplaintId, reviewStatus, reviewNote } = req.body;

  if (!['CONFIRMED', 'REJECTED', 'DEFERRED'].includes(reviewStatus)) {
    return res.status(400).json({ success: false, message: 'reviewStatus must be CONFIRMED, REJECTED or DEFERRED' });
  }

  const complaint = await Complaint.findById(req.params.complaintId);
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  // Update the specific relationship record
  const rel = complaint.overlapRelationships.find(
    (r) => String(r.relatedComplaint) === String(relatedComplaintId)
  );
  if (!rel) {
    return res.status(404).json({ success: false, message: 'Relationship record not found' });
  }

  rel.reviewStatus = reviewStatus;
  rel.reviewedBy   = req.user._id;
  rel.reviewedAt   = new Date();
  rel.reviewNote   = reviewNote || '';

  // If all relationships reviewed, mark complaint as reviewed
  const allReviewed = complaint.overlapRelationships.every(
    (r) => r.reviewStatus !== 'PENDING'
  );
  if (allReviewed) complaint.isOverlapReviewed = true;

  await complaint.save();

  // Add audit action to history
  complaint.actionHistory.push({
    actionBy:   req.user._id,
    bureau:     req.user.bureau,
    actionType: 'Updated',
    remarks:    `Overlap review: ${reviewStatus} — ${reviewNote || ''}`,
  });
  await complaint.save();

  // Mirror: update the related complaint's relationship too
  await Complaint.updateOne(
    { _id: relatedComplaintId, 'overlapRelationships.relatedComplaint': complaint._id },
    {
      $set: {
        'overlapRelationships.$.reviewStatus': reviewStatus,
        'overlapRelationships.$.reviewedBy':   req.user._id,
        'overlapRelationships.$.reviewedAt':   new Date(),
        'overlapRelationships.$.reviewNote':   `Mirrored from ${complaint.caseId}: ${reviewNote || ''}`,
      },
    }
  );

  res.json({ success: true, message: `Overlap marked as ${reviewStatus}`, data: rel });
});

// @desc    Re-scan a complaint for new overlaps (manual trigger)
// @route   POST /api/overlaps/:complaintId/rescan
// @access  Private
const rescan = asyncHandler(async (req, res) => {
  const results = await rescanComplaint(req.params.complaintId);
  res.json({
    success: true,
    message: `Re-scan complete. Found ${results.length} potential overlap(s).`,
    data: results.map((r) => ({
      caseId:           r.complaint.caseId,
      relationshipType: r.relationship.type,
      score:            r.relationship.score,
      evidence:         r.relationship.evidence,
    })),
  });
});

module.exports = { getOverlapAlerts, getPairwise, reviewOverlap, rescan };

