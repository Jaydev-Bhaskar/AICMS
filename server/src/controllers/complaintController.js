const Complaint = require('../models/Complaint');
const Institution = require('../models/Institution');
const Bureau = require('../models/Bureau');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { detectOverlaps } = require('../utils/overlapDetection');

// @desc    Get all complaints (with filters/pagination)
// @route   GET /api/complaints
// @access  Private
const getComplaints = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 10, status, category, priority, region,
    bureauId, institutionId, search, dateFrom, dateTo, slaBreached,
    sortBy = 'receivedDate', sortOrder = 'desc',
  } = req.query;

  const filter = { isActive: true };

  if (status) filter.status = { $in: status.split(',') };
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (region) filter.region = region;
  if (bureauId) filter.assignedBureau = bureauId;
  if (institutionId) filter.institution = institutionId;
  if (slaBreached !== undefined) filter.slaBreached = slaBreached === 'true';

  if (dateFrom || dateTo) {
    filter.receivedDate = {};
    if (dateFrom) filter.receivedDate.$gte = new Date(dateFrom);
    if (dateTo) filter.receivedDate.$lte = new Date(dateTo);
  }

  if (search) {
    filter.$or = [
      { caseId: { $regex: search, $options: 'i' } },
      { complainantName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Role-based filtering
  if (req.user.role === 'rb_officer' || req.user.role === 'pgrc_officer' || req.user.role === 'bureau_officer') {
    if (req.user.bureau) filter.assignedBureau = req.user.bureau;
  }

  const total = await Complaint.countDocuments(filter);
  const complaints = await Complaint.find(filter)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .populate('institution', 'name aicteId region')
    .populate('assignedBureau', 'name code')
    .populate('assignedOfficer', 'name email');

  res.json({
    success: true,
    count: complaints.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: complaints,
  });
});

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private
const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('institution', 'name aicteId region address type')
    .populate('assignedBureau', 'name code fullName')
    .populate('assignedOfficer', 'name email designation')
    .populate('overlapFlags', 'caseId status category assignedBureau receivedDate')
    .populate('actionHistory.actionBy', 'name email designation')
    .populate('actionHistory.bureau', 'name code');

  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  res.json({ success: true, data: complaint });
});

// @desc    Create complaint
// @route   POST /api/complaints
// @access  Private
const createComplaint = asyncHandler(async (req, res) => {
  const { institution: institutionId, assignedBureau, slaDays, ...rest } = req.body;

  // Verify institution exists
  const institution = await Institution.findById(institutionId);
  if (!institution) {
    return res.status(404).json({ success: false, message: 'Institution not found' });
  }

  // Set region from institution
  if (!rest.region) rest.region = institution.region;

  // Set SLA from bureau if not specified
  let sla = slaDays;
  if (!sla && assignedBureau) {
    const bureau = await Bureau.findById(assignedBureau);
    if (bureau) sla = bureau.sladays;
  }

  const complaint = await Complaint.create({
    ...rest,
    institution: institutionId,
    assignedBureau,
    slaDays: sla || 30,
    actionHistory: [{
      actionBy: req.user._id,
      bureau: assignedBureau,
      actionType: 'Created',
      remarks: 'Complaint registered in the system',
      toStatus: 'Pending',
    }],
  });

  // Update institution complaint count
  await Institution.findByIdAndUpdate(institutionId, {
    $inc: { totalComplaints: 1, pendingComplaints: 1 },
  });

  // Run CaseLink AI overlap detection
  const overlaps = await detectOverlaps(complaint);
  if (overlaps.length > 0) {
    // Store overlap flags + rich relationship records
    complaint.overlapFlags = overlaps.map((o) => o.complaint._id);

    complaint.overlapRelationships = overlaps.map((o) => ({
      relatedComplaint: o.complaint._id,
      relationshipType: o.relationship.type,
      score:            o.relationship.score,
      evidence:         o.relationship.evidence,
      reviewStatus:     'PENDING',
    }));

    await complaint.save();

    // Notification with relationship types
    const typeSummary = [...new Set(overlaps.map((o) => o.relationship.type))].join(', ');
    await Notification.create({
      title: 'CaseLink AI — Potential Overlapping Cases Detected',
      message: `Case ${complaint.caseId} may overlap with ${overlaps.map((o) => o.complaint.caseId).join(', ')} for institution "${institution.name}". Relationship types: ${typeSummary}.`,
      type: 'overlap_alert',
      severity: overlaps.some((o) => o.relationship.type === 'CONFLICTING_ACTION') ? 'critical' : 'warning',
      complaint: complaint._id,
      institution: institutionId,
    });

    // Real-time Socket.IO push
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('overlap_detected', {
        complaint:       complaint.caseId,
        institution:     institution.name,
        overlappingWith: overlaps.map((o) => ({ caseId: o.complaint.caseId, type: o.relationship.type, score: o.relationship.score })),
      });
    }
  }

  const populated = await Complaint.findById(complaint._id)
    .populate('institution', 'name aicteId')
    .populate('assignedBureau', 'name code');

  res.status(201).json({ success: true, message: 'Complaint created successfully', data: populated });
});

// @desc    Update complaint
// @route   PUT /api/complaints/:id
// @access  Private
const updateComplaint = asyncHandler(async (req, res) => {
  const { status, assignedBureau, assignedOfficer, remarks, nextAction, nextActionDate, priority } = req.body;

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  const oldStatus = complaint.status;
  const oldBureau = complaint.assignedBureau;

  // Build action history entry
  let actionType = 'Updated';
  if (status && status !== oldStatus) {
    actionType = 'Status Changed';
    if (status === 'Transferred') actionType = 'Transferred';
    if (status === 'Escalated') actionType = 'Escalated';
    if (status === 'Disposed' || status === 'Closed') actionType = status === 'Disposed' ? 'Disposed' : 'Closed';
  }

  const historyEntry = {
    actionBy: req.user._id,
    bureau: assignedBureau || complaint.assignedBureau,
    actionType,
    fromStatus: oldStatus,
    toStatus: status || oldStatus,
    remarks,
  };

  // Handle status changes
  if (status) complaint.status = status;
  if (assignedBureau && assignedBureau !== String(oldBureau)) {
    if (oldBureau) complaint.previousBureaus.push(oldBureau);
    complaint.assignedBureau = assignedBureau;
  }
  if (assignedOfficer) complaint.assignedOfficer = assignedOfficer;
  if (remarks) complaint.nextAction = nextAction;
  if (nextActionDate) complaint.nextActionDate = nextActionDate;
  if (priority) complaint.priority = priority;
  if (status === 'Disposed' || status === 'Closed') {
    complaint.disposalDate = new Date();
    // Update institution pending count
    await Institution.findByIdAndUpdate(complaint.institution, {
      $inc: { pendingComplaints: -1 },
    });
  }

  complaint.lastActionDate = new Date();
  complaint.slaBreached = complaint.checkSlaBreach();
  complaint.actionHistory.push(historyEntry);

  await complaint.save();

  // Emit real-time update
  const io = req.app.get('io');
  if (io) io.to('admin_room').emit('complaint_updated', { caseId: complaint.caseId, status: complaint.status });

  const updated = await Complaint.findById(complaint._id)
    .populate('institution', 'name aicteId')
    .populate('assignedBureau', 'name code')
    .populate('assignedOfficer', 'name email');

  res.json({ success: true, message: 'Complaint updated successfully', data: updated });
});

// @desc    Add action/remark to complaint
// @route   POST /api/complaints/:id/actions
// @access  Private
const addAction = asyncHandler(async (req, res) => {
  const { actionType, remarks, documents } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  complaint.actionHistory.push({
    actionBy: req.user._id,
    bureau: req.user.bureau,
    actionType: actionType || 'Remark Added',
    remarks,
    documents,
  });
  complaint.lastActionDate = new Date();
  await complaint.save();

  res.json({ success: true, message: 'Action recorded', data: complaint.actionHistory.slice(-1)[0] });
});

// @desc    Delete/deactivate complaint
// @route   DELETE /api/complaints/:id
// @access  Private/Admin
const deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }
  res.json({ success: true, message: 'Complaint deactivated' });
});

module.exports = { getComplaints, getComplaint, createComplaint, updateComplaint, addAction, deleteComplaint };

