const fs = require('fs');
const env = require('../config/env');

/**
 * Calls the Python OCR service for a document file.
 * Returns { text, language, confidence, method } so callers can log/store
 * full OCR metadata alongside the raw text.
 *
 * Plain-text uploads are returned directly without hitting the OCR service.
 */
async function readDocument(filePath, mimeType, originalName) {
  if (mimeType === 'text/plain') {
    const text = await fs.promises.readFile(filePath, 'utf8');
    return { text, language: 'text', confidence: null, method: 'direct' };
  }

  const buf = await fs.promises.readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mimeType }), originalName || 'upload');

  let res;
  try {
    res = await fetch(`${env.ocrServiceUrl}/ocr`, { method: 'POST', body: form });
  } catch {
    throw new Error('OCR service is not reachable (is python-services/ocr-service running?)');
  }

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).detail; } catch { /* ignore */ }
    throw new Error(`OCR service error ${res.status}${detail ? `: ${detail}` : ''}`);
  }

  const json = await res.json();
  return {
    text: json.text || '',
    language: json.language || null,
    confidence: json.confidence ?? null,
    method: json.method || null,
  };
}

/**
 * Backwards-compat shim used by tests / any code that only wants the text.
 */
async function readDocumentText(filePath, mimeType, originalName) {
  const { text } = await readDocument(filePath, mimeType, originalName);
  return text;
}

module.exports = { readDocument, readDocumentText };
