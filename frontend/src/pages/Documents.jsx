import { useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api.js';
import FieldInput, { cleanValues } from '../components/FieldInput.jsx';
import { DOC_TYPES, FIELDS_BY_DOC } from '../constants.js';

function DocCard({ doc, onChanged, onError }) {
  const [values, setValues] = useState(doc.extractedData || {});
  const [showText, setShowText] = useState(false);
  const pending = doc.status === 'PENDING_REVIEW';

  const confirm = async () => {
    try {
      await api.post(`/documents/${doc._id}/confirm`, cleanValues(values));
      onChanged('Details saved to your profile.');
    } catch (e) { onError(errMsg(e)); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this document?')) return;
    try { await api.delete(`/documents/${doc._id}`); onChanged('Document deleted.'); } catch (e) { onError(errMsg(e)); }
  };

  return (
    <section className="card">
      <div className="row between">
        <div>
          <h3>{DOC_TYPES[doc.documentType]}</h3>
          <span className="muted">{doc.originalName} - uploaded {new Date(doc.createdAt).toLocaleString()} - {doc.source === 'DIGILOCKER' ? 'DigiLocker' : 'manual upload'}</span>
        </div>
        <span className={`badge ${pending ? 'almost' : 'eligible'}`}>{pending ? 'Needs your review' : 'Confirmed'}</span>
      </div>

      {doc.warnings?.length > 0 && <ul className="warn">{doc.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}

      <div className="grid">
        {FIELDS_BY_DOC[doc.documentType].map((k) => (
          <FieldInput key={k} fieldKey={k} value={values[k]} onChange={(v) => setValues({ ...values, [k]: v })} />
        ))}
      </div>

      <div className="row">
        <button className="primary" onClick={confirm}>{pending ? 'Confirm and save to profile' : 'Update profile with these values'}</button>
        {doc.rawText && <button className="link" onClick={() => setShowText(!showText)}>{showText ? 'Hide' : 'Show'} text read from file</button>}
        <button className="link danger" onClick={remove}>Delete</button>
      </div>
      {showText && <pre className="raw">{doc.rawText}</pre>}
    </section>
  );
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [type, setType] = useState('INCOME_CERTIFICATE');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const fileInput = useRef();

  const load = () => api.get('/documents').then((r) => setDocs(r.data.documents)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return setMsg({ type: 'error', text: 'Choose a file first.' });
    const form = new FormData();
    form.append('documentType', type); // text field first, file last
    form.append('file', file);
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      await api.post('/documents/upload', form);
      setFile(null); fileInput.current.value = '';
      setMsg({ type: 'ok', text: 'Uploaded. Please check the details we read below and confirm them.' });
      load();
    } catch (err) { setMsg({ type: 'error', text: errMsg(err) }); }
    finally { setBusy(false); }
  };

  return (
    <>
      <h1>My documents</h1>
      <p className="muted">Upload a PDF, JPG or PNG (max 5 MB). Use only sample documents while testing - never real identity papers.</p>
      <form onSubmit={upload} className="card row wrap">
        <label>Document type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>File<input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" onChange={(e) => setFile(e.target.files[0])} /></label>
        <button className="primary" disabled={busy}>{busy ? 'Reading document...' : 'Upload'}</button>
      </form>
      {msg.text && <p className={msg.type === 'error' ? 'error' : 'okmsg'}>{msg.text}</p>}

      {docs.length === 0 && <p>No documents yet. Upload your first document above.</p>}
      {docs.map((d) => (
        <DocCard key={`${d._id}-${d.updatedAt}`} doc={d}
          onChanged={(text) => { setMsg({ type: 'ok', text }); load(); }}
          onError={(text) => setMsg({ type: 'error', text })} />
      ))}
    </>
  );
}
