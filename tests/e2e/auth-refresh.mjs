// Refresh-token E2E. Requires the running stack (gateway :8000 + user-service
// + Postgres). Proves: tokens issue on register/login, refresh rotates and
// yields a working access token, the consumed refresh token is invalidated
// (rotation / reuse detection), and logout revokes.
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
  const email = `refresh_${rnd}@auth.test`;

  const reg = await check('Register issues access + refresh tokens', async () => {
    const { status, json } = await call('POST', '/api/auth/register', {
      email, username: `refresh_${rnd}`, password: 'Passw0rd!',
    });
    if (status !== 201) throw new Error(`${status}: ${JSON.stringify(json)}`);
    const d = json.data;
    if (!d.token || !d.refreshToken) throw new Error('missing token or refreshToken');
    if (!d.expiresIn) throw new Error('missing expiresIn');
    return { token: d.token, refreshToken: d.refreshToken, note: `expiresIn=${d.expiresIn}` };
  });

  const login = await check('Login issues a distinct refresh token', async () => {
    const { status, json } = await call('POST', '/api/auth/login', { email, password: 'Passw0rd!' });
    if (status !== 200) throw new Error(`${status}: ${JSON.stringify(json)}`);
    if (json.data.refreshToken === reg.refreshToken) throw new Error('refresh token not unique per session');
    return { refreshToken: json.data.refreshToken };
  });

  const rotated = await check('Refresh rotates the token and returns a new access token', async () => {
    const { status, json } = await call('POST', '/api/auth/refresh', { refreshToken: reg.refreshToken });
    if (status !== 200) throw new Error(`${status}: ${JSON.stringify(json)}`);
    const d = json.data;
    if (!d.token) throw new Error('no new access token');
    if (d.refreshToken === reg.refreshToken) throw new Error('refresh token was not rotated');
    if (!d.user?.id) throw new Error('refresh should return the user');
    return { token: d.token, refreshToken: d.refreshToken };
  });

  await check('New access token works on a protected route', async () => {
    const { status } = await call('GET', '/api/problems', undefined, rotated.token);
    if (status !== 200) throw new Error(`expected 200, got ${status}`);
    return { note: '200' };
  });

  await check('Consumed (old) refresh token is rejected (401)', async () => {
    const { status } = await call('POST', '/api/auth/refresh', { refreshToken: reg.refreshToken });
    if (status !== 401) throw new Error(`expected 401, got ${status}`);
    return { note: 'rotation invalidated old token' };
  });

  await check('Login session still refreshes independently', async () => {
    const { status } = await call('POST', '/api/auth/refresh', { refreshToken: login.refreshToken });
    if (status !== 200) throw new Error(`expected 200, got ${status}`);
    return { note: 'sessions are independent' };
  });

  await check('Logout revokes the refresh token', async () => {
    const { status } = await call('POST', '/api/auth/logout', { refreshToken: rotated.refreshToken });
    if (status !== 200) throw new Error(`logout expected 200, got ${status}`);
    const after = await call('POST', '/api/auth/refresh', { refreshToken: rotated.refreshToken });
    if (after.status !== 401) throw new Error(`refresh after logout expected 401, got ${after.status}`);
    return { note: 'revoked' };
  });

  await check('Garbage refresh token is rejected (401)', async () => {
    const { status } = await call('POST', '/api/auth/refresh', { refreshToken: 'not-a-real-token' });
    if (status !== 401) throw new Error(`expected 401, got ${status}`);
    return { note: '401' };
  });

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed === results.length ? c.g('ALL PASSED') : c.r('SOME FAILED')}: ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(() => {
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${c.r('HALTED')}: ${passed}/${results.length} passed before failure`);
  process.exit(1);
});
