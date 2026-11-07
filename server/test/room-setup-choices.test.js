// CX / Spec M27.3 — ein Raum trägt die Wahl des Aufbaus.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Der Aufbau läuft an **zwei** Stellen: am Tisch und im Raum. Ein Raum, der die
// Wahl nicht trüge, baute **stumm die Standardvariante** - die Mitspieler sähen
// in der Lobby nicht, womit gespielt wird. Gewählt wird deshalb beim **Anlegen**
// (`POST /api/rooms`, dort steht auch das Setup), nicht beim Start (der Start
// kennt nur die `player_id`).
//
// Isolation wie `room-start-sequence.test.js`: CGE_DB_PATH / CGE_UPLOADS_DIR
// zeigen auf ein tmpdir und müssen vor dem Import von src/index.js gesetzt sein.

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
const { getRoom } = await import('../src/roomStore.js');
const { authHeaders } = await import('./helpers.js');
const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

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

// ── Fixtures ─────────────────────────────────────────────────────────────────

const OPTIONS = {
  partie: {
    label: 'Spiellänge', default: 'kurz',
    choices: {
      kurz: { label: 'Kurz (3-Runden-Modus)', vars: { Muenzen: '45' } },
      lang: { label: 'Lang (4 Runden)', vars: { Muenzen: '30' } },
    },
  },
  troedel: {
    label: 'Toller Trödel', default: 'mit',
    choices: {
      mit: { label: 'mit Toller Trödel', vars: { Nachschub: 'Toller Trödel: Nachschub (Nr. 1-30)' } },
      ohne: { label: 'ohne Toller Trödel', vars: { Nachschub: 'Nachschub' } },
    },
  },
};

const SEQUENCE = [
  { type: 'place_stack', category: ['$optNachschub'], label: 'Nachschub (Tante Emma)', x: 1780, y: 640, faceDown: true },
  { type: 'place_stack', category: ['Toller Trödel: Rollen'], label: 'Rollen', x: 1900, y: 640, faceDown: false, onlyChoice: { troedel: 'mit' } },
  { type: 'place_asset', assetName: 'Kurzpartie: erste Runde überspringen', x: 700, y: 100, faceDown: false, onlyChoice: { partie: 'kurz' } },
  { type: 'place_counter', name: 'Münzen (gemeinsam)', value: '$optMuenzen', x: 2080, y: 1430 },
];

const CARDS = {
  'Nachschub': ['N1', 'N2', 'N3'],
  'Nachschub (freischaltbar)': ['F1'],
  'Toller Trödel: Nachschub (Nr. 1-30)': ['T1', 'T2'],
  'Toller Trödel: Rollen': ['R1', 'R2'],
};

async function createGame() {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'M27' } });
  assert.equal(res.statusCode, 201, res.body);
  const gameId = res.json().id;
  const db = getDb();
  for (const [category, names] of Object.entries(CARDS)) {
    const catId = randomUUID();
    db.prepare('INSERT INTO categories (id, game_id, name) VALUES (?, ?, ?)').run(catId, gameId, category);
    for (const name of names) {
      db.prepare('INSERT INTO cards (id, game_id, category_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, 744, 744)')
        .run(randomUUID(), gameId, catId, name, `/uploads/${name}.png`);
    }
  }
  db.prepare('INSERT INTO table_assets (id, game_id, type, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, 60, 60)')
    .run(randomUUID(), gameId, 'token', 'Kurzpartie: erste Runde überspringen', '/uploads/marker.png');
  return gameId;
}

async function createSetup(gameId, payload) {
  const res = await app.inject({
    method: 'POST', url: `/api/games/${gameId}/setups`, headers,
    payload: { name: 'Aufbau', state_data: JSON.stringify({ stacks: [], cards: [], tokens: [], counters: [] }), ...payload },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

const withOptions = (gameId) => createSetup(gameId, {
  sequence_data: JSON.stringify(SEQUENCE),
  scenario_data: JSON.stringify({ options: OPTIONS }),
});

const createRoom = (gameId, setupId, setup_choices) => app.inject({
  method: 'POST', url: '/api/rooms', headers,
  payload: { game_id: gameId, display_name: 'Host', color: 'red', setup_id: setupId, ...(setup_choices === undefined ? {} : { setup_choices }) },
});

async function startRoom(gameId, setupId, setup_choices) {
  const created = await createRoom(gameId, setupId, setup_choices);
  assert.equal(created.statusCode, 201, created.body);
  const { room_code, player_id } = created.json();
  const started = await app.inject({ method: 'POST', url: `/api/rooms/${room_code}/start`, headers, payload: { player_id } });
  return { room_code, player_id, started };
}

const stackOf = (state, label) => state.stacks.find(s => s.label === label);
const roomCount = () => getDb().prepare('SELECT COUNT(*) AS n FROM game_rooms').get().n;

// ── Die Regel ────────────────────────────────────────────────────────────────

test('CX: ein Raum, der mit Lang/ohne angelegt wurde, baut Lang/ohne', async () => {
  const gameId = await createGame();
  const { room_code, started } = await startRoom(gameId, await withOptions(gameId), { partie: 'lang', troedel: 'ohne' });
  assert.equal(started.statusCode, 200, started.body);

  const state = getRoom(room_code).boardState;
  const nachschub = stackOf(state, 'Nachschub (Tante Emma)');
  assert.deepEqual(nachschub.cards.map(c => c.name).sort(), ['N1', 'N2', 'N3'], 'genau die Karten von `Nachschub`, keine von `(freischaltbar)`');
  assert.equal(stackOf(state, 'Rollen'), undefined, 'ohne Toller Trödel kein Rollenstapel');
  assert.equal(state.tokens.length, 0, 'lang: kein Marker');
  assert.equal(state.counters.find(c => c.name === 'Münzen (gemeinsam)').value, 30);
});

test('CX: ohne `setup_choices` gelten die Vorgaben – die heutige Kurzpartie, mit Toller Trödel', async () => {
  const gameId = await createGame();
  const { room_code, started } = await startRoom(gameId, await withOptions(gameId));
  assert.equal(started.statusCode, 200, started.body);
  const state = getRoom(room_code).boardState;
  assert.deepEqual(stackOf(state, 'Nachschub (Tante Emma)').cards.map(c => c.name).sort(), ['T1', 'T2']);
  assert.equal(stackOf(state, 'Rollen').cards.length, 2);
  assert.equal(state.tokens.length, 1, 'kurz: der Marker liegt');
  assert.equal(state.counters.find(c => c.name === 'Münzen (gemeinsam)').value, 45);
});

test('CX: Parität – derselbe Executor mit derselben Wahl baut am Tisch und im Raum dasselbe', async () => {
  const gameId = await createGame();
  const setupId = await withOptions(gameId);
  const choices = { partie: 'lang', troedel: 'mit' };

  // Der Raum.
  const { room_code } = await startRoom(gameId, setupId, choices);
  const raum = getRoom(room_code).boardState;

  // Der Tisch: derselbe Aufruf wie `GameTable.jsx`, dieselben Eingaben.
  const db = getDb();
  const assets = db.prepare(
    'SELECT t.*, (SELECT name FROM categories WHERE id = t.category_id) AS category FROM table_assets t WHERE t.game_id = ? ORDER BY t.created_at DESC').all(gameId);
  const cards = db.prepare(
    'SELECT c.*, (SELECT name FROM categories WHERE id = c.category_id) AS category FROM cards c WHERE c.game_id = ? ORDER BY c.created_at DESC').all(gameId);
  const tisch = executeSequenceWithLog('{}', SEQUENCE, [], { assets, cards, grids: [], scenarioData: { options: OPTIONS }, choices });
  assert.deepEqual(tisch.log.filter(e => e.status !== 'ok'), []);

  const form = (s) => ({
    stacks: s.stacks.map(x => ({ label: x.label, cards: x.cards.map(c => c.name).sort() })).sort((a, b) => a.label.localeCompare(b.label)),
    tokens: s.tokens.map(t => t.label ?? t.name).sort(),
    counters: s.counters.map(c => [c.name, c.value]).sort(),
  });
  assert.deepEqual(form(raum), form(tisch.state));
  // Nicht leer verglichen.
  assert.equal(form(raum).stacks.length, 2);
  assert.deepEqual(form(raum).counters, [['Münzen (gemeinsam)', 30]]);
});

// ── Falsche Wahl: kein Raum ─────────────────────────────────────────────────

test('CX: eine unbekannte Wahl beim Anlegen – 400, deutsche Meldung, **kein** Raum', async () => {
  const gameId = await createGame();
  const setupId = await withOptions(gameId);
  const vorher = roomCount();
  for (const bad of [{ partie: 'mittel' }, { laenge: 'kurz' }, { partie: 3 }]) {
    const res = await createRoom(gameId, setupId, bad);
    assert.equal(res.statusCode, 400, JSON.stringify(bad));
    assert.match(res.json().error, /Ungültige Wahl/);
  }
  assert.equal(roomCount(), vorher, 'es wurde kein Raum angelegt');
});

test('CX: ein Setup ohne options – die Wahl ist ein Fehler, ohne Wahl läuft es wie vorher', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId, { sequence_data: JSON.stringify([{ type: 'place_counter', name: 'X', value: 1, x: 0, y: 0 }]) });
  const vorher = roomCount();
  const res = await createRoom(gameId, setupId, { partie: 'lang' });
  assert.equal(res.statusCode, 400);
  assert.match(res.json().error, /Ungültige Wahl/);
  assert.equal(roomCount(), vorher);

  const { room_code, started } = await startRoom(gameId, setupId);
  assert.equal(started.statusCode, 200, started.body);
  assert.equal(getRoom(room_code).boardState.counters.length, 1);
});

test('CX: eine Wahl für ein Setup, das es nicht gibt, ist ein Fehler – es wird nichts angelegt', async () => {
  const gameId = await createGame();
  const vorher = roomCount();
  const res = await createRoom(gameId, randomUUID(), { partie: 'lang' });
  assert.equal(res.statusCode, 400);
  assert.equal(roomCount(), vorher);
});

// ── Die Lobby sieht die Wahl ────────────────────────────────────────────────

test('CX: `GET /api/rooms/:code` liefert die Wahl mit – aufgelöst, mit den Vorgaben für den Rest', async () => {
  const gameId = await createGame();
  const setupId = await withOptions(gameId);
  const created = await createRoom(gameId, setupId, { partie: 'lang' });
  const { room_code } = created.json();
  const res = await app.inject({ method: 'GET', url: `/api/rooms/${room_code}`, headers });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json().setup_choices, { partie: 'lang', troedel: 'mit' });
  // Die Lobby zeigt die Bezeichnungen - dieselbe Funktion wie die Meldung am Tisch.
  assert.equal(res.json().setup_choices_label, 'Lang (4 Runden), mit Toller Trödel');

  // Ein Raum ohne Optionen trägt keine Wahl.
  const plain = await createSetup(gameId, {});
  const r2 = (await createRoom(gameId, plain)).json();
  const g2 = await app.inject({ method: 'GET', url: `/api/rooms/${r2.room_code}`, headers });
  assert.equal(g2.json().setup_choices, null);
  assert.equal(g2.json().setup_choices_label, '');
});

test('CX: ändert sich das Setup zwischen Anlegen und Start so, dass die Wahl nicht mehr passt, startet der Raum nicht', async () => {
  const gameId = await createGame();
  const setupId = await withOptions(gameId);
  const created = await createRoom(gameId, setupId, { partie: 'lang' });
  const { room_code, player_id } = created.json();
  // Jemand benennt die Wahl um.
  const geaendert = JSON.parse(JSON.stringify(OPTIONS));
  geaendert.partie.choices.lang2 = geaendert.partie.choices.lang;
  delete geaendert.partie.choices.lang;
  getDb().prepare('UPDATE setups SET scenario_data = ? WHERE id = ?').run(JSON.stringify({ options: geaendert }), setupId);

  const started = await app.inject({ method: 'POST', url: `/api/rooms/${room_code}/start`, headers, payload: { player_id } });
  assert.equal(started.statusCode, 409, started.body);
  assert.match(started.json().error, /Wahl/);
  const row = getDb().prepare('SELECT status FROM game_rooms WHERE room_code = ?').get(room_code);
  assert.equal(row.status, 'waiting', 'der Raum ist nicht aktiv geworden');
});
