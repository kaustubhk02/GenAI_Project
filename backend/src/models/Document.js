const mongoose = require('mongoose');
const { DOCUMENT_TYPES } = require('../constants');

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  documentType: { type: String, enum: DOCUMENT_TYPES, required: true },
  originalName: String,
  storedName: String,
  filePath: String,
  mimeType: String,
  size: Number,
  source: { type: String, enum: ['MANUAL_UPLOAD', 'DIGILOCKER'], default: 'MANUAL_UPLOAD' },
  verified: { type: Boolean, default: false }, // only a real DigiLocker issued document may ever set this true
  rawText: String,
  extractedData: { type: mongoose.Schema.Types.Mixed, default: {} },
  warnings: [String],
  status: { type: String, enum: ['PENDING_REVIEW', 'CONFIRMED'], default: 'PENDING_REVIEW' },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
