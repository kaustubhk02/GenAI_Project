/**
 * Smoke test for the LLM extraction pipeline.
 * Run: node tests/testExtraction.js
 *
 * Requires GEMINI_API_KEY in backend/.env
 */

'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { extractFields } = require('../src/services/extractionService');

// Sample Marathi income certificate OCR text (realistic mock)
const SAMPLE_MARATHI_OCR = `
महाराष्ट्र शासन
उत्पन्न प्रमाणपत्र

प्रमाणित केले जाते की,

नाव: सागर राजहंस कुंभारे
पिता: राजहंस दिनकर कुंभारे
जिल्हा: धुळे
तालुका: शिरपूर
राज्य: महाराष्ट्र
जात: इतर मागासवर्ग (OBC)

सदर कुटुंबाचे वार्षिक उत्पन्न खालीलप्रमाणे आहे:

वित्तीय वर्ष 2022-23: रु. 1,20,000
वित्तीय वर्ष 2023-24: रु. 1,45,000

तहसीलदार, शिरपूर
दिनांक: 15-08-2024
`;

async function main() {
  console.log('=== Extraction Smoke Test ===\n');
  console.log('Input OCR text (Marathi income certificate):\n', SAMPLE_MARATHI_OCR);
  console.log('\n--- Running extraction ---\n');

  const result = await extractFields(SAMPLE_MARATHI_OCR, 'INCOME_CERTIFICATE');

  console.log('Extraction method:', result.extractionMethod);
  console.log('\nExtracted data:');
  console.log(JSON.stringify(result.data, null, 2));
  console.log('\nField status:');
  console.log(JSON.stringify(result.fieldStatus, null, 2));
  console.log('\nWarnings:');
  result.warnings.forEach((w) => console.log(' -', w));

  // Validation
  console.log('\n=== Validation ===');
  const d = result.data;

  if (d.name) {
    console.log(`✓ Name extracted: "${d.name}"`);
    if (/[a-zA-Z]/.test(d.name)) console.log('  ✓ Name is in English / transliterated');
    else console.log('  ✗ Name still in Devanagari – check LLM response');
  } else {
    console.log('✗ Name not extracted');
  }

  if (d.district) {
    console.log(`✓ District: "${d.district}"`);
  }

  if (d.state) {
    console.log(`✓ State: "${d.state}"`);
  }

  if (d.category) {
    console.log(`✓ Category: "${d.category}"`);
  }

  if (d.incomeRecords && d.incomeRecords.length > 0) {
    console.log(`✓ Income records (${d.incomeRecords.length}):`);
    d.incomeRecords.forEach((r) => console.log(`    ${r.financialYear}: ₹${r.annualIncome}`));
  } else {
    console.log('✗ No income records extracted');
  }

  if (d.annualIncome) {
    console.log(`✓ annualIncome (most recent): ₹${d.annualIncome}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
