const FarmerProfile = require('../models/FarmerProfile');

const FIELD_TO_PATH = {
  name: 'personal.name',
  age: 'personal.age',
  gender: 'personal.gender',
  state: 'location.state',
  district: 'location.district',
  landAreaHectares: 'agriculture.landAreaHectares',
  occupation: 'agriculture.occupation',
  annualIncome: 'financial.annualIncome',
  category: 'social.category',
};

/** Writes farmer-CONFIRMED extracted fields into the profile. Never called with unreviewed data. */
async function applyToProfile(userId, data) {
  const profile = (await FarmerProfile.findOne({ user: userId })) || new FarmerProfile({ user: userId });
  for (const [key, value] of Object.entries(data)) {
    const path = FIELD_TO_PATH[key];
    if (path && value !== undefined && value !== null && value !== '') profile.set(path, value);
  }
  await profile.save();
  return profile;
}

module.exports = { applyToProfile };
