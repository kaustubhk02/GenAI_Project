/**
 * CLI runner for Scheduled Scheme Synchronization.
 * Usage:
 *   node src/scripts/syncSchemes.js
 */

const connectDB = require('../config/db');
const mongoose = require('mongoose');
const { seedSchemeSources, runSchemeSyncNow } = require('../services/schemeSyncService');

(async () => {
  console.log('[SyncRunner] Connecting to MongoDB...');
  await connectDB();

  console.log('[SyncRunner] Ensuring source catalogue is seeded...');
  await seedSchemeSources();

  console.log('[SyncRunner] Starting synchronization cycle...');
  const result = await runSchemeSyncNow();

  console.log('\n========================================');
  console.log('SYNC SUMMARY');
  console.log('========================================');
  console.log(`Skipped:      ${result.skipped ? 'Yes (' + result.reason + ')' : 'No'}`);
  console.log(`Sources run:  ${result.count}`);
  if (result.results && result.results.length > 0) {
    for (const r of result.results) {
      console.log(`- [${r.status}] ${r.schemeCode}: ${r.error || r.changeSummary || (r.chunksCount ? r.chunksCount + ' chunks indexed' : 'ok')}`);
    }
  }
  console.log('========================================\n');

  await mongoose.disconnect();
})().catch((err) => {
  console.error('[SyncRunner Error]', err);
  process.exit(1);
});
