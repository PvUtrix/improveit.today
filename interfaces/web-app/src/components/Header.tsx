import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="header">
      <h1>🌍 ImproveIt.Today</h1>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/map">Map</Link>
        <Link to="/globe">Globe</Link>
      </nav>
    </header>
  );
}

export default Header;
