// Regression tests: GET /api/games must report each game's real card count.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// The games table has no card_count column and must not grow one - the count
// is derived in the query, so it can never drift from the cards table.
//
// Isolation: CGE_DB_PATH / CGE_UPLOADS_DIR point the SQLite file and uploads
// directory at a tmpdir. They must be set BEFORE src/index.js is imported,
// hence the dynamic import below.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

const { buildApp } = await import('../src/index.js');
const { getDb, closeDatabase } = await import('../src/database.js');
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

async function createGame(name) {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

/** Insert n card rows directly - importing real images is not what's under test. */
function addCards(gameId, n) {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO cards (id, game_id, name, image_path) VALUES (?, ?, ?, ?)');
  for (let i = 0; i < n; i++) {
    stmt.run(randomUUID(), gameId, `card ${i}`, `/uploads/${gameId}/card-${i}.png`);
  }
}

async function listGames() {
  const res = await app.inject({ method: 'GET', url: '/api/games', headers });
  assert.equal(res.statusCode, 200, res.body);
  return new Map(res.json().map((g) => [g.id, g]));
}

test('a game with cards reports its card count', async () => {
  const gameId = await createGame('has cards');
  addCards(gameId, 7);

  const game = (await listGames()).get(gameId);
  assert.ok(game, 'game missing from list');
  assert.equal(game.card_count, 7);
});

test('a game without cards reports 0, not null and not missing', async () => {
  const gameId = await createGame('empty');

  const game = (await listGames()).get(gameId);
  assert.ok(game, 'game missing from list');
  assert.equal(game.card_count, 0);
});

test('counts do not bleed between games', async () => {
  const a = await createGame('three');
  const b = await createGame('none');
  const c = await createGame('one');
  addCards(a, 3);
  addCards(c, 1);

  const games = await listGames();
  assert.equal(games.get(a).card_count, 3);
  assert.equal(games.get(b).card_count, 0);
  assert.equal(games.get(c).card_count, 1);
});
