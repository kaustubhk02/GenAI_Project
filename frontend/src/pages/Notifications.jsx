import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';

export default function Notifications() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/notifications')
      .then((r) => setItems(r.data.notifications))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const readAll = async () => { 
    await api.post('/notifications/read-all'); 
    load(); 
  };

  const readOne = async (id) => { 
    await api.patch(`/notifications/${id}/read`); 
    load(); 
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ margin: 0, color: 'var(--slate-800)' }}>Loading notifications...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-box error" style={{ margin: '2rem 0' }}>
        <span>⚠️</span>
        <div>{error}</div>
      </div>
    );
  }

  const unreadCount = (items || []).filter((n) => !n.read).length;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.85rem', color: 'var(--slate-900)' }}>
            Notifications & Scheme Alerts 🔔
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: '0.925rem' }}>
            Updates on document verification, newly unlocked scheme eligibility, and deadlines.
          </p>
        </div>

        {unreadCount > 0 && (
          <button 
            type="button" 
            className="secondary btn" 
            onClick={readAll}
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>✓</span> Mark all ({unreadCount}) as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔔</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--slate-800)' }}>No notifications yet</h3>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem', maxWidth: '440px', marginInline: 'auto' }}>
            When uploading a document or updating profile details unlocks new scheme benefits, you will receive real-time notifications here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((n) => (
            <section 
              key={n._id} 
              className="card"
              style={{ 
                borderRadius: 'var(--radius-lg)',
                borderLeft: n.read ? '4px solid var(--slate-300)' : '4px solid var(--primary-600)',
                background: n.read ? '#ffffff' : 'linear-gradient(to right, #f0fdf4, #ffffff)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{n.read ? '📩' : '📬'}</span> {n.title}
                </h3>
                {!n.read && (
                  <span style={{ fontSize: '0.72rem', background: 'var(--primary-100)', color: 'var(--primary-800)', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                    NEW
                  </span>
                )}
              </div>

              <p style={{ margin: '0.25rem 0 0.85rem 0', fontSize: '0.9rem', color: 'var(--slate-700)', lineHeight: '1.5' }}>
                {n.message}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--slate-100)', paddingTop: '0.65rem' }}>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  🕒 {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Link 
                    to="/" 
                    className="secondary btn"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    View Schemes ↗
                  </Link>
                  {!n.read && (
                    <button 
                      type="button" 
                      className="link" 
                      onClick={() => readOne(n._id)}
                      style={{ fontSize: '0.825rem', color: 'var(--primary-700)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
