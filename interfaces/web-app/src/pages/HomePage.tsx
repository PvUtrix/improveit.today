import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '📝',
    title: 'Report',
    body: 'Spot a pothole or a dark streetlight? Report it in seconds, with a photo and a pin.',
  },
  {
    icon: '⬆️',
    title: 'Vote',
    body: 'Upvote what matters most. The problems your community cares about rise to the top.',
  },
  {
    icon: '💰',
    title: 'Fund',
    body: 'Crowdfund a fix together — small contributions add up to real change on your street.',
  },
  {
    icon: '🔨',
    title: 'Solve',
    body: 'Vetted solvers bid on the work and get paid to make your neighborhood better.',
  },
];

function HomePage() {
  return (
    <div className="home">
      <section className="hero">
        <span className="hero-badge">🌍 A global open-source service desk</span>
        <h1>
          Fix your <span className="grad">corner of the world</span>.
        </h1>
        <p>
          Report, prioritize, fund, and solve local problems — from a broken
          streetlight to a flooded road. One report doesn't stay one report.
        </p>
        <div className="hero-cta">
          <Link to="/report" className="button">
            📢 Report a Problem
          </Link>
          <Link to="/map" className="button button-secondary">
            Explore the Map
          </Link>
        </div>
      </section>

      <section className="feature-grid">
        {FEATURES.map((f) => (
          <div className="feature" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default HomePage;
