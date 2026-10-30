const Institution = require('../models/Institution');
const Complaint = require('../models/Complaint');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all institutions
// @route   GET /api/institutions
// @access  Private
const getInstitutions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, region, type, approvalStatus, sortBy = 'name', sortOrder = 'asc' } = req.query;

  const filter = { isActive: true };
  if (region) filter.region = region;
  if (type) filter.type = type;
  if (approvalStatus) filter.approvalStatus = approvalStatus;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { aicteId: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } },
      { 'address.state': { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Institution.countDocuments(filter);
  const institutions = await Institution.find(filter)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.json({
    success: true,
    count: institutions.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: institutions,
  });
});

// @desc    Get single institution with complaint history
// @route   GET /api/institutions/:id
// @access  Private
const getInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id);
  if (!institution) {
    return res.status(404).json({ success: false, message: 'Institution not found' });
  }

  // Get complaint stats for this institution
  const [complaintStats, recentComplaints] = await Promise.all([
    Complaint.aggregate([
      { $match: { institution: institution._id, isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.find({ institution: institution._id, isActive: true })
      .sort({ receivedDate: -1 })
      .limit(10)
      .populate('assignedBureau', 'name code')
      .populate('assignedOfficer', 'name email')
      .select('caseId status category priority receivedDate assignedBureau slaBreached overlapFlags'),
  ]);

  res.json({ success: true, data: { institution, complaintStats, recentComplaints } });
});

// @desc    Create institution
// @route   POST /api/institutions
// @access  Private/Admin
const createInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.create(req.body);
  res.status(201).json({ success: true, message: 'Institution created successfully', data: institution });
});

// @desc    Update institution
// @route   PUT /api/institutions/:id
// @access  Private/Admin
const updateInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!institution) {
    return res.status(404).json({ success: false, message: 'Institution not found' });
  }
  res.json({ success: true, data: institution });
});

// @desc    Delete institution
// @route   DELETE /api/institutions/:id
// @access  Private/SuperAdmin
const deleteInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!institution) {
    return res.status(404).json({ success: false, message: 'Institution not found' });
  }
  res.json({ success: true, message: 'Institution deactivated' });
});

module.exports = { getInstitutions, getInstitution, createInstitution, updateInstitution, deleteInstitution };

