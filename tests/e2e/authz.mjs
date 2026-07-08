// Authorization / anti-spoofing E2E. Requires the stack from
// tests/e2e/full-lifecycle.mjs (gateway on :8000, services, Postgres).
//
// Proves: identity comes from the gateway-verified JWT (body userId is
// ignored), and ownership checks deny non-owners.
const GW = process.env.GW || 'http://localhost:8000';

const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };
let step = 0;
const results = [];

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${GW}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

async function check(name, fn) {
  step++;
  try {
    const out = await fn();
    console.log(`${c.g('✓')} ${step}. ${name} ${c.d(out?.note || '')}`);
    results.push({ ok: true });
    return out;
  } catch (e) {
    console.log(`${c.r('✗')} ${step}. ${name}\n   ${c.r(e.message)}`);
    results.push({ ok: false });
    throw e;
  }
}

const rnd = process.argv[2] || String(process.pid);

(async () => {
  // Setup: victim + attacker
  const reg = async (who) => {
    const { status, json } = await call('POST', '/api/auth/register', {
      email: `${who}_${rnd}@authz.test`, username: `${who}_${rnd}`, password: 'Passw0rd!',
    });
    if (status !== 201) throw new Error(`register ${who}: ${status} ${JSON.stringify(json)}`);
    return { id: json.data.user.id, token: json.data.token };
  };
  const victim = await check('Register victim', () => reg('victim'));
  const attacker = await check('Register attacker', () => reg('attacker'));

  // Victim reports a problem
  const problem = await check('Victim reports problem', async () => {
    const { status, json } = await call('POST', '/api/problems', {
      title: 'Authz test problem', description: 'Owned by victim.',
      latitude: 52.52, longitude: 13.405, category: 'other',
    }, victim.token);
    if (status !== 201) throw new Error(`${status}: ${JSON.stringify(json)}`);
    return { id: json.data.id, note: json.data.id };
  });

  // 1. Spoof: problem created with a forged body userId must belong to the caller
  await check('Spoofed body userId is ignored on create', async () => {
    const { status, json } = await call('POST', '/api/problems', {
      userId: victim.id, // forged
      title: 'Spoof attempt', description: 'Attacker claims victim identity.',
      latitude: 52.52, longitude: 13.405, category: 'other',
    }, attacker.token);
    if (status !== 201) throw new Error(`${status}: ${JSON.stringify(json)}`);
    if (json.data.user_id !== attacker.id) throw new Error(`problem attributed to ${json.data.user_id}, expected attacker ${attacker.id}`);
    return { note: 'attributed to attacker, not victim' };
  });

  // 2. Non-owner cannot modify the victim's problem
  await check('Attacker cannot resolve victim problem (403)', async () => {
    const { status } = await call('PATCH', `/api/problems/${problem.id}`, { status: 'resolved' }, attacker.token);
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
    return { note: '403' };
  });

  // 3. Non-owner cannot delete the victim's problem
  await check('Attacker cannot delete victim problem (403)', async () => {
    const { status } = await call('DELETE', `/api/problems/${problem.id}`, undefined, attacker.token);
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
    return { note: '403' };
  });

  // 4. Vote spoofing: vote lands on the caller, not the forged userId
  await check('Spoofed vote lands on caller', async () => {
    const { status } = await call('POST', '/api/votes', { userId: victim.id, problemId: problem.id, voteType: 'upvote' }, attacker.token);
    if (status !== 201) throw new Error(`vote failed: ${status}`);
    const mine = await call('GET', `/api/votes/user/${attacker.id}/problem/${problem.id}`, undefined, attacker.token);
    if (mine.status !== 200) throw new Error(`attacker vote not found (${mine.status}) — vote was misattributed`);
    return { note: 'vote attributed to attacker' };
  });

  // 5. Bid via someone else's solver profile is denied
  const victimSolver = await check('Victim registers solver profile', async () => {
    const { status, json } = await call('POST', '/api/solvers', { skills: ['other'] }, victim.token);
    if (status !== 201) throw new Error(`${status}: ${JSON.stringify(json)}`);
    return { id: json.data.id };
  });
  await check('Attacker cannot bid with victim solver profile (403)', async () => {
    const { status } = await call('POST', '/api/bids', {
      problemId: problem.id, solverId: victimSolver.id, amount: 10, description: 'hijack',
    }, attacker.token);
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
    return { note: '403' };
  });

  // 6. Non-owner cannot accept a bid on the victim's problem
  const attackerSolver = await check('Attacker registers own solver profile', async () => {
    const { status, json } = await call('POST', '/api/solvers', { skills: ['other'] }, attacker.token);
    if (status !== 201) throw new Error(`${status}`);
    return { id: json.data.id };
  });
  const bid = await check('Attacker bids on victim problem (allowed)', async () => {
    const { status, json } = await call('POST', '/api/bids', {
      problemId: problem.id, solverId: attackerSolver.id, amount: 25, description: 'legit bid',
    }, attacker.token);
    if (status !== 201) throw new Error(`${status}: ${JSON.stringify(json)}`);
    return { id: json.data.id };
  });
  await check('Bidder cannot accept own bid (403)', async () => {
    const { status } = await call('POST', `/api/bids/${bid.id}/accept`, undefined, attacker.token);
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
    return { note: '403' };
  });

  // 7. Non-owner cannot withdraw someone else's bid
  await check('Victim cannot withdraw attacker bid (403)', async () => {
    const { status } = await call('POST', `/api/bids/${bid.id}/withdraw`, undefined, victim.token);
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
    return { note: '403' };
  });

  // 8. Owner CAN do the things non-owners were denied
  await check('Owner accepts bid (200)', async () => {
    const { status, json } = await call('POST', `/api/bids/${bid.id}/accept`, undefined, victim.token);
    if (status !== 200) throw new Error(`${status}: ${JSON.stringify(json)}`);
    return { note: 'accepted' };
  });
  await check('Owner resolves own problem (200)', async () => {
    const { status, json } = await call('PATCH', `/api/problems/${problem.id}`, { status: 'resolved' }, victim.token);
    if (status !== 200) throw new Error(`${status}: ${JSON.stringify(json)}`);
    return { note: 'resolved' };
  });

  // 9. Profile: attacker cannot edit victim profile
  await check('Attacker cannot edit victim profile (403)', async () => {
    const { status } = await call('PATCH', `/api/users/${victim.id}`, { bio: 'pwned' }, attacker.token);
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
    return { note: '403' };
  });

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed === results.length ? c.g('ALL PASSED') : c.r('SOME FAILED')}: ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(() => {
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${c.r('HALTED')}: ${passed}/${results.length} passed before failure`);
  process.exit(1);
});
