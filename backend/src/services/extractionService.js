/**
 * Rule/regex based structured extraction: raw OCR text -> typed, validated fields.
 * (LLM-assisted extraction for messy text is a later roadmap step; it would plug in here
 * and its output would still pass through the same validation.)
 */
const { INDIAN_STATES, CATEGORIES, ALLOWED_FIELDS } = require('../constants');

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
  const direct = field(text, 'Age');
  if (direct && /^\d{1,3}/.test(direct)) return parseInt(direct, 10);
  const dob = field(text, 'Date of Birth|DOB');
  if (dob) {
    const m = dob.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
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

const canonicalState = (raw) => (raw ? INDIAN_STATES.find((s) => s.toLowerCase() === raw.trim().toLowerCase()) : undefined);

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

function extractFields(rawText, documentType, now = new Date()) {
  const text = (rawText || '').replace(/\r/g, '');
  const stateRaw = field(text, 'State');
  const candidates = {
    name: field(text, 'Account Holder Name|Account Holder|Owner Name|Applicant Name|Holder Name|Name'),
    age: parseAge(text, now),
    gender: parseGender(field(text, 'Gender|Sex')),
    state: canonicalState(stateRaw),
    district: field(text, 'District'),
    landAreaHectares: parseArea(field(text, 'Total Area|Land Area|Area')),
    occupation: parseOccupation(field(text, 'Occupation')),
    annualIncome: parseIncome(field(text, 'Total Annual Income|Annual Income|Income')),
    category: parseCategory(field(text, 'Caste Category|Category')),
    bankName: field(text, 'Bank Name'),
  };

  const data = {};
  const warnings = [];
  for (const key of ALLOWED_FIELDS[documentType] || []) {
    const v = candidates[key];
    if (v === undefined || v === '' || (typeof v === 'number' && !Number.isFinite(v))) {
      warnings.push(key === 'state' && stateRaw
        ? `State "${stateRaw}" is not a recognised state name - please select it manually.`
        : `Could not find "${key}" in the document - please enter it manually.`);
      continue;
    }
    if (key === 'annualIncome' && v < 0) { warnings.push('Income looked invalid and was ignored.'); continue; }
    if (key === 'landAreaHectares' && v <= 0) { warnings.push('Land area looked invalid and was ignored.'); continue; }
    if (key === 'age' && (v < 0 || v > 120)) { warnings.push('Age looked invalid and was ignored.'); continue; }
    data[key] = v;
  }
  return { data, warnings };
}

module.exports = { extractFields };
