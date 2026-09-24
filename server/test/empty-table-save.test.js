// M9.2 – ein leerer Tisch ueberschreibt den gespeicherten Stand.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// `/play/<id>` oeffnete einen leeren Tisch mit "Auto-save: ON" und binnen
// Sekunden war der einzige Speicherstand leer. Der Client hat die Sperre nur
// an einem seiner beiden Schreibwege; die Regel selbst ("ueberschreibt keinen
// **gefuellten** Stand") kann er ohnehin nicht kennen – er weiss nicht, was
// gespeichert ist. Deshalb steht sie in der Route.
//
// Isolation ueber CGE_DB_PATH / CGE_UPLOADS_DIR, gesetzt vor dem Import von
// src/index.js (daher die dynamischen Importe).

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
const { isEmptyTableState, tableObjectCount } =
  await import('../../shared/tableState.js');

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

/** Ein Tisch mit Objekten: drei Dauerstapel und ein Token. */
function gefuellt() {
  return {
    camera: { x: 0, y: 0, zoom: 1, rotation: 0 },
    background: 'felt',
    cards: [],
    stacks: [{ stackId: 's1', card_ids: ['a', 'b'], cards: [{ tableId: 't1' }] }],
    hand: [],
    counters: [],
    dice: [],
    tokens: [{ id: 'tok1', x: 10, y: 10 }],
    notes: [],
    boards: [],
    textFields: [],
    stackNames: { s1: 'Aktionsdeck' },
    maxZIndex: 7,
  };
}

/** Ein leerer Tisch – keine Objekte, aber Kamera und Hintergrund stehen da. */
function leer() {
  return {
    camera: { x: 120, y: 80, zoom: 1.5, rotation: 0 },
    background: 'wood',
    cards: [],
    stacks: [],
    hand: [],
    counters: [],
    dice: [],
    hitDice: [],
    customDice: [],
    notes: [],
    tokens: [],
    boards: [],
    textFields: [],
    stackNames: {},
    maxZIndex: 1,
  };
}

async function createGame(name) {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

async function autoSave(gameId, state) {
  return app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/saves/auto`,
    headers,
    payload: { state_data: state },
  });
}

async function autoSaveOf(gameId) {
  const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}/saves`, headers });
  assert.equal(res.statusCode, 200, res.body);
  return res.json().find((s) => s.is_auto_save);
}

test('leer heisst keine Objekte, nicht "keine Aenderung"', () => {
  assert.equal(isEmptyTableState(leer()), true);
  assert.equal(isEmptyTableState(gefuellt()), false);
  // Kamera, Hintergrund, Namen und maxZIndex zaehlen nicht als Objekt.
  assert.equal(tableObjectCount(leer()), 0);
  // Der Server speichert JSON-Text, nicht das Objekt.
  assert.equal(isEmptyTableState(JSON.stringify(leer())), true);
  assert.equal(isEmptyTableState(JSON.stringify(gefuellt())), false);
  // Was sich nicht lesen laesst, gilt als leer und darf nichts ueberschreiben.
  assert.equal(isEmptyTableState(null), true);
  assert.equal(isEmptyTableState('kein json'), true);
});

test('Abnahme 1: ein Tisch ohne Objekte ueberschreibt keinen gefuellten Stand', async () => {
  const gameId = await createGame('verlorene Partie');

  assert.equal((await autoSave(gameId, gefuellt())).statusCode, 201);
  const vorher = await autoSaveOf(gameId);
  assert.ok(vorher, 'kein Auto-Stand angelegt');

  const res = await autoSave(gameId, leer());
  assert.equal(res.statusCode, 409, res.body);

  const nachher = await autoSaveOf(gameId);
  assert.equal(nachher.state_data, vorher.state_data, 'der Stand wurde angetastet');
});

test('Abnahme 2: ein Tisch mit Objekten speichert wie bisher', async () => {
  const gameId = await createGame('laufende Partie');
  assert.equal((await autoSave(gameId, gefuellt())).statusCode, 201);

  const zweiter = gefuellt();
  zweiter.tokens.push({ id: 'tok2', x: 99, y: 99 });
  const res = await autoSave(gameId, zweiter);
  assert.equal(res.statusCode, 200, res.body);

  const stand = JSON.parse((await autoSaveOf(gameId)).state_data);
  assert.equal(stand.tokens.length, 2);
});

test('Abnahme 3: der ausdrueckliche Befehl speichert auch einen leeren Tisch', async () => {
  const gameId = await createGame('absichtlich geleert');
  assert.equal((await autoSave(gameId, gefuellt())).statusCode, 201);

  const res = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/saves`,
    headers,
    payload: { name: 'leer geraeumt', state_data: leer() },
  });
  assert.equal(res.statusCode, 201, res.body);
  assert.equal(isEmptyTableState(res.json().state_data), true);
});

test('die engste Fassung: leer ueber leer und der erste Stand gehen durch', async () => {
  const neu = await createGame('frisch');
  assert.equal((await autoSave(neu, leer())).statusCode, 201, 'der erste Stand darf leer sein');
  assert.equal((await autoSave(neu, leer())).statusCode, 200, 'leer ueber leer bleibt erlaubt');
});
