import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import { STATES } from '../constants.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', mobileNumber: '', email: '', password: '',
    preferredLanguage: 'MARATHI', age: '', gender: 'MALE',
    state: 'Maharashtra', district: '', taluka: '', village: '',
    category: 'GENERAL', farmerType: 'INDIVIDUAL'
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); 
    setError('');
    try {
      await register({ ...form, age: Number(form.age) });
      navigate('/profile');
    } catch (err) { 
      setError(errMsg(err)); 
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '680px', margin: '2.5rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.35rem' }}>🌱</div>
        <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.65rem', color: 'var(--slate-900)' }}>
          Create Farmer Account
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
          Register to find official government schemes matching your profile and landholding.
        </p>
      </div>

      <form onSubmit={submit} className="stack">
        <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: 'var(--primary-800)', borderBottom: '1.5px solid var(--slate-100)', paddingBottom: '0.35rem' }}>
          👤 Personal & Account Information
        </h3>

        <div className="grid">
          <label>
            <span>Full Name *</span>
            <input 
              required 
              placeholder="e.g. Ramesh Shankar Patil"
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
            />
          </label>

          <label>
            <span>Mobile Number *</span>
            <input 
              required 
              pattern="^[0-9]{10}$" 
              title="10-digit mobile number"
              placeholder="10-digit number"
              value={form.mobileNumber} 
              onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} 
            />
          </label>

          <label>
            <span>Email (optional)</span>
            <input 
              type="email" 
              placeholder="farmer@example.com"
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
            />
          </label>

          <label>
            <span>Password (8+ characters) *</span>
            <input 
              type="password" 
              minLength={8} 
              required 
              placeholder="••••••••"
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
            />
          </label>

          <label>
            <span>Preferred Language</span>
            <select 
              value={form.preferredLanguage} 
              onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
            >
              <option value="MARATHI">मराठी (Marathi)</option>
              <option value="HINDI">हिंदी (Hindi)</option>
              <option value="ENGLISH">English</option>
            </select>
          </label>

          <label>
            <span>Age *</span>
            <input 
              type="number" 
              min="18" 
              max="120" 
              required 
              placeholder="e.g. 42"
              value={form.age} 
              onChange={(e) => setForm({ ...form, age: e.target.value })} 
            />
          </label>

          <label>
            <span>Gender</span>
            <select 
              value={form.gender} 
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="MALE">Male (पुरुष)</option>
              <option value="FEMALE">Female (महिला)</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        </div>

        <h3 style={{ margin: '1rem 0 0 0', fontSize: '1rem', color: 'var(--primary-800)', borderBottom: '1.5px solid var(--slate-100)', paddingBottom: '0.35rem' }}>
          📍 Location & Farming Area
        </h3>

        <div className="grid">
          <label>
            <span>State *</span>
            <select 
              value={form.state} 
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label>
            <span>District *</span>
            <input 
              required 
              placeholder="e.g. Kolhapur"
              value={form.district} 
              onChange={(e) => setForm({ ...form, district: e.target.value })} 
            />
          </label>

          <label>
            <span>Taluka / Block *</span>
            <input 
              required 
              placeholder="e.g. Karveer"
              value={form.taluka} 
              onChange={(e) => setForm({ ...form, taluka: e.target.value })} 
            />
          </label>

          <label>
            <span>Village *</span>
            <input 
              required 
              placeholder="e.g. Shiroli"
              value={form.village} 
              onChange={(e) => setForm({ ...form, village: e.target.value })} 
            />
          </label>

          <label>
            <span>Social Category</span>
            <select 
              value={form.category} 
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="GENERAL">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
            </select>
          </label>

          <label>
            <span>Farmer Type</span>
            <select 
              value={form.farmerType} 
              onChange={(e) => setForm({ ...form, farmerType: e.target.value })}
            >
              <option value="INDIVIDUAL">Individual Owner</option>
              <option value="JOINT">Joint Family Holding</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="alert-box error" style={{ padding: '0.65rem 0.85rem' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          className="primary btn" 
          disabled={busy}
          style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: '700', marginTop: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
        >
          {busy ? (
            <>
              <span className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#ffffff' }} />
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Complete Registration & Go to Profile</span>
          )}
        </button>
      </form>

      <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
        <span>Already have an account? </span>
        <Link to="/login" style={{ color: 'var(--primary-700)', fontWeight: '700' }}>
          Sign In
        </Link>
      </div>
    </div>
  );
}
