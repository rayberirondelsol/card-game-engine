// M22/BX – ein Spielstand merkt sich den Aufbau, aus dem er stammt.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// `save_states` hatte keine Spalte dafuer. Beim Laden fehlte damit das Geruest
// (Zonen, Raster, Aktionen, Szenario), und der `?setupId=`-Zweig daneben baute
// stattdessen neu auf – eine laufende Partie ueberlebte kein Neuladen.
//
// Hier geprueft wird nur die Serverseite: die Spalte nimmt den Wert an, gibt
// ihn zurueck, und `NULL` bleibt `NULL` (die Aussage "Herkunft unbekannt",
// an der der sichtbare Hinweis am Tisch haengt).
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

/** Ein Tisch mit einem Token – die Leersperre aus M9.2 soll nicht zuschlagen. */
function tisch(x = 10) {
  return {
    camera: { x: 0, y: 0, zoom: 1, rotation: 0 },
    background: 'felt',
    cards: [],
    stacks: [],
    hand: [],
    counters: [],
    dice: [],
    hitDice: [],
    customDice: [],
    notes: [],
    tokens: [{ id: 'tok1', x, y: 10 }],
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

async function createSetup(gameId, name) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/setups`,
    headers,
    payload: { name, state_data: tisch(), zone_data: [], sequence_data: [] },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

test('Abnahme: ein Stand von Hand nimmt setup_id an und gibt sie zurueck', async () => {
  const gameId = await createGame('Partie mit Herkunft');
  const setupId = await createSetup(gameId, 'TFT Kurzpartie');

  const res = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/saves`,
    headers,
    payload: { name: 'Runde 3', state_data: tisch(), setup_id: setupId },
  });
  assert.equal(res.statusCode, 201, res.body);
  assert.equal(res.json().setup_id, setupId);

  const geladen = await app.inject({
    method: 'GET',
    url: `/api/games/${gameId}/saves/${res.json().id}`,
    headers,
  });
  assert.equal(geladen.statusCode, 200, geladen.body);
  assert.equal(geladen.json().setup_id, setupId, 'die Herkunft kam nicht zurueck');

  // Auch die Liste fuehrt sie – der Ladeweg fragt sonst zweimal.
  const liste = await app.inject({ method: 'GET', url: `/api/games/${gameId}/saves`, headers });
  assert.equal(liste.json().find((s) => s.id === res.json().id).setup_id, setupId);
});

test('Abnahme: ohne setup_id bleibt die Spalte null, nicht leerer Text', async () => {
  const gameId = await createGame('Partie ohne Herkunft');

  const res = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/saves`,
    headers,
    payload: { name: 'blanker Tisch', state_data: tisch() },
  });
  assert.equal(res.statusCode, 201, res.body);
  assert.equal(res.json().setup_id, null);

  // Eine leere Zeichenkette ist dasselbe wie "nicht angegeben" – sonst gaebe
  // es zwei Schreibweisen fuer "unbekannt" und der Hinweis am Tisch muesste
  // beide kennen.
  const leer = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/saves`,
    headers,
    payload: { name: 'auch blank', state_data: tisch(), setup_id: '' },
  });
  assert.equal(leer.json().setup_id, null);
});

test('Abnahme: der Auto-Stand schreibt die Herkunft auch beim Ueberschreiben', async () => {
  const gameId = await createGame('Partie mit Auto-Stand');
  const ersterSetup = await createSetup(gameId, 'Aufbau A');
  const zweiterSetup = await createSetup(gameId, 'Aufbau B');

  const erster = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/saves/auto`,
    headers,
    payload: { state_data: tisch(10), setup_id: ersterSetup },
  });
  assert.equal(erster.statusCode, 201, erster.body);
  assert.equal(erster.json().setup_id, ersterSetup);

  // Derselbe Auto-Stand, anderer Aufbau: das UPDATE muss die Spalte wirklich
  // mitschreiben, sonst behaelt der erste Auto-Stand seinen Wert fuer immer.
  const zweiter = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/saves/auto`,
    headers,
    payload: { state_data: tisch(20), setup_id: zweiterSetup },
  });
  assert.equal(zweiter.statusCode, 200, zweiter.body);
  assert.equal(zweiter.json().id, erster.json().id, 'es gibt nur einen Auto-Stand');
  assert.equal(zweiter.json().setup_id, zweiterSetup);
});

test('ein Stand, der vor der Migration geschrieben wurde, bleibt lesbar', async () => {
  // Nachgebaut, nicht nachgeahmt: eine Zeile ohne die neue Spalte, direkt
  // eingefuegt wie vor M22. Der echte Fall ist "Partie 12 — Endstand".
  const { getDb } = await import('../src/database.js');
  const gameId = await createGame('Partie 12');
  const db = getDb();
  const saveId = 'alt-ohne-herkunft';
  db.prepare(
    'INSERT INTO save_states (id, game_id, name, is_auto_save, state_data) VALUES (?, ?, ?, 0, ?)'
  ).run(saveId, gameId, 'Endstand', JSON.stringify(tisch()));

  const res = await app.inject({
    method: 'GET',
    url: `/api/games/${gameId}/saves/${saveId}`,
    headers,
  });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().setup_id, null);
  assert.equal(res.json().name, 'Endstand');
});
