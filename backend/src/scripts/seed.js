/* Seeds DEMO schemes and a demo user. Usage: npm run seed */
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const Scheme = require('../models/Scheme');
const User = require('../models/User');

(async () => {
  await connectDB();
  const file = path.join(__dirname, '../../../database/seed/schemes.json');
  const schemes = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const s of schemes) {
    await Scheme.findOneAndUpdate({ code: s.code }, { $set: s }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  console.log(`Seeded ${schemes.length} demo schemes`);

  const email = 'demo@farmer.test';
  if (!(await User.findOne({ email }))) {
    await User.create({ name: 'Demo Farmer', email, passwordHash: await bcrypt.hash('Demo@12345', 10) });
    console.log(`Created demo user ${email} / Demo@12345 (local testing only)`);
  } else {
    console.log('Demo user already exists');
  }
  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
