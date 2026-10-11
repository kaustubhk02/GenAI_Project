/* Seeds Official Government schemes and a demo user. Usage: npm run seed */
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
  
  // Remove obsolete demo schemes
  const deletedDemo = await Scheme.deleteMany({ code: { $regex: /^DEMO-/i } });
  if (deletedDemo.deletedCount > 0) {
    console.log(`Cleaned up ${deletedDemo.deletedCount} old demo schemes from database.`);
  }

  const file = path.join(__dirname, '../../../database/seed/schemes.json');
  const schemes = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { indexSchemeText } = require('../services/ragService');

  for (const s of schemes) {
    const schemeDoc = await Scheme.findOneAndUpdate(
      { code: s.code },
      { $set: s },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Build rich official document text for RAG Vector embedding
    const textToEmbed = `Scheme Name: ${schemeDoc.name}
Department: ${schemeDoc.department}
Source / API: ${schemeDoc.source?.name || 'Official Portal'} (${schemeDoc.source?.url || ''})
Description: ${schemeDoc.description}
Benefits: ${schemeDoc.benefitSummary} (Amount: ₹${schemeDoc.benefitAmountPerYear}/year)
Eligibility Rules: ${JSON.stringify(schemeDoc.rules)}
Required Documents: ${schemeDoc.requiredDocuments.join(', ')}
Official Portal URL: ${schemeDoc.officialApplicationUrl}
Official Guidelines & Documentation:
${s.officialDocumentText || schemeDoc.description}`;

    try {
      await indexSchemeText(schemeDoc._id, textToEmbed);
      console.log(`[RAG VectorDB] Indexed chunks for ${s.code} - ${s.name}`);
    } catch (err) {
      console.warn(`Failed to index RAG for ${s.code}: ${err.message}`);
    }
  }
  console.log(`Successfully seeded and indexed ${schemes.length} authentic government schemes.`);

  const email = 'demo@farmer.test';
  if (!(await User.findOne({ email }))) {
    await User.create({ name: 'Demo Farmer', email, passwordHash: await bcrypt.hash('Demo@12345', 10) });
    console.log(`Created demo user ${email} / Demo@12345 (local testing only)`);
  } else {
    console.log('Demo user already exists');
  }
  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
