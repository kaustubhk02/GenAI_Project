const mongoose = require('mongoose');

const schemeSourceSchema = new mongoose.Schema(
  {
    schemeCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    schemeName: { type: String, required: true, trim: true },
    sourceUrl: { type: String, required: true, unique: true, trim: true },
    sourceType: {
      type: String,
      enum: ['OFFICIAL_PDF', 'OFFICIAL_PORTAL', 'API'],
      default: 'OFFICIAL_PDF',
    },
    domain: { type: String, required: true, trim: true },
    authority: { type: String, required: true, trim: true },
    classification: { type: String, enum: ['CENTRAL', 'STATE'], default: 'CENTRAL' },
    stateApplicability: { type: String, default: 'ALL', trim: true },
    contentHash: { type: String, default: '', trim: true },
    version: { type: Number, default: 1 },
    lastSuccessfulFetchAt: { type: Date, default: null },
    lastVerificationAt: { type: Date, default: null },
    syncStatus: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'UNCHANGED', 'REQUIRES_MANUAL_REVIEW', 'FAILED'],
      default: 'PENDING',
    },
    lastError: { type: String, default: null },
    changeSummary: { type: String, default: null },
    pendingProposedRules: { type: mongoose.Schema.Types.Mixed, default: null },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SchemeSource', schemeSourceSchema);
