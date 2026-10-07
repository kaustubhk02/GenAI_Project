import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import FieldInput, { cleanValues } from '../components/FieldInput.jsx';
import { PROFILE_FIELDS } from '../constants.js';

const getPath = (obj, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), obj);

export default function Profile() {
  const [values, setValues] = useState({});
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/profile').then((r) => {
      const next = {};
      for (const [path, key] of PROFILE_FIELDS) next[key] = getPath(r.data.profile, path) ?? '';
      setValues(next);
    }).catch((e) => setMsg({ type: 'error', text: errMsg(e) })).finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    const typed = cleanValues(values);
    const body = {};
    for (const [path, key] of PROFILE_FIELDS) {
      if (typed[key] === undefined) continue;
      const [group, field] = path.split('.');
      (body[group] ||= {})[field] = typed[key];
    }
    try {
      await api.put('/profile', body);
      setMsg({ type: 'ok', text: 'Profile saved. Your scheme matches have been updated.' });
    } catch (err) { setMsg({ type: 'error', text: errMsg(err) }); }
  };

  if (loading) return <p>Loading...</p>;
  return (
    <>
      <h1>My profile</h1>
      <p className="muted">Fill in what you know. You can also upload documents and we will read the details for you to confirm.</p>
      <form onSubmit={save} className="grid">
        {PROFILE_FIELDS.map(([, key]) => (
          <FieldInput key={key} fieldKey={key} value={values[key]} onChange={(v) => setValues({ ...values, [key]: v })} />
        ))}
        <div className="full">
          {msg.text && <p className={msg.type === 'error' ? 'error' : 'okmsg'}>{msg.text}</p>}
          <button className="primary">Save profile</button>
        </div>
      </form>
    </>
  );
}
