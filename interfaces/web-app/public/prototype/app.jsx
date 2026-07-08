// Main app — orchestrates persona, scenario, filters, selection, modals
const { useState, useEffect, useMemo } = React;

function App() {
  const [t, setTweak] = window.useTweaks({
    persona: "citizen",
    scenario: "calm",
  });
  const persona = t.persona || "citizen";
  const scenario = t.scenario || "calm";

  const [selectedId, setSelectedId] = useState("P-12345");
  const [hoverId, setHoverId] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filters, setFilters] = useState({ category: "all", status: "all", minVotes: 0 });
  const [reportOpen, setReportOpen] = useState(false);
  const [voteBumps, setVoteBumps] = useState({});

  // Derive a per-scenario problem set
  const problems = useMemo(() => {
    return window.PROBLEMS.map(p => {
      let votes = p.votes;
      let status = p.status;
      let raised = p.raised;
      if (scenario === "crisis") {
        votes = Math.round(p.votes * 1.8 + 40);
        if (status === "verified" || status === "reported") status = "escalated";
      } else if (scenario === "resolved") {
        if (p.status === "in_progress" || (p.votes > 100)) {
          status = "resolved";
          raised = p.goal;
        }
      }
      votes += voteBumps[p.id] || 0;
      return { ...p, votes, status, raised };
    });
  }, [scenario, voteBumps]);

  const selected = problems.find(p => p.id === selectedId) || null;

  const onVote = (id, voted) => {
    setVoteBumps(b => ({ ...b, [id]: (b[id] || 0) + (voted ? 1 : -1) }));
  };
  const onContribute = () => {};
  const onBid = () => {};
  const onJump = (id) => setSelectedId(id);

  return (
    <div className={`persona-${persona}`}>
      <TopBar persona={persona} setPersona={(p) => setTweak("persona", p)} />

      {persona === "citizen" && (
        <div className="app">
          <div className="col">
            <window.LeftRail
              filters={filters} setFilters={setFilters}
              showHeatmap={showHeatmap} setShowHeatmap={setShowHeatmap}
              scenario={scenario} problemsCount={problems.length}
            />
          </div>
          <div className="col center-col">
            <MapToolbar problems={problems} scenario={scenario} />
            <div className="map-wrap">
              <window.CityMap
                problems={problems}
                selectedId={selectedId}
                hoverId={hoverId}
                onSelect={setSelectedId}
                onHover={setHoverId}
                showHeatmap={showHeatmap}
                filters={filters}
              />
            </div>
            <button className="map-fab" onClick={() => setReportOpen(true)}>
              <span className="plus">+</span> Report a problem
            </button>
          </div>
          <div className="col">
            <window.DetailPanel
              problem={selected}
              onClose={() => setSelectedId(null)}
              onVote={onVote}
              onContribute={onContribute}
              onBid={onBid}
              persona={persona}
            />
            {!selected && <window.ActivityRail activity={window.ACTIVITY} onJump={onJump} />}
          </div>
        </div>
      )}

      {persona === "solver" && (
        <div style={{ height: "calc(100vh - 56px)" }}>
          <window.SolverShell problems={problems} onJump={onJump}>
            <div className="app" style={{ gridTemplateColumns: "1fr 380px", height: "100%" }}>
              <div className="col center-col">
                <MapToolbar problems={problems} scenario={scenario} variant="solver" />
                <div className="map-wrap">
                  <window.CityMap
                    problems={problems}
                    selectedId={selectedId}
                    hoverId={hoverId}
                    onSelect={setSelectedId}
                    onHover={setHoverId}
                    showHeatmap={showHeatmap}
                    filters={filters}
                  />
                </div>
              </div>
              <div className="col">
                <window.DetailPanel
                  problem={selected}
                  onClose={() => setSelectedId(null)}
                  onVote={onVote}
                  onContribute={onContribute}
                  onBid={onBid}
                  persona={persona}
                />
              </div>
            </div>
          </window.SolverShell>
        </div>
      )}

      {persona === "authority" && (
        <div style={{ height: "calc(100vh - 56px)" }}>
          <window.AuthorityShell problems={problems} onJump={onJump}>
            <div className="app" style={{ gridTemplateColumns: "1fr 380px", height: "100%" }}>
              <div className="col center-col">
                <MapToolbar problems={problems} scenario={scenario} variant="authority" />
                <div className="map-wrap">
                  <window.CityMap
                    problems={problems}
                    selectedId={selectedId}
                    hoverId={hoverId}
                    onSelect={setSelectedId}
                    onHover={setHoverId}
                    showHeatmap={showHeatmap}
                    filters={filters}
                  />
                </div>
              </div>
              <div className="col">
                <window.DetailPanel
                  problem={selected}
                  onClose={() => setSelectedId(null)}
                  onVote={onVote}
                  onContribute={onContribute}
                  onBid={onBid}
                  persona={persona}
                />
              </div>
            </div>
          </window.AuthorityShell>
        </div>
      )}

      <window.ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={() => {}}
      />

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Persona" />
        <window.TweakRadio
          label="View as"
          value={persona}
          onChange={(v) => setTweak("persona", v)}
          options={[
            { label: "Citizen", value: "citizen" },
            { label: "Solver", value: "solver" },
            { label: "Authority", value: "authority" },
          ]}
        />
        <window.TweakSection label="Sample data scenario" />
        <window.TweakRadio
          label="Scenario"
          value={scenario}
          onChange={(v) => setTweak("scenario", v)}
          options={[
            { label: "Calm", value: "calm" },
            { label: "Crisis", value: "crisis" },
            { label: "Resolved", value: "resolved" },
          ]}
        />
      </window.TweaksPanel>
    </div>
  );
}

function TopBar({ persona, setPersona }) {
  const labels = { citizen: "Citizen", solver: "Solver", authority: "Authority" };
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">▲</div>
        <div>
          <div className="brand-name">improveit<span className="dot-tld">.today</span></div>
        </div>
        <div className="brand-tag">SPRINGFIELD · IL</div>
      </div>

      <div className="topbar-search">
        <span style={{ color: "var(--ink-3)" }}>⌕</span>
        <input placeholder="Search cases, addresses, categories…" />
        <span className="mono small" style={{ color: "var(--ink-3)" }}>⌘K</span>
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        <div className="persona-pill">
          <span className="pdot" />
          <span>Viewing as <b>{labels[persona]}</b></span>
        </div>
      </div>
    </div>
  );
}

function MapToolbar({ problems, scenario, variant }) {
  const totalVotes = problems.reduce((a, p) => a + p.votes, 0);
  const escalated = problems.filter(p => p.status === "escalated").length;
  const inProgress = problems.filter(p => p.status === "in_progress").length;
  return (
    <div className="map-toolbar">
      <div className="map-stat">
        <span className="map-stat-num">{problems.length}</span>
        <span className="map-stat-lab">cases on map</span>
      </div>
      <div className="map-stat">
        <span className="map-stat-num" style={{ color: "var(--accent)" }}>{escalated}</span>
        <span className="map-stat-lab">escalated</span>
      </div>
      <div className="map-stat">
        <span className="map-stat-num" style={{ color: "var(--info)" }}>{inProgress}</span>
        <span className="map-stat-lab">in progress</span>
      </div>
      <div className="map-stat">
        <span className="map-stat-num">{totalVotes.toLocaleString()}</span>
        <span className="map-stat-lab">total votes</span>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
