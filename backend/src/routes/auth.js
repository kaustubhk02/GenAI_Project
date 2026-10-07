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

const emailRule = Joi.string().trim().email({ tlds: { allow: false } });

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: emailRule.required(),
  password: Joi.string().min(8).max(100).required(),
});
const loginSchema = Joi.object({ email: emailRule.required(), password: Joi.string().required() });

const sign = (user) => jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email: email.toLowerCase() })) throw new HttpError(409, 'An account with this email already exists');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  const ok = user && (await bcrypt.compare(req.body.password, user.passwordHash));
  if (!ok) throw new HttpError(401, 'Incorrect email or password');
  res.json({ token: sign(user), user: publicUser(user) });
}));

module.exports = router;