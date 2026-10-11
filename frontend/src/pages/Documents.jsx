import { useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api.js';
import FieldInput, { cleanValues } from '../components/FieldInput.jsx';
import { DOC_TYPES, FIELDS_BY_DOC, FIELD_DEFS } from '../constants.js';

/** In-Page Modal to preview the uploaded document directly in front of the user */
function DocumentViewerModal({ doc, fileBlobUrl, mimeType, onClose }) {
  if (!doc || !fileBlobUrl) return null;

  const isImage = mimeType?.startsWith('image/') || doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(doc.originalName);
  const isPdf = mimeType === 'application/pdf' || doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.originalName);

  return (
    <div className="pdf-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="pdf-modal-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px' }}
      >
        {/* Modal Header */}
        <div className="pdf-modal-header">
          <div className="pdf-modal-title">
            <span style={{ fontSize: '1.25rem' }}>📄</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--slate-900)' }}>
                {DOC_TYPES[doc.documentType] || doc.documentType}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                {doc.originalName} • {((doc.size || 0) / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href={fileBlobUrl}
              download={doc.originalName || 'document'}
              className="secondary btn"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <span>⬇️</span> Download File
            </a>
            <button
              type="button"
              className="pdf-close-btn"
              onClick={onClose}
              aria-label="Close Preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content / Document Body */}
        <div style={{
          padding: '1.25rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--slate-100)',
          minHeight: '380px'
        }}>
          {isImage ? (
            <img
              src={fileBlobUrl}
              alt={doc.originalName}
              style={{
                maxWidth: '100%',
                maxHeight: '72vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          ) : isPdf ? (
            <iframe
              src={fileBlobUrl}
              title={doc.originalName}
              style={{
                width: '100%',
                height: '72vh',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
                boxShadow: 'var(--shadow-sm)'
              }}
            />
          ) : (
            <pre style={{
              background: '#ffffff',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              maxWidth: '100%',
              maxHeight: '70vh',
              overflow: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}>
              {doc.rawText || 'Text document content loaded.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small info row showing how the document was processed by OCR/AI */
function ExtractionSummary({ doc }) {
  const { ocrMeta, extractionMethod, fieldStatus } = doc;
  if (!extractionMethod && !ocrMeta?.language) return null;

  const extractedCount = Object.values(fieldStatus || {}).filter((s) => s === 'extracted').length;
  const totalCount = Object.keys(fieldStatus || {}).length;

  const methodLabel = extractionMethod === 'llm'
    ? '🤖 Gemini AI Field Extraction'
    : extractionMethod === 'regex'
      ? '🔍 Pattern Matching'
      : null;

  const langLabel = ocrMeta?.language && ocrMeta.language !== 'text' && ocrMeta.language !== 'direct'
    ? `OCR: ${ocrMeta.language.toUpperCase()}` + (ocrMeta.confidence != null ? ` (${Math.round(ocrMeta.confidence)}% confidence)` : '')
    : ocrMeta?.language === 'text' || ocrMeta?.method === 'direct'
      ? 'Direct Digital Document'
      : null;

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.6rem 0' }}>
      {langLabel && (
        <span style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: '600' }}>
          {langLabel}
        </span>
      )}
      {methodLabel && (
        <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: '700' }}>
          {methodLabel}
        </span>
      )}
      {totalCount > 0 && (
        <span style={{ background: 'var(--primary-50)', color: 'var(--primary-800)', border: '1px solid var(--primary-200)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: '600' }}>
          ✓ {extractedCount}/{totalCount} fields verified
        </span>
      )}
    </div>
  );
}

function DocCard({ doc, onChanged, onError, onPreview }) {
  const [values, setValues] = useState(doc.extractedData || {});
  const [showText, setShowText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const pending = doc.status === 'PENDING_REVIEW';

  const fieldStatus = doc.fieldStatus || {};
  const fields = FIELDS_BY_DOC[doc.documentType] || Object.keys(values);

  // Single button: Saves the document and updates farmer profile simultaneously
  const handleSaveAndUpdate = async () => {
    setSaving(true);
    try {
      await api.post(`/documents/${doc._id}/confirm`, cleanValues(values));
      setIsEditing(false);
      onChanged(`✓ "${doc.originalName || DOC_TYPES[doc.documentType]}" saved! Your profile has been updated and document is kept in your vault.`);
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${doc.originalName || 'this document'} from your vault?`)) return;
    try {
      await api.delete(`/documents/${doc._id}`);
      onChanged('Document removed from vault.');
    } catch (e) {
      onError(errMsg(e));
    }
  };

  const hasAnyDetail = fields.some(k => values[k] !== undefined && values[k] !== null && values[k] !== '');

  return (
    <section 
      className="card" 
      style={{ 
        marginBottom: '1.25rem', 
        borderLeft: pending ? '5px solid var(--amber-500)' : '5px solid var(--primary-600)',
        borderRadius: 'var(--radius-xl)'
      }}
    >
      <div className="row between wrap" style={{ alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.35rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', color: 'var(--slate-900)' }}>
            <span>📄</span> {DOC_TYPES[doc.documentType] || doc.documentType}
          </h3>
          <span className="muted" style={{ fontSize: '0.825rem' }}>
            <strong>{doc.originalName}</strong> • uploaded {new Date(doc.createdAt).toLocaleString()} • {doc.source === 'DIGILOCKER' ? 'DigiLocker Verified' : 'Direct Upload'}
          </span>
        </div>
        <span className={`badge ${pending ? 'almost' : 'eligible'}`} style={{ fontWeight: '700' }}>
          {pending ? '⚠️ Needs Review' : '✓ Saved & Confirmed'}
        </span>
      </div>

      <ExtractionSummary doc={doc} />

      {doc.warnings?.length > 0 && pending && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', margin: '0.6rem 0' }}>
          <strong style={{ color: '#92400e' }}>Warnings:</strong>
          <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, color: '#b45309' }}>
            {doc.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* CONFIRMED STATE: Show read-only details summary and View Document button */}
      {!pending && !isEditing ? (
        <div style={{ marginTop: '0.75rem' }}>
          {hasAnyDetail ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '0.75rem', 
              background: 'var(--slate-50)', 
              padding: '1rem', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--slate-200)' 
            }}>
              {fields.map((k) => {
                const val = values[k];
                if (val === undefined || val === null || val === '') return null;
                return (
                  <div key={k}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {FIELD_DEFS[k]?.label || k}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--slate-900)', marginTop: '0.15rem' }}>
                      {k === 'annualIncome' ? `₹${Number(val).toLocaleString('en-IN')}` :
                       k === 'landAreaHectares' ? `${val} Ha` :
                       k === 'disabilityPercentage' ? `${val}%` :
                       String(val)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>
              Document saved securely in your vault.
            </p>
          )}

          {/* Action Row for Confirmed Documents */}
          <div className="row wrap" style={{ marginTop: '1rem', gap: '0.6rem', alignItems: 'center' }}>
            <button 
              type="button" 
              className="primary btn" 
              onClick={() => onPreview(doc)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', padding: '0.45rem 1rem' }}
            >
              <span>👁️</span> View Document
            </button>

            <button 
              type="button" 
              className="secondary btn" 
              onClick={() => setIsEditing(true)}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
            >
              <span>✏️</span> Edit Details
            </button>

            {doc.rawText && (
              <button 
                type="button" 
                className="secondary btn" 
                onClick={() => setShowText(!showText)}
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
              >
                {showText ? 'Hide OCR Text' : 'View OCR Text'}
              </button>
            )}

            <button 
              type="button" 
              className="link" 
              onClick={remove}
              style={{ marginLeft: 'auto', color: 'var(--rose-600)', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', fontSize: '0.85rem' }}
            >
              🗑️ Delete Document
            </button>
          </div>
        </div>
      ) : (
        /* PENDING OR EDITING STATE: Show auto-filled fields for review/editing */
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ 
            background: '#fffbeb', 
            border: '1px solid #fef3c7', 
            padding: '0.75rem 1rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1rem', 
            fontSize: '0.85rem',
            color: '#92400e'
          }}>
            ℹ️ Please review the auto-filled information below. Make any necessary corrections and click <strong>"Save Document & Update Profile"</strong>.
          </div>

          <div className="grid">
            {fields.map((k) => (
              <FieldInput
                key={k}
                fieldKey={k}
                value={values[k]}
                status={fieldStatus[k]}
                onChange={(v) => setValues({ ...values, [k]: v })}
              />
            ))}
          </div>

          <div className="row wrap" style={{ marginTop: '1.25rem', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              type="button"
              className="primary btn" 
              onClick={handleSaveAndUpdate}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: '700', padding: '0.5rem 1.25rem' }}
            >
              <span>💾</span> {saving ? 'Saving & Updating Profile...' : 'Save Document & Update Profile'}
            </button>

            <button 
              type="button" 
              className="secondary btn" 
              onClick={() => onPreview(doc)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>👁️</span> View Document
            </button>

            {isEditing && (
              <button 
                type="button" 
                className="secondary btn" 
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            )}

            {doc.rawText && (
              <button 
                type="button" 
                className="secondary btn" 
                onClick={() => setShowText(!showText)}
                style={{ fontSize: '0.85rem' }}
              >
                {showText ? 'Hide OCR Text' : 'View OCR Text'}
              </button>
            )}

            <button 
              type="button" 
              className="link" 
              onClick={remove}
              style={{ marginLeft: 'auto', color: 'var(--rose-600)', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', fontSize: '0.85rem' }}
            >
              🗑️ Delete Document
            </button>
          </div>
        </div>
      )}

      {showText && (
        <pre style={{ 
          background: 'var(--slate-900)', 
          color: '#f8fafc', 
          padding: '1rem', 
          borderRadius: 'var(--radius-md)', 
          fontSize: '0.8rem', 
          marginTop: '1rem', 
          maxHeight: '220px', 
          overflowY: 'auto',
          lineHeight: '1.4'
        }}>
          {doc.rawText}
        </pre>
      )}
    </section>
  );
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [type, setType] = useState('LAND_RECORD');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const fileInput = useRef();

  // Preview Modal state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState(null);

  const load = () => {
    api.get('/documents')
      .then((r) => setDocs(r.data.documents))
      .catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  };

  useEffect(() => { load(); }, []);

  const handleOpenPreview = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc._id}/file`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      setPreviewDoc(doc);
      setPreviewBlobUrl(blobUrl);
      setPreviewMime(res.data.type || doc.mimeType);
    } catch (err) {
      setMsg({ type: 'error', text: `Could not load file for preview: ${errMsg(err)}` });
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewDoc(null);
    setPreviewBlobUrl(null);
    setPreviewMime(null);
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return setMsg({ type: 'error', text: 'Please choose a document file to upload first.' });
    const form = new FormData();
    form.append('documentType', type);
    form.append('file', file);
    setBusy(true); 
    setMsg({ type: '', text: '' });
    try {
      await api.post('/documents/upload', form);
      setFile(null); 
      if (fileInput.current) fileInput.current.value = '';
      setMsg({ 
        type: 'ok', 
        text: '✓ Document uploaded and analyzed by OCR & AI! Please review the auto-filled details below and confirm.' 
      });
      load();
    } catch (err) { 
      setMsg({ type: 'error', text: errMsg(err) }); 
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.35rem 0', fontSize: '1.85rem', color: 'var(--slate-900)' }}>
          Farmer Documents Vault 📁
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: '0.925rem' }}>
          Upload your official documents (7/12 Extract, 8A Extract, Aadhaar, Income Certificate, Bank Passbook). Our OCR & AI extracts your profile information to unlock scheme benefits automatically.
        </p>
      </div>

      {/* Upload Zone Card */}
      <form 
        onSubmit={upload} 
        className="card" 
        style={{ 
          marginBottom: '1.75rem', 
          background: 'linear-gradient(to right, #f8fafc, #ffffff)', 
          border: '1.5px solid var(--slate-200)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📤</span>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--slate-900)' }}>
            Upload Official Document
          </h3>
        </div>

        <div className="row wrap" style={{ gap: '1rem', alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 260px', margin: 0 }}>
            <span>Select Document Type</span>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              style={{ marginTop: '0.25rem' }}
            >
              {Object.entries(DOC_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          <label style={{ flex: '2 1 300px', margin: 0 }}>
            <span>Attach File (PDF, JPG, PNG)</span>
            <input 
              ref={fileInput} 
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png,.txt" 
              onChange={(e) => setFile(e.target.files[0])} 
              style={{ marginTop: '0.25rem' }}
            />
          </label>

          <button 
            type="submit" 
            className="primary btn" 
            disabled={busy}
            style={{ 
              height: '42px', 
              padding: '0 1.5rem', 
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexShrink: 0
            }}
          >
            {busy ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#ffffff' }} />
                <span>Running OCR & AI...</span>
              </>
            ) : (
              <span>📤 Upload & Analyze</span>
            )}
          </button>
        </div>
      </form>

      {/* Feedback Messages */}
      {msg.text && (
        <div className={`alert-box ${msg.type === 'error' ? 'error' : 'ok'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Uploaded Documents List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '800', color: 'var(--slate-900)' }}>
            Documents in Vault
          </h2>
          <span className="badge eligible" style={{ fontSize: '0.8rem' }}>
            {docs.length}
          </span>
        </div>

        {docs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--slate-800)' }}>Your document vault is currently empty</h3>
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem', maxWidth: '480px', marginInline: 'auto' }}>
              Upload your 7/12 land extract, Aadhaar card, or income certificate above. We will automatically extract the information and evaluate your government scheme eligibility.
            </p>
          </div>
        ) : (
          docs.map((d) => (
            <DocCard 
              key={`${d._id}-${d.updatedAt}`} 
              doc={d}
              onChanged={(text) => { setMsg({ type: 'ok', text }); load(); }}
              onError={(text) => setMsg({ type: 'error', text })}
              onPreview={handleOpenPreview}
            />
          ))
        )}
      </div>

      {/* Lightbox / In-Page Document Preview Modal */}
      {previewDoc && (
        <DocumentViewerModal
          doc={previewDoc}
          fileBlobUrl={previewBlobUrl}
          mimeType={previewMime}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
