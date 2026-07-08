// Problem detail panel — manila-dossier styled card
const { useState: useStateD } = React;

window.DetailPanel = function DetailPanel({ problem, onClose, onVote, onContribute, onBid, persona }) {
  const [tab, setTab] = useStateD("overview");
  const [voted, setVoted] = useStateD(false);
  const [contribAmt, setContribAmt] = useStateD(10);
  const [showContrib, setShowContrib] = useStateD(false);
  const [showBid, setShowBid] = useStateD(false);

  if (!problem) {
    return (
      <div className="detail-empty">
        <div className="manila-tab">CASE FILE</div>
        <div className="empty-art">
          <svg viewBox="0 0 80 80" width="80" height="80">
            <circle cx="40" cy="40" r="30" fill="none" stroke="#d6d3d1" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx="40" cy="40" r="3" fill="#c2410c" />
            <line x1="40" y1="37" x2="40" y2="20" stroke="#c2410c" strokeWidth="1" />
          </svg>
        </div>
        <div className="empty-msg">Select a pin on the map<br/>to view the case file.</div>
        <div className="empty-hint">{window.PROBLEMS.length} active cases · click any spike</div>
      </div>
    );
  }

  const cat = window.CATEGORIES[problem.category];
  const status = window.STATUSES[problem.status];
  const fundPct = Math.min(100, Math.round((problem.raised / problem.goal) * 100));
  const totalVotes = problem.votes + (voted ? 1 : 0);
  const totalRaised = problem.raised + (showContrib ? 0 : 0);

  return (
    <div className="detail-panel">
      {/* Manila-folder tab on top */}
      <div className="manila-header">
        <div className="manila-tab">CASE FILE</div>
        <button className="close-x" onClick={onClose} aria-label="Close">×</button>
      </div>

      {/* Case number bar */}
      <div className="case-bar">
        <div className="case-num">{problem.id}</div>
        <div className={`status-chip status-${status.tone}`}>
          <span className="status-dot" />{status.label}
        </div>
      </div>

      {/* Title block */}
      <div className="title-block">
        <div className="cat-line">
          <span className="cat-glyph" style={{ color: cat.color }}>{cat.glyph}</span>
          <span className="cat-label">{cat.label}</span>
          <span className="dot-sep">·</span>
          <span className="reported-when">Reported {problem.daysAgo}d ago by <b>{problem.reporter}</b></span>
        </div>
        <h2 className="case-title">{problem.title}</h2>
        <div className="addr-line">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 0 L5 8 M3 6 L5 8 L7 6" stroke="#78716c" fill="none" strokeWidth="1"/></svg>
          {problem.address}
        </div>
      </div>

      {/* Photo placeholder */}
      <div className="photo-slot">
        <PhotoPlaceholder kind={problem.photo} />
        <div className="photo-meta">
          <span className="mono">EXIF</span> · GPS verified · {problem.daysAgo}d
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {["overview", "funding", "bids", "comments"].map(t => (
          <button key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}>
            {t === "overview" ? "Overview" :
             t === "funding"  ? "Funding" :
             t === "bids"     ? `Bids (${problem.bids.length})` :
             `Comments (${problem.comments})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-body">
        {tab === "overview" && (
          <div>
            <p className="desc">{problem.description}</p>

            {/* Vote thermometer */}
            <div className="metric-card">
              <div className="metric-label">Community priority</div>
              <div className="thermo">
                <div className="thermo-fill" style={{ width: `${Math.min(100, totalVotes / 4)}%` }} />
                <div className="thermo-marks">
                  {[50, 100, 200, 300].map(m => (
                    <div key={m} className="thermo-mark" style={{ left: `${Math.min(100, m / 4)}%` }}>
                      <span className="mark-tick" />
                      <span className="mark-num">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="metric-bottom">
                <div className="vote-count">
                  <span className="big-num">{totalVotes}</span><span className="big-sub"> upvotes</span>
                </div>
                <button
                  className={`vote-btn ${voted ? "voted" : ""}`}
                  onClick={() => { setVoted(v => !v); onVote(problem.id, !voted); }}>
                  {voted ? "✓ Voted" : "▲ Upvote"}
                </button>
              </div>
            </div>

            {/* Quick funding */}
            <div className="metric-card">
              <div className="metric-label-row">
                <span className="metric-label">Funding</span>
                <span className="mono small">${problem.raised} of ${problem.goal}</span>
              </div>
              <FundingBar funding={problem.funding} goal={problem.goal} />
              <div className="metric-bottom">
                <div className="funding-pct"><span className="big-num">{fundPct}%</span><span className="big-sub"> funded</span></div>
                <button className="ghost-btn" onClick={() => { setTab("funding"); setShowContrib(true); }}>
                  Contribute →
                </button>
              </div>
            </div>

            {/* Timeline */}
            <Timeline problem={problem} />
          </div>
        )}

        {tab === "funding" && (
          <FundingTab problem={problem} contribAmt={contribAmt} setContribAmt={setContribAmt}
                      onContribute={onContribute} />
        )}

        {tab === "bids" && (
          <BidsTab problem={problem} persona={persona} onBid={onBid} showBid={showBid} setShowBid={setShowBid} />
        )}

        {tab === "comments" && (
          <CommentsTab problem={problem} />
        )}
      </div>
    </div>
  );
};

function PhotoPlaceholder({ kind }) {
  // Subtle striped placeholder w/ monospace explainer
  const labels = {
    asphalt:  "POTHOLE · main st",
    night:    "STREETLIGHT · oak ave",
    park:     "TRASH · riverside park",
    guardrail:"GUARDRAIL · hwy 55",
    sidewalk: "SIDEWALK · elm st",
    lot:      "DUMPING · birch & 14th",
    bench:    "BENCH · maple park",
    crosswalk:"CROSSWALK · 3rd & pine",
    wall:     "GRAFFITI · community ctr",
    manhole:  "MANHOLE · dexter st",
    drain:    "DRAIN · cedar & riverside",
    shelter:  "BUS SHELTER · market & 9th",
  };
  return (
    <div className="photo-ph">
      <svg viewBox="0 0 100 56" preserveAspectRatio="none" width="100%" height="100%">
        <defs>
          <pattern id="phStripes" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="3" fill="#f5efe1" />
            <line x1="0" y1="0" x2="0" y2="3" stroke="#e7dfc9" strokeWidth="1.4" />
          </pattern>
        </defs>
        <rect width="100" height="56" fill="url(#phStripes)" />
        <rect width="100" height="56" fill="none" stroke="#a8a29e" strokeWidth="0.3" />
      </svg>
      <div className="photo-label">{labels[kind] || "PHOTO"}</div>
    </div>
  );
}

function FundingBar({ funding, goal }) {
  const total = funding.crowd + funding.gov + funding.corp;
  const pct = (n) => `${Math.min(100, (n / goal) * 100)}%`;
  return (
    <div className="fund-bar">
      <div className="fund-track">
        <div className="fund-seg crowd" style={{ width: pct(funding.crowd) }} title={`Crowd $${funding.crowd}`}/>
        <div className="fund-seg gov"   style={{ width: pct(funding.gov)   }} title={`Gov match $${funding.gov}`}/>
        <div className="fund-seg corp"  style={{ width: pct(funding.corp)  }} title={`Corporate $${funding.corp}`}/>
      </div>
      <div className="fund-legend">
        <span><i className="dot crowd"></i> Crowd ${funding.crowd}</span>
        <span><i className="dot gov"></i> Gov ${funding.gov}</span>
        <span><i className="dot corp"></i> Corp ${funding.corp}</span>
      </div>
    </div>
  );
}

function Timeline({ problem }) {
  const events = [
    { d: problem.daysAgo, label: "Reported", who: problem.reporter, done: true },
    { d: Math.max(0, problem.daysAgo - 1), label: "Verified", who: "moderator", done: problem.status !== "reported" },
    { d: Math.max(0, problem.daysAgo - 2), label: "Escalated to authority", who: "system", done: ["escalated","in_progress","resolved"].includes(problem.status) },
    { d: Math.max(0, problem.daysAgo - 4), label: "Solver assigned", who: problem.bids[0]?.solver || "—", done: ["in_progress","resolved"].includes(problem.status) },
    { d: 0, label: "Resolved", who: "—", done: problem.status === "resolved" },
  ];
  return (
    <div className="metric-card">
      <div className="metric-label">Case timeline</div>
      <ol className="timeline">
        {events.map((e, i) => (
          <li key={i} className={e.done ? "done" : "pending"}>
            <span className="t-dot"></span>
            <span className="t-label">{e.label}</span>
            <span className="t-meta mono">{e.done ? `${e.d}d ago · ${e.who}` : "pending"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FundingTab({ problem, contribAmt, setContribAmt, onContribute }) {
  const [contributed, setContributed] = useStateD(false);
  const [bumpRaised, setBumpRaised] = useStateD(0);
  const goal = problem.goal;
  const raised = problem.raised + bumpRaised;
  const pct = Math.min(100, Math.round((raised / goal) * 100));

  const submit = () => {
    setContributed(true);
    setBumpRaised(b => b + Number(contribAmt));
    onContribute(problem.id, Number(contribAmt));
    setTimeout(() => setContributed(false), 1800);
  };

  return (
    <div>
      <div className="metric-card">
        <div className="metric-label-row">
          <span className="metric-label">Crowdfunding campaign</span>
          <span className="mono small">12 contributors · 15d left</span>
        </div>
        <div className="big-fund">
          <div className="big-fund-amt">${raised}</div>
          <div className="big-fund-of">of ${goal} goal · <b>{pct}%</b></div>
        </div>
        <FundingBar funding={problem.funding} goal={goal} />
      </div>

      <div className="contribute-card">
        <div className="metric-label">Contribute</div>
        <div className="amount-presets">
          {[5, 10, 25, 50, 100].map(v => (
            <button key={v}
                    className={`preset ${contribAmt === v ? "active" : ""}`}
                    onClick={() => setContribAmt(v)}>
              ${v}
            </button>
          ))}
        </div>
        <div className="amount-row">
          <span className="dollar">$</span>
          <input type="range" min="1" max="200" value={contribAmt}
                 onChange={(e) => setContribAmt(Number(e.target.value))}
                 className="amount-slider" />
          <span className="mono amount-display">{contribAmt}</span>
        </div>
        <div className="payment-row">
          <button className="pay-btn">💳 Card</button>
          <button className="pay-btn">PayPal</button>
          <button className="pay-btn">Crypto</button>
        </div>
        <button className={`primary-btn ${contributed ? "success" : ""}`} onClick={submit}>
          {contributed ? `✓ Thanks for $${contribAmt}!` : `Contribute $${contribAmt}`}
        </button>
        <div className="anonymity">
          <label><input type="checkbox" defaultChecked /> Show me as a contributor</label>
        </div>
      </div>
    </div>
  );
}

function BidsTab({ problem, persona, onBid, showBid, setShowBid }) {
  const [submitted, setSubmitted] = useStateD(false);
  const [bidForm, setBidForm] = useStateD({ amount: "", days: "", plan: "" });

  const submit = () => {
    setSubmitted(true);
    onBid(problem.id, bidForm);
    setTimeout(() => { setShowBid(false); setSubmitted(false); }, 1500);
  };

  return (
    <div>
      {problem.bids.length === 0 ? (
        <div className="empty-bids">
          <div className="empty-bids-art">⌧</div>
          <div>No bids yet. Be the first.</div>
        </div>
      ) : (
        <div className="bid-list">
          {problem.bids.map((b, i) => (
            <div key={i} className={`bid-card ${i === 0 ? "winner" : ""}`}>
              {i === 0 && <div className="winner-tag">LOWEST BID</div>}
              <div className="bid-row1">
                <div className="bid-solver">
                  <div className="solver-avatar">{b.solver[0]}</div>
                  <div>
                    <div className="solver-name">{b.solver} {b.verified && <span className="verified" title="Verified">✓</span>}</div>
                    <div className="solver-meta mono">★ {b.rating} · {b.jobs} jobs</div>
                  </div>
                </div>
                <div className="bid-amount">${b.amount}</div>
              </div>
              <div className="bid-row2">
                <span className="mono small">⏱ {b.days}d turnaround</span>
                {persona === "citizen" && (
                  <button className="ghost-btn small">Accept bid</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {persona === "solver" && !showBid && (
        <button className="primary-btn" onClick={() => setShowBid(true)}>+ Submit your bid</button>
      )}

      {persona === "solver" && showBid && (
        <div className="bid-form">
          <div className="metric-label">Your bid</div>
          <label className="form-label">Amount (USD)</label>
          <input className="form-input" type="number" placeholder="120"
                 value={bidForm.amount} onChange={e => setBidForm({...bidForm, amount: e.target.value})} />
          <label className="form-label">Timeline (days)</label>
          <input className="form-input" type="number" placeholder="2"
                 value={bidForm.days} onChange={e => setBidForm({...bidForm, days: e.target.value})} />
          <label className="form-label">Work plan</label>
          <textarea className="form-input" rows="3" placeholder="Describe your approach…"
                    value={bidForm.plan} onChange={e => setBidForm({...bidForm, plan: e.target.value})} />
          <div className="form-actions">
            <button className="ghost-btn" onClick={() => setShowBid(false)}>Cancel</button>
            <button className={`primary-btn ${submitted ? "success" : ""}`} onClick={submit}>
              {submitted ? "✓ Bid submitted" : "Submit bid"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentsTab({ problem }) {
  const sample = [
    { who: "@maria_l",      t: "2h ago", text: "Drove past this morning — definitely worse than last week. Voting up." },
    { who: "@drive_safe",   t: "5h ago", text: "Almost lost a tire. Please prioritize." },
    { who: "ABC Paving Co", t: "1d ago", text: "Submitted a bid. Can be on-site Tuesday morning if accepted.", solver: true },
    { who: "@cyclist_pdx",  t: "1d ago", text: "Bike lane next to it makes this extra dangerous." },
  ];
  return (
    <div className="comments">
      {sample.slice(0, Math.min(4, problem.comments)).map((c, i) => (
        <div key={i} className="comment">
          <div className="comment-head">
            <span className={`comment-who ${c.solver ? "solver" : ""}`}>{c.who}</span>
            <span className="mono small">{c.t}</span>
          </div>
          <div className="comment-text">{c.text}</div>
        </div>
      ))}
      <div className="comment-compose">
        <input className="form-input" placeholder="Add a comment…" />
        <button className="ghost-btn small">Post</button>
      </div>
    </div>
  );
}
