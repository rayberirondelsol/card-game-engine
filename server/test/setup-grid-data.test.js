// M3b – the grids of a setup survive saving and loading again.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// grid-geometry.test.js proves that a figure on C7 is on C7 again *given* the
// grid. This file covers the other half of that sentence: the grid itself has
// to come back, through its own column, and an update that says nothing about
// grids must not wipe the ones already there – the same COALESCE the zones get.
//
// Isolation: CGE_DB_PATH / CGE_UPLOADS_DIR point at a tmpdir and must be set
// before src/index.js is imported, hence the dynamic import below.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

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

/** The scenario card grid of Townsfolk Tussle, anchored to the board. */
const GRIDS = [{
  id: 'g-scenario', label: 'Scenario', type: 'square',
  origin: { x: 100, y: 100 }, cell: 40, cols: 19, rows: 14,
  labels: { cols: 'alpha', rows: 'numeric' },
  anchor: { assetId: 'asset-board', relX: 0, relY: 0, relWidth: 1, relHeight: 1 },
  showInPlay: false,
}];

async function createGame() {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'TT' } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

async function createSetup(gameId, payload) {
  const res = await app.inject({ method: 'POST', url: `/api/games/${gameId}/setups`, headers, payload });
  assert.equal(res.statusCode, 201, res.body);
  return res.json();
}

async function readSetup(gameId, setupId) {
  const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}/setups/${setupId}`, headers });
  assert.equal(res.statusCode, 200, res.body);
  return res.json();
}

test('a setup saved with grids gives them back exactly', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Scenario 1', grid_data: GRIDS, zone_data: [] });
  assert.deepStrictEqual(JSON.parse((await readSetup(gameId, saved.id)).grid_data), GRIDS);
});

test('a setup saved without grids has an empty list, not null', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'No grids' });
  assert.deepStrictEqual(JSON.parse(saved.grid_data), []);
});

test('updating a setup without mentioning grids keeps the ones it has', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Scenario 1', grid_data: GRIDS });

  const res = await app.inject({
    method: 'PUT',
    url: `/api/games/${gameId}/setups/${saved.id}`,
    headers,
    payload: { name: 'Scenario 1 renamed' },
  });
  assert.equal(res.statusCode, 200, res.body);
  assert.deepStrictEqual(JSON.parse(res.json().grid_data), GRIDS, 'a rename must not drop the grids');
});

test('updating the grids replaces them, and an empty list really empties', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Scenario 1', grid_data: GRIDS });

  const wider = [{ ...GRIDS[0], cols: 20 }];
  let res = await app.inject({
    method: 'PUT', url: `/api/games/${gameId}/setups/${saved.id}`, headers, payload: { grid_data: wider },
  });
  assert.equal(res.statusCode, 200, res.body);
  assert.deepStrictEqual(JSON.parse(res.json().grid_data), wider);

  res = await app.inject({
    method: 'PUT', url: `/api/games/${gameId}/setups/${saved.id}`, headers, payload: { grid_data: [] },
  });
  assert.equal(res.statusCode, 200, res.body);
  assert.deepStrictEqual(JSON.parse(res.json().grid_data), []);
});
