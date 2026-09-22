// Logging out must end the session on the SERVER, not just in the browser.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Isolation: CGE_DB_PATH / CGE_UPLOADS_DIR must be set before src/index.js is
// imported — hence the dynamic import below (same pattern as auth-guard.test.js).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-logout-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

const { buildApp } = await import('../src/index.js');
const { closeDatabase } = await import('../src/database.js');

let app;

before(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
});

after(async () => {
  if (app) await app.close();
  closeDatabase();
  rmSync(TMP, { recursive: true, force: true });
});

const PASSWORD = 'correct horse battery';

async function loginFresh(email) {
  const reg = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: PASSWORD },
  });
  assert.equal(reg.statusCode, 200, reg.body);

  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: PASSWORD },
  });
  assert.equal(res.statusCode, 200, res.body);
  return res.json().token;
}

test('a token stops working after logout', async () => {
  const token = await loginFresh('logout-basic@test.local');
  const headers = { authorization: `Bearer ${token}` };

  // Before: the token opens the guarded API.
  const before = await app.inject({ method: 'GET', url: '/api/games', headers });
  assert.equal(before.statusCode, 200, before.body);

  const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers });
  assert.equal(out.statusCode, 200, out.body);
  assert.equal(out.json().ok, true, out.body);

  // After: same token, guarded API and session probe both reject it.
  const after = await app.inject({ method: 'GET', url: '/api/games', headers });
  assert.equal(after.statusCode, 401, `token still valid after logout: ${after.statusCode}`);

  const check = await app.inject({ method: 'GET', url: '/api/auth/check', headers });
  assert.equal(check.statusCode, 401, check.body);
});

test('logout accepts the request the client actually sends (JSON content-type, no body)', async () => {
  const token = await loginFresh('logout-nobody@test.local');
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };

  const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers });
  assert.equal(out.statusCode, 200, out.body);

  const after = await app.inject({
    method: 'GET',
    url: '/api/games',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(after.statusCode, 401, after.body);
});

test('logout ends only the session it was called with', async () => {
  const token = await loginFresh('logout-one-device@test.local');
  const second = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'logout-one-device@test.local', password: PASSWORD },
  });
  assert.equal(second.statusCode, 200, second.body);
  const otherToken = second.json().token;
  assert.notEqual(otherToken, token);

  await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    headers: { authorization: `Bearer ${token}` },
  });

  const dead = await app.inject({
    method: 'GET',
    url: '/api/games',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(dead.statusCode, 401, dead.body);

  const alive = await app.inject({
    method: 'GET',
    url: '/api/games',
    headers: { authorization: `Bearer ${otherToken}` },
  });
  assert.equal(alive.statusCode, 200, alive.body);
});

test('logout without a token is a no-op, not an error', async () => {
  const out = await app.inject({ method: 'POST', url: '/api/auth/logout' });
  assert.equal(out.statusCode, 200, out.body);

  const junk = await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    headers: { authorization: 'Bearer not-a-real-token' },
  });
  assert.equal(junk.statusCode, 200, junk.body);
});
