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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📄</span> {DOC_TYPES[doc.documentType] || doc.documentType}
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {doc.originalName} ({((doc.size || 0) / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#64748b',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Content / Document Body */}
        <div style={{
          padding: '1rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9',
          minHeight: '350px'
        }}>
          {isImage ? (
            <img
              src={fileBlobUrl}
              alt={doc.originalName}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '4px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}
            />
          ) : isPdf ? (
            <iframe
              src={fileBlobUrl}
              title={doc.originalName}
              style={{
                width: '100%',
                height: '70vh',
                border: 'none',
                borderRadius: '4px',
                background: '#ffffff'
              }}
            />
          ) : (
            <pre style={{
              background: '#ffffff',
              padding: '1rem',
              borderRadius: '6px',
              maxWidth: '100%',
              maxHeight: '70vh',
              overflow: 'auto',
              fontSize: '0.85rem'
            }}>
              {doc.rawText || 'Text document loaded.'}
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <a
            href={fileBlobUrl}
            download={doc.originalName || 'document'}
            className="secondary btn"
            style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
          >
            <span>⬇️</span> Download File
          </a>
          <button
            type="button"
            className="primary btn"
            onClick={onClose}
            style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small info row showing how the document was processed. */
function ExtractionSummary({ doc }) {
  const { ocrMeta, extractionMethod, fieldStatus } = doc;
  if (!extractionMethod && !ocrMeta?.language) return null;

  const extractedCount = Object.values(fieldStatus || {}).filter((s) => s === 'extracted').length;
  const totalCount = Object.keys(fieldStatus || {}).length;

  const methodLabel = extractionMethod === 'llm'
    ? '🤖 AI Extraction (Gemini)'
    : extractionMethod === 'regex'
      ? '🔍 Pattern Matching'
      : null;

  const langLabel = ocrMeta?.language && ocrMeta.language !== 'text' && ocrMeta.language !== 'direct'
    ? `OCR: ${ocrMeta.language.toUpperCase()}` + (ocrMeta.confidence != null ? ` (${Math.round(ocrMeta.confidence)}% confidence)` : '')
    : ocrMeta?.language === 'text' || ocrMeta?.method === 'direct'
      ? 'Text file – direct read'
      : null;

  return (
    <div className="extraction-summary" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
      {langLabel && <span className="extraction-meta" style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{langLabel}</span>}
      {methodLabel && <span className="extraction-meta" style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{methodLabel}</span>}
      {totalCount > 0 && (
        <span className="extraction-meta" style={{ background: '#f0fdf4', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
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
    <section className="card" style={{ marginBottom: '1.25rem', borderLeft: pending ? '4px solid #f59e0b' : '4px solid #16a34a' }}>
      <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📄</span> {DOC_TYPES[doc.documentType] || doc.documentType}
          </h3>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            <strong>{doc.originalName}</strong> – uploaded {new Date(doc.createdAt).toLocaleString()} – {doc.source === 'DIGILOCKER' ? 'DigiLocker' : 'Manual Upload'}
          </span>
        </div>
        <span className={`badge ${pending ? 'almost' : 'eligible'}`} style={{ fontWeight: 'bold' }}>
          {pending ? 'Needs Review' : '✓ Saved & Confirmed'}
        </span>
      </div>

      <ExtractionSummary doc={doc} />

      {doc.warnings?.length > 0 && pending && (
        <ul className="warn" style={{ background: '#fffbeb', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.85rem', margin: '0.5rem 0' }}>
          {doc.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}

      {/* CONFIRMED STATE: Show read-only details summary and View Document button */}
      {!pending && !isEditing ? (
        <div style={{ marginTop: '0.75rem' }}>
          {hasAnyDetail ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
              gap: '0.75rem', 
              background: '#f8fafc', 
              padding: '0.9rem', 
              borderRadius: '6px', 
              border: '1px solid #e2e8f0' 
            }}>
              {fields.map((k) => {
                const val = values[k];
                if (val === undefined || val === null || val === '') return null;
                return (
                  <div key={k}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {FIELD_DEFS[k]?.label || k}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', marginTop: '0.15rem' }}>
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
              Document saved in vault.
            </p>
          )}

          {/* Action Row for Confirmed Documents */}
          <div className="row" style={{ marginTop: '0.9rem', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              type="button" 
              className="primary btn" 
              onClick={() => onPreview(doc)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', padding: '0.45rem 1rem' }}
            >
              <span>👁️</span> View Document
            </button>

            <button 
              type="button" 
              className="secondary btn" 
              onClick={() => setIsEditing(true)}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem' }}
            >
              <span>✏️</span> Edit Details
            </button>

            {doc.rawText && (
              <button 
                type="button" 
                className="secondary btn" 
                onClick={() => setShowText(!showText)}
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem' }}
              >
                {showText ? 'Hide Read Text' : 'Show Read Text'}
              </button>
            )}

            <button 
              type="button" 
              className="link danger" 
              onClick={remove}
              style={{ marginLeft: 'auto', color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
            >
              Delete Document
            </button>
          </div>
        </div>
      ) : (
        /* PENDING OR EDITING STATE: Show auto-filled fields for review/editing */
        <div>
          <div className="grid" style={{ marginTop: '0.75rem' }}>
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

          <div className="row" style={{ marginTop: '1rem', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              type="button"
              className="primary btn" 
              onClick={handleSaveAndUpdate}
              disabled={saving}
              style={{ background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}
            >
              <span>💾</span> {saving ? 'Saving...' : 'Save Document and Update Profile'}
            </button>

            <button 
              type="button" 
              className="secondary btn" 
              onClick={() => onPreview(doc)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
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
                {showText ? 'Hide Read Text' : 'Show Read Text'}
              </button>
            )}

            <button 
              type="button" 
              className="link danger" 
              onClick={remove}
              style={{ marginLeft: 'auto', color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
            >
              Delete Document
            </button>
          </div>
        </div>
      )}

      {showText && (
        <pre className="raw" style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginTop: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
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
    if (!file) return setMsg({ type: 'error', text: 'Please choose a file to upload first.' });
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
        text: 'Document uploaded and analyzed! Review the auto-filled details and click "Save Document and Update Profile".' 
      });
      load();
    } catch (err) { 
      setMsg({ type: 'error', text: errMsg(err) }); 
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ margin: '0 0 0.25rem 0' }}>Farmer Documents & Vault</h1>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Upload your 7/12 Extract, 8A Extract, Aadhaar, Caste, Disability, Ration Card, or Bank Passbook. Once saved, your documents remain securely stored in your vault.
        </p>
      </div>

      {/* Upload Form Card */}
      <form onSubmit={upload} className="card" style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#1e293b' }}>Upload New Document</h3>
        <div className="row wrap" style={{ gap: '1rem', alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 240px', margin: 0 }}>
            <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Document Type</span>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {Object.entries(DOC_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          <label style={{ flex: '2 1 280px', margin: 0 }}>
            <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>File (PDF, JPG, PNG)</span>
            <input 
              ref={fileInput} 
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png,.txt" 
              onChange={(e) => setFile(e.target.files[0])} 
              style={{ width: '100%', marginTop: '0.25rem' }}
            />
          </label>

          <button 
            type="submit" 
            className="primary btn" 
            disabled={busy}
            style={{ height: '40px', padding: '0 1.25rem', fontWeight: 'bold' }}
          >
            {busy ? 'Processing OCR & AI...' : 'Upload & Scan'}
          </button>
        </div>
      </form>

      {msg.text && (
        <div style={{ 
          padding: '0.75rem 1rem', 
          borderRadius: '6px', 
          marginBottom: '1.25rem',
          background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: msg.type === 'error' ? '#991b1b' : '#166534',
          border: msg.type === 'error' ? '1px solid #fecaca' : '1px solid #bbf7d0',
          fontWeight: '500'
        }}>
          {msg.text}
        </div>
      )}

      {/* Uploaded Documents Section */}
      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📂</span> My Uploaded Documents ({docs.length})
        </h2>

        {docs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>No documents in your vault yet.</p>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Upload your 7/12 Extract or Aadhaar card above to automatically evaluate your scheme benefits.
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
    </>
  );
}
