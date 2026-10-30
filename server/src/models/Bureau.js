const mongoose = require('mongoose');

const bureauSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    description: { type: String },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    sladays: { type: Number, default: 30, comment: 'Default SLA days for cases handled by this bureau' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bureau', bureauSchema);

