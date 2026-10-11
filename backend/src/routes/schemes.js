const express = require('express');
const Joi = require('joi');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const HttpError = require('../middleware/httpError');
const Scheme = require('../models/Scheme');
const SchemeChunk = require('../models/SchemeChunk');
const { ingestSchemeFromUrl } = require('../services/schemeIngestionService');

const router = express.Router();

const ingestSchema = Joi.object({
  url: Joi.string().uri().required(),
  code: Joi.string().trim().uppercase().max(50).optional().allow(''),
  sourceName: Joi.string().trim().max(150).optional().allow(''),
});

/**
 * Ingests an official scheme PDF or Web URL into the platform & VectorDB.
 * POST /api/schemes/ingest-url
 */
router.post('/ingest-url', requireAuth, validate(ingestSchema), asyncHandler(async (req, res) => {
  const { url, code, sourceName } = req.body;
  
  try {
    const result = await ingestSchemeFromUrl({ url, code, sourceName });
    res.status(201).json({
      message: `Successfully ingested "${result.scheme.name}" (${result.scheme.code})`,
      scheme: result.scheme,
      chunksIndexed: result.chunksCount,
      textLength: result.textLength,
      sourceUrl: result.sourceUrl,
    });
  } catch (err) {
    console.error('[POST /api/schemes/ingest-url] Ingestion failed:', err);
    throw new HttpError(422, `Scheme ingestion failed: ${err.message}`);
  }
}));

/**
 * Lists all active government schemes with their VectorDB chunk count.
 * GET /api/schemes
 */
router.get('/', asyncHandler(async (req, res) => {
  const schemes = await Scheme.find().sort({ createdAt: -1 });
  const schemeIds = schemes.map((s) => s._id);

  // Group chunk count per scheme
  const chunkCounts = await SchemeChunk.aggregate([
    { $match: { scheme: { $in: schemeIds } } },
    { $group: { _id: '$scheme', count: { $sum: 1 } } },
  ]);

  const countMap = Object.fromEntries(chunkCounts.map((c) => [c._id.toString(), c.count]));

  const enriched = schemes.map((s) => ({
    ...s.toObject(),
    vectorChunksCount: countMap[s._id.toString()] || 0,
  }));

  res.json({ schemes: enriched });
}));

const SchemeSource = require('../models/SchemeSource');
const { runSchemeSyncNow } = require('../services/schemeSyncService');

/**
 * Lists all registered sources in the official catalogue.
 * GET /api/schemes/sources
 */
router.get('/sources', asyncHandler(async (req, res) => {
  const sources = await SchemeSource.find().sort({ schemeCode: 1 });
  res.json({ sources });
}));

/**
 * Triggers an immediate synchronization cycle across all registered sources.
 * POST /api/schemes/sync
 */
router.post('/sync', requireAuth, asyncHandler(async (req, res) => {
  const syncResult = await runSchemeSyncNow();
  res.json({
    message: syncResult.skipped ? 'Sync already running' : 'Synchronization cycle completed',
    ...syncResult,
  });
}));

/**
 * Approves staged material rule changes for a source that requires manual review.
 * POST /api/schemes/sources/:id/approve-changes
 */
router.post('/sources/:id/approve-changes', requireAuth, asyncHandler(async (req, res) => {
  const source = await SchemeSource.findById(req.params.id);
  if (!source) throw new HttpError(404, 'Source not found in catalogue');

  if (!source.pendingProposedRules) {
    throw new HttpError(400, 'No pending rule changes awaiting approval for this source');
  }

  const scheme = await Scheme.findOne({ code: source.schemeCode });
  if (!scheme) throw new HttpError(404, 'Associated Scheme not found');

  // Activate the approved rules
  scheme.rules = source.pendingProposedRules;
  if (scheme.pendingChanges?.proposedBenefitAmountPerYear != null) {
    scheme.benefitAmountPerYear = scheme.pendingChanges.proposedBenefitAmountPerYear;
  }
  if (scheme.pendingChanges?.proposedBenefitSummary) {
    scheme.benefitSummary = scheme.pendingChanges.proposedBenefitSummary;
  }
  scheme.syncStatus = 'VERIFIED';
  scheme.pendingChanges = null;
  await scheme.save();

  source.syncStatus = 'ACTIVE';
  source.pendingProposedRules = null;
  source.changeSummary = `Rules approved and verified by administrator on ${new Date().toISOString()}`;
  await source.save();

  res.json({
    message: `Proposed rules approved and activated for ${source.schemeCode}`,
    scheme,
    source,
  });
}));

/**
 * Retrieves a single scheme along with its indexed RAG vector chunks.
 * GET /api/schemes/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const scheme = await Scheme.findById(req.params.id);
  if (!scheme) throw new HttpError(404, 'Scheme not found');

  const chunks = await SchemeChunk.find({ scheme: scheme._id }).select('text chunkIndex sourceUrl version');
  res.json({ scheme, chunks });
}));

module.exports = router;
