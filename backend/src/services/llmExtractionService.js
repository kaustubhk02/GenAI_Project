/**
 * LLM-assisted document field extraction.
 *
 * Sends OCR'd text (Marathi / Hindi / English) to the Gemini API with a
 * strict JSON schema.  The model is instructed to:
 *   - extract and normalise fields into English
 *   - transliterate Devanagari names (e.g. "सागर राजहंस कुंभारे" → "Sagar Rajhans Kumbhare")
 *   - resolve district / state names to their standard English spellings
 *   - return null for any field it cannot confidently extract
 *   - NEVER decide eligibility or interpret policy – extraction only
 *
 * Each field in the returned object also carries a `_status` twin that is one of:
 *   "extracted"  – the LLM found this value in the document
 *   "null"       – the field was not present / not readable
 *
 * Caller receives:  { data, fieldStatus, warnings }
 */

const env = require('../config/env');

// ─── Gemini REST endpoint ────────────────────────────────────────────────────

function getGeminiUrl() {
  const model = env.geminiModel || 'gemini-3.5-flash';
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// ─── Per-document-type schemas ───────────────────────────────────────────────

/**
 * Returns a prompt that asks the model to extract the right fields for
 * `documentType` from `ocrText`.
 *
 * incomeRecords is an array so that certificates listing multiple financial
 * years are captured in full (the caller / UI will pick the most recent one
 * for the profile when the farmer confirms, or the farmer can choose).
 */
function buildPrompt(ocrText, documentType) {
  const schemaByType = {
    INCOME_CERTIFICATE: `{
  "name": string | null,          // Full name, transliterated to English
  "state": string | null,         // Standard English state name
  "district": string | null,      // Standard English district name
  "incomeRecords": [              // One entry per financial year found
    {
      "financialYear": string,    // e.g. "2023-24"
      "annualIncome": number      // Integer rupees
    }
  ] | null,
  "annualIncome": number | null   // Most recent / only income (rupees)
}`,
    AADHAAR: `{
  "name": string | null,
  "age": number | null,           // Integer years
  "gender": "MALE"|"FEMALE"|"OTHER" | null,
  "state": string | null,
  "district": string | null
}`,
    LAND_RECORD: `{
  "name": string | null,
  "landAreaHectares": number | null,  // Convert Guntha / Acres → Hectares if needed (1 Hectare = 2.471 Acres = 100 Guntha)
  "state": string | null,
  "district": string | null,
  "taluka": string | null,
  "village": string | null
}`,
    EIGHT_A_EXTRACT: `{
  "name": string | null,
  "landAreaHectares": number | null,  // Khate holding area in hectares
  "state": string | null,
  "district": string | null,
  "taluka": string | null,
  "village": string | null
}`,
    CASTE_CERTIFICATE: `{
  "name": string | null,
  "category": "GENERAL"|"OBC"|"SC"|"ST" | null,
  "state": string | null,
  "district": string | null
}`,
    DISABILITY_CERTIFICATE: `{
  "name": string | null,
  "hasDisability": boolean | null,      // true if person has certified disability
  "disabilityPercentage": number | null,// Disability percentage (e.g. 40, 50, 75)
  "state": string | null,
  "district": string | null
}`,
    RATION_CARD: `{
  "name": string | null,
  "category": "GENERAL"|"OBC"|"SC"|"ST" | null,
  "annualIncome": number | null,
  "state": string | null,
  "district": string | null
}`,
    DOMICILE_CERTIFICATE: `{
  "name": string | null,
  "state": string | null,
  "district": string | null,
  "taluka": string | null,
  "village": string | null
}`,
    CROP_SOWING_CERTIFICATE: `{
  "name": string | null,
  "landAreaHectares": number | null,
  "state": string | null,
  "district": string | null,
  "taluka": string | null,
  "village": string | null
}`,
    BANK_PASSBOOK: `{
  "name": string | null,
  "bankName": string | null
}`,
    SOIL_HEALTH_CARD: `{
  "name": string | null,
  "state": string | null,
  "district": string | null,
  "village": string | null
}`,
    KCC_CARD: `{
  "name": string | null,
  "bankName": string | null
}`,
  };

  const schema = schemaByType[documentType] || schemaByType.INCOME_CERTIFICATE;

  return `You are a document field extractor for an Indian government farmer-scheme platform.

TASK
----
Extract structured information from the OCR text below.
The document type is: ${documentType}

RULES (follow strictly)
-----------------------
1. Return ONLY a single valid JSON object matching the schema.  No markdown, no prose.
2. If a field is not present or you cannot read it confidently, set it to null.
3. Transliterate all Devanagari (Marathi / Hindi) names, places, and values into
   their standard English equivalents.
   Examples:
     "सागर राजहंस कुंभारे"  →  "Sagar Rajhans Kumbhare"
     "जिल्हा धुळे"           →  "Dhule"
     "महाराष्ट्र"              →  "Maharashtra"
     "अनुसूचित जाती"          →  "SC"
4. For income_records include one entry for EVERY financial year you find.
5. Do NOT make eligibility decisions.  Extract only.
6. Numbers must be plain integers/floats – no commas, no currency symbols.
7. State names must be standard Indian state names in English (e.g. "Maharashtra",
   "Uttar Pradesh").
8. Category must be exactly one of: GENERAL, OBC, SC, ST.  Map common Marathi/Hindi
   equivalents:
     खुला / सर्वसाधारण / General   →  GENERAL
     इतर मागासवर्ग / OBC            →  OBC
     अनुसूचित जाती / SC             →  SC
     अनुसूचित जमाती / ST            →  ST

JSON SCHEMA
-----------
${schema}

OCR TEXT
--------
${ocrText}

Return only the JSON object:`;
}

// ─── LLM call ────────────────────────────────────────────────────────────────

async function callGemini(prompt) {
  const apiKey = env.geminiApiKey;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const modelsToTry = [
    env.geminiModel,
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        // If 503 (high demand) or 404 (model retired) or 429, try next model
        if ([503, 404, 429].includes(res.status)) {
          console.warn(`[callGemini] Model ${model} returned ${res.status}. Failing over to next candidate...`);
          lastError = new Error(`Gemini API error ${res.status} on ${model}: ${detail}`);
          continue;
        }
        throw new Error(`Gemini API error ${res.status}: ${detail}`);
      }

      const json = await res.json();
      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error(`Gemini (${model}) returned an empty response`);
      return raw.trim();
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes('503') || err.message.includes('404') || err.message.includes('429'))) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All Gemini model candidates failed');
}

// ─── Parse + validate LLM output ─────────────────────────────────────────────

function parseAndValidate(raw, documentType) {
  // Strip ```json … ``` fences if the model adds them despite instructions
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`LLM returned non-JSON: ${raw.slice(0, 200)}`);
  }

  const VALID_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
    'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
  ];

  const warnings = [];
  const data = {};
  const fieldStatus = {};

  // Helper: record a field's status
  const set = (key, value) => {
    if (value !== null && value !== undefined && value !== '') {
      data[key] = value;
      fieldStatus[key] = 'extracted';
    } else {
      fieldStatus[key] = 'null';
    }
  };

  // ── Common fields ──────────────────────────────────────────────────────────

  if ('name' in parsed) {
    const n = typeof parsed.name === 'string' ? parsed.name.trim() : null;
    set('name', n && n.length > 0 ? n : null);
  }

  if ('age' in parsed) {
    const a = Number(parsed.age);
    set('age', Number.isFinite(a) && a > 0 && a < 121 ? Math.round(a) : null);
  }

  if ('gender' in parsed) {
    const g = ['MALE', 'FEMALE', 'OTHER'].includes(parsed.gender) ? parsed.gender : null;
    set('gender', g);
  }

  if ('state' in parsed) {
    const raw = typeof parsed.state === 'string' ? parsed.state.trim() : null;
    const matched = raw
      ? VALID_STATES.find((s) => s.toLowerCase() === raw.toLowerCase()) || null
      : null;
    if (raw && !matched) {
      warnings.push(`State "${raw}" could not be matched to a known Indian state – please select it manually.`);
    }
    set('state', matched);
  }

  if ('district' in parsed) {
    const d = typeof parsed.district === 'string' ? parsed.district.trim() : null;
    set('district', d && d.length > 0 ? d : null);
  }

  if ('taluka' in parsed) {
    const t = typeof parsed.taluka === 'string' ? parsed.taluka.trim() : null;
    set('taluka', t && t.length > 0 ? t : null);
  }

  if ('village' in parsed) {
    const v = typeof parsed.village === 'string' ? parsed.village.trim() : null;
    set('village', v && v.length > 0 ? v : null);
  }

  if ('category' in parsed) {
    const c = ['GENERAL', 'OBC', 'SC', 'ST'].includes(parsed.category) ? parsed.category : null;
    set('category', c);
  }

  if ('hasDisability' in parsed) {
    const hd = typeof parsed.hasDisability === 'boolean' ? parsed.hasDisability : (parsed.hasDisability === 'true' || parsed.hasDisability === 'yes');
    set('hasDisability', hd);
  }

  if ('disabilityPercentage' in parsed) {
    const dp = Number(parsed.disabilityPercentage);
    set('disabilityPercentage', Number.isFinite(dp) && dp >= 0 && dp <= 100 ? Math.round(dp) : null);
  }

  if ('annualIncome' in parsed) {
    const inc = Number(parsed.annualIncome);
    set('annualIncome', Number.isFinite(inc) && inc >= 0 ? inc : null);
  }

  if ('landAreaHectares' in parsed) {
    const la = Number(parsed.landAreaHectares);
    set('landAreaHectares', Number.isFinite(la) && la > 0 ? Math.round(la * 100) / 100 : null);
  }

  if ('occupation' in parsed) {
    const VALID_OCC = ['FARMER', 'TENANT_FARMER', 'AGRICULTURAL_LABOURER', 'OTHER'];
    const o = VALID_OCC.includes(parsed.occupation) ? parsed.occupation : null;
    set('occupation', o);
  }

  if ('bankName' in parsed) {
    const b = typeof parsed.bankName === 'string' ? parsed.bankName.trim() : null;
    set('bankName', b && b.length > 0 ? b : null);
  }

  // ── Income records (multi-year) ────────────────────────────────────────────
  if ('incomeRecords' in parsed) {
    const records = Array.isArray(parsed.incomeRecords) ? parsed.incomeRecords : null;
    if (records && records.length > 0) {
      const clean = records
        .map((r) => ({
          financialYear: typeof r.financialYear === 'string' ? r.financialYear.trim() : null,
          annualIncome: Number.isFinite(Number(r.annualIncome)) ? Number(r.annualIncome) : null,
        }))
        .filter((r) => r.financialYear && r.annualIncome !== null);
      if (clean.length > 0) {
        data.incomeRecords = clean;
        fieldStatus.incomeRecords = 'extracted';
        // If annualIncome is not separately set, use the last (most recent) record
        if (!data.annualIncome) {
          const last = clean[clean.length - 1];
          data.annualIncome = last.annualIncome;
          fieldStatus.annualIncome = 'extracted';
        }
      } else {
        fieldStatus.incomeRecords = 'null';
      }
    } else {
      fieldStatus.incomeRecords = 'null';
    }
  }

  return { data, fieldStatus, warnings };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract fields from OCR text using the Gemini LLM.
 *
 * @param {string} ocrText   - raw text from the OCR service
 * @param {string} documentType - one of DOCUMENT_TYPES
 * @returns {{ data: object, fieldStatus: object, warnings: string[] }}
 */
async function extractWithLLM(ocrText, documentType) {
  const prompt = buildPrompt(ocrText, documentType);
  const raw = await callGemini(prompt);
  return parseAndValidate(raw, documentType);
}

module.exports = { extractWithLLM };
