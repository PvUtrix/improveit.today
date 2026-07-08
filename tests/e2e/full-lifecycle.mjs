// End-to-end flow against the running API gateway.
// report -> vote -> fund -> contribute -> become solver -> bid -> accept -> resolve
const GW = process.env.GW || 'http://localhost:8000';
let token = '';

const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };
let step = 0;
const results = [];

async function call(method, path, body, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${GW}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
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
    results.push({ name, ok: true });
    return out;
  } catch (e) {
    console.log(`${c.r('✗')} ${step}. ${name}\n   ${c.r(e.message)}`);
    results.push({ name, ok: false, err: e.message });
    throw e;
  }
}

const rnd = process.argv[2] || String(process.pid);

(async () => {
  // 1. Register a citizen
  const citizen = await check('Register citizen', async () => {
    const { status, json } = await call('POST', '/api/auth/register', {
      email: `citizen_${rnd}@e2e.test`, username: `citizen_${rnd}`, password: 'Passw0rd!',
    }, { auth: false });
    if (status !== 201) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    if (!json.data?.token) throw new Error(`no token: ${JSON.stringify(json)}`);
    return { user: json.data.user, token: json.data.token, note: `user ${json.data.user.id}` };
  });
  token = citizen.token;
  const citizenId = citizen.user.id;

  // 2. Register a solver user
  const solverUser = await check('Register solver user', async () => {
    const { status, json } = await call('POST', '/api/auth/register', {
      email: `solver_${rnd}@e2e.test`, username: `solver_${rnd}`, password: 'Passw0rd!',
    }, { auth: false });
    if (status !== 201) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    return { user: json.data.user, token: json.data.token };
  });
  const solverUserId = solverUser.user.id;

  // 3. Login (verify credentials path)
  await check('Login citizen', async () => {
    const { status, json } = await call('POST', '/api/auth/login', {
      email: `citizen_${rnd}@e2e.test`, password: 'Passw0rd!',
    }, { auth: false });
    if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    if (!json.data?.token) throw new Error('no token on login');
    return { note: 'token issued' };
  });

  // 4. Report a problem
  const problem = await check('Report problem', async () => {
    const { status, json } = await call('POST', '/api/problems', {
      userId: citizenId, title: 'E2E pothole on Main St',
      description: 'Deep pothole, hazard for cyclists.',
      latitude: 37.7749, longitude: -122.4194, address: '1 Main St', category: 'roads',
    });
    if (status !== 201) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    return { id: json.data.id, note: `problem ${json.data.id} status=${json.data.status}` };
  });
  const problemId = problem.id;

  // 5. Upvote
  await check('Upvote problem', async () => {
    const { status, json } = await call('POST', '/api/votes', {
      userId: citizenId, problemId, voteType: 'upvote',
    });
    if (status !== 200 && status !== 201) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    return { note: 'vote cast' };
  });

  // 5b. Read vote stats
  await check('Read vote stats', async () => {
    const { status, json } = await call('GET', `/api/votes/problem/${problemId}`);
    if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    return { note: `upvotes=${json.data?.upvotes} score=${json.data?.score}` };
  });

  // 6. Start a crowdfunding campaign
  const campaign = await check('Start crowdfunding campaign', async () => {
    const { status, json } = await call('POST', '/api/crowdfunding/campaigns', {
      problemId, goalAmount: 100, currency: 'USD',
    });
    if (status !== 201) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    return { id: json.data.id, note: `campaign ${json.data.id} goal=${json.data.goal_amount}` };
  });
  const campaignId = campaign.id;

  // 7. Contribute (fully fund)
  await check('Contribute to campaign', async () => {
    const { status, json } = await call('POST', `/api/crowdfunding/campaigns/${campaignId}/contribute`, {
      userId: citizenId, amount: 100, paymentMethod: 'card',
    });
    if (status !== 200 && status !== 201) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    return { note: 'contributed $100' };
  });

  // 8. Become a solver
  const solver = await check('Create solver profile', async () => {
    const { status, json } = await call('POST', '/api/solvers', {
      userId: solverUserId, companyName: 'FixIt Co', accountType: 'individual',
      skills: ['roads'], hourlyRate: 50,
    });
    if (status !== 201) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    return { id: json.data.id, note: `solver ${json.data.id}` };
  });
  const solverId = solver.id;

  // 9. Submit a bid
  const bid = await check('Submit bid', async () => {
    const { status, json } = await call('POST', '/api/bids', {
      problemId, solverId, amount: 90, currency: 'USD', timelineDays: 5,
      description: 'Repave the pothole and seal.', laborCost: 60, materialCost: 30,
    });
    if (status !== 201) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    return { id: json.data.id, note: `bid ${json.data.id} amount=${json.data.amount}` };
  });
  const bidId = bid.id;

  // 10. Accept the bid -> problem moves to in_progress
  await check('Accept bid', async () => {
    const { status, json } = await call('POST', `/api/bids/${bidId}/accept`);
    if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    return { note: 'bid accepted' };
  });

  // 10b. Verify problem is in_progress
  await check('Problem now in_progress', async () => {
    const { status, json } = await call('GET', `/api/problems/${problemId}`);
    if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    if (json.data.status !== 'in_progress') throw new Error(`expected in_progress, got ${json.data.status}`);
    return { note: `status=${json.data.status}` };
  });

  // 11. Resolve the problem
  await check('Resolve problem', async () => {
    const { status, json } = await call('PATCH', `/api/problems/${problemId}`, { status: 'resolved' });
    if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
    if (json.data.status !== 'resolved') throw new Error(`expected resolved, got ${json.data.status}`);
    return { note: `status=${json.data.status}` };
  });

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed === results.length ? c.g('ALL PASSED') : c.r('SOME FAILED')}: ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(() => {
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${c.r('HALTED')}: ${passed}/${results.length} steps passed before failure`);
  process.exit(1);
});
