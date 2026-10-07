import { FIELD_DEFS } from '../constants.js';

export default function FieldInput({ fieldKey, value, onChange }) {
  const def = FIELD_DEFS[fieldKey];
  const v = value ?? '';
  return (
    <label>
      {def.label}
      {def.type === 'select' ? (
        <select value={v} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select...</option>
          {def.options.map((o) => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}
        </select>
      ) : (
        <input type={def.type} step={def.step} min={def.type === 'number' ? 0 : undefined} value={v} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

// Convert form strings to typed values and drop empties
export function cleanValues(values) {
  const out = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === '' || v === null || v === undefined) continue;
    out[k] = FIELD_DEFS[k]?.type === 'number' ? Number(v) : v;
  }
  return out;
}
