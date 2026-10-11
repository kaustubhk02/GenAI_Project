/**
 * CLI script to ingest an official scheme from a Web or PDF URL.
 * Usage:
 *   node src/scripts/ingestUrl.js "https://pmkisan.gov.in/Documents/PM-KMY%20-%20FAQs.pdf" "PM-KMY" "Ministry of Agriculture"
 */

const connectDB = require('../config/db');
const mongoose = require('mongoose');
const { ingestSchemeFromUrl } = require('../services/schemeIngestionService');

(async () => {
  const url = process.argv[2];
  const code = process.argv[3] || null;
  const sourceName = process.argv[4] || null;

  if (!url) {
    console.error('Usage: node src/scripts/ingestUrl.js <URL> [SCHEME_CODE] [SOURCE_NAME]');
    process.exit(1);
  }

  console.log(`[Ingest] Connecting to database...`);
  await connectDB();

  console.log(`[Ingest] Fetching and parsing document from: ${url}...`);
  try {
    const result = await ingestSchemeFromUrl({ url, code, sourceName });
    console.log('\n========================================');
    console.log('✓ SCHEME INGESTION SUCCESSFUL!');
    console.log('========================================');
    console.log(`Scheme Code:         ${result.scheme.code}`);
    console.log(`Scheme Name:         ${result.scheme.name}`);
    console.log(`Department:          ${result.scheme.department}`);
    console.log(`Benefit Summary:     ${result.scheme.benefitSummary}`);
    console.log(`Annual Value:        ₹${result.scheme.benefitAmountPerYear}`);
    console.log(`Required Documents:  ${result.scheme.requiredDocuments.join(', ')}`);
    console.log(`VectorDB Chunks:     ${result.chunksCount} chunks indexed`);
    console.log(`Raw Text Length:     ${result.textLength} characters`);
    console.log('========================================\n');
  } catch (err) {
    console.error(`[Ingest Error] ${err.message}`);
  } finally {
    await mongoose.disconnect();
  }
})();
