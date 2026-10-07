/**
 * Deterministic, rule-based eligibility engine. No LLM is involved anywhere in this file.
 *
 * Rule tree (stored as data on each Scheme):
 *   leaf : { field: 'financial.annualIncome', operator: '<=', value: 200000, label: 'optional text' }
 *   AND  : { all: [ ...nodes ] }
 *   OR   : { any: [ ...nodes ] }
 *   NOT  : { not: node }
 *
 * Three-valued logic: every node evaluates to true, false, or null (= unknown, data missing).
 * A missing field is NEVER treated as a failed condition.
 */
const STATUS = {
  ELIGIBLE: 'ELIGIBLE',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  INCOMPLETE: 'INCOMPLETE',
  ALMOST_ELIGIBLE: 'ALMOST_ELIGIBLE',
};
const STATUS_RANK = { NOT_ELIGIBLE: 0, INCOMPLETE: 1, ALMOST_ELIGIBLE: 2, ELIGIBLE: 3 };
const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'IN'];

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function isMissing(v) {
  return v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v));
}

const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

function compare(operator, actual, expected) {
  switch (operator) {
    case '=': return norm(actual) === norm(expected);
    case '!=': return norm(actual) !== norm(expected);
    case '>': return Number(actual) > Number(expected);
    case '<': return Number(actual) < Number(expected);
    case '>=': return Number(actual) >= Number(expected);
    case '<=': return Number(actual) <= Number(expected);
    case 'IN': return Array.isArray(expected) && expected.map(norm).includes(norm(actual));
    default: throw new Error(`Unsupported operator: ${operator}`);
  }
}

function evaluateNode(node, profile, trace = []) {
  if (!node || typeof node !== 'object') throw new Error('Invalid rule node');

  if (Array.isArray(node.all)) {
    const results = node.all.map((n) => evaluateNode(n, profile, trace));
    if (results.includes(false)) return false;
    if (results.includes(null)) return null;
    return true;
  }
  if (Array.isArray(node.any)) {
    const results = node.any.map((n) => evaluateNode(n, profile, trace));
    if (results.includes(true)) return true;
    if (results.includes(null)) return null;
    return false;
  }
  if (node.not) {
    const r = evaluateNode(node.not, profile, trace);
    return r === null ? null : !r;
  }

  // leaf
  if (typeof node.field !== 'string' || !OPERATORS.includes(node.operator)) {
    throw new Error(`Invalid rule leaf: ${JSON.stringify(node)}`);
  }
  const base = { field: node.field, operator: node.operator, value: node.value, label: node.label };
  const actual = getByPath(profile, node.field);
  if (isMissing(actual)) {
    trace.push({ ...base, outcome: 'unknown' });
    return null;
  }
  const ok = compare(node.operator, actual, node.value);
  trace.push({ ...base, actual, outcome: ok ? 'matched' : 'failed' });
  return ok;
}

/**
 * @param {object} profile            plain FarmerProfile object
 * @param {object} scheme             { rules, requiredDocuments, ... }
 * @param {string[]} availableDocTypes document types the farmer has uploaded
 */
function checkEligibility(profile, scheme, availableDocTypes = []) {
  const trace = [];
  const outcome = evaluateNode(scheme.rules, profile || {}, trace);

  const matchedRules = trace.filter((t) => t.outcome === 'matched');
  const failedRules = trace.filter((t) => t.outcome === 'failed');
  const missingInformation = [...new Set(trace.filter((t) => t.outcome === 'unknown').map((t) => t.field))];

  const required = scheme.requiredDocuments || [];
  const have = new Set(availableDocTypes);
  const missingDocuments = required.filter((d) => !have.has(d));
  const completionPercent = required.length
    ? Math.round(((required.length - missingDocuments.length) / required.length) * 100)
    : 100;

  let status;
  if (outcome === false) status = STATUS.NOT_ELIGIBLE;
  else if (outcome === null) status = STATUS.INCOMPLETE;
  else if (missingDocuments.length > 0) status = STATUS.ALMOST_ELIGIBLE;
  else status = STATUS.ELIGIBLE;

  return { status, matchedRules, failedRules, missingInformation, missingDocuments, completionPercent };
}

module.exports = { checkEligibility, evaluateNode, STATUS, STATUS_RANK, OPERATORS };
