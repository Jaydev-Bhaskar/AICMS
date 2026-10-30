const mongoose = require('mongoose');

const REGIONS = ['Northern', 'Southern', 'Eastern', 'Western', 'Central', 'North-Eastern', 'South-Western'];

const institutionSchema = new mongoose.Schema(
  {
    aicteId: {
      type: String,
      required: [true, 'AICTE Permanent ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: [true, 'Institution name is required'], trim: true, index: true },
    type: {
      type: String,
      enum: ['Engineering', 'Management', 'Pharmacy', 'Architecture', 'Hotel Management', 'Applied Arts', 'MCA', 'Other'],
      required: true,
    },
    address: {
      street: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String },
    },
    region: { type: String, enum: REGIONS, required: true, index: true },
    contactEmail: { type: String, lowercase: true },
    contactPhone: { type: String },
    website: { type: String },
    approvalStatus: {
      type: String,
      enum: ['Approved', 'Conditionally Approved', 'Denied', 'Under Review', 'Withdrawn'],
      default: 'Approved',
    },
    isActive: { type: Boolean, default: true },
    totalComplaints: { type: Number, default: 0 },
    pendingComplaints: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: complaints
institutionSchema.virtual('complaints', {
  ref: 'Complaint',
  localField: '_id',
  foreignField: 'institution',
  justOne: false,
});

// Text index for search
institutionSchema.index({ name: 'text', aicteId: 'text', 'address.city': 'text', 'address.state': 'text' });

module.exports = mongoose.model('Institution', institutionSchema);

