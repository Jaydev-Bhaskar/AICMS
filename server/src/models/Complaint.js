const mongoose = require('mongoose');

const STATUSES = ['Pending', 'Under Process', 'Transferred', 'Escalated', 'Disposed', 'Closed', 'Rejected'];
const CATEGORIES = [
  'Fee Regulation',
  'Faculty Issues',
  'Infrastructure',
  'Affiliation',
  'Admission Malpractice',
  'Anti-Ragging',
  'Sexual Harassment',
  'Irregular Conduct',
  'Refund Issues',
  'Academic Grievance',
  'Administrative Misconduct',
  'Other',
];

const actionSchema = new mongoose.Schema({
  actionDate: { type: Date, default: Date.now },
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  bureau: { type: mongoose.Schema.Types.ObjectId, ref: 'Bureau' },
  actionType: {
    type: String,
    enum: ['Submitted', 'Created', 'Updated', 'Assigned', 'Transferred', 'Escalated', 'Remark Added', 'Document Added', 'Status Changed', 'Disposed', 'Closed'],
    required: true,
  },
  remarks: { type: String },
  toStatus: { type: String },
  fromStatus: { type: String },
  documents: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
});

const complaintSchema = new mongoose.Schema(
  {
    caseId: { type: String, unique: true, uppercase: true, index: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    complainantName: { type: String, required: true, trim: true },
    complainantEmail: { type: String, lowercase: true, trim: true },
    complainantPhone: { type: String, trim: true },
    complainantType: {
      type: String,
      enum: ['Student', 'Faculty', 'Parent', 'Staff', 'Other Stakeholder', 'Anonymous'],
      required: true,
    },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    subCategory: { type: String },
    description: { type: String, required: [true, 'Complaint description is required'] },
    status: { type: String, enum: STATUSES, default: 'Pending', index: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium', index: true },

    // Bureau/Cell handling
    assignedBureau: { type: mongoose.Schema.Types.ObjectId, ref: 'Bureau', index: true },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    previousBureaus: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bureau' }],

    // Dates
    receivedDate: { type: Date, default: Date.now, index: true },
    expectedDisposalDate: { type: Date },
    disposalDate: { type: Date },
    lastActionDate: { type: Date, default: Date.now },

    // Region
    region: { type: String, index: true },

    // CaseLink AI — Overlap detection (enhanced)
    overlapFlags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }],
    overlapAlertSent: { type: Boolean, default: false },
    isOverlapReviewed: { type: Boolean, default: false },

    // Pairwise relationship records (human-in-the-loop)
    overlapRelationships: [{
      relatedComplaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
      relationshipType: {
        type: String,
        enum: ['DUPLICATE', 'RELATED', 'SAME_INST_DIFF_ISSUE', 'CONFLICTING_ACTION', 'UNRELATED'],
      },
      score: { type: Number },             // 0.0–1.0 composite NLP score
      evidence: [{ type: String }],        // human-readable evidence strings
      reviewStatus: {
        type: String,
        enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'DEFERRED'],
        default: 'PENDING',
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt:  { type: Date },
      reviewNote:  { type: String },
    }],

    // Action history
    actionHistory: [actionSchema],

    // Documents
    documents: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],

    // Next action
    nextAction: { type: String },
    nextActionDate: { type: Date },

    // SLA
    slaBreached: { type: Boolean, default: false },
    slaDays: { type: Number, default: 30 },

    // Source of complaint
    source: {
      type: String,
      enum: ['Online Portal', 'Email', 'Physical', 'Ministry Referred', 'Court Order', 'RTI', 'Other'],
      default: 'Online Portal',
    },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate Case ID before saving
complaintSchema.pre('save', async function (next) {
  if (!this.caseId) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.caseId = `UGMS-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  // Set SLA expected disposal date
  if (!this.expectedDisposalDate && this.receivedDate) {
    const sla = this.slaDays || 30;
    const d = new Date(this.receivedDate);
    d.setDate(d.getDate() + sla);
    this.expectedDisposalDate = d;
  }
  next();
});

// Check SLA breach
complaintSchema.methods.checkSlaBreach = function () {
  if (['Disposed', 'Closed', 'Rejected'].includes(this.status)) return false;
  return this.expectedDisposalDate && new Date() > this.expectedDisposalDate;
};

// Text index for search
complaintSchema.index({
  caseId: 'text',
  complainantName: 'text',
  description: 'text',
  category: 'text',
});

module.exports = mongoose.model('Complaint', complaintSchema);

