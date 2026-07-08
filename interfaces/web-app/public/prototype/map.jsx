// Stylized axonometric SVG city map.
// Coordinate space: 0..100 in both x/y. The map projects them onto an axonometric
// plane so pins read as standing up on a "tilted" city plate.

const { useMemo } = React;

// Iso projection: rotate 30°, scale Y by 0.55. Returns screen { sx, sy }.
function isoProject(x, y) {
  const cx = 50, cy = 50;
  const dx = x - cx, dy = y - cy;
  const ang = -0.45;            // light tilt (radians)
  const xy = dx * Math.cos(ang) - dy * Math.sin(ang);
  const yy = dx * Math.sin(ang) + dy * Math.cos(ang);
  return { sx: cx + xy, sy: cy + yy * 0.62 };
}

// Map status -> visual treatment
function statusVisual(status) {
  if (status === "resolved")    return { fill: "#65a30d", glow: "#84cc16", dim: 0.55 };
  if (status === "in_progress") return { fill: "#0369a1", glow: "#38bdf8", dim: 1   };
  if (status === "escalated")   return { fill: "#c2410c", glow: "#fb923c", dim: 1   };
  if (status === "verified")    return { fill: "#374151", glow: "#9ca3af", dim: 1   };
  return { fill: "#6b7280", glow: "#9ca3af", dim: 1 };
}

window.CityMap = function CityMap({
  problems, selectedId, onSelect, hoverId, onHover,
  showHeatmap, filters,
}) {

  // Map plate corners in iso space
  const corners = [
    isoProject(0, 0), isoProject(100, 0),
    isoProject(100, 100), isoProject(0, 100),
  ];
  const platePath = `M ${corners[0].sx} ${corners[0].sy}
                     L ${corners[1].sx} ${corners[1].sy}
                     L ${corners[2].sx} ${corners[2].sy}
                     L ${corners[3].sx} ${corners[3].sy} Z`;

  // Stylized roads — drawn in city space, projected
  const roads = useMemo(() => ([
    // big horizontals
    { from: [5, 25],  to: [95, 25],  w: 4 },
    { from: [5, 50],  to: [95, 50],  w: 5 },  // main street
    { from: [5, 75],  to: [95, 75],  w: 4 },
    // verticals
    { from: [25, 5],  to: [25, 95],  w: 4 },
    { from: [50, 5],  to: [50, 95],  w: 4 },
    { from: [75, 5],  to: [75, 95],  w: 4 },
    // diagonals — make it less grid-y
    { from: [10, 10], to: [40, 40],  w: 2 },
    { from: [60, 60], to: [90, 90],  w: 2 },
  ]), []);

  // Stylized blocks — soft tinted polygons between major roads
  const blocks = useMemo(() => {
    const out = [];
    const gx = [5, 25, 50, 75, 95];
    const gy = [5, 25, 50, 75, 95];
    for (let i = 0; i < gx.length - 1; i++) {
      for (let j = 0; j < gy.length - 1; j++) {
        out.push({
          a: [gx[i] + 1.5, gy[j] + 1.5],
          b: [gx[i + 1] - 1.5, gy[j] + 1.5],
          c: [gx[i + 1] - 1.5, gy[j + 1] - 1.5],
          d: [gx[i] + 1.5, gy[j + 1] - 1.5],
          tone: ((i * 3 + j * 5) % 4),
        });
      }
    }
    return out;
  }, []);

  // River — soft curve
  const river = useMemo(() => {
    const pts = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const x = 0 + 100 * t;
      const y = 65 + Math.sin(t * Math.PI * 2.2) * 6;
      pts.push(isoProject(x, y));
    }
    return pts;
  }, []);

  // Park — green polygon
  const park = [[8, 78], [22, 78], [22, 92], [8, 92]];

  return (
    <svg
      viewBox="-10 -5 120 100"
      className="city-map-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="plateGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fbf9f4" />
          <stop offset="1" stopColor="#f1ece1" />
        </linearGradient>
        <linearGradient id="riverGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#bfdbfe" />
          <stop offset="1" stopColor="#93c5fd" />
        </linearGradient>
        <radialGradient id="heatGrad">
          <stop offset="0" stopColor="rgba(194,65,12,0.65)" />
          <stop offset="1" stopColor="rgba(194,65,12,0)" />
        </radialGradient>
        <pattern id="hatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="2" stroke="#1f2937" strokeWidth="0.4" opacity="0.04" />
        </pattern>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" />
          <feOffset dx="0" dy="0.6" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Plate shadow */}
      <path d={platePath} fill="#1f2937" opacity="0.08" transform="translate(0.6, 1.2)" />
      {/* Plate */}
      <path d={platePath} fill="url(#plateGrad)" stroke="#1f2937" strokeOpacity="0.18" strokeWidth="0.3" />
      {/* Hatch wash */}
      <path d={platePath} fill="url(#hatch)" />

      {/* Blocks */}
      {blocks.map((b, i) => {
        const tones = ["#f5efe1", "#efe9d8", "#ece5d0", "#f7f1e3"];
        const a = isoProject(...b.a);
        const c = isoProject(...b.b);
        const d = isoProject(...b.c);
        const e = isoProject(...b.d);
        return (
          <path
            key={i}
            d={`M ${a.sx} ${a.sy} L ${c.sx} ${c.sy} L ${d.sx} ${d.sy} L ${e.sx} ${e.sy} Z`}
            fill={tones[b.tone]}
            stroke="#a8a29e"
            strokeOpacity="0.25"
            strokeWidth="0.15"
          />
        );
      })}

      {/* Park */}
      {(() => {
        const pts = park.map(([x, y]) => isoProject(x, y));
        return (
          <path
            d={`M ${pts[0].sx} ${pts[0].sy} L ${pts[1].sx} ${pts[1].sy} L ${pts[2].sx} ${pts[2].sy} L ${pts[3].sx} ${pts[3].sy} Z`}
            fill="#bbf7d0"
            stroke="#16a34a"
            strokeOpacity="0.4"
            strokeWidth="0.2"
          />
        );
      })()}

      {/* River */}
      <path
        d={"M " + river.map(p => `${p.sx} ${p.sy}`).join(" L ")}
        fill="none"
        stroke="url(#riverGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Roads */}
      {roads.map((r, i) => {
        const a = isoProject(...r.from);
        const b = isoProject(...r.to);
        return (
          <g key={i}>
            <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy}
                  stroke="#1f2937" strokeOpacity="0.18"
                  strokeWidth={r.w * 0.18} strokeLinecap="round" />
            <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy}
                  stroke="#fafaf7"
                  strokeWidth={r.w * 0.1} strokeLinecap="round"
                  strokeDasharray="0.8 1.2" opacity="0.7" />
          </g>
        );
      })}

      {/* Compass + scale */}
      <g transform="translate(-5, 92)">
        <text x="0" y="0" fontFamily="JetBrains Mono, monospace" fontSize="2.2" fill="#6b7280">
          0      500m
        </text>
        <line x1="0" y1="2" x2="14" y2="2" stroke="#374151" strokeWidth="0.3" />
        <line x1="0" y1="1" x2="0" y2="3" stroke="#374151" strokeWidth="0.3" />
        <line x1="14" y1="1" x2="14" y2="3" stroke="#374151" strokeWidth="0.3" />
      </g>
      <g transform="translate(102, -2)">
        <circle r="3" cx="0" cy="0" fill="none" stroke="#374151" strokeWidth="0.2" />
        <path d="M 0 -3 L 1 0 L 0 0.6 L -1 0 Z" fill="#c2410c" />
        <text x="0" y="6" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="2" fill="#6b7280">N</text>
      </g>

      {/* Heatmap layer */}
      {showHeatmap && problems.map(p => {
        const { sx, sy } = isoProject(p.x, p.y);
        const r = 4 + Math.sqrt(p.votes) * 0.7;
        return <circle key={"h"+p.id} cx={sx} cy={sy} r={r} fill="url(#heatGrad)" />;
      })}

      {/* Pins — drawn back-to-front */}
      {[...problems]
        .sort((a, b) => isoProject(a.x, a.y).sy - isoProject(b.x, b.y).sy)
        .map(p => {
          const { sx, sy } = isoProject(p.x, p.y);
          const visible = (!filters.category || filters.category === "all" || filters.category === p.category)
                       && (!filters.status   || filters.status   === "all" || filters.status   === p.status)
                       && (p.votes >= (filters.minVotes || 0));
          if (!visible) return null;

          const v = statusVisual(p.status);
          // Spike height encodes votes
          const spikeH = Math.max(2.2, Math.min(18, 2 + Math.sqrt(p.votes) * 0.9));
          const isSel = p.id === selectedId;
          const isHov = p.id === hoverId;
          const cat = window.CATEGORIES[p.category];

          return (
            <g key={p.id}
               className="pin"
               style={{ cursor: "pointer", opacity: showHeatmap ? 0.85 : 1 }}
               onClick={() => onSelect(p.id)}
               onMouseEnter={() => onHover(p.id)}
               onMouseLeave={() => onHover(null)}>
              {/* drop shadow ellipse on the ground */}
              <ellipse cx={sx} cy={sy + 0.4} rx="1.2" ry="0.4"
                       fill="#000" opacity={0.25 * v.dim} />
              {/* spike base ring */}
              <circle cx={sx} cy={sy} r={isSel ? 1.4 : 0.9}
                      fill={v.fill} opacity={v.dim} />
              {/* the spike */}
              <line x1={sx} y1={sy} x2={sx} y2={sy - spikeH}
                    stroke={v.fill} strokeWidth={isSel ? 0.8 : 0.5}
                    opacity={v.dim} strokeLinecap="round" />
              {/* glow halo when selected/hover */}
              {(isSel || isHov) && (
                <line x1={sx} y1={sy} x2={sx} y2={sy - spikeH}
                      stroke={v.glow} strokeWidth="2"
                      opacity="0.35" strokeLinecap="round" />
              )}
              {/* head — diamond with glyph */}
              <g transform={`translate(${sx} ${sy - spikeH})`}>
                <circle r={isSel ? 2.4 : isHov ? 2.0 : 1.7}
                        fill={v.fill}
                        stroke="#fbf9f4" strokeWidth="0.4"
                        opacity={v.dim} />
                {isSel && (
                  <circle r="3.4" fill="none"
                          stroke={v.glow} strokeWidth="0.4" opacity="0.6">
                    <animate attributeName="r" from="2.4" to="5" dur="1.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                )}
                <text textAnchor="middle" y="0.7"
                      fontSize={isSel ? 2.2 : 1.6}
                      fill="#fff"
                      fontFamily="ui-sans-serif">
                  {cat.glyph}
                </text>
              </g>
              {/* label only on selection */}
              {isSel && (
                <g transform={`translate(${sx + 3} ${sy - spikeH - 1})`}>
                  <rect x="0" y="-2.4" width={p.id.length * 1.3 + 1} height="3.2"
                        rx="0.4" fill="#1f2937" />
                  <text x="0.5" y="0"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="2.2" fill="#fbf9f4">{p.id}</text>
                </g>
              )}
            </g>
          );
        })}
    </svg>
  );
};
