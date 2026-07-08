// Report-problem multi-step modal + main side panels (filters, activity, persona shells)

const { useState: useStateR } = React;

window.ReportModal = function ReportModal({ open, onClose, onSubmit }) {
  const [step, setStep] = useStateR(1);
  const [data, setData] = useStateR({ category: "", title: "", desc: "", address: "" });

  if (!open) return null;

  const close = () => { setStep(1); setData({ category: "", title: "", desc: "", address: "" }); onClose(); };
  const next  = () => setStep(s => Math.min(5, s + 1));
  const back  = () => setStep(s => Math.max(1, s - 1));
  const submit = () => { onSubmit(data); setStep(5); };

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="manila-tab small">NEW CASE FILE</div>
          <button className="close-x" onClick={close}>×</button>
        </div>

        <div className="modal-progress">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className={`prog-step ${step >= n ? "done" : ""} ${step === n ? "current" : ""}`}>
              <span className="prog-num">{n}</span>
              <span className="prog-label">
                {n === 1 ? "Location" : n === 2 ? "Photo" : n === 3 ? "Describe" : n === 4 ? "Categorize" : "Done"}
              </span>
            </div>
          ))}
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="step">
              <h3>Where is the problem?</h3>
              <div className="loc-mock">
                <svg viewBox="0 0 200 100" className="loc-mini" preserveAspectRatio="none">
                  <rect width="200" height="100" fill="#f5efe1" />
                  <line x1="0" y1="50" x2="200" y2="50" stroke="#a8a29e" strokeWidth="1" />
                  <line x1="100" y1="0" x2="100" y2="100" stroke="#a8a29e" strokeWidth="1" />
                  <circle cx="100" cy="50" r="4" fill="#c2410c" />
                  <circle cx="100" cy="50" r="10" fill="#c2410c" opacity="0.2">
                    <animate attributeName="r" from="4" to="20" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.4" to="0" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                </svg>
                <div className="loc-mock-cap mono">📍 Lat 39.7817, Lng -89.6501 · 12m accuracy</div>
              </div>
              <input className="form-input" placeholder="Or type an address…"
                     value={data.address} onChange={e => setData({...data, address: e.target.value})} />
              <div className="form-actions end">
                <button className="primary-btn" onClick={next}>Continue →</button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="step">
              <h3>Add a photo (recommended)</h3>
              <div className="upload-zone">
                <div className="upload-icon">📷</div>
                <div>Drop a photo here or <u>browse</u></div>
                <div className="upload-hint mono">JPG, PNG · max 10MB</div>
              </div>
              <div className="form-actions">
                <button className="ghost-btn" onClick={back}>← Back</button>
                <div className="form-actions-right">
                  <button className="link-btn" onClick={next}>Skip</button>
                  <button className="primary-btn" onClick={next}>Continue →</button>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="step">
              <h3>Describe the problem</h3>
              <input className="form-input" placeholder="Short title (e.g., Pothole on Main St)"
                     value={data.title} onChange={e => setData({...data, title: e.target.value})} />
              <textarea className="form-input" rows="4" placeholder="What's happening? How urgent?"
                        value={data.desc} onChange={e => setData({...data, desc: e.target.value})} />
              <div className="form-actions">
                <button className="ghost-btn" onClick={back}>← Back</button>
                <button className="primary-btn" onClick={next} disabled={!data.title}>Continue →</button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="step">
              <h3>What kind of problem?</h3>
              <div className="cat-grid">
                {Object.entries(window.CATEGORIES).map(([k, c]) => (
                  <button key={k}
                          className={`cat-tile ${data.category === k ? "active" : ""}`}
                          onClick={() => setData({...data, category: k})}>
                    <span className="cat-tile-glyph" style={{ color: c.color }}>{c.glyph}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <button className="ghost-btn" onClick={back}>← Back</button>
                <button className="primary-btn" onClick={submit} disabled={!data.category}>Submit report</button>
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="step success-step">
              <div className="success-art">
                <svg viewBox="0 0 80 80" width="80" height="80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#65a30d" strokeWidth="2" />
                  <path d="M 24 40 L 36 52 L 56 28" fill="none" stroke="#65a30d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Case opened</h3>
              <div className="case-id-big mono">P-{12357 + Math.floor(Math.random() * 99)}</div>
              <p>Your report is now visible on the map. Share it with neighbors to gather votes.</p>
              <div className="form-actions center">
                <button className="primary-btn" onClick={close}>View on map</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

window.LeftRail = function LeftRail({ filters, setFilters, showHeatmap, setShowHeatmap, scenario, problemsCount }) {
  const sc = window.SCENARIOS[scenario];

  return (
    <div className="left-rail">
      <div className="rail-section">
        <div className="rail-section-label">CITY SNAPSHOT</div>
        <div className="rail-headline">
          <div className="rail-stat">
            <div className="rail-stat-num">{sc.stats.reported.toLocaleString()}</div>
            <div className="rail-stat-lab">reported</div>
          </div>
          <div className="rail-stat">
            <div className="rail-stat-num">{sc.stats.resolved.toLocaleString()}</div>
            <div className="rail-stat-lab">resolved</div>
          </div>
        </div>
        <div className="rail-sub mono">SCENARIO · {sc.label.toUpperCase()}</div>
      </div>

      <div className="rail-section">
        <div className="rail-section-label">FILTER</div>
        <div className="filter-group">
          <div className="filter-label">Category</div>
          <div className="chip-row">
            <button className={`chip ${!filters.category || filters.category === "all" ? "active" : ""}`}
                    onClick={() => setFilters({...filters, category: "all"})}>All</button>
            {Object.entries(window.CATEGORIES).map(([k, c]) => (
              <button key={k} className={`chip ${filters.category === k ? "active" : ""}`}
                      onClick={() => setFilters({...filters, category: k})}>
                <span style={{ color: c.color, marginRight: 4 }}>{c.glyph}</span>{c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">Status</div>
          <div className="chip-row">
            <button className={`chip ${!filters.status || filters.status === "all" ? "active" : ""}`}
                    onClick={() => setFilters({...filters, status: "all"})}>All</button>
            {Object.entries(window.STATUSES).map(([k, s]) => (
              <button key={k} className={`chip ${filters.status === k ? "active" : ""}`}
                      onClick={() => setFilters({...filters, status: k})}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">
            Min votes: <span className="mono">{filters.minVotes || 0}</span>
          </div>
          <input type="range" min="0" max="300" step="10"
                 value={filters.minVotes || 0}
                 onChange={e => setFilters({...filters, minVotes: Number(e.target.value)})}
                 className="amount-slider" />
        </div>

        <label className="toggle-row">
          <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
          <span>Heatmap view</span>
        </label>
      </div>

      <div className="rail-section">
        <div className="rail-section-label">LEGEND</div>
        <div className="legend">
          <div className="legend-row"><span className="legend-spike escal" /> Escalated</div>
          <div className="legend-row"><span className="legend-spike prog" /> In progress</div>
          <div className="legend-row"><span className="legend-spike verif" /> Verified</div>
          <div className="legend-row"><span className="legend-spike resolv" /> Resolved</div>
        </div>
        <div className="legend-note mono">Spike height = votes</div>
      </div>
    </div>
  );
};

window.ActivityRail = function ActivityRail({ activity, onJump }) {
  return (
    <div className="activity-rail">
      <div className="rail-section-label">LIVE ACTIVITY</div>
      <ul className="activity-list">
        {activity.map((a, i) => (
          <li key={i} className="activity-item" onClick={() => onJump(a.where)}>
            <div className="activity-line">
              <span className="who">{a.who}</span>{" "}
              <span className="what">{a.what}</span>{" "}
              <span className="where mono">{a.where}</span>
            </div>
            <div className="when mono">{a.t}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

window.SolverShell = function SolverShell({ children, problems, onJump }) {
  const me = window.ME_SOLVER;
  const myProblems = problems.filter(p => me.bids.includes(p.id) || me.active.includes(p.id));
  return (
    <div className="solver-shell">
      <div className="solver-side">
        <div className="solver-card">
          <div className="solver-avatar-lg">A</div>
          <div className="solver-card-name">{me.name}</div>
          <div className="mono small">★ {me.rating} · {me.reviews} reviews</div>
          <div className="solver-stats">
            <div><b>{me.completed}</b><span>jobs</span></div>
            <div><b>${(me.earned/1000).toFixed(1)}k</b><span>earned</span></div>
            <div><b>{me.successRate}%</b><span>success</span></div>
          </div>
        </div>

        <div className="rail-section">
          <div className="rail-section-label">MY ACTIVE JOBS</div>
          {myProblems.filter(p => me.active.includes(p.id)).map(p => (
            <div key={p.id} className="solver-job active" onClick={() => onJump(p.id)}>
              <div className="solver-job-id mono">{p.id} · ACTIVE</div>
              <div className="solver-job-title">{p.title}</div>
              <div className="solver-job-meta mono">deadline 3d · ${p.bids[0]?.amount}</div>
            </div>
          ))}
          <div className="rail-section-label" style={{ marginTop: 14 }}>PENDING BIDS</div>
          {myProblems.filter(p => me.bids.includes(p.id)).map(p => (
            <div key={p.id} className="solver-job" onClick={() => onJump(p.id)}>
              <div className="solver-job-id mono">{p.id}</div>
              <div className="solver-job-title">{p.title}</div>
              <div className="solver-job-meta mono">your bid · ${p.bids[0]?.amount}</div>
            </div>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
};

window.AuthorityShell = function AuthorityShell({ children, problems, onJump }) {
  const me = window.ME_AUTH;
  const urgent = problems.filter(p => p.votes >= me.threshold).sort((a,b) => b.votes - a.votes);
  return (
    <div className="auth-shell">
      <div className="auth-side">
        <div className="auth-card">
          <div className="auth-name">{me.name}</div>
          <div className="mono small">{me.jurisdiction}</div>
          <div className="auth-metrics">
            <div><b>{me.responseTime}d</b><span>avg response</span></div>
            <div><b>{me.resolutionTime}d</b><span>avg resolution</span></div>
            <div><b>{me.satisfaction}%</b><span>satisfaction</span></div>
          </div>
        </div>

        <div className="rail-section">
          <div className="rail-section-label">URGENT QUEUE · ≥{me.threshold} VOTES</div>
          {urgent.map(p => (
            <div key={p.id} className={`auth-row ${p.status}`} onClick={() => onJump(p.id)}>
              <div className="auth-row-l">
                <div className="auth-row-id mono">{p.id}</div>
                <div className="auth-row-title">{p.title}</div>
                <div className="auth-row-meta mono">{window.STATUSES[p.status].label}</div>
              </div>
              <div className="auth-row-r">
                <div className="auth-votes">▲ {p.votes}</div>
                <button className="ghost-btn small">Ack</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
};
