import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../store/auth';
import AuthModal from './AuthModal';

function Header() {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <Link to="/" className="brand">
        <span className="brand-mark">🌍</span>
        <span className="brand-name">
          ImproveIt<b>.Today</b>
        </span>
      </Link>
      <button
        className="nav-toggle"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      <nav className={menuOpen ? 'open' : ''} onClick={() => setMenuOpen(false)}>
        <NavLink to="/map">Map</NavLink>
        <NavLink to="/globe">Globe</NavLink>
        <NavLink to="/report">Report</NavLink>
        <NavLink to="/dashboard">Authorities</NavLink>
        {user ? (
          <span className="user-chip">
            <span title={user.email}>👤 {user.username}</span>
            <button className="link-button" onClick={logout}>
              Sign out
            </button>
          </span>
        ) : (
          <button className="button button-small" onClick={() => setShowAuth(true)}>
            Sign in
          </button>
        )}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}

export default Header;
