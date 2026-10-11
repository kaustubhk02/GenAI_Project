import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    api.get('/notifications').then((r) => setUnread(r.data.unreadCount || 0)).catch(() => {});
  }, [location.pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <>
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label="Toggle Navigation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>

          <NavLink to="/" className="brand">
            <div className="brand-icon">🌱</div>
            <div className="brand-text">
              <span className="brand-title">KisanSetu <span style={{ fontSize: '0.85rem', fontWeight: '500', opacity: 0.9 }}>किसानसेतू</span></span>
              <span className="brand-subtitle">Government Scheme & Welfare Portal</span>
            </div>
          </NavLink>
        </div>

        <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <NavLink to="/" end>
            Schemes For Me
          </NavLink>
          <NavLink to="/profile">
            Farmer Profile
          </NavLink>
          <NavLink to="/documents">
            Documents Vault
          </NavLink>
          <NavLink to="/notifications">
            Notifications
            {unread > 0 && <span className="pill-badge">{unread}</span>}
          </NavLink>
        </nav>

        {/* Profile Avatar & Dropdown */}
        <div className="user-menu-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className="profile-avatar-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <div className="avatar-circle">{initials}</div>
            <span className="avatar-name">{user?.name || 'Farmer'}</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
          </button>

          {dropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-user-name">{user?.name || 'Farmer User'}</div>
                <div className="dropdown-user-sub">{user?.email || user?.mobileNumber || 'Farmer Account'}</div>
                {user?.preferredLanguage && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#047857', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                      {user.preferredLanguage}
                    </span>
                  </div>
                )}
              </div>

              <div className="dropdown-items">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                >
                  Edit Profile Details
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setDropdownOpen(false); navigate('/documents'); }}
                >
                  Uploaded Documents
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setDropdownOpen(false); navigate('/notifications'); }}
                >
                  Notifications ({unread})
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  style={{ color: '#dc2626' }}
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                    navigate('/login');
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <footer className="foot">
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ margin: 0, fontWeight: '600', color: 'var(--slate-700)' }}>
            KisanSetu • AI-Powered Government Scheme Eligibility Platform for Farmers
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--slate-500)' }}>
            Official Information Disclaimer: This platform provides automated eligibility assessment grounded in official government scheme documentation. Final sanction and benefit disbursement is carried out exclusively through official central and state government portals.
          </p>
        </div>
      </footer>
    </>
  );
}
