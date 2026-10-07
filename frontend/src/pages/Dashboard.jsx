import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { DOC_TYPES, PATH_LABELS, STATUS_LABEL } from '../constants.js';

const ORDER = ['ELIGIBLE', 'ALMOST_ELIGIBLE', 'INCOMPLETE', 'NOT_ELIGIBLE'];
const CLASS = { ELIGIBLE: 'eligible', ALMOST_ELIGIBLE: 'almost', INCOMPLETE: 'incomplete', NOT_ELIGIBLE: 'not' };
const ruleText = (r) => r.label || `${r.field} ${r.operator} ${JSON.stringify(r.value)}`;

function SchemeCard({ item }) {
  const { scheme, status } = item;
  return (
    <section className="card">
      <div className="row between">
        <h3>{scheme.name}</h3>
        <span className={`badge ${CLASS[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
      <p>{scheme.benefitSummary}</p>
      <p className="muted">{scheme.description}</p>

      {status === 'ALMOST_ELIGIBLE' && (
        <div>
          <div className="bar"><div style={{ width: `${item.completionPercent}%` }} /></div>
          <p>Documents ready: {item.completionPercent}%. You still need to <Link to="/documents">upload</Link>: <strong>{item.missingDocuments.map((d) => DOC_TYPES[d]).join(', ')}</strong></p>
        </div>
      )}
      {status === 'INCOMPLETE' && (
        <p>We cannot tell yet. Add to <Link to="/profile">your profile</Link>: <strong>{item.missingInformation.map((p) => PATH_LABELS[p] || p).join(', ')}</strong></p>
      )}
      {status === 'NOT_ELIGIBLE' && (
        <div><p>Why not:</p><ul>{item.failedRules.map((r, i) => <li key={i}>{ruleText(r)} (yours: {String(r.actual)})</li>)}</ul></div>
      )}
      {status === 'ELIGIBLE' && (
        <ul>{item.matchedRules.map((r, i) => <li key={i}>{ruleText(r)}</li>)}</ul>
      )}

      <div className="row between foot-row">
        <span className="muted">
          Source: {scheme.source?.type === 'DEMO_SAMPLE' ? 'demo data (not an official scheme)' : scheme.source?.name} - version {scheme.version}
        </span>
        {status === 'ELIGIBLE' && (scheme.officialApplicationUrl
          ? <a className="primary btn" href={scheme.officialApplicationUrl} target="_blank" rel="noreferrer noopener">Apply on the official website</a>
          : <span className="muted">No official application link recorded for this demo scheme.</span>)}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/recommendations').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Checking schemes...</p>;
  const total = ORDER.reduce((n, k) => n + data.summary[k], 0);

  return (
    <>
      <h1>Schemes for me</h1>
      {total === 0 && <p>No schemes found. Ask the administrator to run the seed command (npm run seed).</p>}
      <p className="muted">
        {data.summary.ELIGIBLE} eligible, {data.summary.ALMOST_ELIGIBLE} almost eligible, {data.summary.INCOMPLETE} need more information, {data.summary.NOT_ELIGIBLE} not eligible.
        {' '}{data.disclaimer}
      </p>
      {ORDER.map((status) => data.groups[status].length > 0 && (
        <div key={status}>
          <h2>{STATUS_LABEL[status]} ({data.groups[status].length})</h2>
          {data.groups[status].map((item) => <SchemeCard key={item.scheme.id} item={item} />)}
        </div>
      ))}
    </>
  );
}
