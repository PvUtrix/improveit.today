import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div style={{ padding: '48px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>
        Global Open-Source Service Desk
      </h1>
      <p style={{ fontSize: '20px', marginBottom: '32px', color: '#666' }}>
        Report, prioritize, fund, and solve local problems worldwide
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '48px' }}>
        <div style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>📝 Report</h2>
          <p>Spot a pothole? Broken streetlight? Report problems in your community instantly.</p>
        </div>

        <div style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>⬆️ Vote</h2>
          <p>Upvote problems that matter most to you and your community.</p>
        </div>

        <div style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>💰 Fund</h2>
          <p>Crowdfund solutions to community problems.</p>
        </div>

        <div style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>🔨 Solve</h2>
          <p>Bid on problems, get paid to make your community better.</p>
        </div>
      </div>

      <div style={{ marginTop: '48px', display: 'flex', gap: '16px' }}>
        <Link to="/report" className="button">
          📢 Report a Problem
        </Link>
        <Link to="/map" className="button button-secondary">
          View Map
        </Link>
        <Link to="/globe" className="button button-secondary">
          View Globe
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
