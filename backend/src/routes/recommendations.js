const express = require('express');
const EligibilityResult = require('../models/EligibilityResult');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { reevaluate } = require('../services/reevaluate');

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
      scheme: {
        id: s._id, code: s.code, name: s.name, description: s.description, department: s.department,
        benefitSummary: s.benefitSummary, benefitAmountPerYear: s.benefitAmountPerYear,
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

module.exports = router;
