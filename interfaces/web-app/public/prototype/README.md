# ImproveIt.Today — Citizen Prototype

This is the design-handoff prototype from Claude Design (claude.ai/design). It lives in
`public/` so Vite serves it untouched as static assets — visit `/prototype/` while the
web-app dev server is running.

## What's here

- `index.html` — entry point. Loads React 18 + Babel Standalone via CDN and the
  JSX files below.
- `app.jsx` — main app shell. Wires together top bar, persona-switched layout
  (citizen / solver / authority), filters, selection, modals, and the Tweaks panel.
- `tweaks-panel.jsx` — floating Tweaks panel + `useTweaks` hook for live persona /
  scenario switching.
- `map.jsx` — stylized axonometric SVG city map. Pins are vertical spikes whose
  height encodes vote count.
- `detail.jsx` — manila-dossier "case file" detail panel (overview / funding /
  bids / comments tabs).
- `panels.jsx` — left filter rail, live activity rail, multi-step report modal,
  solver and authority shells.
- `data.js` — sample categories, statuses, scenarios, problems, activity log,
  and per-persona profiles. All data is in-memory and gets scenario-modulated at
  render time.
- `styles.css` — civic-modern aesthetic: warm off-white paper, deep ink, civic
  orange accent, JetBrains Mono for case IDs and metrics.

## Running

```
cd interfaces/web-app
npm install
npm run dev
```

Then open <http://localhost:5173/prototype/>.

## Production build

The prototype is included in `vite build` output automatically because it lives
under `public/`. After build, it's available at `/prototype/` on whatever host
serves the web-app's `dist/`.

## When to translate to TypeScript

The prototype intentionally uses Babel Standalone + script-tag JSX so it stays
1:1 with the design source. If/when this design ships as the real product, port
the components into `src/` as proper TSX modules — the visual output is the
contract, not the prototype's internal structure.
