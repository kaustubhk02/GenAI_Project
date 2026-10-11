import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { DOC_TYPES, PATH_LABELS, STATUS_LABEL } from '../constants.js';

const ORDER = ['ELIGIBLE', 'ALMOST_ELIGIBLE', 'INCOMPLETE', 'NOT_ELIGIBLE'];
const CLASS = { ELIGIBLE: 'eligible', ALMOST_ELIGIBLE: 'almost', INCOMPLETE: 'incomplete', NOT_ELIGIBLE: 'not' };
const ruleText = (r) => r.label || `${r.field} ${r.operator} ${JSON.stringify(r.value)}`;

const LANGUAGES = [
  { code: 'MARATHI', label: 'मराठी' },
  { code: 'HINDI', label: 'हिंदी' },
  { code: 'ENGLISH', label: 'English' }
];

function SchemeCard({ item }) {
  const { scheme, status } = item;
  const [explanationData, setExplanationData] = useState(null);
  const [selectedLang, setSelectedLang] = useState('MARATHI');
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [showExplainBox, setShowExplainBox] = useState(false);

  const fetchExplanation = async (lang) => {
    setLoadingExplain(true);
    try {
      const res = await api.get(`/recommendations/${item.id || item._id || item.scheme.id}/explain?lang=${lang}`);
      setExplanationData(res.data);
    } catch (err) {
      setExplanationData({ explanation: errMsg(err), languageLabel: 'Error' });
    } finally {
      setLoadingExplain(false);
    }
  };

  const handleToggleExplain = async () => {
    if (showExplainBox) {
      setShowExplainBox(false);
      return;
    }
    setShowExplainBox(true);
    if (!explanationData) {
      await fetchExplanation(selectedLang);
    }
  };

  const handleLangChange = async (lang) => {
    setSelectedLang(lang);
    await fetchExplanation(lang);
  };

  return (
    <section className="card" style={{ marginBottom: '1.25rem', borderLeft: status === 'ELIGIBLE' ? '4px solid #16a34a' : (status === 'ALMOST_ELIGIBLE' ? '4px solid #f59e0b' : '4px solid #94a3b8') }}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              {scheme.code}
            </span>
            {scheme.department && (
              <span className="muted" style={{ fontSize: '0.8rem' }}>{scheme.department}</span>
            )}
          </div>
          <h3 style={{ margin: '0.25rem 0' }}>{scheme.name}</h3>
        </div>
        <span className={`badge ${CLASS[status]}`}>{STATUS_LABEL[status]}</span>
      </div>

      <p style={{ fontWeight: '600', color: '#15803d', margin: '0.5rem 0' }}>
        💰 {scheme.benefitSummary}
      </p>
      <p className="muted" style={{ margin: '0.25rem 0 0.75rem 0', fontSize: '0.9rem' }}>
        {scheme.description}
      </p>

      {status === 'ALMOST_ELIGIBLE' && (
        <div style={{ background: '#fffbeb', padding: '0.75rem', borderRadius: '6px', margin: '0.75rem 0' }}>
          <div className="bar" style={{ marginBottom: '0.5rem' }}>
            <div style={{ width: `${item.completionPercent}%`, background: '#f59e0b', height: '6px', borderRadius: '3px' }} />
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            <strong>Action needed:</strong> Profile is ready ({item.completionPercent}%). Upload required documents: <strong>{item.missingDocuments.map((d) => DOC_TYPES[d] || d).join(', ')}</strong> in <Link to="/documents">Documents section</Link>.
          </p>
        </div>
      )}

      {status === 'INCOMPLETE' && (
        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', margin: '0.75rem 0' }}>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            ℹ️ Additional details needed to verify eligibility. Update in <Link to="/profile">Farmer Profile</Link>: <strong>{item.missingInformation.map((p) => PATH_LABELS[p] || p).join(', ')}</strong>.
          </p>
        </div>
      )}

      {status === 'NOT_ELIGIBLE' && item.failedRules.length > 0 && (
        <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '6px', margin: '0.75rem 0' }}>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 'bold', color: '#b91c1c' }}>Eligibility Criteria Not Met:</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
            {item.failedRules.map((r, i) => <li key={i}>{ruleText(r)} (Current value: {String(r.actual)})</li>)}
          </ul>
        </div>
      )}

      {status === 'ELIGIBLE' && item.matchedRules.length > 0 && (
        <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', margin: '0.75rem 0' }}>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 'bold', color: '#166534' }}>✓ Verified Criteria:</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
            {item.matchedRules.map((r, i) => <li key={i}>{ruleText(r)}</li>)}
          </ul>
        </div>
      )}

      {/* Multilingual RAG Explanation Box */}
      <div style={{ margin: '1rem 0 0.5rem 0' }}>
        <button 
          onClick={handleToggleExplain} 
          disabled={loadingExplain} 
          className="secondary btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
        >
          <span>🤖</span> {loadingExplain ? 'Consulting RAG Advisor...' : (showExplainBox ? 'Hide AI Explanation' : 'Explain Why in Regional Language (RAG AI)')}
        </button>

        {showExplainBox && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '1rem', 
            background: 'linear-gradient(to right, #f0fdf4, #f8fafc)', 
            border: '1px solid #bbf7d0', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                🌾 Official Scheme Advisor (RAG Grounded)
              </span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleLangChange(l.code)}
                    disabled={loadingExplain}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      border: selectedLang === l.code ? '1px solid #16a34a' : '1px solid #cbd5e1',
                      background: selectedLang === l.code ? '#16a34a' : '#ffffff',
                      color: selectedLang === l.code ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      fontWeight: selectedLang === l.code ? 'bold' : 'normal'
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingExplain ? (
              <p style={{ margin: 0, fontStyle: 'italic', color: '#64748b', fontSize: '0.9rem' }}>
                Analyzing official government documentation and translating response to {selectedLang}...
              </p>
            ) : (
              explanationData && (
                <div style={{ fontSize: '0.925rem', lineHeight: '1.5', color: '#1e293b' }}>
                  <p style={{ margin: 0 }}>{explanationData.explanation}</p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="row between foot-row" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🏛️ Source: <strong>{scheme.source?.name || 'API Setu / Government Portal'}</strong>
        </span>
        {scheme.officialApplicationUrl && (
          <a 
            className="primary btn" 
            href={scheme.officialApplicationUrl} 
            target="_blank" 
            rel="noreferrer noopener"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
          >
            Apply on Official Portal ↗
          </a>
        )}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const loadData = () => {
    api.get('/recommendations').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Evaluating schemes matching your farmer profile...</p>;
  const total = ORDER.reduce((n, k) => n + data.summary[k], 0);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem 0' }}>Government Schemes For Me</h1>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Real-time automated eligibility check across official Central & State Government Welfare Schemes.
          </p>
        </div>
      </div>

      {total === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No schemes found. Please seed the platform with official schemes using <code>npm run seed</code>.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>{data.summary.ELIGIBLE}</div>
          <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>Eligible</div>
        </div>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>{data.summary.ALMOST_ELIGIBLE}</div>
          <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '600' }}>Upload Docs Needed</div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#64748b' }}>{data.summary.INCOMPLETE}</div>
          <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '600' }}>More Info Needed</div>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{data.summary.NOT_ELIGIBLE}</div>
          <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: '600' }}>Not Eligible</div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>
        ℹ️ <em>{data.disclaimer}</em>
      </p>

      {ORDER.map((status) => data.groups[status].length > 0 && (
        <div key={status} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`badge ${CLASS[status]}`}>{data.groups[status].length}</span>
            {STATUS_LABEL[status]}
          </h2>
          {data.groups[status].map((item) => (
            <SchemeCard key={item.scheme.id || item.scheme.code} item={item} />
          ))}
        </div>
      ))}
    </>
  );
}
