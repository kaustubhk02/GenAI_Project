const mongoose = require('mongoose');
const { GENDERS, CATEGORIES, OCCUPATIONS } = require('../constants');

// All fields optional on purpose: a partial profile is valid and leads to INCOMPLETE results.
const farmerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  personal: {
    name: String,
    age: { type: Number, min: 0, max: 120 },
    gender: { type: String, enum: GENDERS },
  },
  location: { state: String, district: String },
  agriculture: {
    landAreaHectares: { type: Number, min: 0 },
    occupation: { type: String, enum: OCCUPATIONS },
  },
  financial: { annualIncome: { type: Number, min: 0 } },
  social: { category: { type: String, enum: CATEGORIES } },
}, { timestamps: true });

module.exports = mongoose.model('FarmerProfile', farmerProfileSchema);
