import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', mobileNumber: '', email: '', password: '',
    preferredLanguage: 'MARATHI', age: '', gender: 'MALE',
    state: '', district: '', taluka: '', village: '',
    category: 'GENERAL', farmerType: 'INDIVIDUAL'
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await register({ ...form, age: Number(form.age) });
      navigate('/profile');
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth" style={{ maxWidth: '600px' }}>
      <h1>Create your account</h1>
      <form onSubmit={submit} className="stack">
        <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Mobile Number<input required pattern="^[0-9]{10}$" title="10 digit mobile number" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} /></label>
        <label>Email (optional)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password (8+ characters)<input type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        
        <label>Preferred Language
          <select value={form.preferredLanguage} onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}>
            <option value="MARATHI">Marathi</option>
            <option value="HINDI">Hindi</option>
            <option value="ENGLISH">English</option>
          </select>
        </label>
        
        <label>Age<input type="number" min="18" max="120" required value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
        
        <label>Gender
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        
        <label>State<input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></label>
        <label>District<input required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></label>
        <label>Taluka<input required value={form.taluka} onChange={(e) => setForm({ ...form, taluka: e.target.value })} /></label>
        <label>Village<input required value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} /></label>
        
        <label>Category (optional)
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="GENERAL">General</option>
            <option value="OBC">OBC</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
          </select>
        </label>
        
        <label>Farmer Type
          <select value={form.farmerType} onChange={(e) => setForm({ ...form, farmerType: e.target.value })}>
            <option value="INDIVIDUAL">Individual</option>
            <option value="JOINT">Joint</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
      </form>
      <p>Already registered? <Link to="/login">Log in</Link></p>
    </div>
  );
}
