import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import AuthModal from './AuthModal';

function Header() {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <header className="header">
      <h1>🌍 ImproveIt.Today</h1>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/map">Map</Link>
        <Link to="/globe">Globe</Link>
        <Link to="/report">Report</Link>
        <Link to="/dashboard">Authorities</Link>
        <a href="/prototype/">Prototype</a>
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
