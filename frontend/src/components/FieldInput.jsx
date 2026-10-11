import { FIELD_DEFS } from '../constants.js';

/**
 * Status badge shown next to an extracted field label.
 *   "extracted" → green "Auto-filled" chip
 *   "null"      → yellow "Not found" chip
 *   undefined   → nothing (manual entry, no badge)
 */
function ExtractionBadge({ status }) {
  if (!status) return null;
  if (status === 'extracted') {
    return (
      <span className="extraction-badge extracted" title="Automatically filled from document">
        ✓ Auto-filled
      </span>
    );
  }
  if (status === 'null') {
    return (
      <span className="extraction-badge not-found" title="Not found in document – please enter manually">
        ⚠ Not found
      </span>
    );
  }
  return null;
}

/**
 * Read-only table showing multi-year income records from an income certificate.
 */
function IncomeRecordsDisplay({ records }) {
  if (!Array.isArray(records) || records.length === 0) {
    return <p className="muted" style={{ fontSize: '0.85rem', margin: '4px 0' }}>No income records extracted.</p>;
  }
  return (
    <table className="income-records-table">
      <thead>
        <tr>
          <th>Financial Year</th>
          <th>Annual Income (₹)</th>
        </tr>
      </thead>
      <tbody>
        {records.map((r, i) => (
          <tr key={i}>
            <td>{r.financialYear ?? '—'}</td>
            <td>{r.annualIncome != null ? r.annualIncome.toLocaleString('en-IN') : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Generic field input that renders correctly for:
 *   text, number, select, income-records
 *
 * Props:
 *   fieldKey   – key into FIELD_DEFS
 *   value      – current value (string | number | object[])
 *   onChange   – (newValue) callback
 *   status     – "extracted" | "null" | undefined  (from fieldStatus map)
 */
export default function FieldInput({ fieldKey, value, onChange, status }) {
  const def = FIELD_DEFS[fieldKey];
  if (!def) return null;

  const v = value ?? '';

  // ── Income records: read-only display (the farmer edits annualIncome directly) ──
  if (def.type === 'income-records') {
    return (
      <label className="field-full">
        <span className="field-label-row">
          {def.label}
          <ExtractionBadge status={status} />
        </span>
        <IncomeRecordsDisplay records={v} />
      </label>
    );
  }

  // ── Select ────────────────────────────────────────────────────────────────────
  if (def.type === 'select') {
    return (
      <label className={status === 'extracted' ? 'field-extracted' : ''}>
        <span className="field-label-row">
          {def.label}
          <ExtractionBadge status={status} />
        </span>
        <select value={v} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select...</option>
          {def.options.map((o) => (
            <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>
          ))}
        </select>
      </label>
    );
  }

  // ── Text / number ─────────────────────────────────────────────────────────────
  return (
    <label className={status === 'extracted' ? 'field-extracted' : ''}>
      <span className="field-label-row">
        {def.label}
        <ExtractionBadge status={status} />
      </span>
      <input
        type={def.type}
        step={def.step}
        min={def.type === 'number' ? 0 : undefined}
        value={v}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// Convert form strings to typed values and drop empties
export function cleanValues(values) {
  const out = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === '' || v === null || v === undefined) continue;
    // Skip the incomeRecords array – it's display-only; annualIncome holds the editable value
    if (k === 'incomeRecords') continue;
    out[k] = FIELD_DEFS[k]?.type === 'number' ? Number(v) : v;
  }
  return out;
}
