// M5 – die Aktionen eines Setups überleben Speichern und Laden.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Gleiche Halbierung wie bei den Rastern: sequence-reveal.test.js zeigt, dass
// eine Aktion läuft; hier geht es nur darum, dass sie überhaupt wieder da ist –
// über eine eigene Spalte, und ein Update, das nichts über Aktionen sagt, darf
// die vorhandenen nicht wegwerfen (dasselbe COALESCE wie Zonen und Raster).
//
// Isolation: CGE_DB_PATH / CGE_UPLOADS_DIR zeigen in ein Temp-Verzeichnis und
// müssen vor dem Import von src/index.js gesetzt sein, daher der dynamische
// Import unten.

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

/** „Kampf beginnen" aus dem Referenzfall der Spec, Abschnitt 11. */
const ACTIONS = [{
  id: 'a-fight',
  label: 'Kampf beginnen',
  steps: [
    { type: 'reveal_next', zoneLabel: 'Bosseleiste', targetZoneLabel: 'Reihenfolge' },
    { type: 'set_asset_face', assetName: 'Sideboard', faceDown: false },
    { type: 'place_asset', assetName: 'Tableau: $revealedBase', x: 1800, y: 400 },
  ],
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

test('a setup saved with actions gives them back exactly', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Townsfolk Tussle', action_data: ACTIONS });

  const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}/setups/${saved.id}`, headers });
  assert.equal(res.statusCode, 200, res.body);
  assert.deepStrictEqual(JSON.parse(res.json().action_data), ACTIONS);
});

test('a setup saved without actions has an empty list, not null', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Ohne Aktionen' });
  assert.deepStrictEqual(JSON.parse(saved.action_data), []);
});

test('updating a setup without mentioning actions keeps the ones it has', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Townsfolk Tussle', action_data: ACTIONS });

  const res = await app.inject({
    method: 'PUT',
    url: `/api/games/${gameId}/setups/${saved.id}`,
    headers,
    payload: { name: 'Townsfolk Tussle umbenannt' },
  });
  assert.equal(res.statusCode, 200, res.body);
  assert.deepStrictEqual(JSON.parse(res.json().action_data), ACTIONS, 'a rename must not drop the actions');
});
