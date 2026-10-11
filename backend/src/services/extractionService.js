/**
 * Document field extraction pipeline.
 *
 * Strategy:
 *   1. Try LLM extraction (Gemini) → handles Marathi/Hindi/English text natively.
 *   2. If LLM unavailable or fails → fall back to legacy regex-based extraction.
 *
 * The caller (documents route) always receives:
 *   { data, fieldStatus, warnings }
 *
 * fieldStatus is a map of fieldKey → "extracted" | "null"
 * so the frontend can visually distinguish auto-filled fields from empty ones.
 */

const { extractWithLLM } = require('./llmExtractionService');
const { INDIAN_STATES, CATEGORIES, ALLOWED_FIELDS } = require('../constants');
const env = require('../config/env');

// ─── Legacy regex helpers (fallback only) ────────────────────────────────────

function field(text, labels) {
  const re = new RegExp(`^\\s*(?:${labels})\\s*[:\\-]\\s*(.+?)\\s*$`, 'im');
  const m = text.match(re);
  return m ? m[1].trim() : undefined;
}

function parseIncome(raw) {
  const m = raw && raw.match(/\d[\d,]*(?:\.\d+)?/);
  return m ? Number(m[0].replace(/,/g, '')) : undefined;
}

function parseArea(raw) {
  const m = raw && raw.match(/(\d+(?:\.\d+)?)\s*(hectares?|ha|acres?)?/i);
  if (!m) return undefined;
  let v = Number(m[1]);
  if (m[2] && /^acre/i.test(m[2])) v *= 0.404686;
  return Math.round(v * 100) / 100;
}

function parseAge(text, now = new Date()) {
  const direct = field(text, 'Age|वये|वय|Age/वय');
  if (direct && /^\d{1,3}/.test(direct)) return parseInt(direct, 10);
  const dob = field(text, 'Date of Birth|DOB|जन्म तारीख|जन्म तिथी|DOB/जन्म तारीख');
  if (dob) {
    const m = dob.match(/(\d{1,2})[/\-.]\s*(\d{1,2})[/\-.]\s*(\d{4})/);
    if (m) {
      const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
      let age = now.getFullYear() - y;
      if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age -= 1;
      return age;
    }
  }
  const yob = field(text, 'Year of Birth');
  if (yob && /\d{4}/.test(yob)) return now.getFullYear() - Number(yob.match(/\d{4}/)[0]);
  return undefined;
}

const canonicalState = (raw) =>
  raw ? INDIAN_STATES.find((s) => s.toLowerCase() === raw.trim().toLowerCase()) : undefined;

function parseGender(raw) {
  if (!raw) return undefined;
  const r = raw.trim().toLowerCase();
  if (/^(m|male)\b/.test(r)) return 'MALE';
  if (/^(f|female)\b/.test(r)) return 'FEMALE';
  return 'OTHER';
}

function parseOccupation(raw) {
  if (!raw) return undefined;
  const r = raw.toLowerCase();
  if (r.includes('tenant')) return 'TENANT_FARMER';
  if (r.includes('labour') || r.includes('laborer')) return 'AGRICULTURAL_LABOURER';
  if (r.includes('farmer') || r.includes('cultivator')) return 'FARMER';
  return 'OTHER';
}

function parseCategory(raw) {
  if (!raw) return undefined;
  const r = raw.trim().toUpperCase();
  return CATEGORIES.find((c) => r === c || r.startsWith(`${c} `) || r.startsWith(`${c}(`));
}

function legacyExtract(rawText, documentType, now = new Date()) {
  const text = (rawText || '').replace(/\r/g, '');
  const stateRaw = field(text, 'State');
  const candidates = {
    name: field(text, 'Account Holder Name|Account Holder|Owner Name|Applicant Name|Holder Name|Name|नाव|Name/नाव|Full Name'),
    age: parseAge(text, now),
    gender: parseGender(field(text, 'Gender|Sex|लिंग|Gender/लिंग')),
    state: canonicalState(stateRaw),
    district: field(text, 'District'),
    landAreaHectares: parseArea(field(text, 'Total Area|Land Area|Area')),
    occupation: parseOccupation(field(text, 'Occupation')),
    annualIncome: parseIncome(field(text, 'Total Annual Income|Annual Income|Income')),
    category: parseCategory(field(text, 'Caste Category|Category')),
    bankName: field(text, 'Bank Name'),
  };

  const allowed = ALLOWED_FIELDS[documentType] || [];
  const data = {};
  const fieldStatus = {};
  const warnings = [];

  for (const key of allowed) {
    const v = candidates[key];
    const invalid =
      v === undefined || v === '' ||
      (typeof v === 'number' && !Number.isFinite(v)) ||
      (key === 'annualIncome' && v < 0) ||
      (key === 'landAreaHectares' && v <= 0) ||
      (key === 'age' && (v < 0 || v > 120));

    if (invalid) {
      fieldStatus[key] = 'null';
      warnings.push(
        key === 'state' && stateRaw
          ? `State "${stateRaw}" is not a recognised state name - please select it manually.`
          : `Could not find "${key}" in the document - please enter it manually.`,
      );
    } else {
      data[key] = v;
      fieldStatus[key] = 'extracted';
    }
  }

  return { data, fieldStatus, warnings };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extract fields from OCR text.
 * Tries LLM first (if GEMINI_API_KEY is configured), falls back to regex.
 *
 * Returns: { data, fieldStatus, warnings, extractionMethod }
 *   extractionMethod: "llm" | "regex"
 */
async function extractFields(rawText, documentType, now = new Date()) {
  const allowed = ALLOWED_FIELDS[documentType] || [];

  // ── LLM path ────────────────────────────────────────────────────────────────
  // Skip live LLM network calls during unit testing to avoid exhausting free-tier rate limits
  if (env.geminiApiKey && process.env.NODE_ENV !== 'test') {
    try {
      const { data: llmData, fieldStatus: llmStatus, warnings: llmWarnings } =
        await extractWithLLM(rawText, documentType);

      // Keep only allowed fields (drop any the LLM added speculatively)
      const data = {};
      const fieldStatus = {};
      for (const key of allowed) {
        if (llmData[key] !== undefined) {
          data[key] = llmData[key];
        }
        fieldStatus[key] = llmStatus[key] || 'null';
      }
      // incomeRecords is special – allowed for INCOME_CERTIFICATE beyond the base set
      if (documentType === 'INCOME_CERTIFICATE' && llmData.incomeRecords) {
        data.incomeRecords = llmData.incomeRecords;
        fieldStatus.incomeRecords = llmStatus.incomeRecords || 'null';
      }

      const nullFields = allowed.filter((k) => fieldStatus[k] === 'null');
      const nullWarnings = nullFields.map((k) =>
        `"${k}" was not found in the document – please enter it manually.`,
      );

      return {
        data,
        fieldStatus,
        warnings: [...llmWarnings, ...nullWarnings],
        extractionMethod: 'llm',
      };
    } catch (err) {
      console.warn('[extractFields] LLM extraction failed, falling back to regex:', err.message);
    }
  }

  // ── Regex fallback ───────────────────────────────────────────────────────────
  const result = legacyExtract(rawText, documentType, now);
  return { ...result, extractionMethod: 'regex' };
}

module.exports = { extractFields };
