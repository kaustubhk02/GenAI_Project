const mongoose = require('mongoose');
const { DOCUMENT_TYPES } = require('../constants');

const schemeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  department: String,
  benefitSummary: String,
  benefitAmountPerYear: { type: Number, default: 0 },
  // Machine-checkable rule tree: {all:[...]} | {any:[...]} | {not:{...}} | {field, operator, value, label}
  rules: { type: mongoose.Schema.Types.Mixed, required: true },
  requiredDocuments: [{ type: String, enum: DOCUMENT_TYPES }],
  officialApplicationUrl: { type: String, default: '' },
  source: {
    type: { type: String, default: 'DEMO_SAMPLE' }, // OFFICIAL_API | PERMITTED_PDF | MANUAL_ENTRY | DEMO_SAMPLE
    name: String,
    url: String,
    retrievedAt: Date,
    lastVerifiedAt: Date,
    note: String,
  },
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Scheme', schemeSchema);
