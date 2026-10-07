const mongoose = require('mongoose');

const eligibilityResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheme: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', required: true },
  schemeVersion: Number,
  status: { type: String, enum: ['ELIGIBLE', 'NOT_ELIGIBLE', 'INCOMPLETE', 'ALMOST_ELIGIBLE'], required: true },
  matchedRules: [mongoose.Schema.Types.Mixed],
  failedRules: [mongoose.Schema.Types.Mixed],
  missingInformation: [String],
  missingDocuments: [String],
  completionPercent: Number,
  evaluatedAt: Date,
}, { timestamps: true });

eligibilityResultSchema.index({ user: 1, scheme: 1 }, { unique: true });

module.exports = mongoose.model('EligibilityResult', eligibilityResultSchema);
