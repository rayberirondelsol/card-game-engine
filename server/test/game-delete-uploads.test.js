// Regression tests: DELETE /api/games/:id must also remove uploads/<gameId>/.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Isolation: CGE_DB_PATH and CGE_UPLOADS_DIR redirect the SQLite file and the
// uploads directory into a tmpdir, so these tests never touch server/data or
// server/uploads. They must be set BEFORE src/index.js is imported, hence the
// dynamic import below.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');
const UPLOADS = process.env.CGE_UPLOADS_DIR;

const { buildApp } = await import('../src/index.js');
const { getDb, closeDatabase } = await import('../src/database.js');
const { authHeaders } = await import('./helpers.js');

let app;
let headers; // the API requires a valid session token

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

async function createGame(name) {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

test('deleting a game removes its uploads directory', async () => {
  const gameId = await createGame('with uploads');
  const gameDir = path.join(UPLOADS, gameId);
  mkdirSync(path.join(gameDir, 'card-backs'), { recursive: true });
  writeFileSync(path.join(gameDir, 'card.png'), 'not really a png');
  writeFileSync(path.join(gameDir, 'card-backs', 'back.png'), 'nor this');

  const res = await app.inject({ method: 'DELETE', url: `/api/games/${gameId}`, headers });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().success, true);
  assert.equal(existsSync(gameDir), false, `uploads dir leaked: ${gameDir}`);
});

test('deleting a game without an uploads directory still succeeds', async () => {
  const gameId = await createGame('no uploads');
  assert.equal(existsSync(path.join(UPLOADS, gameId)), false);

  const res = await app.inject({ method: 'DELETE', url: `/api/games/${gameId}`, headers });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().success, true);
});

test('a traversing game id never deletes outside the uploads root', async () => {
  // Craft rows the API itself would never create, so the delete handler reaches
  // the filesystem step with a hostile :id. Encoded separators survive routing,
  // so `a%2F..%2F..` really does arrive as the single param 'a/../..'.
  const db = getDb();
  const sentinelOutside = path.join(TMP, 'sentinel-outside.txt');
  const sentinelInside = path.join(UPLOADS, 'sentinel-inside.txt');
  mkdirSync(UPLOADS, { recursive: true });
  writeFileSync(sentinelOutside, 'must survive');
  writeFileSync(sentinelInside, 'must survive');

  const hostileIds = ['../..', 'a/../..', '../sentinel-outside.txt', './', '..' + path.sep + '..'];
  for (const id of hostileIds) {
    db.prepare('INSERT INTO games (id, name, description) VALUES (?, ?, ?)').run(id, 'evil', '');
    const res = await app.inject({ method: 'DELETE', url: `/api/games/${encodeURIComponent(id)}`, headers });
    const why = `id ${JSON.stringify(id)} -> ${res.statusCode} ${res.body}`;
    assert.notEqual(res.statusCode, 500, why);
    assert.ok(existsSync(UPLOADS), `uploads root deleted by ${why}`);
    assert.ok(existsSync(sentinelInside), `uploads root emptied by ${why}`);
    assert.ok(existsSync(sentinelOutside), `escaped uploads root with ${why}`);
    assert.ok(existsSync(process.env.CGE_DB_PATH), `db file deleted by ${why}`);
  }
});
