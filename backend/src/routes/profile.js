const express = require('express');
const Joi = require('joi');
const FarmerProfile = require('../models/FarmerProfile');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { reevaluate } = require('../services/reevaluate');
const { GENDERS, CATEGORIES, OCCUPATIONS, INDIAN_STATES } = require('../constants');

const router = express.Router();
router.use(requireAuth);

const profileSchema = Joi.object({
  personal: Joi.object({
    name: Joi.string().trim().max(100),
    age: Joi.number().integer().min(0).max(120),
    gender: Joi.string().valid(...GENDERS),
  }),
  location: Joi.object({
    state: Joi.string().valid(...INDIAN_STATES),
    district: Joi.string().trim().max(100),
  }),
  agriculture: Joi.object({
    landAreaHectares: Joi.number().min(0).max(100000),
    occupation: Joi.string().valid(...OCCUPATIONS),
  }),
  financial: Joi.object({ annualIncome: Joi.number().min(0) }),
  social: Joi.object({ category: Joi.string().valid(...CATEGORIES) }),
});

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else out[p] = v;
  }
  return out;
}

router.get('/', asyncHandler(async (req, res) => {
  const profile = await FarmerProfile.findOne({ user: req.user.id });
  res.json({ profile: profile || null });
}));

const save = asyncHandler(async (req, res) => {
  const set = flatten(req.body);
  const profile = Object.keys(set).length
    ? await FarmerProfile.findOneAndUpdate(
      { user: req.user.id }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true })
    : await FarmerProfile.findOne({ user: req.user.id });
  await reevaluate(req.user.id);
  res.json({ profile });
});
router.put('/', validate(profileSchema), save);
router.post('/', validate(profileSchema), save);

module.exports = router;
