// FU 8 und 9 / Spec M32.6 – die private Hand am echten Raumstart: `welcome.hand` und `dealStartingHands`.
//
// 8: das `welcome` trägt die **eigene** Hand und nur sie; nach Schließen und Neuverbinden ist sie dieselbe; ein Spieler ohne
//    Karten bekommt `hand: []` (das trägt „überlebt Neuladen und Wiederverbinden").
// 9: `dealStartingHands` legt seine Karten in die Hand (`room.hands`), `handCardCount` stimmt, ein späteres
//    `hand_count_update` überschreibt es nicht.
//
// Die Räume hier haben keine Wahl und keine Lage – die Hand gilt in **jedem** Raum (M32.7 Nr. 8).
// Die Hand-Wege selbst (Ziehen, Ausspielen, Aufnehmen) prüft `room-hand.test.js` mit gefälschten Verbindungen.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { WebSocket } from 'ws';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

const { buildApp } = await import('../src/index.js');
const { getDb, closeDatabase } = await import('../src/database.js');
const { getRoom } = await import('../src/roomStore.js');
const { setupWebSocketServer, closeWebSocketServer, WS_SUBPROTOCOL } = await import('../src/websocket/roomWs.js');
const { authHeaders } = await import('./helpers.js');

let app;
let headers;
let token;
let port;
const sockets = [];

before(async () => {
  app = await buildApp({ logger: false });
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

// ── Gestell ──────────────────────────────────────────────────────────────────

const eineKarte = (n) => ({
  tableId: `t${n}`, cardId: `c${n}`, name: `Geheimname ${n}`, image_path: `/uploads/geheim${n}.png`,
  card_back_id: null, width: 100, height: 150, zIndex: n, faceDown: true, rotation: 0,
});
const STAPEL = { stackId: 'deal', label: 'Dorf', x: 300, y: 300, cards: [1, 2, 3, 4, 5].map(eineKarte) };
const HAND_ROT = {
  id: 'hand-rot', label: 'Hand', shape: 'rect', type: 'player', color: 'red', accepts: ['card'],
  x: 700, y: 700, width: 300, height: 150, dealStackId: 'deal', dealCount: 2, startingHandCardIds: [],
};

async function createGame() {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'FU' } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

async function createSetup(gameId, { zones = [], stacks = [STAPEL] } = {}) {
  const res = await app.inject({
    method: 'POST', url: `/api/games/${gameId}/setups`, headers,
    payload: {
      name: 'Aufbau', state_data: JSON.stringify({ stacks, cards: [], tokens: [], counters: [] }),
      sequence_data: '[]', scenario_data: '{}', zone_data: JSON.stringify(zones),
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

/** Ein Raum mit Host (rot) und Gast (blau), gestartet; beide sind verbunden. */
async function laufenderRaum(setupId, gameId) {
  const created = await app.inject({
    method: 'POST', url: '/api/rooms', headers,
    payload: { game_id: gameId, display_name: 'Host', color: 'red', setup_id: setupId },
  });
  assert.equal(created.statusCode, 201, created.body);
  const { room_code: code, player_id: hostId } = created.json();
  const joined = await app.inject({ method: 'POST', url: `/api/rooms/${code}/join`, headers, payload: { display_name: 'Gast', color: 'blue' } });
  assert.equal(joined.statusCode, 201, joined.body);
  const gastId = joined.json().player_id;

  const host = open(code, hostId);
  const gast = open(code, gastId);
  await Promise.all([host.next('welcome'), gast.next('welcome')]);
  const res = await app.inject({ method: 'POST', url: `/api/rooms/${code}/start`, headers, payload: { player_id: hostId } });
  assert.equal(res.statusCode, 200, res.body);
  await Promise.all([host.next('room_started'), gast.next('room_started')]);
  return { code, hostId, gastId, host, gast };
}

/** Eine echte Verbindung; sammelt alles, was ankommt. */
function open(code, playerId) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/rooms/${code}?player_id=${playerId}`, [WS_SUBPROTOCOL, token]);
  sockets.push(ws);
  const msgs = [];
  const waiters = [];
  ws.on('message', (data) => {
    const m = JSON.parse(data.toString());
    msgs.push(m);
    for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); }
  });
  const waitFor = (pred) => {
    const had = msgs.find(pred);
    if (had) return Promise.resolve(had);
    return new Promise((resolve) => waiters.push({ pred, resolve }));
  };
  const next = (type) => waitFor(m => m.type === type);
  const send = (msg) => ws.send(JSON.stringify(msg));
  const closed = () => new Promise((resolve) => (ws.readyState === WebSocket.CLOSED ? resolve() : ws.once('close', resolve)));
  return { ws, msgs, next, waitFor, send, closed };
}

/** Ein kleiner Taktschlag, damit Nachrichten, die nicht kommen sollen, Zeit hatten zu kommen. */
const tick = () => new Promise(r => setTimeout(r, 60));

// ── 8. welcome.hand ──────────────────────────────────────────────────────────

test('FU 8: welcome.hand ist die eigene Hand – nach Schließen und Neuverbinden dieselbe; der Gast sieht die des Hosts nirgends; ohne Karten []', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId);
  const { code, hostId, gastId, host, gast } = await laufenderRaum(setupId, gameId);

  assert.deepEqual(host.msgs.find(m => m.type === 'welcome').hand, [], 'ein Spieler ohne Karten bekommt hand: []');
  assert.deepEqual(gast.msgs.find(m => m.type === 'welcome').hand, []);

  host.send({ type: 'card_draw_to_hand', stack_id: 'deal', count: 2 });
  const antwort = await host.next('draw_response');
  assert.equal(antwort.cards.length, 2);
  await gast.waitFor(m => m.type === 'player_hand_count' && m.count === 2);

  // Neuladen: der Host schließt und verbindet neu (useGameRoom tut es bei jedem Abbruch)
  host.ws.close();
  await host.closed();
  const neu = open(code, hostId);
  const welcome = await neu.next('welcome');
  assert.deepEqual(welcome.hand, antwort.cards, 'dieselben Karten mit denselben handIds, in derselben Reihenfolge');
  assert.ok(welcome.hand.every(c => c.handId && c.name && c.image_path));
  assert.equal(welcome.players.find(p => p.id === hostId).handCardCount, 2);
  assert.equal(welcome.board_state.stacks.find(s => s.stackId === 'deal').cards.length, 3, 'der Tisch hat den Stapel um zwei kleiner');

  // der Gast verbindet neu: seine Hand ist leer, und nirgends steht die des Hosts
  gast.ws.close();
  await gast.closed();
  const gastNeu = open(code, gastId);
  const gastWelcome = await gastNeu.next('welcome');
  assert.deepEqual(gastWelcome.hand, []);
  const json = JSON.stringify(gastWelcome);
  for (const wort of ['Geheimname 4', 'Geheimname 5', antwort.cards[0].handId]) assert.equal(json.includes(wort), false, `„${wort}“ steht nicht im welcome des Gastes`);
  const seitdemGezogen = gast.msgs.slice(gast.msgs.findIndex(m => m.type === 'player_hand_count'));
  assert.equal(JSON.stringify(seitdemGezogen).includes('Geheimname 4'), false, 'und in keiner Nachricht, die der Gast seit dem Ziehen bekam');
});

// ── 9. dealStartingHands ─────────────────────────────────────────────────────

test('FU 9: dealStartingHands legt die Starthand in die Hand (room.hands) – draw_response nur an den Eigentümer, Zähler stimmt, hand_count_update überschreibt es nicht', async () => {
  const gameId = await createGame();
  const bibliothek = getDb().prepare('INSERT INTO cards (id, game_id, name, image_path, width, height) VALUES (?, ?, ?, ?, 744, 1039)');
  bibliothek.run('lib1', gameId, 'Startkarte', '/uploads/start.png');
  const setupId = await createSetup(gameId, { zones: [{ ...HAND_ROT, startingHandCardIds: ['lib1'] }] });
  const { code, hostId, host, gast } = await laufenderRaum(setupId, gameId);
  await tick();

  const live = getRoom(code);
  const hand = live.hands.get(hostId);
  assert.equal(hand.length, 3, 'zwei vom Stapel und die Startkarte aus der Bibliothek');
  assert.ok(hand.every(c => typeof c.handId === 'string' && c.handId));
  assert.deepEqual(hand.slice(0, 2).map(c => c.tableId), ['t4', 't5']);
  assert.equal(hand[2].name, 'Startkarte');
  assert.equal(hand[2].cardId, 'lib1', 'cardId, wie handFromServer es liest');
  assert.equal(live.players.get(hostId).handCardCount, 3);
  assert.equal(live.boardState.stacks.find(s => s.stackId === 'deal').cards.length, 3, 'der Stapel ist kleiner');

  const dealt = host.msgs.filter(m => m.type === 'draw_response').flatMap(m => m.cards);
  assert.deepEqual(dealt.map(c => c.handId), hand.map(c => c.handId));
  assert.equal(gast.msgs.some(m => m.type === 'draw_response'), false, 'der Gast bekommt keine Karte');
  const beimGast = JSON.stringify(gast.msgs);
  for (const wort of ['Geheimname 4', 'Geheimname 5', 'Startkarte']) assert.equal(beimGast.includes(wort), false, `„${wort}“ kommt beim Gast nicht an (der Stapel im Tisch ist schon kleiner)`);
  assert.ok(gast.msgs.some(m => m.type === 'player_hand_count' && m.player_id === hostId && m.count === 3), 'alle sehen die Zahl');

  host.send({ type: 'hand_count_update', count: 0 });
  await tick();
  assert.equal(live.players.get(hostId).handCardCount, 3, 'ein späteres hand_count_update überschreibt es nicht');
  assert.equal(live.hands.get(hostId).length, 3);
});

test('FU 9: ein Raum ohne Starthand (Zonen ohne dealStackId) bleibt, wie er ist – kein draw_response, Hand leer', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId, { zones: [{ ...HAND_ROT, dealStackId: null, dealCount: 0 }] });
  const { code, hostId, host, gast } = await laufenderRaum(setupId, gameId);
  await tick();
  for (const v of [host, gast]) assert.equal(v.msgs.some(m => m.type === 'draw_response' || m.type === 'player_hand_count'), false);
  assert.equal((getRoom(code).hands.get(hostId) ?? []).length, 0);
  assert.equal(getRoom(code).players.get(hostId).handCardCount, 0);
});
