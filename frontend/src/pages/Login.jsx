import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); 
    setError('');
    try { 
      await login(form.identifier, form.password); 
      navigate('/'); 
    } catch (err) { 
      setError(errMsg(err)); 
    } finally { 
      setBusy(false); 
    }
  };

  const handleFillDemo = () => {
    setForm({ identifier: 'demo@farmer.test', password: 'Demo@12345' });
  };

  return (
    <div className="auth-container">
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.35rem' }}>🌱</div>
        <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', color: 'var(--slate-900)' }}>
          KisanSetu <span style={{ fontSize: '1.1rem', color: 'var(--primary-700)' }}>किसानसेतू</span>
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
          Sign in to check government welfare schemes and benefits
        </p>
      </div>

      <form onSubmit={submit} className="stack">
        <label>
          <span>Mobile Number or Email</span>
          <input 
            type="text" 
            required 
            placeholder="e.g. 9876543210 or demo@farmer.test"
            value={form.identifier} 
            onChange={(e) => setForm({ ...form, identifier: e.target.value })} 
          />
        </label>

        <label>
          <span>Password</span>
          <input 
            type="password" 
            required 
            placeholder="••••••••"
            value={form.password} 
            onChange={(e) => setForm({ ...form, password: e.target.value })} 
          />
        </label>

        {error && (
          <div className="alert-box error" style={{ padding: '0.65rem 0.85rem', margin: '0.25rem 0' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          className="primary btn" 
          disabled={busy}
          style={{ width: '100%', padding: '0.7rem', fontSize: '0.95rem', fontWeight: '700', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
        >
          {busy ? (
            <>
              <span className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#ffffff' }} />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In to Dashboard</span>
          )}
        </button>
      </form>

      {/* Demo Credentials Quick-fill box */}
      <div style={{ 
        marginTop: '1.5rem', 
        padding: '0.85rem', 
        background: 'var(--slate-50)', 
        border: '1px solid var(--slate-200)', 
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8rem',
        textAlign: 'center'
      }}>
        <div style={{ color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
          <strong>Demo Farmer Account:</strong> demo@farmer.test / Demo@12345
        </div>
        <button
          type="button"
          onClick={handleFillDemo}
          className="secondary btn"
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
        >
          ⚡ Auto-fill Demo Credentials
        </button>
      </div>

      <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
        <span>New farmer on the platform? </span>
        <Link to="/register" style={{ color: 'var(--primary-700)', fontWeight: '700' }}>
          Create an account
        </Link>
      </div>
    </div>
  );
}
