// M7/T5 – die Szenariodaten eines Setups überleben Speichern und Laden.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Dieselbe Halbierung wie bei Rastern und Aktionen: `scenario-data-validate`
// prüft den Inhalt, hier geht es nur darum, dass er überhaupt wieder da ist –
// über eine eigene Spalte, und ein Update, das nichts über Szenarien sagt, darf
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

/**
 * Der Eintrag aus M7, „Die Szenariodaten" – mit dem Feldbereich aus M7.1
 * dazwischen. Der Bereich steht hier nicht wegen der Prüfung (die hat ihre
 * eigene Datei), sondern weil `setups.js` `scenario_data` **untypisiert**
 * durchreicht: POST, PUT und GET dürfen an `"D5:G5"` nichts kennen und nichts
 * zurechtbiegen. Fiele die Route je auf ein Schema zurück, das nur Feldnamen
 * kennt, bräche jeder Test dieser Datei – und nicht erst der Tisch.
 */
const SCENARIOS = {
  gridLabel: 'Kampffeld',
  bosses: {
    Patches: {
      scenario: "Meal Time's Over",
      terrain: [
        { assetName: 'Fetid Furball', cells: ['C7', 'D7', 'H9'] },
        { assetName: 'Wheat Field', cells: ['M4'] },
        { assetName: 'Holzzaun', cells: ['D5:G5'] },
      ],
      fields: { B: 'J5', D: ['A1', 'B3', 'C4', 'D6', 'E9'] },
      decks: [{ category: 'Aktionen: Patches', label: 'Verhaltensdeck' }],
      final: {
        terrain: [{ assetName: 'Giant Milk Jug', cells: ['K2', 'K3'] }],
        fields: { FF: ['K2', 'K3', 'L2', 'L3', 'M2'] },
      },
    },
  },
};

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

test('a setup saved with scenario data gives it back exactly', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Townsfolk Tussle', scenario_data: SCENARIOS });

  const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}/setups/${saved.id}`, headers });
  assert.equal(res.statusCode, 200, res.body);
  assert.deepStrictEqual(JSON.parse(res.json().scenario_data), SCENARIOS);
});

test('a setup saved without scenario data has an empty object, not null', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Ohne Szenarien' });
  assert.deepStrictEqual(JSON.parse(saved.scenario_data), {});
});

test('the list endpoint carries the scenario data too', async () => {
  const gameId = await createGame();
  await createSetup(gameId, { name: 'Townsfolk Tussle', scenario_data: SCENARIOS });

  const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}/setups`, headers });
  assert.equal(res.statusCode, 200, res.body);
  assert.deepStrictEqual(JSON.parse(res.json()[0].scenario_data), SCENARIOS);
});

test('updating a setup replaces the scenario data it names', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Townsfolk Tussle', scenario_data: SCENARIOS });

  const next = { gridLabel: 'Kampffeld', bosses: { 'Barry Bluff': { terrain: [] } } };
  const res = await app.inject({
    method: 'PUT',
    url: `/api/games/${gameId}/setups/${saved.id}`,
    headers,
    payload: { scenario_data: next },
  });
  assert.equal(res.statusCode, 200, res.body);
  assert.deepStrictEqual(JSON.parse(res.json().scenario_data), next);
});

test('updating a setup without mentioning scenarios keeps the ones it has', async () => {
  const gameId = await createGame();
  const saved = await createSetup(gameId, { name: 'Townsfolk Tussle', scenario_data: SCENARIOS });

  const res = await app.inject({
    method: 'PUT',
    url: `/api/games/${gameId}/setups/${saved.id}`,
    headers,
    payload: { name: 'Townsfolk Tussle umbenannt' },
  });
  assert.equal(res.statusCode, 200, res.body);
  assert.deepStrictEqual(
    JSON.parse(res.json().scenario_data), SCENARIOS,
    'a rename must not drop the scenario data',
  );
});
