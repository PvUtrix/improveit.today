// Auth rate-limit E2E. Must run LAST in the suite: it deliberately exhausts
// the auth limiter budget for its source IP, so any auth call after it would
// be throttled. Verifies the strict limiter on /api/auth/* trips with the
// platform 429 envelope.
//
// CI sets AUTH_RATE_LIMIT_MAX to a modest value so a short burst trips it
// without the functional suites (which make far fewer auth calls) hitting it.
const GW = process.env.GW || 'http://localhost:8000';
const MAX_ATTEMPTS = Number(process.env.RL_MAX_ATTEMPTS || 120);

const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };
const rnd = process.argv[2] || String(process.pid);

async function register(i) {
  const res = await fetch(`${GW}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `rl_${rnd}_${i}@rate.test`,
      username: `rl_${rnd}_${i}`,
      password: 'Passw0rd!',
    }),
  });
  let body;
  try { body = await res.json(); } catch { body = {}; }
  return { status: res.status, body };
}

(async () => {
  let throttledAt = -1;
  let throttledBody = null;
  let allowed = 0;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const { status, body } = await register(i);
    if (status === 429) {
      throttledAt = i;
      throttledBody = body;
      break;
    }
    allowed++;
  }

  const checks = [];
  checks.push([
    'Limiter eventually returns 429',
    throttledAt >= 0,
    `throttled after ${allowed} allowed attempts`,
  ]);
  checks.push([
    '429 uses the platform error envelope (code RATE_LIMITED)',
    throttledBody?.success === false && throttledBody?.error?.code === 'RATE_LIMITED',
    JSON.stringify(throttledBody?.error ?? throttledBody),
  ]);
  checks.push([
    'Some attempts were allowed before throttling (limiter is not off)',
    allowed > 0,
    `${allowed} allowed`,
  ]);

  let ok = true;
  checks.forEach(([name, pass, note], idx) => {
    console.log(`${pass ? c.g('✓') : c.r('✗')} ${idx + 1}. ${name} ${c.d(note || '')}`);
    if (!pass) ok = false;
  });

  console.log(`\n${ok ? c.g('ALL PASSED') : c.r('FAILED')}: ${checks.filter((x) => x[1]).length}/${checks.length}`);
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.log(c.r(`HALTED: ${e.message}`));
  process.exit(1);
});
