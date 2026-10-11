import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { DOC_TYPES, PATH_LABELS, STATUS_LABEL } from '../constants.js';
import SchemePdfModal from '../components/SchemePdfModal.jsx';

const ORDER = ['ELIGIBLE', 'ALMOST_ELIGIBLE', 'INCOMPLETE', 'NOT_ELIGIBLE'];
const CLASS = { ELIGIBLE: 'eligible', ALMOST_ELIGIBLE: 'almost', INCOMPLETE: 'incomplete', NOT_ELIGIBLE: 'not' };
const ruleText = (r) => r.label || `${r.field} ${r.operator} ${JSON.stringify(r.value)}`;

const LANGUAGES = [
  { code: 'MARATHI', label: 'मराठी' },
  { code: 'HINDI', label: 'हिंदी' },
  { code: 'ENGLISH', label: 'English' }
];

function SchemeCard({ item, onOpenPdf }) {
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

  const borderLeftColor = 
    status === 'ELIGIBLE' ? 'var(--primary-600)' :
    status === 'ALMOST_ELIGIBLE' ? 'var(--amber-500)' :
    status === 'INCOMPLETE' ? 'var(--sky-500)' : 'var(--slate-400)';

  return (
    <section 
      className="card scheme-card" 
      style={{ 
        marginBottom: '1.25rem', 
        borderLeft: `5px solid ${borderLeftColor}`,
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      <div className="row between wrap" style={{ alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: '800', 
              background: '#e0f2fe', 
              color: '#0369a1', 
              padding: '0.2rem 0.6rem', 
              borderRadius: 'var(--radius-sm)',
              letterSpacing: '0.03em'
            }}>
              {scheme.code}
            </span>
            {scheme.department && (
              <span className="muted" style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                🏛️ {scheme.department}
              </span>
            )}
          </div>
          <h3 style={{ margin: '0.25rem 0 0.35rem 0', fontSize: '1.25rem', fontWeight: '700', color: 'var(--slate-900)' }}>
            {scheme.name}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className={`badge ${CLASS[status]}`}>{STATUS_LABEL[status]}</span>
        </div>
      </div>

      {/* Benefit Highlight Banner */}
      <div style={{ 
        background: 'linear-gradient(to right, #f0fdf4, #f8fafc)', 
        border: '1px solid #dcfce7', 
        borderRadius: 'var(--radius-md)', 
        padding: '0.6rem 0.85rem',
        margin: '0.5rem 0 0.85rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#15803d', fontSize: '0.925rem' }}>
          <span>💰</span>
          <span>{scheme.benefitSummary || `Direct financial assistance of ₹${(scheme.benefitAmountPerYear || 0).toLocaleString('en-IN')}/year`}</span>
        </div>
        {scheme.benefitAmountPerYear > 0 && (
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: '700', 
            background: '#dcfce7', 
            color: '#166534', 
            padding: '0.2rem 0.5rem', 
            borderRadius: 'var(--radius-sm)' 
          }}>
            ₹{scheme.benefitAmountPerYear.toLocaleString('en-IN')} / yr
          </span>
        )}
      </div>

      <p className="muted" style={{ margin: '0.25rem 0 0.85rem 0', fontSize: '0.875rem', lineHeight: '1.5' }}>
        {scheme.description}
      </p>

      {/* Status Specific Action / Guidance Banners */}
      {status === 'ALMOST_ELIGIBLE' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', margin: '0.75rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '700', color: '#b45309' }}>
            <span>Profile Match Progress</span>
            <span>{item.completionPercent}% Complete</span>
          </div>
          <div className="progress-track" style={{ height: '6px', margin: '0 0 0.6rem 0' }}>
            <div className="progress-fill" style={{ width: `${item.completionPercent}%`, background: '#f59e0b' }} />
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e', lineHeight: '1.45' }}>
            <strong>Action Needed:</strong> Your profile qualifications match! Please upload the remaining required documents:{' '}
            <strong>{item.missingDocuments.map((d) => DOC_TYPES[d] || d).join(', ')}</strong> in the{' '}
            <Link to="/documents" style={{ color: '#b45309', fontWeight: 'bold', textDecoration: 'underline' }}>
              Documents section ↗
            </Link>.
          </p>
        </div>
      )}

      {status === 'INCOMPLETE' && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', margin: '0.75rem 0' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#0369a1', lineHeight: '1.45' }}>
            ℹ️ <strong>Additional details required:</strong> Please complete missing details in your{' '}
            <Link to="/profile" style={{ color: '#0284c7', fontWeight: 'bold', textDecoration: 'underline' }}>
              Farmer Profile ↗
            </Link>:{' '}
            <strong>{item.missingInformation.map((p) => PATH_LABELS[p] || p).join(', ')}</strong>.
          </p>
        </div>
      )}

      {status === 'NOT_ELIGIBLE' && item.failedRules.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', margin: '0.75rem 0' }}>
          <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.875rem', fontWeight: '700', color: '#b91c1c' }}>
            Criteria Not Met:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#991b1b', lineHeight: '1.4' }}>
            {item.failedRules.map((r, i) => (
              <li key={i}>{ruleText(r)} (Your profile value: {String(r.actual ?? 'Not set')})</li>
            ))}
          </ul>
        </div>
      )}

      {status === 'ELIGIBLE' && item.matchedRules.length > 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', margin: '0.75rem 0' }}>
          <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.875rem', fontWeight: '700', color: '#166534' }}>
            ✓ Verified Criteria Met:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#166534', lineHeight: '1.4' }}>
            {item.matchedRules.map((r, i) => (
              <li key={i}>{ruleText(r)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Row: PDF Details & AI Explanation Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: '0.85rem 0 0.5rem 0' }}>
        <button
          type="button"
          onClick={() => onOpenPdf(scheme, item)}
          className="secondary btn"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            fontSize: '0.85rem', 
            padding: '0.45rem 0.85rem',
            background: '#ffffff',
            borderColor: 'var(--primary-600)',
            color: 'var(--primary-700)',
            fontWeight: '600'
          }}
          title="Open official scheme details, eligibility checklist, and download PDF guide"
        >
          <span>📄</span> View Details PDF
        </button>

        <button 
          type="button"
          onClick={handleToggleExplain} 
          disabled={loadingExplain} 
          className="secondary btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
        >
          <span>🤖</span> {loadingExplain ? 'Consulting RAG Advisor...' : (showExplainBox ? 'Hide AI Explanation' : 'Explain Why in Regional Language (RAG AI)')}
        </button>
      </div>

      {/* Multilingual RAG Explanation Box */}
      {showExplainBox && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '1rem', 
          background: 'linear-gradient(to right, #f0fdf4, #f8fafc)', 
          border: '1px solid #bbf7d0', 
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                    borderRadius: 'var(--radius-sm)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
              <span className="spinner" style={{ width: '16px', height: '16px' }} />
              Analyzing official documentation and synthesizing response in {selectedLang}...
            </div>
          ) : (
            explanationData && (
              <div style={{ fontSize: '0.925rem', lineHeight: '1.55', color: '#1e293b' }}>
                <p style={{ margin: 0 }}>{explanationData.explanation}</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Card Footer */}
      <div className="row between foot-row" style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--slate-100)', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🏛️ Source: <strong>{scheme.source?.name || 'API Setu / Government Portal'}</strong>
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {scheme.officialApplicationUrl && (
            <a 
              className="primary btn" 
              href={scheme.officialApplicationUrl} 
              target="_blank" 
              rel="noreferrer noopener"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            >
              Apply on Official Portal ↗
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfModalData, setPdfModalData] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError('');
    api.get('/recommendations')
      .then((r) => setData(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPdf = (scheme, evaluationItem) => {
    setPdfModalData({ scheme, evaluationItem });
  };

  const handleClosePdf = () => {
    setPdfModalData(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--slate-800)' }}>Evaluating Government Welfare Schemes...</h3>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Verifying your farmer profile and uploaded documents against official scheme rules.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-box error" style={{ margin: '2rem 0' }}>
        <span>⚠️</span>
        <div>
          <strong>Error loading recommendations:</strong> {error}
          <div style={{ marginTop: '0.5rem' }}>
            <button type="button" onClick={loadData} className="secondary btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const total = ORDER.reduce((n, k) => n + (data.summary[k] || 0), 0);

  // Compute total potential annual benefits for eligible & almost eligible schemes
  const eligibleBenefitTotal = (data.groups.ELIGIBLE || []).reduce(
    (acc, it) => acc + (it.scheme.benefitAmountPerYear || 0), 0
  );
  const potentialBenefitTotal = [
    ...(data.groups.ELIGIBLE || []),
    ...(data.groups.ALMOST_ELIGIBLE || [])
  ].reduce((acc, it) => acc + (it.scheme.benefitAmountPerYear || 0), 0);

  return (
    <>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.35rem 0', fontSize: '1.85rem', color: 'var(--slate-900)' }}>
              Government Schemes For Me 🌾
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: '0.925rem' }}>
              Real-time automated eligibility evaluation across official Central & State Government Welfare Schemes.
            </p>
          </div>

          {potentialBenefitTotal > 0 && (
            <div style={{ 
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', 
              border: '1px solid #a7f3d0', 
              borderRadius: 'var(--radius-lg)', 
              padding: '0.65rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>💰</span>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#065f46', textTransform: 'uppercase' }}>
                  Potential Annual Assistance
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#047857' }}>
                  ₹{potentialBenefitTotal.toLocaleString('en-IN')}{' '}
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#059669' }}>/ year</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div 
          className="stat-card" 
          onClick={() => setActiveFilter(activeFilter === 'ELIGIBLE' ? 'ALL' : 'ELIGIBLE')}
          style={{ 
            cursor: 'pointer',
            borderColor: activeFilter === 'ELIGIBLE' ? 'var(--primary-600)' : 'var(--primary-200)',
            background: activeFilter === 'ELIGIBLE' ? '#f0fdf4' : '#ffffff'
          }}
        >
          <div className="stat-value" style={{ color: 'var(--primary-700)' }}>{data.summary.ELIGIBLE || 0}</div>
          <div className="stat-label" style={{ color: 'var(--primary-800)' }}>Eligible Schemes</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)', marginTop: '0.25rem' }}>
            ₹{eligibleBenefitTotal.toLocaleString('en-IN')}/yr ready to apply
          </div>
        </div>

        <div 
          className="stat-card" 
          onClick={() => setActiveFilter(activeFilter === 'ALMOST_ELIGIBLE' ? 'ALL' : 'ALMOST_ELIGIBLE')}
          style={{ 
            cursor: 'pointer',
            borderColor: activeFilter === 'ALMOST_ELIGIBLE' ? 'var(--amber-500)' : 'var(--amber-200)',
            background: activeFilter === 'ALMOST_ELIGIBLE' ? '#fffbeb' : '#ffffff'
          }}
        >
          <div className="stat-value" style={{ color: 'var(--amber-600)' }}>{data.summary.ALMOST_ELIGIBLE || 0}</div>
          <div className="stat-label" style={{ color: 'var(--amber-800)' }}>Upload Docs Needed</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--amber-700)', marginTop: '0.25rem' }}>
            Qualifications met, upload docs
          </div>
        </div>

        <div 
          className="stat-card" 
          onClick={() => setActiveFilter(activeFilter === 'INCOMPLETE' ? 'ALL' : 'INCOMPLETE')}
          style={{ 
            cursor: 'pointer',
            borderColor: activeFilter === 'INCOMPLETE' ? 'var(--sky-500)' : 'var(--slate-200)',
            background: activeFilter === 'INCOMPLETE' ? '#f0f9ff' : '#ffffff'
          }}
        >
          <div className="stat-value" style={{ color: 'var(--slate-700)' }}>{data.summary.INCOMPLETE || 0}</div>
          <div className="stat-label" style={{ color: 'var(--slate-700)' }}>More Info Needed</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
            Requires profile details
          </div>
        </div>

        <div 
          className="stat-card" 
          onClick={() => setActiveFilter(activeFilter === 'NOT_ELIGIBLE' ? 'ALL' : 'NOT_ELIGIBLE')}
          style={{ 
            cursor: 'pointer',
            borderColor: activeFilter === 'NOT_ELIGIBLE' ? 'var(--rose-500)' : 'var(--rose-200)',
            background: activeFilter === 'NOT_ELIGIBLE' ? '#fef2f2' : '#ffffff'
          }}
        >
          <div className="stat-value" style={{ color: 'var(--rose-600)' }}>{data.summary.NOT_ELIGIBLE || 0}</div>
          <div className="stat-label" style={{ color: 'var(--rose-800)' }}>Not Eligible</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--rose-600)', marginTop: '0.25rem' }}>
            Criteria not currently met
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All Schemes (${total})` },
            { id: 'ELIGIBLE', label: `Eligible (${data.summary.ELIGIBLE || 0})` },
            { id: 'ALMOST_ELIGIBLE', label: `Needs Docs (${data.summary.ALMOST_ELIGIBLE || 0})` },
            { id: 'INCOMPLETE', label: `Needs Info (${data.summary.INCOMPLETE || 0})` },
            { id: 'NOT_ELIGIBLE', label: `Not Eligible (${data.summary.NOT_ELIGIBLE || 0})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn ${activeFilter === tab.id ? 'primary' : 'secondary'}`}
              onClick={() => setActiveFilter(tab.id)}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: '280px', width: '100%' }}>
          <input
            type="text"
            placeholder="🔍 Search schemes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {total === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌾</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No government schemes loaded</h3>
          <p className="muted" style={{ margin: 0, maxWidth: '480px', marginInline: 'auto' }}>
            Please seed the platform with official schemes using <code>npm run seed</code> or ingest new schemes using the CLI.
          </p>
        </div>
      )}

      {/* Render Categorized Scheme Lists */}
      {ORDER.map((status) => {
        if (activeFilter !== 'ALL' && activeFilter !== status) return null;
        let items = data.groups[status] || [];

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          items = items.filter(
            (it) => it.scheme.name.toLowerCase().includes(q) || 
                    it.scheme.code.toLowerCase().includes(q) ||
                    (it.scheme.description && it.scheme.description.toLowerCase().includes(q))
          );
        }

        if (items.length === 0) return null;

        return (
          <div key={status} style={{ marginBottom: '2.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <span className={`badge ${CLASS[status]}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.7rem' }}>
                {items.length}
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--slate-900)' }}>
                {STATUS_LABEL[status]}
              </h2>
            </div>

            {items.map((item) => (
              <SchemeCard
                key={item.scheme.id || item.scheme.code}
                item={item}
                onOpenPdf={handleOpenPdf}
              />
            ))}
          </div>
        );
      })}

      {/* Official Disclaimer Note */}
      <div style={{ 
        background: 'var(--slate-50)', 
        border: '1px solid var(--slate-200)', 
        borderRadius: 'var(--radius-md)', 
        padding: '0.85rem 1rem', 
        marginTop: '1.5rem',
        fontSize: '0.8rem',
        color: 'var(--slate-600)'
      }}>
        ℹ️ <strong>Official Advisory:</strong> {data.disclaimer}
      </div>

      {/* Scheme PDF Modal */}
      {pdfModalData && (
        <SchemePdfModal
          scheme={pdfModalData.scheme}
          evaluationItem={pdfModalData.evaluationItem}
          onClose={handleClosePdf}
        />
      )}
    </>
  );
}
