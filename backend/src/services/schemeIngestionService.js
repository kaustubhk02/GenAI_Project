/**
 * Scheme Ingestion Service.
 *
 * Ingests official government scheme documentation from PDF URLs or Web URLs.
 * Extracts full text using the OCR/PDF service, parses structured eligibility rules
 * and scheme metadata via Gemini AI, upserts the Scheme model, and indexes the text
 * into the VectorDB (SchemeChunk) for RAG-powered eligibility explanations.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const { DOCUMENT_TYPES } = require('../constants');
const Scheme = require('../models/Scheme');
const SchemeChunk = require('../models/SchemeChunk');
const { readDocument } = require('./ocrClient');
const { indexSchemeText } = require('./ragService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const https = require('https');
const http = require('http');

/**
 * Downloads binary or text from a remote URL with redirect and SSL certificate tolerance.
 * Indian government websites (.gov.in) frequently use NIC/CCA certs that require rejectUnauthorized: false.
 */
function downloadBufferWithRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          return resolve(downloadBufferWithRedirects(redirectUrl, maxRedirects - 1));
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Failed to fetch URL (${res.statusCode} ${res.statusMessage || 'Error'}): ${url}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: (res.headers['content-type'] || '').toLowerCase(),
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(45000, () => {
      req.destroy();
      reject(new Error(`Connection timed out while fetching ${url}`));
    });
  });
}

/**
 * Downloads a remote PDF/file or fetches web text from a URL.
 *
 * @param {string} url - Target Web or PDF URL
 * @returns {Promise<{ text: string, sourceName: string, mimeType: string }>}
 */
async function fetchAndExtractUrlContent(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('A valid HTTP/HTTPS URL is required');
  }

  const { buffer, contentType } = await downloadBufferWithRedirects(url);

  // Check if PDF by content-type or binary magic bytes (%PDF) or URL extension
  const isPdf =
    contentType.includes('application/pdf') ||
    (buffer.length >= 4 && buffer.slice(0, 4).toString() === '%PDF') ||
    url.toLowerCase().split('?')[0].endsWith('.pdf');

  if (isPdf) {
    // Write buffer to a temp file in uploadDir scratch
    const scratchDir = path.join(env.uploadDir, 'temp_ingest');
    fs.mkdirSync(scratchDir, { recursive: true });
    const tempFilePath = path.join(scratchDir, `ingest_${crypto.randomUUID()}.pdf`);

    try {
      await fs.promises.writeFile(tempFilePath, buffer);

      const ocrResult = await readDocument(tempFilePath, 'application/pdf', path.basename(url));
      return {
        text: ocrResult.text || '',
        sourceName: path.basename(url).split('?')[0] || 'Official PDF Document',
        mimeType: 'application/pdf',
      };
    } finally {
      fs.promises.unlink(tempFilePath).catch(() => {});
    }
  } else {
    // Handle Web HTML / Plain Text
    const rawHtml = buffer.toString('utf8');
    // Clean basic HTML tags, scripts, and stylesheets
    const cleanedText = rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text: cleanedText,
      sourceName: new URL(url).hostname || 'Official Web Portal',
      mimeType: 'text/html',
    };
  }
}

/**
 * Uses Gemini LLM to parse structured scheme metadata & rule AST from official text.
 */
async function parseSchemeMetadataWithLLM(text, sourceUrl, fallbackCode = null) {
  const prompt = `You are a Senior Agricultural Policy & Government Welfare Scheme Analyst for India.

TASK:
Analyze the official government scheme document text below and extract a structured JSON representation matching our platform's standard scheme specification.

DOCUMENT SOURCE URL: ${sourceUrl}
FALLBACK CODE (if discernible): ${fallbackCode || 'AUTO'}

VALID REQUIRED DOCUMENT CODES (select ONLY from this list):
${JSON.stringify(DOCUMENT_TYPES)}

VALID FARMER PROFILE FIELDS & OPERATORS:
- agriculture.occupation: "FARMER" | "TENANT_FARMER" | "AGRICULTURAL_LABOURER" | "OTHER" (use "IN" operator)
- agriculture.landAreaHectares: number in hectares (operators: "<=", ">=", ">", "<")
- agriculture.farmerType: "INDIVIDUAL" | "JOINT" | "OTHER"
- personal.age: number (operators: ">=", "<=", ">", "<", "==")
- personal.gender: "MALE" | "FEMALE" | "OTHER"
- financial.annualIncome: number in rupees (operator: "<=")
- social.category: "GENERAL" | "OBC" | "SC" | "ST" (operators: "IN", "==")
- social.hasDisability: boolean (operator: "==")
- social.disabilityPercentage: number (operator: ">=")
- location.state: string (operator: "==")

OUTPUT JSON SCHEMA:
{
  "code": "SHORT_UNIQUE_SCHEME_CODE (e.g. PM-KMY, PM-KISAN, PMFBY, KCC)",
  "name": "Full official scheme name in English",
  "description": "2-3 sentence overview of the scheme's purpose and scope",
  "department": "Name of the Government Department / Ministry",
  "benefitSummary": "Concise summary of direct financial or material assistance (e.g. ₹3,000/month pension)",
  "benefitAmountPerYear": 0, // Estimated annual financial value in INR as integer
  "officialApplicationUrl": "${sourceUrl}",
  "requiredDocuments": ["AADHAAR", "LAND_RECORD", ...], // Choose only valid document types
  "rules": {
    "all": [
      {
        "field": "agriculture.occupation",
        "operator": "IN",
        "value": ["FARMER", "TENANT_FARMER"],
        "label": "Human readable rule description in English"
      }
    ]
  }
}

DOCUMENT TEXT:
${text.slice(0, 15000)}

Return ONLY the valid JSON object. No markdown fences, no conversational prose.`;

  const apiKey = env.geminiApiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for automatic scheme rule parsing');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelCandidates = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastErr = null;

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const rawJson = result.response.text().trim();
      const parsed = JSON.parse(rawJson);
      return parsed;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('Failed to parse scheme metadata with Gemini');
}

/**
 * End-to-end Scheme Ingestion Pipeline:
 * URL -> Download/OCR -> Gemini Parsing -> MongoDB Scheme Upsert -> VectorDB Chunking & Embedding.
 *
 * @param {object} params
 * @param {string} params.url - URL of PDF or Web Page
 * @param {string} [params.code] - Optional manual override for scheme code
 * @param {string} [params.sourceName] - Name of issuing authority or portal
 * @returns {Promise<{ scheme: object, chunksCount: number, textLength: number }>}
 */
async function ingestSchemeFromUrl({ url, code = null, sourceName = null }) {
  // 1. Download & extract text from PDF or Web URL
  const { text, sourceName: detectedName, mimeType } = await fetchAndExtractUrlContent(url);
  if (!text || text.trim().length < 50) {
    throw new Error('Could not extract readable text from the provided URL');
  }

  // 2. Parse scheme metadata & eligibility rules via Gemini
  let metadata;
  try {
    metadata = await parseSchemeMetadataWithLLM(text, url, code);
  } catch (err) {
    console.warn(`[ingestSchemeFromUrl] LLM parsing failed (${err.message}). Using fallback defaults.`);
    metadata = {
      code: code || `SCHEME-${Date.now()}`,
      name: detectedName || 'Government Agricultural Scheme',
      description: text.slice(0, 300) + '...',
      department: 'Ministry of Agriculture & Farmers Welfare',
      benefitSummary: 'Direct government agricultural scheme benefits',
      benefitAmountPerYear: 0,
      officialApplicationUrl: url,
      requiredDocuments: ['AADHAAR', 'LAND_RECORD', 'BANK_PASSBOOK'],
      rules: {
        all: [
          {
            field: 'agriculture.occupation',
            operator: 'IN',
            value: ['FARMER', 'TENANT_FARMER'],
            label: 'Applicant is a practicing farmer',
          },
        ],
      },
    };
  }

  const schemeCode = (code || metadata.code || `SCHEME-${Date.now()}`).toUpperCase().trim();

  // 3. Upsert Scheme in MongoDB
  const schemeDoc = await Scheme.findOneAndUpdate(
    { code: schemeCode },
    {
      $set: {
        code: schemeCode,
        name: metadata.name,
        description: metadata.description,
        department: metadata.department,
        benefitSummary: metadata.benefitSummary,
        benefitAmountPerYear: Number(metadata.benefitAmountPerYear) || 0,
        rules: metadata.rules || { all: [] },
        requiredDocuments: (metadata.requiredDocuments || []).filter((d) => DOCUMENT_TYPES.includes(d)),
        officialApplicationUrl: metadata.officialApplicationUrl || url,
        source: {
          type: mimeType === 'application/pdf' ? 'PERMITTED_PDF' : 'OFFICIAL_API',
          name: sourceName || detectedName,
          url,
          retrievedAt: new Date(),
          lastVerifiedAt: new Date(),
          note: `Ingested from ${url} via automated RAG Ingestion Engine`,
        },
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 4. Index full document text into VectorDB (SchemeChunk collection)
  const fullTextToEmbed = `Scheme Name: ${schemeDoc.name}
Department: ${schemeDoc.department}
Source URL: ${url}
Description: ${schemeDoc.description}
Benefits: ${schemeDoc.benefitSummary} (Amount: ₹${schemeDoc.benefitAmountPerYear}/year)
Eligibility Rules: ${JSON.stringify(schemeDoc.rules)}
Required Documents: ${schemeDoc.requiredDocuments.join(', ')}
Official Documentation Text:
${text}`;

  const chunksCount = await indexSchemeText(schemeDoc._id, fullTextToEmbed, url);

  return {
    scheme: schemeDoc,
    chunksCount,
    textLength: text.length,
    sourceUrl: url,
  };
}

module.exports = {
  fetchAndExtractUrlContent,
  parseSchemeMetadataWithLLM,
  ingestSchemeFromUrl,
};
