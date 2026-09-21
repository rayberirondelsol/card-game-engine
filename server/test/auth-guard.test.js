// The data API must require a valid session token.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Isolation: CGE_DB_PATH and CGE_UPLOADS_DIR redirect the SQLite file and the
// uploads directory into a tmpdir. They must be set BEFORE src/index.js is
// imported, hence the dynamic import below.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

// Seed a file into the uploads root before the app boots: @fastify/static reads
// the directory at registration time.
mkdirSync(process.env.CGE_UPLOADS_DIR, { recursive: true });
writeFileSync(path.join(process.env.CGE_UPLOADS_DIR, 'public.txt'), 'served to anyone');

const { buildApp } = await import('../src/index.js');
const { closeDatabase } = await import('../src/database.js');
const { authHeaders } = await import('./helpers.js');

let app;
let headers;

before(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
  headers = authHeaders();
});

after(async () => {
  if (app) await app.close();
  closeDatabase();
  rmSync(TMP, { recursive: true, force: true });
});

// ── Guarded endpoints ───────────────────────────────────────────────────────

const GUARDED = [
  { method: 'GET', url: '/api/games' },
  { method: 'POST', url: '/api/games', payload: { name: 'sneaky' } },
  { method: 'GET', url: '/api/games/whatever/cards' },
  { method: 'DELETE', url: '/api/games/whatever' },
  { method: 'GET', url: '/api/rooms/ABCDEF' },
];

test('unauthenticated requests to the data API are rejected with 401', async () => {
  for (const req of GUARDED) {
    const res = await app.inject(req);
    assert.equal(res.statusCode, 401, `${req.method} ${req.url} -> ${res.statusCode} ${res.body}`);
  }
});

test('garbage and unknown tokens are rejected with 401', async () => {
  const bad = [
    { authorization: 'Bearer not-a-real-token' },
    { authorization: 'Bearer ' },
    { authorization: 'Basic aGk6dGhlcmU=' },
    { authorization: 'nonsense' },
    { authorization: `Bearer ${'a'.repeat(4096)}` },
  ];
  for (const h of bad) {
    const res = await app.inject({ method: 'GET', url: '/api/games', headers: h });
    assert.equal(res.statusCode, 401, `${JSON.stringify(h)} -> ${res.statusCode} ${res.body}`);
  }
});

test('an expired session is rejected with 401', async () => {
  const expired = authHeaders(-60);
  const res = await app.inject({ method: 'GET', url: '/api/games', headers: expired });
  assert.equal(res.statusCode, 401, res.body);
});

test('a valid token gets through', async () => {
  const list = await app.inject({ method: 'GET', url: '/api/games', headers });
  assert.equal(list.statusCode, 200, list.body);

  const created = await app.inject({
    method: 'POST',
    url: '/api/games',
    headers,
    payload: { name: 'authorised' },
  });
  assert.equal(created.statusCode, 201, created.body);
});

test('a near-miss path is not treated as public', async () => {
  // /api/auth/ is public; /api/authors or /api/auth-foo must not inherit that.
  for (const url of ['/api/authors', '/api/auth-foo', '/api/healthz']) {
    const res = await app.inject({ method: 'GET', url });
    assert.notEqual(res.statusCode, 200, `${url} -> ${res.statusCode} ${res.body}`);
  }
});

// ── Public endpoints ────────────────────────────────────────────────────────

test('/api/health is reachable without a token', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().status, 'ok');
});

test('/api/auth/* is reachable without a token', async () => {
  // Wrong credentials, but the guard must not shadow the route's own 401/400.
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'nobody@test.local', password: 'wrong-password' },
  });
  assert.equal(login.statusCode, 401, login.body);
  assert.equal(login.json().error, 'E-Mail oder Passwort falsch', login.body);

  const missing = await app.inject({ method: 'POST', url: '/api/auth/login', payload: {} });
  assert.equal(missing.statusCode, 400, missing.body);

  const confirm = await app.inject({ method: 'GET', url: '/api/auth/confirm' });
  assert.equal(confirm.statusCode, 400, confirm.body);

  // /api/auth/check is the client's own session probe and must answer itself.
  const check = await app.inject({ method: 'GET', url: '/api/auth/check' });
  assert.equal(check.statusCode, 401, check.body);
  const okCheck = await app.inject({ method: 'GET', url: '/api/auth/check', headers });
  assert.equal(okCheck.statusCode, 200, okCheck.body);
});

test('/uploads/* stays reachable without a token (<img src> cannot send headers)', async () => {
  const res = await app.inject({ method: 'GET', url: '/uploads/public.txt' });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.body, 'served to anyone');
});

// ── Registration flag ───────────────────────────────────────────────────────

async function register(email) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'correct horse battery' },
  });
}

test('registration is allowed by default', async () => {
  delete process.env.CGE_ALLOW_REGISTRATION;
  const res = await register('default-on@test.local');
  assert.equal(res.statusCode, 200, res.body);

  process.env.CGE_ALLOW_REGISTRATION = 'true';
  const explicit = await register('explicit-on@test.local');
  assert.equal(explicit.statusCode, 200, explicit.body);
  delete process.env.CGE_ALLOW_REGISTRATION;
});

test('registration returns 403 when CGE_ALLOW_REGISTRATION is off', async () => {
  for (const value of ['0', 'false', 'no', 'off', 'FALSE']) {
    process.env.CGE_ALLOW_REGISTRATION = value;
    const res = await register(`blocked-${value}@test.local`);
    assert.equal(res.statusCode, 403, `${value} -> ${res.statusCode} ${res.body}`);
  }
  delete process.env.CGE_ALLOW_REGISTRATION;
});
