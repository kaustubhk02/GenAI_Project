/**
 * Scheduled Scheme Synchronization & Change Detection Service.
 *
 * Implements:
 * 1. Predefined Source Catalogue Synchronization
 * 2. SSRF Protection & Domain Allowlist
 * 3. SHA-256 Content-Hash Comparison (Avoid redundant LLM / VectorDB calls)
 * 4. Safe Rule Conflict Resolution (Preserves verified rules on material changes)
 * 5. Background Scheduled Execution (node-cron) with Concurrency Locking
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cron = require('node-cron');
const env = require('../config/env');
const SchemeSource = require('../models/SchemeSource');
const Scheme = require('../models/Scheme');
const { fetchAndExtractUrlContent, parseSchemeMetadataWithLLM } = require('./schemeIngestionService');
const { indexSchemeText } = require('./ragService');
const { DOCUMENT_TYPES } = require('../constants');

// In-memory concurrency guard
let isSyncRunning = false;
let cronJob = null;

// SSRF Protection: strict allowlist of approved Indian government and statutory domains
const APPROVED_DOMAINS = [
  'gov.in',
  'nic.in',
  'nabard.org',
  'rbi.org.in',
];

/**
 * Validates that a URL belongs strictly to an authorized government domain
 * and protects against private network / localhost SSRF attacks.
 */
function validateApprovedUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error(`Invalid URL: ${urlStr}`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Forbidden protocol "${parsed.protocol}" in URL: ${urlStr}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block loopback and private IP blocks (SSRF protection)
  const isPrivateOrLoopback =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

  if (isPrivateOrLoopback) {
    throw new Error(`Security Violation: Access to private/loopback host "${hostname}" is blocked.`);
  }

  const isApproved = APPROVED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isApproved) {
    throw new Error(
      `Security Violation: Domain "${hostname}" is not in the approved government sources allowlist.`
    );
  }

  return parsed;
}

/**
 * Computes SHA-256 hash of a text or buffer string.
 */
function computeContentHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Detects whether extracted candidate rules differ materially from current active rules.
 */
function isMaterialRuleChange(existingScheme, candidateMetadata) {
  if (!existingScheme || !existingScheme.rules) return true;

  // 1. Check benefit amount difference (> 10% or non-zero change)
  if (
    Number(candidateMetadata.benefitAmountPerYear) !== Number(existingScheme.benefitAmountPerYear)
  ) {
    return true;
  }

  // 2. Compare rule trees structurally
  const existingRulesJson = JSON.stringify(existingScheme.rules);
  const candidateRulesJson = JSON.stringify(candidateMetadata.rules || {});

  return existingRulesJson !== candidateRulesJson;
}

/**
 * Synchronizes a single registered SchemeSource.
 */
async function syncSingleSource(source) {
  const { sourceUrl, schemeCode } = source;
  console.log(`[SchemeSync] Checking source for ${schemeCode}: ${sourceUrl}`);

  // 1. Security Check
  validateApprovedUrl(sourceUrl);

  // 2. Fetch and extract content
  const { text, mimeType } = await fetchAndExtractUrlContent(sourceUrl);
  if (!text || text.trim().length < 50) {
    throw new Error('Retrieved document text is empty or too short');
  }

  // 3. Content Hash Check (Unchanged Document Detection)
  const newHash = computeContentHash(text);
  const now = new Date();

  if (source.contentHash && source.contentHash === newHash && source.syncStatus !== 'FAILED') {
    console.log(`[SchemeSync] Content unchanged for ${schemeCode} (Hash: ${newHash.slice(0, 10)}...). Skipping re-indexing.`);
    source.lastVerificationAt = now;
    source.syncStatus = 'UNCHANGED';
    source.lastError = null;
    await source.save();
    return { status: 'UNCHANGED', schemeCode };
  }

  // 4. Content has changed or is being ingested for the first time
  console.log(`[SchemeSync] Change detected for ${schemeCode} (Old: ${source.contentHash?.slice(0, 8) || 'none'} -> New: ${newHash.slice(0, 8)}). Processing...`);

  // 5. Parse scheme metadata & eligibility rules via Gemini
  let candidateMetadata;
  try {
    candidateMetadata = await parseSchemeMetadataWithLLM(text, sourceUrl, schemeCode);
  } catch (err) {
    console.warn(`[SchemeSync] Gemini parsing warning for ${schemeCode}: ${err.message}. Using safe fallback.`);
    candidateMetadata = {
      code: schemeCode,
      name: source.schemeName,
      description: text.slice(0, 300) + '...',
      department: source.authority,
      benefitSummary: 'Government scheme benefits',
      benefitAmountPerYear: 0,
      rules: { all: [] },
      requiredDocuments: ['AADHAAR', 'LAND_RECORD', 'BANK_PASSBOOK'],
    };
  }

  const existingScheme = await Scheme.findOne({ code: schemeCode });
  const isFirstTime = !existingScheme;
  const isMaterial = !isFirstTime && isMaterialRuleChange(existingScheme, candidateMetadata);

  const nextVersion = (source.version || 1) + (isFirstTime ? 0 : 1);

  if (isMaterial) {
    // ── SAFE RULE CONFLICT HANDLING ──────────────────────────────────────────
    // DO NOT silently overwrite verified deterministic rules!
    console.warn(`[SchemeSync] Material rule change detected for ${schemeCode}! Flagging for manual review.`);

    source.syncStatus = 'REQUIRES_MANUAL_REVIEW';
    source.pendingProposedRules = candidateMetadata.rules;
    source.changeSummary = `Version ${nextVersion} contains altered eligibility rules or benefit amounts (Proposed: ₹${candidateMetadata.benefitAmountPerYear}/yr). Active rules preserved until human verification.`;
    source.contentHash = newHash;
    source.version = nextVersion;
    source.lastSuccessfulFetchAt = now;
    source.lastVerificationAt = now;
    source.lastError = null;
    await source.save();

    existingScheme.syncStatus = 'REQUIRES_MANUAL_REVIEW';
    existingScheme.pendingChanges = {
      proposedRules: candidateMetadata.rules,
      proposedBenefitAmountPerYear: candidateMetadata.benefitAmountPerYear,
      proposedBenefitSummary: candidateMetadata.benefitSummary,
      detectedAt: now,
      version: nextVersion,
    };
    existingScheme.lastSyncedAt = now;
    await existingScheme.save();

    // Re-index VectorDB with new text so RAG explanations reflect the latest document context
    await indexSchemeText(existingScheme._id, text, sourceUrl, nextVersion);

    return { status: 'REQUIRES_MANUAL_REVIEW', schemeCode, changeSummary: source.changeSummary };
  }

  // ── SAFE AUTOMATIC UPDATE OR INITIAL INGESTION ─────────────────────────────
  const schemeDoc = await Scheme.findOneAndUpdate(
    { code: schemeCode },
    {
      $set: {
        code: schemeCode,
        name: candidateMetadata.name || source.schemeName,
        description: candidateMetadata.description || existingScheme?.description,
        department: candidateMetadata.department || source.authority,
        benefitSummary: candidateMetadata.benefitSummary || existingScheme?.benefitSummary,
        benefitAmountPerYear: Number(candidateMetadata.benefitAmountPerYear) || existingScheme?.benefitAmountPerYear || 0,
        rules: isFirstTime ? (candidateMetadata.rules || { all: [] }) : existingScheme.rules,
        requiredDocuments: (candidateMetadata.requiredDocuments || ['AADHAAR', 'LAND_RECORD']).filter((d) =>
          DOCUMENT_TYPES.includes(d)
        ),
        officialApplicationUrl: sourceUrl,
        source: {
          type: mimeType === 'application/pdf' ? 'OFFICIAL_PDF' : 'OFFICIAL_PORTAL',
          name: source.authority,
          url: sourceUrl,
          retrievedAt: now,
          lastVerifiedAt: now,
          note: `Synchronized from official authority via SchemeSync`,
        },
        version: nextVersion,
        syncStatus: 'VERIFIED',
        pendingChanges: null,
        lastSyncedAt: now,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Index text chunks into VectorDB
  const chunksCount = await indexSchemeText(schemeDoc._id, text, sourceUrl, nextVersion);

  // Update source record
  source.contentHash = newHash;
  source.version = nextVersion;
  source.syncStatus = 'ACTIVE';
  source.lastSuccessfulFetchAt = now;
  source.lastVerificationAt = now;
  source.lastError = null;
  source.changeSummary = isFirstTime ? 'Initial official ingestion verified' : 'Routine text update verified';
  source.pendingProposedRules = null;
  await source.save();

  console.log(`[SchemeSync] Successfully synced ${schemeCode} (${chunksCount} vector chunks indexed).`);
  return { status: 'ACTIVE', schemeCode, chunksCount };
}

/**
 * Runs a complete synchronization cycle across all registered active sources.
 */
async function runSchemeSyncNow() {
  if (isSyncRunning) {
    console.warn('[SchemeSync] Sync cycle is already in progress. Skipping duplicate run.');
    return { skipped: true, reason: 'ALREADY_RUNNING' };
  }

  isSyncRunning = true;
  console.log('\n======================================================');
  console.log(`[SchemeSync] Starting Scheduled Scheme Synchronization Cycle at ${new Date().toISOString()}`);
  console.log('======================================================');

  const results = [];
  try {
    const sources = await SchemeSource.find({ enabled: true });
    if (sources.length === 0) {
      console.log('[SchemeSync] No enabled scheme sources registered in catalogue.');
      return { skipped: false, count: 0, results: [] };
    }

    console.log(`[SchemeSync] Processing ${sources.length} registered official source(s)...`);

    for (const source of sources) {
      try {
        const res = await syncSingleSource(source);
        results.push({ sourceUrl: source.sourceUrl, ...res });
      } catch (err) {
        console.error(`[SchemeSync] Error syncing ${source.schemeCode} (${source.sourceUrl}):`, err.message);
        source.syncStatus = 'FAILED';
        source.lastError = err.message;
        source.lastVerificationAt = new Date();
        await source.save().catch(() => {});
        results.push({ sourceUrl: source.sourceUrl, schemeCode: source.schemeCode, status: 'FAILED', error: err.message });
      }
    }
  } finally {
    isSyncRunning = false;
    console.log('======================================================');
    console.log(`[SchemeSync] Completed Synchronization Cycle. Processed ${results.length} sources.`);
    console.log('======================================================\n');
  }

  return { skipped: false, count: results.length, results };
}

/**
 * Seeds the SchemeSource collection from database/seed/schemeSources.json if empty or missing.
 */
async function seedSchemeSources() {
  const seedFile = path.join(__dirname, '../../../database/seed/schemeSources.json');
  if (!fs.existsSync(seedFile)) {
    console.warn(`[SchemeSync] Seed file not found at ${seedFile}`);
    return;
  }

  const seedData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  for (const item of seedData) {
    await SchemeSource.findOneAndUpdate(
      { sourceUrl: item.sourceUrl },
      { $setOnInsert: item },
      { upsert: true, new: true }
    );
  }
  console.log(`[SchemeSync] Scheme source catalogue verified with ${seedData.length} official source definitions.`);
}

/**
 * Initializes the background cron scheduler.
 */
function initSchemeSyncScheduler() {
  const enabled = (process.env.ENABLE_SCHEME_SYNC || 'true').toLowerCase() === 'true';
  if (!enabled || process.env.NODE_ENV === 'test') {
    console.log('[SchemeSync] Background sync cron is disabled (test or ENABLE_SCHEME_SYNC=false).');
    return null;
  }

  // Default: Daily at 2:00 AM ('0 2 * * *')
  const cronExpression = process.env.SCHEME_SYNC_CRON || '0 2 * * *';

  if (!cron.validate(cronExpression)) {
    console.error(`[SchemeSync] Invalid cron expression: "${cronExpression}". Scheduler not started.`);
    return null;
  }

  if (cronJob) cronJob.stop();

  cronJob = cron.schedule(cronExpression, async () => {
    console.log(`[SchemeSync] Triggered scheduled sync by cron (${cronExpression})`);
    try {
      await runSchemeSyncNow();
    } catch (err) {
      console.error('[SchemeSync] Scheduled cron sync execution failed:', err);
    }
  });

  console.log(`[SchemeSync] Scheduled background synchronization initialized with schedule: "${cronExpression}"`);
  return cronJob;
}

module.exports = {
  validateApprovedUrl,
  computeContentHash,
  isMaterialRuleChange,
  syncSingleSource,
  runSchemeSyncNow,
  seedSchemeSources,
  initSchemeSyncScheduler,
};
