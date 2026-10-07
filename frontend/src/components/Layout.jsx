import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get('/notifications').then((r) => setUnread(r.data.unreadCount)).catch(() => {});
  }, [location.pathname]);

  return (
    <>
      <header className="topbar">
        <strong className="brand">Scheme Finder</strong>
        <nav>
          <NavLink to="/" end>Schemes for me</NavLink>
          <NavLink to="/profile">My profile</NavLink>
          <NavLink to="/documents">My documents</NavLink>
          <NavLink to="/notifications">Notifications{unread > 0 && <span className="pill">{unread}</span>}</NavLink>
        </nav>
        <span className="who">
          {user?.name}
          <button className="link" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </span>
      </header>
      <main className="page"><Outlet /></main>
      <footer className="foot">
        Informational assessment only - not a final decision. Applications are always made on the official government portal.
      </footer>
    </>
  );
}
