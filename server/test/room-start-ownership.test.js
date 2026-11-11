// FN / Spec M32.3, M32.7 – der Raumstart: genau `S` Spieler, die Zuordnung, die Zonenkopie.
//
// `POST /api/rooms/:code/start` bindet **nach** dem Aufbau die Hand-Zonen (`platz`) an ihre Eigentümer
// (`lageOf` → `ownersOfPlayers` → `bindZones`) – auf der **Kopie** des Raums, nie in `zone_data`. Eine falsche
// Spielerzahl ist ein 409 **vor** dem `active`. Solo, ein Aufbau ohne Lage und Daten ohne `platz` bleiben,
// wie sie sind (M32.7): Code vor Daten ist folgenlos.
//
// Setup: dieselben Optionen wie `room-lage.test.js`, vier Dörfler, und die Hand-Zonen aus der echten Fixture
// (`auslagen-kurzpartie.json`, mit EU und FF angewendet), `platz` 1 … 5 vom Test gesetzt.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { WebSocket } from 'ws';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

const { buildApp } = await import('../src/index.js');
const { getDb, closeDatabase } = await import('../src/database.js');
const { getRoom } = await import('../src/roomStore.js');
const { setupWebSocketServer, closeWebSocketServer, WS_SUBPROTOCOL } = await import('../src/websocket/roomWs.js');
const { authHeaders } = await import('./helpers.js');
const dz = await import('../../scripts/doerflerzahl-daten.mjs');

const logLines = [];
let app;
let headers;
let token;
let port;
const sockets = [];

before(async () => {
  app = await buildApp({ logger: { level: 'warn', stream: { write: (s) => logLines.push(JSON.parse(s)) } } });
  await app.listen({ port: 0, host: '127.0.0.1' });
  setupWebSocketServer(app.server);
  port = app.server.address().port;
  headers = authHeaders();
  token = headers.authorization.slice(7);
});

after(async () => {
  for (const ws of sockets) ws.terminate();
  closeWebSocketServer();
  if (app) await app.close();
  closeDatabase();
  rmSync(TMP, { recursive: true, force: true });
});

// ── Fixture ──────────────────────────────────────────────────────────────────

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const FF = dz.patchHaende(dz.patchZonen(lies('auslagen-kurzpartie.json').zones).zone).zone;
const OHNE_PLATZ = FF;
const MIT_PLATZ = FF.map(z => (/^zhand(\d)$/.test(z.id) ? { ...z, platz: Number(z.id.slice(5)) } : z));

const NAMES = ['keiner', 'Henlo', 'Granny', 'Judy', 'Fridgette'];
const choicesOf = (names) => Object.fromEntries(names.map(n => [n, { label: n }]));
const seat = (def, on) => ({
  label: 'Dörfler', default: def, choices: choicesOf(NAMES),
  ...(on ? { optional: { off: 'keiner', on, addLabel: 'Dörfler dazu' } } : {}),
});
const OPTIONS = {
  spieler: { label: 'Spieler', default: 's1', choices: Object.fromEntries([1, 2, 3, 4].map(n => [`s${n}`, { label: String(n) }])) },
  doerfler1: seat('Henlo'),
  doerfler2: seat('Granny'),
  doerfler3: seat('keiner', 'Judy'),
  doerfler4: seat('keiner', 'Fridgette'),
};
const LAGE = { players: 'spieler', seats: ['doerfler1', 'doerfler2', 'doerfler3', 'doerfler4'] };
const VIER = { doerfler3: 'Judy', doerfler4: 'Fridgette' };
const SEQUENCE = [{ type: 'place_counter', name: 'Probe', value: 1, x: 40, y: 50 }];

async function createGame() {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'FN' } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

async function createSetup(gameId, { zones = MIT_PLATZ, scenario = { options: OPTIONS, villagers: { lage: LAGE } } } = {}) {
  const res = await app.inject({
    method: 'POST', url: `/api/games/${gameId}/setups`, headers,
    payload: {
      name: 'Aufbau', state_data: JSON.stringify({ stacks: [], cards: [], tokens: [], counters: [] }),
      sequence_data: JSON.stringify(SEQUENCE), scenario_data: JSON.stringify(scenario), zone_data: JSON.stringify(zones),
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

const FARBEN = ['red', 'blue', 'green', 'purple', 'orange', 'yellow'];

/** Ein wartender Raum: der Host legt ihn an, `gaeste` Spieler treten bei. */
async function wartenderRaum(setupId, gameId, choices, gaeste = 1) {
  const created = await app.inject({
    method: 'POST', url: '/api/rooms', headers,
    payload: { game_id: gameId, display_name: 'Host', color: FARBEN[0], setup_id: setupId, setup_choices: choices },
  });
  assert.equal(created.statusCode, 201, created.body);
  const { room_code, player_id } = created.json();
  const spieler = [{ id: player_id, color: FARBEN[0] }];
  for (let i = 1; i <= gaeste; i++) {
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${room_code}/join`, headers, payload: { display_name: `Gast${i}`, color: FARBEN[i] } });
    assert.equal(res.statusCode, 201, res.body);
    spieler.push({ id: res.json().player_id, color: FARBEN[i] });
  }
  return { code: room_code, host: spieler[0], spieler };
}

const start = (code, player_id) => app.inject({ method: 'POST', url: `/api/rooms/${code}/start`, headers, payload: { player_id } });
const dbStatus = (code) => getDb().prepare('SELECT status FROM game_rooms WHERE room_code = ?').get(code).status;
const zoneData = (setupId) => getDb().prepare('SELECT zone_data FROM setups WHERE id = ?').get(setupId).zone_data;
const sha = (text) => createHash('sha256').update(text).digest('hex');
const plain = (x) => JSON.parse(JSON.stringify(x));

/** Eine echte Verbindung; sammelt alles, was ankommt. */
function open(code, playerId) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/rooms/${code}?player_id=${playerId}`, [WS_SUBPROTOCOL, token]);
  sockets.push(ws);
  const msgs = [];
  const waiters = [];
  ws.on('message', (data) => {
    const m = JSON.parse(data.toString());
    msgs.push(m);
    for (const w of [...waiters]) if (w.type === m.type) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); }
  });
  const next = (type) => {
    const had = msgs.find(m => m.type === type);
    if (had) return Promise.resolve(had);
    return new Promise((resolve) => waiters.push({ type, resolve }));
  };
  return { ws, msgs, next };
}

// ── 1. Zuordnung: die Zonenkopie des Raums ──────────────────────────────────

test('FN 1: s2 mit vier Dörflern, zwei Spieler – Hand 1/2 in der Farbe des Hosts, 3/4 in der des Gastes, alle exclusive; zone_data bleibt', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId);
  const vorher = zoneData(setupId);
  const { code, host, spieler } = await wartenderRaum(setupId, gameId, { spieler: 's2', ...VIER });
  const gast = spieler[1];

  const res = await start(code, host.id);
  assert.equal(res.statusCode, 200, res.body);

  const zonen = getRoom(code).zones;
  const hand = (n) => zonen.find(z => z.id === `zhand${n}`);
  assert.deepEqual([1, 2].map(n => [hand(n).color, hand(n).exclusive]), [[host.color, true], [host.color, true]]);
  assert.deepEqual([3, 4].map(n => [hand(n).color, hand(n).exclusive]), [[gast.color, true], [gast.color, true]]);

  // sonst Zeichen für Zeichen gleich: Platz 5 > D bleibt unberührt, jede andere Zone ist unverändert
  const original = JSON.parse(vorher);
  assert.equal(zonen.length, original.length);
  zonen.forEach((z, i) => {
    const o = original[i];
    const gebunden = /^zhand[1-4]$/.test(o.id);
    assert.deepEqual(z, gebunden ? { ...o, color: z.color, exclusive: true } : o, `Zone ${o.id}`);
  });
  assert.equal(hand(5).color ?? null, original.find(z => z.id === 'zhand5').color ?? null, 'Platz 5 (kein Dörfler) bleibt ungebunden');
  assert.equal(hand(5).exclusive, false);

  assert.equal(sha(zoneData(setupId)), sha(vorher), 'setups.zone_data in der Datenbank bytegleich');
});

// ── 2. Falsche Zahl ──────────────────────────────────────────────────────────

test('FN 2: ein Spieler bei s2 → 409 (deutsch, beide Zahlen), nichts startet; drei Spieler → 409', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId);

  const ein = await wartenderRaum(setupId, gameId, { spieler: 's2', ...VIER }, 0);
  const res = await start(ein.code, ein.host.id);
  assert.equal(res.statusCode, 409, res.body);
  assert.match(res.json().error, /braucht genau 2 Spieler, im Raum ist erst 1 Spieler\./);
  assert.equal(dbStatus(ein.code), 'waiting', 'in der Datenbank');
  const live = getRoom(ein.code);
  assert.equal(live.status, 'waiting', 'im Live-Raum');
  assert.equal(live.boardState.counters.length, 0, 'der Tisch bleibt leer – kein Raum mit leerem Tisch');
  assert.deepEqual(live.zones, [], 'nichts gebunden');

  const drei = await wartenderRaum(setupId, gameId, { spieler: 's2', ...VIER }, 2);
  const res3 = await start(drei.code, drei.host.id);
  assert.equal(res3.statusCode, 409, res3.body);
  assert.match(res3.json().error, /braucht genau 2 Spieler, im Raum sind 3 Spieler\./);
  assert.equal(dbStatus(drei.code), 'waiting');

  // mit genau zwei Spielern geht derselbe Aufbau
  const zwei = await wartenderRaum(setupId, gameId, { spieler: 's2', ...VIER }, 1);
  assert.equal((await start(zwei.code, zwei.host.id)).statusCode, 200);
});

// ── 3. Solo, ohne Lage, ohne platz: nichts gebunden ─────────────────────────

test('FN 3: solo (Vorgabe s1) mit zwei Spielern → 200, Zonen deepEqual zone_data, room_started wie heute', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId);
  const { code, host, spieler } = await wartenderRaum(setupId, gameId, undefined, 1);
  const verbindungen = spieler.map(p => open(code, p.id));
  await Promise.all(verbindungen.map(v => v.next('welcome')));

  assert.equal((await start(code, host.id)).statusCode, 200);
  const live = getRoom(code);
  assert.deepEqual(live.zones, JSON.parse(zoneData(setupId)), 'nichts gebunden');
  assert.equal(live.zones.some(z => z.exclusive && z.color), false);

  const erwartet = { type: 'room_started', board_state: plain(live.boardState), zones: JSON.parse(zoneData(setupId)), grids: [] };
  for (const v of verbindungen) assert.deepEqual(await v.next('room_started'), erwartet);
});

test('FN 3: ein Aufbau ohne villagers.lage und Daten ohne platz – 200, nichts gebunden (Warnung im Log)', async () => {
  const gameId = await createGame();

  // ohne Lage: s2 gilt nicht, es gibt keine Lage → Start mit einem Spieler geht, nichts gebunden
  const ohneLage = await createSetup(gameId, { scenario: { options: OPTIONS } });
  const a = await wartenderRaum(ohneLage, gameId, { spieler: 's2', ...VIER }, 0);
  assert.equal((await start(a.code, a.host.id)).statusCode, 200);
  assert.deepEqual(getRoom(a.code).zones, JSON.parse(zoneData(ohneLage)));

  // Lage mehrfach, aber die Daten tragen kein `platz`: der Raum startet trotzdem, jeder Platz wird gemeldet
  const ohnePlatz = await createSetup(gameId, { zones: OHNE_PLATZ });
  const b = await wartenderRaum(ohnePlatz, gameId, { spieler: 's2', ...VIER }, 1);
  logLines.length = 0;
  const res = await start(b.code, b.host.id);
  assert.equal(res.statusCode, 200, res.body);
  assert.deepEqual(getRoom(b.code).zones, JSON.parse(zoneData(ohnePlatz)), 'nichts gebunden');
  const warnungen = logLines.filter(l => l.level === 40 && /keine Hand-Zone mit `platz`/.test(`${l.msg}`)).map(l => l.msg);
  assert.deepEqual(warnungen.map(w => w.match(/Platz \d/)[0]), ['Platz 1', 'Platz 2', 'Platz 3', 'Platz 4']);
});

// ── 4. welcome und room_started ─────────────────────────────────────────────

test('FN 4: room_started und welcome tragen die gebundenen Zonen; der Zustand ist für beide derselbe (Stufe A, kein Filter)', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId);
  const { code, host, spieler } = await wartenderRaum(setupId, gameId, { spieler: 's2', ...VIER }, 1);
  const verbindungen = spieler.map(p => open(code, p.id));
  await Promise.all(verbindungen.map(v => v.next('welcome')));

  assert.equal((await start(code, host.id)).statusCode, 200);
  const live = getRoom(code);
  const gestartet = await Promise.all(verbindungen.map(v => v.next('room_started')));
  for (const m of gestartet) assert.deepEqual(m.zones, plain(live.zones), 'room_started trägt die gebundenen Zonen');
  assert.deepEqual(gestartet[0].zones.filter(z => z.exclusive).map(z => [z.id, z.color]),
    [['zhand1', spieler[0].color], ['zhand2', spieler[0].color], ['zhand3', spieler[1].color], ['zhand4', spieler[1].color]]);
  assert.deepEqual(gestartet[0].board_state, gestartet[1].board_state, 'kein Filter: derselbe Zustand');
  assert.deepEqual(gestartet[0], gestartet[1]);

  // Wiederverbinden des Gastes: das welcome trägt dieselben Zonen und denselben Zustand
  verbindungen[1].ws.close();
  const neu = open(code, spieler[1].id);
  const welcome = await neu.next('welcome');
  assert.deepEqual(welcome.zones, plain(live.zones));
  assert.deepEqual(welcome.board_state, gestartet[0].board_state);
});

// ── 5. dealStartingHands ────────────────────────────────────────────────────

test('FN 5: dealStartingHands tut an den gebundenen Zonen nichts – kein draw_response, handCardCount 0', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId);
  const { code, host, spieler } = await wartenderRaum(setupId, gameId, { spieler: 's2', ...VIER }, 1);
  const verbindungen = spieler.map(p => open(code, p.id));
  await Promise.all(verbindungen.map(v => v.next('welcome')));

  assert.equal((await start(code, host.id)).statusCode, 200);
  await Promise.all(verbindungen.map(v => v.next('room_started')));

  for (const v of verbindungen) assert.equal(v.msgs.some(m => m.type === 'draw_response'), false);
  for (const p of getRoom(code).players.values()) assert.equal(p.handCardCount, 0);
});

// ── 6. GET /api/rooms/:code ─────────────────────────────────────────────────

const get = (code) => app.inject({ method: 'GET', url: `/api/rooms/${code}`, headers });

test('FN 6: GET trägt lage { players, villagers, kind } und plaetze [{ platz, rang }]', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId);

  const mehr = await wartenderRaum(setupId, gameId, { spieler: 's2', ...VIER }, 1);
  const body = (await get(mehr.code)).json();
  assert.deepEqual(body.lage, { players: 2, villagers: 4, kind: 'mehrfach' });
  assert.deepEqual(body.plaetze, [{ platz: 1, rang: 1 }, { platz: 2, rang: 1 }, { platz: 3, rang: 2 }, { platz: 4, rang: 2 }]);

  const normal = await wartenderRaum(setupId, gameId, { spieler: 's4', ...VIER }, 3);
  const n = (await get(normal.code)).json();
  assert.equal(n.lage.kind, 'normal');
  assert.deepEqual(n.plaetze.map(p => p.rang), [1, 2, 3, 4]);

  // solo: eine Lage, aber kein Eigentum
  const solo = (await get((await wartenderRaum(setupId, gameId, undefined, 1)).code)).json();
  assert.deepEqual(solo.lage, { players: 1, villagers: 2, kind: 'solo' });
  assert.equal(solo.plaetze, null);
});

test('FN 6: ohne Lage `null`, der Rest der Antwort bleibt – gleiche Schlüssel und Werte wie heute', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId, { scenario: { options: OPTIONS } });
  const { code, host } = await wartenderRaum(setupId, gameId, undefined, 0);
  const body = (await get(code)).json();

  assert.equal(body.lage, null);
  assert.equal(body.plaetze, null);
  const { lage, plaetze, ...rest } = body;
  assert.deepEqual(Object.keys(rest), ['room_code', 'room_id', 'game_id', 'host_player_id', 'status', 'setup_id', 'setup_choices', 'setup_choices_label', 'players']);
  assert.equal(rest.host_player_id, host.id);
  assert.equal(rest.status, 'waiting');

  // und ein Raum ganz ohne Aufbau
  const created = await app.inject({ method: 'POST', url: '/api/rooms', headers, payload: { game_id: gameId, display_name: 'Host', color: 'red' } });
  const roh = (await get(created.json().room_code)).json();
  assert.equal(roh.lage, null);
  assert.equal(roh.plaetze, null);
});
