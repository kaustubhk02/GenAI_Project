import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import FieldInput, { cleanValues } from '../components/FieldInput.jsx';
import { PROFILE_FIELDS } from '../constants.js';

const getPath = (obj, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), obj);

const SECTIONS = [
  {
    id: 'personal',
    icon: '👤',
    title: 'Personal Information',
    subtitle: 'Primary identification and demographic details',
    fields: ['name', 'mobileNumber', 'preferredLanguage', 'age', 'gender']
  },
  {
    id: 'location',
    icon: '📍',
    title: 'Location & Residence',
    subtitle: 'Village, taluka, and district of residence and farming',
    fields: ['state', 'district', 'taluka', 'village']
  },
  {
    id: 'agriculture',
    icon: '🌾',
    title: 'Agricultural Holdings & Land',
    subtitle: 'Cultivable land area in hectares and farming occupation type',
    fields: ['landAreaHectares', 'occupation', 'farmerType']
  },
  {
    id: 'financial',
    icon: '💰',
    title: 'Financial Information',
    subtitle: 'Annual family income for economic threshold verification',
    fields: ['annualIncome']
  },
  {
    id: 'social',
    icon: '🤝',
    title: 'Social & Special Category',
    subtitle: 'Reservation category and Divyang (disability) benefit status',
    fields: ['category', 'hasDisability', 'disabilityPercentage']
  }
];

export default function Profile() {
  const [values, setValues] = useState({});
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/profile')
      .then((r) => {
        const next = {};
        for (const [path, key] of PROFILE_FIELDS) {
          next[key] = getPath(r.data.profile, path) ?? '';
        }
        setValues(next);
      })
      .catch((e) => setMsg({ type: 'error', text: errMsg(e) }))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setSaving(true);
    const typed = cleanValues(values);
    const body = {};
    for (const [path, key] of PROFILE_FIELDS) {
      if (typed[key] === undefined) continue;
      const [group, field] = path.split('.');
      (body[group] ||= {})[field] = typed[key];
    }
    try {
      await api.put('/profile', body);
      setMsg({ type: 'ok', text: '✓ Profile saved successfully! Scheme recommendations and eligibility have been updated in real-time.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ margin: 0, color: 'var(--slate-800)' }}>Loading farmer profile...</h3>
      </div>
    );
  }

  // Calculate completion percentage
  const totalFields = PROFILE_FIELDS.length;
  const filledFields = PROFILE_FIELDS.filter(([, key]) => values[key] !== '' && values[key] !== undefined && values[key] !== null).length;
  const completionRate = Math.round((filledFields / totalFields) * 100);

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.35rem 0', fontSize: '1.85rem', color: 'var(--slate-900)' }}>
              Farmer Profile 👤
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: '0.925rem' }}>
              Keep your profile up to date to maximize match accuracy across all government welfare schemes.
            </p>
          </div>

          {/* Profile Completion Indicator */}
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid var(--slate-200)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '0.75rem 1.25rem',
            minWidth: '200px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '700' }}>
              <span style={{ color: 'var(--slate-700)' }}>Profile Completion</span>
              <span style={{ color: completionRate >= 80 ? 'var(--primary-700)' : 'var(--amber-600)' }}>{completionRate}%</span>
            </div>
            <div className="progress-track" style={{ height: '6px', margin: 0 }}>
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${completionRate}%`, 
                  background: completionRate >= 80 ? 'var(--primary-600)' : 'var(--amber-500)' 
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* OCR Vault Tip Banner */}
      <div style={{ 
        background: 'linear-gradient(to right, #f0fdf4, #f8fafc)', 
        border: '1px solid #bbf7d0', 
        borderRadius: 'var(--radius-lg)', 
        padding: '0.85rem 1.25rem', 
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem'
      }}>
        <span style={{ fontSize: '1.4rem' }}>💡</span>
        <div style={{ fontSize: '0.875rem', color: 'var(--slate-700)', lineHeight: '1.45' }}>
          <strong>Tip: Fast Auto-fill via OCR:</strong> You don't have to type everything manually. Upload your official documents (such as 7/12 land extract, Aadhaar card, or income certificate) in the{' '}
          <Link to="/documents" style={{ color: 'var(--primary-700)', fontWeight: 'bold', textDecoration: 'underline' }}>
            Documents Vault
          </Link>{' '}
          and our OCR will extract and auto-fill your profile details.
        </div>
      </div>

      {/* Notification / Feedback Banner */}
      {msg.text && (
        <div className={`alert-box ${msg.type === 'error' ? 'error' : 'ok'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {SECTIONS.map((sec) => (
          <section 
            key={sec.id} 
            className="card" 
            style={{ 
              borderRadius: 'var(--radius-xl)', 
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--slate-200)',
              overflow: 'hidden'
            }}
          >
            {/* Section Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.65rem', 
              marginBottom: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--slate-100)'
            }}>
              <span style={{ fontSize: '1.35rem' }}>{sec.icon}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--slate-900)' }}>
                  {sec.title}
                </h3>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  {sec.subtitle}
                </span>
              </div>
            </div>

            {/* Fields Grid */}
            <div className="grid">
              {sec.fields.map((fieldKey) => (
                <FieldInput
                  key={fieldKey}
                  fieldKey={fieldKey}
                  value={values[fieldKey]}
                  onChange={(v) => setValues({ ...values, [fieldKey]: v })}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Sticky/Bottom Action Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          gap: '1rem',
          padding: '1.25rem',
          background: '#ffffff',
          border: '1px solid var(--slate-200)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-md)',
          position: 'sticky',
          bottom: '1rem',
          zIndex: 10
        }}>
          <Link to="/" className="secondary btn" style={{ padding: '0.6rem 1.25rem' }}>
            Cancel / Back to Schemes
          </Link>
          <button 
            type="submit" 
            className="primary btn" 
            disabled={saving}
            style={{ padding: '0.6rem 1.75rem', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {saving ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#ffffff' }} />
                <span>Saving Profile...</span>
              </>
            ) : (
              <span>💾 Save & Update Schemes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
