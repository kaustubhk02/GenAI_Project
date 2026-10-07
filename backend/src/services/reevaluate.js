const FarmerProfile = require('../models/FarmerProfile');
const Document = require('../models/Document');
const Scheme = require('../models/Scheme');
const EligibilityResult = require('../models/EligibilityResult');
const Notification = require('../models/Notification');
const { checkEligibility, STATUS_RANK } = require('./eligibilityEngine');

const LABEL = {
  ELIGIBLE: 'Eligible',
  ALMOST_ELIGIBLE: 'Almost eligible',
  INCOMPLETE: 'Needs more information',
  NOT_ELIGIBLE: 'Not eligible',
};

/**
 * Runs the rule engine for one farmer against every active scheme, stores the results,
 * and creates a Notification whenever a scheme's status improves. Idempotent: running it
 * twice with unchanged data produces no new notifications.
 */
async function reevaluate(userId) {
  const [profileDoc, docs, schemes, previous] = await Promise.all([
    FarmerProfile.findOne({ user: userId }),
    Document.find({ user: userId }).select('documentType'),
    Scheme.find({ isActive: true }),
    EligibilityResult.find({ user: userId }),
  ]);
  const profile = profileDoc ? profileDoc.toObject() : {};
  const docTypes = docs.map((d) => d.documentType);
  const prevBySchemeId = new Map(previous.map((r) => [String(r.scheme), r]));

  for (const scheme of schemes) {
    const result = checkEligibility(profile, scheme.toObject(), docTypes);
    const prev = prevBySchemeId.get(String(scheme._id));

    await EligibilityResult.findOneAndUpdate(
      { user: userId, scheme: scheme._id },
      { $set: { ...result, schemeVersion: scheme.version, evaluatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (prev && STATUS_RANK[result.status] > STATUS_RANK[prev.status]) {
      await Notification.create({
        user: userId,
        scheme: scheme._id,
        title: `Good news: ${scheme.name}`,
        message: `Your status for "${scheme.name}" improved from "${LABEL[prev.status]}" to "${LABEL[result.status]}".`,
      });
    }
  }
}

module.exports = { reevaluate };
