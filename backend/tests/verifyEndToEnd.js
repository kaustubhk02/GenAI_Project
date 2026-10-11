const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const FarmerProfile = require('../src/models/FarmerProfile');
const Document = require('../src/models/Document');
const EligibilityResult = require('../src/models/EligibilityResult');
const SchemeChunk = require('../src/models/SchemeChunk');
const Scheme = require('../src/models/Scheme');
const { reevaluate } = require('../src/services/reevaluate');
const { explainResult } = require('../src/services/ragService');

async function verify() {
  await connectDB();
  console.log('\n=== 1. Checking VectorDB & Scheme Chunks ===');
  const chunkCount = await SchemeChunk.countDocuments();
  console.log(`Total vector chunks in DB: ${chunkCount}`);
  const sampleChunk = await SchemeChunk.findOne().populate('scheme');
  console.log(`Sample vector chunk for [${sampleChunk.scheme.name}]: embedding dimensions = ${sampleChunk.embedding.length}`);

  console.log('\n=== 2. Creating / Finding Test Farmer Profile ===');
  let user = await User.findOne({ email: 'test.farmer@example.com' });
  if (!user) {
    user = await User.create({ name: 'Kaustubh Kumbhare', email: 'test.farmer@example.com', passwordHash: 'hash123', mobileNumber: '9876543210' });
  }

  // Profile: Small Farmer in Maharashtra with 1.5 hectares, age 32, income 120000
  const profile = await FarmerProfile.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        personal: { name: 'Kaustubh Kumbhare', age: 32, gender: 'MALE', preferredLanguage: 'MARATHI' },
        location: { state: 'Maharashtra', district: 'Dhule' },
        agriculture: { occupation: 'FARMER', landAreaHectares: 1.5, farmerType: 'INDIVIDUAL' },
        financial: { annualIncome: 120000 },
        social: { category: 'OBC' }
      }
    },
    { upsert: true, new: true }
  );
  console.log('Farmer Profile configured:', {
    name: profile.personal.name,
    age: profile.personal.age,
    occupation: profile.agriculture.occupation,
    landAreaHectares: profile.agriculture.landAreaHectares,
    state: profile.location.state
  });

  // Mock confirmed documents: AADHAAR, LAND_RECORD, BANK_PASSBOOK
  await Document.deleteMany({ user: user._id });
  await Document.create([
    { user: user._id, documentType: 'AADHAAR', status: 'CONFIRMED', ocrText: 'Aadhaar Text', originalFilename: 'aadhaar.pdf', storedFilename: 'aadhaar.pdf', mimeType: 'application/pdf', sizeBytes: 1000 },
    { user: user._id, documentType: 'LAND_RECORD', status: 'CONFIRMED', ocrText: '7/12 Land Record 1.5 ha', originalFilename: 'land.pdf', storedFilename: 'land.pdf', mimeType: 'application/pdf', sizeBytes: 1000 },
    { user: user._id, documentType: 'BANK_PASSBOOK', status: 'CONFIRMED', ocrText: 'SBI Passbook', originalFilename: 'passbook.pdf', storedFilename: 'passbook.pdf', mimeType: 'application/pdf', sizeBytes: 1000 },
  ]);
  console.log('Documents confirmed: AADHAAR, LAND_RECORD, BANK_PASSBOOK');

  console.log('\n=== 3. Evaluating Eligibility Engine Against Schemes ===');
  await reevaluate(user._id);

  const results = await EligibilityResult.find({ user: user._id }).populate('scheme');
  console.log(`\nEvaluation Results (${results.length} schemes evaluated):`);
  for (const r of results) {
    console.log(`- [${r.status}] ${r.scheme.code}: ${r.scheme.name} (Benefit: ₹${r.scheme.benefitAmountPerYear}/yr)`);
  }

  const eligibleOne = results.find(r => r.status === 'ELIGIBLE' && r.scheme.code === 'PM-KISAN');
  if (eligibleOne) {
    console.log('\n=== 4. Testing Phase 15 Multilingual RAG Explanation (Marathi) ===');
    const mrExplain = await explainResult(eligibleOne._id, 'MARATHI');
    console.log('Marathi RAG Explanation:\n', mrExplain.explanation);

    console.log('\n=== 5. Testing RAG Explanation in English ===');
    const enExplain = await explainResult(eligibleOne._id, 'ENGLISH');
    console.log('English RAG Explanation:\n', enExplain.explanation);
  }

  await mongoose.disconnect();
  console.log('\n✓ All checks completed successfully!');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
