const fs = require('fs');
const env = require('../config/env');

/** Returns raw text for a stored file. Plain-text samples are read directly; everything else goes to the Python OCR service. */
async function readDocumentText(filePath, mimeType, originalName) {
  if (mimeType === 'text/plain') return fs.promises.readFile(filePath, 'utf8');

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
  return json.text || '';
}

module.exports = { readDocumentText };
