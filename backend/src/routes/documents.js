const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const Joi = require('joi');
const env = require('../config/env');
const Document = require('../models/Document');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const HttpError = require('../middleware/httpError');
const { readDocumentText } = require('../services/ocrClient');
const { extractFields } = require('../services/extractionService');
const { applyToProfile } = require('../services/profileMerge');
const { reevaluate } = require('../services/reevaluate');
const { DOCUMENT_TYPES, GENDERS, CATEGORIES, OCCUPATIONS, INDIAN_STATES } = require('../constants');

const router = express.Router();
router.use(requireAuth);

const EXT_BY_MIME = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'text/plain': '.txt' };

const upload = multer({
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(env.uploadDir, req.user.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + (EXT_BY_MIME[file.mimetype] || '')),
  }),
  fileFilter: (req, file, cb) => {
    const allowed = Object.keys(EXT_BY_MIME).filter((m) => m !== 'text/plain' || env.allowTextUploads);
    if (!allowed.includes(file.mimetype)) return cb(new HttpError(400, 'Only PDF, JPG and PNG files are allowed'));
    cb(null, true);
  },
});

// Check the real file signature, not just the client-supplied MIME type.
function signatureMatches(filePath, mime) {
  if (mime === 'text/plain') return true;
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);
  if (mime === 'application/pdf') return buf.slice(0, 4).toString() === '%PDF';
  if (mime === 'image/png') return buf.slice(1, 4).toString() === 'PNG';
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  return false;
}

const removeFile = (p) => fs.promises.unlink(p).catch(() => {});
const publicDoc = (doc) => {
  const o = doc.toObject ? doc.toObject() : doc;
  delete o.filePath;
  delete o.storedName;
  return o;
};

router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file received (form field name must be "file")');
  const { documentType } = req.body;
  if (!DOCUMENT_TYPES.includes(documentType)) {
    await removeFile(req.file.path);
    throw new HttpError(400, `documentType must be one of: ${DOCUMENT_TYPES.join(', ')}`);
  }
  if (!signatureMatches(req.file.path, req.file.mimetype)) {
    await removeFile(req.file.path);
    throw new HttpError(400, 'File content does not match its type');
  }

  let rawText = '';
  let extractedData = {};
  let warnings = [];
  try {
    rawText = await readDocumentText(req.file.path, req.file.mimetype, req.file.originalname);
    ({ data: extractedData, warnings } = extractFields(rawText, documentType));
  } catch (err) {
    console.warn('Extraction failed:', err.message);
    warnings = [`Automatic reading failed: ${err.message}. You can still enter the values manually below.`];
  }

  const doc = await Document.create({
    user: req.user.id,
    documentType,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    filePath: req.file.path,
    mimeType: req.file.mimetype,
    size: req.file.size,
    source: 'MANUAL_UPLOAD',
    verified: false,
    rawText,
    extractedData,
    warnings,
  });
  await reevaluate(req.user.id);
  res.status(201).json({ document: publicDoc(doc) });
}));

router.get('/', asyncHandler(async (req, res) => {
  const docs = await Document.find({ user: req.user.id }).select('-filePath -storedName').sort({ createdAt: -1 });
  res.json({ documents: docs });
}));

const confirmSchema = Joi.object({
  name: Joi.string().trim().max(100),
  age: Joi.number().integer().min(0).max(120),
  gender: Joi.string().valid(...GENDERS),
  state: Joi.string().valid(...INDIAN_STATES),
  district: Joi.string().trim().max(100),
  landAreaHectares: Joi.number().greater(0).max(100000),
  occupation: Joi.string().valid(...OCCUPATIONS),
  annualIncome: Joi.number().min(0),
  category: Joi.string().valid(...CATEGORIES),
  bankName: Joi.string().trim().max(100),
});

router.post('/:id/confirm', validate(confirmSchema), asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) throw new HttpError(404, 'Document not found');
  doc.extractedData = req.body;
  doc.status = 'CONFIRMED';
  await doc.save();
  const profile = await applyToProfile(req.user.id, req.body);
  await reevaluate(req.user.id);
  res.json({ document: publicDoc(doc), profile });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const doc = await Document.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!doc) throw new HttpError(404, 'Document not found');
  if (doc.filePath) await removeFile(doc.filePath);
  await reevaluate(req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
