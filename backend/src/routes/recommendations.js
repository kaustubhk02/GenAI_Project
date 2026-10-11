const express = require('express');
const EligibilityResult = require('../models/EligibilityResult');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { reevaluate } = require('../services/reevaluate');
const HttpError = require('../middleware/httpError');

const router = express.Router();
router.use(requireAuth);

const DISCLAIMER = 'Informational assessment based on the details and documents you provided. '
  + 'It is not a final decision - the official authority decides on your application.';

router.get('/', asyncHandler(async (req, res) => {
  await reevaluate(req.user.id);
  const results = await EligibilityResult.find({ user: req.user.id }).populate('scheme');

  const groups = { ELIGIBLE: [], ALMOST_ELIGIBLE: [], INCOMPLETE: [], NOT_ELIGIBLE: [] };
  for (const r of results) {
    if (!r.scheme || !r.scheme.isActive) continue;
    const s = r.scheme;
    groups[r.status].push({
      id: r._id,
      _id: r._id,
      scheme: {
        id: s._id, code: s.code, name: s.name, description: s.description, department: s.department,
        benefitSummary: s.benefitSummary, benefitAmountPerYear: s.benefitAmountPerYear,
        requiredDocuments: s.requiredDocuments || [], rules: s.rules,
        officialApplicationUrl: s.officialApplicationUrl, source: s.source, version: s.version,
      },
      status: r.status,
      matchedRules: r.matchedRules,
      failedRules: r.failedRules,
      missingInformation: r.missingInformation,
      missingDocuments: r.missingDocuments,
      completionPercent: r.completionPercent,
      evaluatedAt: r.evaluatedAt,
    });
  }
  groups.ELIGIBLE.sort((a, b) => b.scheme.benefitAmountPerYear - a.scheme.benefitAmountPerYear);
  groups.ALMOST_ELIGIBLE.sort((a, b) => b.completionPercent - a.completionPercent);

  const summary = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]));
  res.json({ summary, groups, disclaimer: DISCLAIMER });
}));

const { explainResult } = require('../services/ragService');

router.get('/:id/explain', asyncHandler(async (req, res) => {
  let result = null;
  // Try finding by EligibilityResult ID
  try {
    result = await EligibilityResult.findOne({ _id: req.params.id, user: req.user.id });
  } catch {
    // If not a valid ObjectId or not found, fall through
  }
  // If not found, try finding by Scheme ID
  if (!result) {
    result = await EligibilityResult.findOne({ scheme: req.params.id, user: req.user.id });
  }
  if (!result) throw new HttpError(404, 'Result not found');
  try {
    const data = await explainResult(result._id, req.query.lang);
    res.json(data);
  } catch (err) {
    console.error('Explanation error:', err);
    res.status(500).json({ error: 'Failed to generate explanation. Please try again later.' });
  }
}));

module.exports = router;
