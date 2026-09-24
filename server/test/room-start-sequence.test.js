// M6 – der Raum baut auf wie der Tisch.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// `POST /api/rooms/:code/start` lud bisher nur `state_data`, `zone_data` und
// `grid_data`; `sequence_data` lief ausschliesslich im Client. Ein Raum startete
// deshalb ohne alles, was die Sequenz herstellt. Geprueft wird hier der Raum,
// nicht der Executor – dessen Schritte haben ihre eigenen Tests.
//
// Isolation: CGE_DB_PATH / CGE_UPLOADS_DIR zeigen auf ein tmpdir und muessen vor
// dem Import von src/index.js gesetzt sein, daher die dynamischen Imports.

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

/** Ein Stapel mit drei Karten – die Sequenz teilt zwei davon aus. */
function stateWithDeck() {
  return {
    cards: [],
    stacks: [{
      id: 'stack-deck',
      label: 'Nachschub',
      x: 0, y: 0,
      cards: [
        { tableId: 'c1', id: 'c1', name: 'Eins', zIndex: 1, width: 100, height: 140 },
        { tableId: 'c2', id: 'c2', name: 'Zwei', zIndex: 2, width: 100, height: 140 },
        { tableId: 'c3', id: 'c3', name: 'Drei', zIndex: 3, width: 100, height: 140 },
      ],
    }],
    tokens: [],
    counters: [],
    notes: [],
    dice: [],
    boards: [],
  };
}

/** Auslage mit zwei ausdruecklichen Plaetzen: Box 200x100 bei (400, 300). */
const ZONES = [{
  id: 'z-auslage', label: 'Auslage', type: 'table',
  x: 400, y: 300, width: 200, height: 100,
  layout: 'slots',
  slots: [{ relX: 0.25, relY: 0.5 }, { relX: 0.75, relY: 0.5 }],
}];

const SEQUENCE = [
  { type: 'deal_to_zone', stackLabel: 'Nachschub', count: 2, targetZoneLabel: 'Auslage', faceDown: false },
  { type: 'place_counter', name: 'Runde', value: 1, max: 8, x: 40, y: 50 },
];

async function createGame() {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'M6' } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

async function createSetup(gameId, payload) {
  const res = await app.inject({
    method: 'POST', url: `/api/games/${gameId}/setups`, headers,
    payload: { name: 'Aufbau', ...payload },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

/** Ein Tisch-Asset direkt in die DB – der Upload-Weg gehoert nicht zu M6. */
function addTableAsset(gameId, name, over = {}) {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO table_assets (id, game_id, type, name, image_path, width, height)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, gameId, over.type || 'token', name, over.image_path || `/uploads/${id}.png`,
    over.width ?? 60, over.height ?? 60);
  return id;
}

async function startRoom(gameId, setupId) {
  const created = await app.inject({
    method: 'POST', url: '/api/rooms', headers,
    payload: { game_id: gameId, display_name: 'Host', color: 'red', setup_id: setupId },
  });
  assert.equal(created.statusCode, 201, created.body);
  const { room_code, player_id } = created.json();

  const started = await app.inject({
    method: 'POST', url: `/api/rooms/${room_code}/start`, headers, payload: { player_id },
  });
  return { room_code, player_id, started };
}

// ── Die Regel ────────────────────────────────────────────────────────────────

test('ein Raum fuehrt die Aufbau-Sequenz des Setups aus', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify(stateWithDeck()),
    zone_data: JSON.stringify(ZONES),
    sequence_data: JSON.stringify(SEQUENCE),
  });

  const { room_code, started } = await startRoom(gameId, setupId);
  assert.equal(started.statusCode, 200, started.body);

  const room = getRoom(room_code);
  const state = room.boardState;

  // zwei Karten liegen auf den beiden Plaetzen der Auslage, eine blieb im Stapel
  assert.equal(state.cards.length, 2, 'die Sequenz hat ausgeteilt');
  assert.deepEqual(
    state.cards.map(c => ({ x: c.x, y: c.y })),
    [{ x: 450, y: 350 }, { x: 550, y: 350 }],
  );
  assert.equal(state.stacks[0].cards.length, 1);

  // und der Zaehler steht mit Startwert da
  assert.equal(state.counters.length, 1);
  assert.equal(state.counters[0].name, 'Runde');
  assert.equal(state.counters[0].value, 1);
  assert.equal(state.counters[0].max, 8);
});

test('Asset-Schritte ziehen aus den Tisch-Assets des Spiels', async () => {
  const gameId = await createGame();
  addTableAsset(gameId, 'Boesewicht');
  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify(stateWithDeck()),
    zone_data: JSON.stringify(ZONES),
    sequence_data: JSON.stringify([
      { type: 'place_asset', assetName: 'Boesewicht', x: 120, y: 240 },
    ]),
  });

  const { room_code } = await startRoom(gameId, setupId);
  const tokens = getRoom(room_code).boardState.tokens;
  assert.equal(tokens.length, 1, 'ohne die Assets des Spiels bliebe der Schritt uebersprungen');
  assert.equal(tokens[0].x, 120);
  assert.equal(tokens[0].y, 240);
});

test('ein Setup ohne Sequenz verhaelt sich unveraendert', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify(stateWithDeck()),
    zone_data: JSON.stringify(ZONES),
  });

  const { room_code, started } = await startRoom(gameId, setupId);
  assert.equal(started.statusCode, 200, started.body);

  const state = getRoom(room_code).boardState;
  assert.equal(state.cards.length, 0);
  assert.equal(state.stacks[0].cards.length, 3);
  assert.deepEqual(getRoom(room_code).zones, ZONES);
});

test('ein fehlgeschlagener Schritt verhindert den Start nicht', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify(stateWithDeck()),
    zone_data: JSON.stringify(ZONES),
    sequence_data: JSON.stringify([
      { type: 'deal_to_zone', stackLabel: 'Gibt es nicht', count: 1, targetZoneLabel: 'Auslage' },
      { type: 'place_counter', name: 'Runde', value: 1, x: 40, y: 50 },
    ]),
  });

  const { room_code, started } = await startRoom(gameId, setupId);
  assert.equal(started.statusCode, 200, started.body);

  const room = getRoom(room_code);
  assert.equal(room.status, 'active', 'der Raum laeuft trotz des kaputten Schritts');
  assert.equal(room.boardState.counters.length, 1, 'die Schritte danach laufen weiter');
});

// ── Raster: dieselbe Platzierung wie beim Laden am Tisch ──────────────────────

test('ein Objekt auf einem Rasterfeld liegt im Raum auf demselben Feld', async () => {
  const gameId = await createGame();
  const state = stateWithDeck();
  // gespeichert mit veralteten Koordinaten – das Feld ist die Wahrheit.
  state.tokens.push({ id: 't-fig', label: 'Figur', x: 0, y: 0, width: 40, height: 40, gridId: 'g1', cell: 'C7' });
  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify(state),
    zone_data: JSON.stringify([]),
    grid_data: JSON.stringify([{
      id: 'g1', label: 'Feld', type: 'square',
      origin: { x: 100, y: 100 }, cell: 40, cols: 10, rows: 10,
      labels: { cols: 'alpha', rows: 'numeric' },
    }]),
  });

  const { room_code } = await startRoom(gameId, setupId);
  const token = getRoom(room_code).boardState.tokens.find(t => t.id === 't-fig');
  // C = dritte Spalte, 7 = siebte Zeile, Feldmitte: 100 + 2*40 + 20 = 200 / 100 + 6*40 + 20 = 360
  assert.deepEqual({ x: token.x, y: token.y }, { x: 200, y: 360 });
});

// ── Szenariodaten: derselbe Aufbau wie am Tisch ───────────────────────────────

test('der Raum baut das Szenario des aufgedeckten Boesewichts auf', async () => {
  const gameId = await createGame();
  addTableAsset(gameId, 'Boesewicht: Klaus', { image_path: '/uploads/klaus.png' });
  // Verdeckt aufgedeckt werden kann nur, was eine Rueckseite hat.
  getDb().prepare('UPDATE table_assets SET back_image_path = ? WHERE name = ?')
    .run('/uploads/back.png', 'Boesewicht: Klaus');
  // Feldgross (40 auf einem 40er-Raster): dieser Test fragt, ob der Raum dasselbe
  // baut wie der Tisch, nicht wie viele Felder ein Stueck belegt. Mit der Vorgabe
  // von 60 leitete M7.3 hier 2x2 ab, und der Test pruefte still die
  // Grundflaechenregel mit (die steht in scenario-footprint.test.js).
  addTableAsset(gameId, 'Fetid Furball', { width: 40, height: 40 });

  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify(stateWithDeck()),
    zone_data: JSON.stringify([{
      id: 'z-bar', label: 'Leiste', type: 'table', x: 800, y: 100, width: 200, height: 60,
      accepts: ['asset'], capacity: 2, layout: 'row',
    }]),
    grid_data: JSON.stringify([{
      id: 'g1', label: 'Kampffeld', type: 'square',
      origin: { x: 100, y: 100 }, cell: 40, cols: 10, rows: 10,
      labels: { cols: 'alpha', rows: 'numeric' },
    }]),
    scenario_data: JSON.stringify({
      gridLabel: 'Kampffeld',
      bosses: { Klaus: { terrain: [{ assetName: 'Fetid Furball', cells: ['C7', 'D7'] }], fields: { B: 'A1' } } },
    }),
    sequence_data: JSON.stringify([
      { type: 'place_asset', assetName: 'Boesewicht: Klaus', targetZoneLabel: 'Leiste', faceDown: true },
      { type: 'reveal_next', zoneLabel: 'Leiste' },
      { type: 'build_scenario', final: 'auto' },
    ]),
  });

  const { room_code, started } = await startRoom(gameId, setupId);
  assert.equal(started.statusCode, 200, started.body);

  const tiles = getRoom(room_code).boardState.tokens.filter(t => t.label === 'Fetid Furball');
  assert.equal(tiles.length, 2, 'ohne die Szenariodaten in den options laege hier nichts');
  assert.deepEqual(tiles.map(t => t.cell).sort(), ['C7', 'D7']);
});

test('ein Objekt mit Bereichsadresse liegt im Raum auf der Mitte des Bereichs', async () => {
  const gameId = await createGame();
  const state = stateWithDeck();
  // Gespeichert mit veralteten Koordinaten und der Assetgröße – beides ist beim
  // Bereich nicht die Wahrheit: `placeOnGrids` rechnet Mitte und Maße neu.
  state.tokens.push({ id: 't-zaun', label: 'Holzzaun', x: 0, y: 0, width: 40, height: 40, gridId: 'g1', cell: 'E3:G4' });
  state.tokens.push({ id: 't-fig', label: 'Figur', x: 0, y: 0, width: 40, height: 40, gridId: 'g1', cell: 'C7' });
  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify(state),
    zone_data: JSON.stringify([]),
    grid_data: JSON.stringify([{
      id: 'g1', label: 'Feld', type: 'square',
      origin: { x: 100, y: 100 }, cell: 40, cols: 10, rows: 10,
      labels: { cols: 'alpha', rows: 'numeric' },
    }]),
  });

  const { room_code } = await startRoom(gameId, setupId);
  const tokens = getRoom(room_code).boardState.tokens;

  // E3:G4 = Spalten 4–6, Zeilen 2–3: Kasten 100+160 .. 100+280 / 100+80 .. 100+160
  const zaun = tokens.find(t => t.id === 't-zaun');
  assert.deepEqual({ x: zaun.x, y: zaun.y, width: zaun.width, height: zaun.height },
    { x: 320, y: 220, width: 120, height: 80 });

  // Und das Einzelfeld daneben ändert seine Größe nicht.
  const fig = tokens.find(t => t.id === 't-fig');
  assert.deepEqual({ x: fig.x, y: fig.y, width: fig.width, height: fig.height },
    { x: 200, y: 360, width: 40, height: 40 });
});

test('der Raum baut einen Feldbereich aus den Szenariodaten genauso auf wie der Tisch', async () => {
  const gameId = await createGame();
  addTableAsset(gameId, 'Boesewicht: Klaus', { image_path: '/uploads/klaus.png' });
  getDb().prepare('UPDATE table_assets SET back_image_path = ? WHERE name = ?')
    .run('/uploads/back.png', 'Boesewicht: Klaus');
  addTableAsset(gameId, 'Holzzaun', { width: 40, height: 40 });

  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify(stateWithDeck()),
    zone_data: JSON.stringify([{
      id: 'z-bar', label: 'Leiste', type: 'table', x: 800, y: 100, width: 200, height: 60,
      accepts: ['asset'], capacity: 2, layout: 'row',
    }]),
    grid_data: JSON.stringify([{
      id: 'g1', label: 'Kampffeld', type: 'square',
      origin: { x: 100, y: 100 }, cell: 40, cols: 10, rows: 10,
      labels: { cols: 'alpha', rows: 'numeric' },
    }]),
    // `scenario_data` reicht der Server untypisiert durch – der Bereich steht
    // in den Daten, nicht am Schritt, und braucht keine Routenaenderung.
    scenario_data: JSON.stringify({
      gridLabel: 'Kampffeld',
      bosses: { Klaus: { terrain: [{ assetName: 'Holzzaun', cells: ['E3:G4', 'J2'] }] } },
    }),
    sequence_data: JSON.stringify([
      { type: 'place_asset', assetName: 'Boesewicht: Klaus', targetZoneLabel: 'Leiste', faceDown: true },
      { type: 'reveal_next', zoneLabel: 'Leiste' },
      { type: 'build_scenario', final: 'auto' },
    ]),
  });

  const { room_code, started } = await startRoom(gameId, setupId);
  assert.equal(started.statusCode, 200, started.body);

  const tiles = getRoom(room_code).boardState.tokens.filter(t => t.label === 'Holzzaun');
  assert.deepEqual(tiles.map(t => t.cell).sort(), ['E3:G4', 'J2']);

  // E3:G4 = Spalten 4–6, Zeilen 2–3: Kasten 260..380 / 180..260.
  const ranged = tiles.find(t => t.cell === 'E3:G4');
  assert.deepEqual({ x: ranged.x, y: ranged.y, width: ranged.width, height: ranged.height },
    { x: 320, y: 220, width: 120, height: 80 });

  // Das Einzelfeld daneben behaelt die Groesse seines Assets.
  const single = tiles.find(t => t.cell === 'J2');
  assert.deepEqual({ x: single.x, y: single.y, width: single.width, height: single.height },
    { x: 480, y: 160, width: 40, height: 40 });
});

test('ein Bereich in den Szenariodaten des Raums scheitert, bevor das erste Objekt liegt', async () => {
  const gameId = await createGame();
  addTableAsset(gameId, 'Boesewicht: Klaus', { image_path: '/uploads/klaus.png' });
  getDb().prepare('UPDATE table_assets SET back_image_path = ? WHERE name = ?')
    .run('/uploads/back.png', 'Boesewicht: Klaus');
  addTableAsset(gameId, 'Holzzaun');

  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify(stateWithDeck()),
    zone_data: JSON.stringify([{
      id: 'z-bar', label: 'Leiste', type: 'table', x: 800, y: 100, width: 200, height: 60,
      accepts: ['asset'], capacity: 2, layout: 'row',
    }]),
    grid_data: JSON.stringify([{
      id: 'g1', label: 'Kampffeld', type: 'square',
      origin: { x: 100, y: 100 }, cell: 40, cols: 10, rows: 10,
      labels: { cols: 'alpha', rows: 'numeric' },
    }]),
    scenario_data: JSON.stringify({
      gridLabel: 'Kampffeld',
      bosses: { Klaus: { terrain: [{ assetName: 'Holzzaun', cells: ['C7', 'D7', 'H9:K9'] }] } },
    }),
    sequence_data: JSON.stringify([
      { type: 'place_asset', assetName: 'Boesewicht: Klaus', targetZoneLabel: 'Leiste', faceDown: true },
      { type: 'reveal_next', zoneLabel: 'Leiste' },
      { type: 'build_scenario', final: 'auto' },
    ]),
  });

  const { room_code, started } = await startRoom(gameId, setupId);
  assert.equal(started.statusCode, 200, started.body, 'der Raum startet trotzdem');
  const tiles = getRoom(room_code).boardState.tokens.filter(t => t.label === 'Holzzaun');
  assert.equal(tiles.length, 0, 'kein einziges Objekt gelegt – auch im Raum gilt „erst pruefen, dann legen"');
});

// ── M8.11/E5: der Raum baut den Dauerstapel aus mehreren Kategorien ──────────
//
// Es gibt genau einen Executor, und die Mehr-Kategorien-Logik steckt in ihm.
// Geprueft wird hier trotzdem der Weg: der Raum liest die Kartenbibliothek
// ueber eigenes SQL (Kategorie als *Name* je Zeile), und ohne diesen Namen
// waere die Liste im Schritt unadressierbar.

/** Eine Kartenkategorie mit n Karten direkt in die DB. */
function addCards(gameId, categoryName, prefix, n) {
  const catId = randomUUID();
  getDb().prepare('INSERT INTO categories (id, game_id, name) VALUES (?, ?, ?)')
    .run(catId, gameId, categoryName);
  for (let i = 0; i < n; i++) {
    getDb().prepare(
      'INSERT INTO cards (id, game_id, category_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(randomUUID(), gameId, catId, `${prefix}${i + 1}`, `/uploads/${prefix}${i}.png`, 300, 420);
  }
}

test('ein place_stack mit zwei Kategorien baut den Stapel auch im Raum', async () => {
  const gameId = await createGame();
  addCards(gameId, 'Dorf-Ereignisse', 'h', 3);
  addCards(gameId, 'Dorf-Ereignisse (Üble Nachbarn)', 'n', 2);

  const setupId = await createSetup(gameId, {
    state_data: JSON.stringify({ cards: [], stacks: [], tokens: [], boards: [], counters: [] }),
    sequence_data: JSON.stringify([{
      type: 'place_stack',
      category: ['Dorf-Ereignisse', 'Dorf-Ereignisse (Üble Nachbarn)', 'Gibt es nicht'],
      label: 'Dorf-Ereignisse',
      x: 100, y: 200, faceDown: true,
    }]),
  });

  const { room_code, started } = await startRoom(gameId, setupId);
  assert.equal(started.statusCode, 200, started.body);

  const stacks = getRoom(room_code).boardState.stacks;
  assert.equal(stacks.length, 1);
  assert.equal(stacks[0].label, 'Dorf-Ereignisse');
  assert.equal(stacks[0].cards.length, 5, 'beide Kategorien, die dritte ist leer und kein Abbruch');
  assert.ok(stacks[0].cards.every(c => c.faceDown), 'ein Nachziehstapel liegt verdeckt');
});
