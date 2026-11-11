// Der Server weist eine unzulässige Lage beim Anlegen eines Raums ab (M31.15, Aufgabe FC).
//
// `POST /api/rooms` fragt `lageOf` neben `resolveChoices`: mit `S > D` gibt es 4xx mit dem
// Problem im Text und **keinen** Raum. Der Weg „Raum starten" ist nicht doppelt gesichert; was
// dort passiert, wenn der Executor hält, steht als Messung im letzten Test.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

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

const NAMES = ['keiner', 'Henlo', 'Granny', 'Judy'];
const choicesOf = (names) => Object.fromEntries(names.map(n => [n, { label: n }]));
const seat = (def, on) => ({
  label: 'Dörfler', default: def, choices: choicesOf(NAMES),
  ...(on ? { optional: { off: 'keiner', on, addLabel: 'Dörfler dazu' } } : {}),
});
const OPTIONS = {
  spieler: { label: 'Spieler', default: 's1', choices: Object.fromEntries([1, 2, 3].map(n => [`s${n}`, { label: String(n) }])) },
  doerfler1: seat('Henlo'),
  doerfler2: seat('Granny'),
  doerfler3: seat('keiner', 'Judy'),
};
const LAGE = { players: 'spieler', seats: ['doerfler1', 'doerfler2', 'doerfler3'] };
const SEQUENCE = [{ type: 'place_counter', name: 'Probe', value: 1, x: 40, y: 50 }];

async function createGame() {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'FC' } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

async function createSetup(gameId, scenario) {
  const res = await app.inject({
    method: 'POST', url: `/api/games/${gameId}/setups`, headers,
    payload: {
      name: 'Aufbau', state_data: JSON.stringify({ stacks: [], cards: [], tokens: [], counters: [] }),
      sequence_data: JSON.stringify(SEQUENCE), scenario_data: JSON.stringify(scenario),
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

const mitLage = (gameId) => createSetup(gameId, { options: OPTIONS, villagers: { lage: LAGE } });
const ohneLage = (gameId) => createSetup(gameId, { options: OPTIONS });

const createRoom = (gameId, setupId, setup_choices) => app.inject({
  method: 'POST', url: '/api/rooms', headers,
  payload: { game_id: gameId, display_name: 'Host', color: 'red', setup_id: setupId, setup_choices },
});
const count = (table) => getDb().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

const UNZULAESSIG = { spieler: 's3', doerfler3: 'keiner' };   // drei Spieler, zwei Dörfler

test('FC: eine unzulässige Lage (S > D) wird abgewiesen, mit dem Problem im Text, ohne Raum', async () => {
  const gameId = await createGame();
  const setupId = await mitLage(gameId);
  const rooms = count('game_rooms');
  const players = count('room_players');

  const res = await createRoom(gameId, setupId, UNZULAESSIG);
  assert.ok(res.statusCode >= 400 && res.statusCode < 500, `4xx erwartet, war ${res.statusCode}`);
  const error = res.json().error;
  assert.match(error, /Ungültige Wahl für diesen Aufbau/, 'dieselbe Form wie die vorhandene Abweisung');
  assert.match(error, /3 Spieler, aber nur 2 Dörfler/);

  assert.equal(count('game_rooms'), rooms, 'kein Raum angelegt');
  assert.equal(count('room_players'), players, 'kein Spieler angelegt');
});

test('FC: mit zulässiger Wahl wird der Raum angelegt und die Wahl aufgelöst gespeichert, wie heute', async () => {
  const gameId = await createGame();
  const setupId = await mitLage(gameId);
  const res = await createRoom(gameId, setupId, { spieler: 's2' });
  assert.equal(res.statusCode, 201, res.body);
  const row = getDb().prepare('SELECT setup_choices FROM game_rooms WHERE room_code = ?').get(res.json().room_code);
  assert.equal(JSON.parse(row.setup_choices).spieler, 's2');

  // auch ohne Wahl: die Vorgabe (solo) ist eine Lage
  assert.equal((await createRoom(gameId, setupId)).statusCode, 201);
  // und drei Spieler mit drei Dörflern
  assert.equal((await createRoom(gameId, setupId, { spieler: 's3', doerfler3: 'Judy' })).statusCode, 201);
});

test('FC: ohne villagers.lage wird nichts geprüft - dieselbe Wahl legt den Raum an', async () => {
  const gameId = await createGame();
  const res = await createRoom(gameId, await ohneLage(gameId), UNZULAESSIG);
  assert.equal(res.statusCode, 201, res.body);
});

test('FC: ein Aufbau ohne Optionen und der Raum ohne Aufbau ändern sich nicht', async () => {
  const gameId = await createGame();
  const keine = await createSetup(gameId, {});
  assert.equal((await createRoom(gameId, keine)).statusCode, 201);
  assert.equal((await createRoom(gameId, undefined)).statusCode, 201);
});

// ── „Raum starten": die Lage gilt noch? ─────────────────────────────────────
//
// Der Raum wird mit zulässiger Wahl angelegt, danach ändern sich die Daten so, dass `lageOf` ein
// Problem meldet (`lage.players` nennt eine Option, die es nicht gibt), `resolveChoices` aber
// nichts sieht. Wie bei der Wahl selbst startet der Raum dann gar nicht (409), statt auf `active`
// zu gehen und einen leeren Tisch zu zeigen - gemessen vor FC: 200, `active`, leerer Tisch.

const start = (room_code, player_id) => app.inject({ method: 'POST', url: `/api/rooms/${room_code}/start`, headers, payload: { player_id } });
const dbStatus = (room_code) => getDb().prepare('SELECT status FROM game_rooms WHERE room_code = ?').get(room_code).status;
const setScenario = (setupId, scenario) => getDb().prepare('UPDATE setups SET scenario_data = ? WHERE id = ?').run(JSON.stringify(scenario), setupId);

test('FC: „Raum starten" weist ab (409), wenn die Lage nach dem Anlegen ungültig wurde - nichts startet', async () => {
  const gameId = await createGame();
  const setupId = await mitLage(gameId);
  const created = await createRoom(gameId, setupId, { spieler: 's2' });
  assert.equal(created.statusCode, 201, created.body);
  const { room_code, player_id } = created.json();

  setScenario(setupId, { options: OPTIONS, villagers: { lage: { players: 'mitspieler', seats: LAGE.seats } } });

  const res = await start(room_code, player_id);
  assert.equal(res.statusCode, 409, res.body);
  assert.match(res.json().error, /Die Wahl für diesen Aufbau gilt nicht mehr/, 'dieselbe Form wie bei resolveChoices');
  assert.match(res.json().error, /mitspieler/);

  assert.equal(dbStatus(room_code), 'waiting', 'in der Datenbank');
  const live = getRoom(room_code);
  assert.equal(live.status, 'waiting', 'im Live-Raum');
  assert.equal(live.boardState?.counters?.length ?? 0, 0, 'der Tisch bleibt leer');
});

test('FC: ein Start mit zulässiger Wahl gibt weiter 200 und baut', async () => {
  const gameId = await createGame();
  const created = await createRoom(gameId, await mitLage(gameId), { spieler: 's2' });
  const { room_code, player_id } = created.json();
  // M32/FN: zwei Spieler brauchen zwei Spieler im Raum - der Gast tritt vor dem Start bei.
  const join = await app.inject({ method: 'POST', url: `/api/rooms/${room_code}/join`, headers, payload: { display_name: 'Gast', color: 'blue' } });
  assert.equal(join.statusCode, 201, join.body);

  const res = await start(room_code, player_id);
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(dbStatus(room_code), 'active');
  assert.deepEqual(getRoom(room_code).boardState.counters.map(c => c.name), ['Probe']);
});

test('FC: ein Raum ohne villagers.lage startet wie heute', async () => {
  const gameId = await createGame();
  const setupId = await ohneLage(gameId);
  const created = await createRoom(gameId, setupId, { spieler: 's3', doerfler3: 'Judy' });
  const { room_code, player_id } = created.json();

  const res = await start(room_code, player_id);
  assert.equal(res.statusCode, 200, res.body);
  assert.deepEqual(getRoom(room_code).boardState.counters.map(c => c.name), ['Probe']);
});

// ── dieselbe Figur zweimal bei mehreren Spielern (Auftraggeber, 2026-11-11) ─────────────────────

test('Doppelwahl: derselbe Dörfler auf zwei Plätzen bei zwei Spielern wird abgewiesen (400), ohne Raum - solo geht', async () => {
  const gameId = await createGame();
  const setupId = await mitLage(gameId);
  const rooms = count('game_rooms');

  const res = await createRoom(gameId, setupId, { spieler: 's2', doerfler1: 'Judy', doerfler2: 'Judy' });
  assert.equal(res.statusCode, 400, res.body);
  assert.match(res.json().error, /Ungültige Wahl für diesen Aufbau/);
  assert.match(res.json().error, /Judy ist doppelt gewählt/);
  assert.equal(count('game_rooms'), rooms, 'kein Raum angelegt');

  assert.equal((await createRoom(gameId, setupId, { spieler: 's1', doerfler1: 'Judy', doerfler2: 'Judy' })).statusCode, 201, 'solo bleibt wie M30.4');
});

test('Doppelwahl: „Raum starten" weist ab (409), wenn die Daten nach dem Anlegen eine Doppelwahl ergeben', async () => {
  const gameId = await createGame();
  const setupId = await mitLage(gameId);
  const created = await createRoom(gameId, setupId, { spieler: 's2' });
  assert.equal(created.statusCode, 201, created.body);
  const { room_code, player_id } = created.json();

  // der Raum trägt seine aufgelöste Wahl: Dörfler 2 wird Henlo, so wie Dörfler 1 - gültig für `resolveChoices`, eine Doppelwahl für `lageOf`
  getDb().prepare('UPDATE game_rooms SET setup_choices = ? WHERE room_code = ?').run(JSON.stringify({ spieler: 's2', doerfler1: 'Henlo', doerfler2: 'Henlo' }), room_code);
  const res = await start(room_code, player_id);
  assert.equal(res.statusCode, 409, res.body);
  assert.match(res.json().error, /Die Wahl für diesen Aufbau gilt nicht mehr/);
  assert.match(res.json().error, /Henlo ist doppelt gewählt/);
  assert.equal(dbStatus(room_code), 'waiting');
});
