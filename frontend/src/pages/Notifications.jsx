import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';

export default function Notifications() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get('/notifications').then((r) => setItems(r.data.notifications)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const readAll = async () => { await api.post('/notifications/read-all'); load(); };
  const readOne = async (id) => { await api.patch(`/notifications/${id}/read`); load(); };

  if (error) return <p className="error">{error}</p>;
  if (!items) return <p>Loading...</p>;
  return (
    <>
      <div className="row between"><h1>Notifications</h1>{items.some((n) => !n.read) && <button className="link" onClick={readAll}>Mark all as read</button>}</div>
      {items.length === 0 && <p>Nothing yet. When a missing document or profile detail improves your eligibility, you will see it here.</p>}
      {items.map((n) => (
        <section key={n._id} className={`card ${n.read ? '' : 'unread'}`}>
          <h3>{n.title}</h3>
          <p>{n.message}</p>
          <div className="row">
            <span className="muted">{new Date(n.createdAt).toLocaleString()}</span>
            <Link to="/">See schemes</Link>
            {!n.read && <button className="link" onClick={() => readOne(n._id)}>Mark as read</button>}
          </div>
        </section>
      ))}
    </>
  );
}
