import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authorityApi } from '../lib/api';
import { useAuth } from '../store/auth';

const STATUS_ORDER = [
  'reported',
  'verified',
  'escalated',
  'in_progress',
  'pending_verification',
  'resolved',
  'rejected',
  'reopened',
];

function DashboardBody({ authorityId }: { authorityId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['authority-dashboard', authorityId],
    queryFn: () => authorityApi.dashboard(authorityId),
  });

  const { data: escalatedProblems } = useQuery({
    queryKey: ['authority-problems', authorityId, 'escalated'],
    queryFn: () => authorityApi.problems(authorityId, 'escalated'),
  });

  if (isLoading) return <div className="panel">Loading dashboard…</div>;
  if (error || !data)
    return (
      <div className="panel">
        <div className="form-error">
          Could not load the dashboard. Is the backend running?
        </div>
      </div>
    );

  const statuses = STATUS_ORDER.filter((s) => data.byStatus[s] !== undefined);

  return (
    <div className="dashboard">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{data.totalProblems}</div>
          <div className="stat-label">Total problems</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.byStatus.escalated ?? 0}</div>
          <div className="stat-label">Escalated to you</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.byStatus.resolved ?? 0}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {data.resolutionTime.medianDays != null
              ? `${data.resolutionTime.medianDays}d`
              : '—'}
          </div>
          <div className="stat-label">Median resolution</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Problems by status</h2>
          {statuses.length === 0 ? (
            <p className="muted">No problems in this jurisdiction yet.</p>
          ) : (
            <ul className="stat-list">
              {statuses.map((s) => (
                <li key={s}>
                  <span className={`status-pill status-${s}`}>
                    {s.replace('_', ' ')}
                  </span>
                  <strong>{data.byStatus[s]}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Top categories</h2>
          {data.topCategories.length === 0 ? (
            <p className="muted">No data yet.</p>
          ) : (
            <ul className="stat-list">
              {data.topCategories.map((c) => (
                <li key={c.category}>
                  <span>🏷️ {c.category}</span>
                  <strong>{c.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>🚨 Escalated — awaiting action</h2>
        {escalatedProblems && escalatedProblems.length > 0 ? (
          <ul className="escalated-list">
            {escalatedProblems.map((p) => (
              <li key={p.id} className="escalated-item">
                <div>
                  <Link to={`/problem/${p.id}`} className="escalated-title">
                    {p.title}
                  </Link>
                  <div className="escalated-meta">
                    🏷️ {p.category} · ⬆️ {p.upvotes} votes
                  </div>
                </div>
                <span className={`status-pill status-${p.status}`}>
                  {p.status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nothing escalated right now. 🎉</p>
        )}
      </section>
    </div>
  );
}

function AuthorityDashboard() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string>('');

  const { data: authorities, isLoading } = useQuery({
    queryKey: ['authorities'],
    queryFn: () => authorityApi.list(),
  });

  if (!user) {
    return (
      <div className="detail-page">
        <h1>Authority Dashboard</h1>
        <p className="muted">Sign in to view the authority dashboard.</p>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <h1>🏛️ Authority Dashboard</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        Monitor problems reported in a jurisdiction and act on escalations.
      </p>

      <label className="field" style={{ maxWidth: 420, marginBottom: 24 }}>
        <span>Authority</span>
        <select
          className="select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={isLoading}
        >
          <option value="">
            {isLoading ? 'Loading authorities…' : 'Select an authority…'}
          </option>
          {authorities?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.jurisdiction_name ? ` — ${a.jurisdiction_name}` : ''}
              {a.is_verified ? ' ✓' : ''}
            </option>
          ))}
        </select>
      </label>

      {authorities && authorities.length === 0 && (
        <p className="muted">
          No authorities registered yet. Register one via the Authority Service
          (<code>POST /api/authorities</code>).
        </p>
      )}

      {selectedId && <DashboardBody authorityId={selectedId} />}
    </div>
  );
}

export default AuthorityDashboard;
