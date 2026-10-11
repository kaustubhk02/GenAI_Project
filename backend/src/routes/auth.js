const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const env = require('../config/env');
const User = require('../models/User');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const HttpError = require('../middleware/httpError');

const router = express.Router();

const FarmerProfile = require('../models/FarmerProfile');

const emailRule = Joi.string().trim().email({ tlds: { allow: false } });

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  mobileNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).required(),
  email: emailRule.allow('', null).optional(),
  password: Joi.string().min(8).max(100).required(),
  preferredLanguage: Joi.string().valid('MARATHI', 'HINDI', 'ENGLISH').required(),
  age: Joi.number().min(0).max(120).required(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').required(),
  state: Joi.string().required(),
  district: Joi.string().required(),
  taluka: Joi.string().required(),
  village: Joi.string().required(),
  category: Joi.string().valid('GENERAL', 'OBC', 'SC', 'ST').optional(),
  farmerType: Joi.string().valid('INDIVIDUAL', 'JOINT', 'OTHER').required(),
});
const loginSchema = Joi.object({ identifier: Joi.string().required(), password: Joi.string().required() });

const sign = (user) => jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const publicUser = (u) => ({ id: u._id, name: u.name, mobileNumber: u.mobileNumber, email: u.email, role: u.role });

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, mobileNumber, email, password, preferredLanguage, age, gender, state, district, taluka, village, category, farmerType } = req.body;
  if (await User.findOne({ mobileNumber })) throw new HttpError(409, 'An account with this mobile number already exists');
  if (email && await User.findOne({ email: email.toLowerCase() })) throw new HttpError(409, 'An account with this email already exists');
  
  const user = await User.create({ name, mobileNumber, email: email ? email.toLowerCase() : undefined, passwordHash: await bcrypt.hash(password, 10) });
  
  await FarmerProfile.create({
    user: user._id,
    personal: { name, mobileNumber, email, preferredLanguage, age, gender },
    location: { state, district, taluka, village },
    agriculture: { farmerType },
    social: category ? { category } : undefined,
  });

  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({ $or: [{ mobileNumber: identifier }, { email: identifier.toLowerCase() }] });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new HttpError(401, 'Incorrect mobile number/email or password');
  res.json({ token: sign(user), user: publicUser(user) });
}));

module.exports = router;