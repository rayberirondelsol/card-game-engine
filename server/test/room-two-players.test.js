// FP / Spec M32.8, M32.12 – der Zwei-Spieler-Raum als Test: zwei echte Verbindungen.
//
// Die Kette **Anlegen → Beitreten → Starten → Zug** über die echten Wege (`POST /api/rooms`, `…/join`, `…/start`,
// `DELETE …/leave`) mit zwei `ws`-Clients auf einem Ephemeral-Port – die Handler-Tests (`ownership-handlers.test.js`,
// `room-hand.test.js`) laufen mit gefälschten Verbindungen. Setup: die Hand-Zonen aus der echten Fixture
// (`auslagen-kurzpartie.json`, EU + FF, `platz` 1 … 5 vom Test gesetzt), `spieler s2`, vier Dörfler; ein Dorfereignis-Stapel,
// zwei Karten in Hand-Zonen, ein Tableau-Token, an dem die verankerte Hand 3 hängt.
//
// **Was dieser Test nicht abdeckt:** er läuft im selben Prozess (kein nginx, kein Cloudflare-Tunnel), sieht keinen Bildschirm
// (der Blick, der Ring, die Hinweise sind Client – `FQ`) und spielt kein Spiel (kein Kampf, keine Dorfphase, keine
// Aktionen: Räume führen keine). Die Entwicklerwerkzeuge dürfen die Karten lesen (Stufe A, entschieden): hier wird nur
// belegt, was an die Verbindung des **anderen** Spielers geht.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { WebSocket } from 'ws';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

const { buildApp } = await import('../src/index.js');
const { closeDatabase } = await import('../src/database.js');
const { getRoom } = await import('../src/roomStore.js');
const { setupWebSocketServer, closeWebSocketServer, WS_SUBPROTOCOL } = await import('../src/websocket/roomWs.js');
const { authHeaders } = await import('./helpers.js');
const { resolveServerZones } = await import('../../shared/ownership.js');
const dz = await import('../../scripts/doerflerzahl-daten.mjs');

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

// ── Fixture ──────────────────────────────────────────────────────────────────

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const FF = dz.patchHaende(dz.patchZonen(lies('auslagen-kurzpartie.json').zones).zone).zone;
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
const SCENARIO = { options: OPTIONS, villagers: { lage: { players: 'spieler', seats: ['doerfler1', 'doerfler2', 'doerfler3', 'doerfler4'] } } };
const VIER = { doerfler3: 'Judy', doerfler4: 'Fridgette' };

const TABLEAU3 = { id: 't3', assetId: 'bad13f49-c614-4551-9e81-fe8603dbf09a', x: 1460, y: 1600, width: 300, height: 400 };
const ZONEN = resolveServerZones({ tokens: [TABLEAU3], boards: [] }, MIT_PLATZ);
const mitte = (id) => {
  const z = ZONEN.find(x => x.id === id);
  return { x: z.x + z.width / 2, y: z.y + z.height / 2 };
};
const HAND1 = mitte('zhand1');   // Zone des Hosts (Platz 1 von 4, absolute Box)
const HAND2 = mitte('zhand2');   // Zone des Hosts (Platz 2)
const HAND3 = mitte('zhand3');   // Zone des Gastes (Platz 3), verankert am Tableau-Token
const FREI = { x: 5, y: 5 };     // in keiner Hand-Zone

const ereignis = (n) => ({
  tableId: `ev${n}`, cardId: `cev${n}`, name: `Ereignis ${n}`, image_path: `/uploads/ereignis${n}.png`,
  card_back_id: null, width: 100, height: 150, zIndex: n, faceDown: true, rotation: 0,
});
const EREIGNISSE = [1, 2, 3, 4, 5, 6].map(ereignis);
const STATE = {
  stacks: [{ stackId: 'dorfereignis', label: 'Dorfereignisse', x: 400, y: 400, cards: EREIGNISSE, card_ids: EREIGNISSE.map(c => c.cardId), table_ids: EREIGNISSE.map(c => c.tableId) }],
  cards: [
    { tableId: 'inhand1', ...HAND1, name: 'Karte in Hand 1', image_path: '/uploads/hand1.png', faceDown: true, rotation: 0, zIndex: 20 },
    { tableId: 'lose', ...FREI, name: 'Lose Karte', image_path: '/uploads/lose.png', faceDown: false, rotation: 0, zIndex: 21 },
  ],
  tokens: [TABLEAU3],
  counters: [],
};

const FARBEN = ['red', 'blue'];

async function createGame() {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'FP' } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

async function createSetup(gameId) {
  const res = await app.inject({
    method: 'POST', url: `/api/games/${gameId}/setups`, headers,
    payload: {
      name: 'Aufbau', state_data: JSON.stringify(STATE), sequence_data: '[]',
      scenario_data: JSON.stringify(SCENARIO), zone_data: JSON.stringify(MIT_PLATZ),
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

const tick = () => new Promise(r => setTimeout(r, 80));
const plain = (x) => JSON.parse(JSON.stringify(x));

/** Eine echte Verbindung; sammelt alles, was ankommt, und kann auf eine Nachricht **nach** einer Marke warten. */
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
  const waitFor = (pred, from = 0) => {
    const had = msgs.slice(from).find(pred);
    if (had) return Promise.resolve(had);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`keine Nachricht nach ${from}: ${JSON.stringify(msgs.slice(from).map(m => m.type))}`)), 4000);
      waiters.push({ pred, resolve: (m) => { clearTimeout(timer); resolve(m); } });
    });
  };
  const closed = () => new Promise((resolve) => (ws.readyState === WebSocket.CLOSED ? resolve() : ws.once('close', resolve)));
  return {
    ws, msgs, waitFor, closed,
    next: (type, from = 0) => waitFor(m => m.type === type, from),
    send: (msg) => ws.send(JSON.stringify(msg)),
    mark: () => msgs.length,
    since: (n) => msgs.slice(n),
  };
}

/** Anlegen → Beitreten → Verbinden → Starten, über die echten Wege. */
async function startedRoom(setupId, gameId, choices) {
  const created = await app.inject({
    method: 'POST', url: '/api/rooms', headers,
    payload: { game_id: gameId, display_name: 'Host', color: FARBEN[0], setup_id: setupId, setup_choices: choices },
  });
  assert.equal(created.statusCode, 201, created.body);
  const { room_code: code, player_id: hostId } = created.json();
  const joined = await app.inject({ method: 'POST', url: `/api/rooms/${code}/join`, headers, payload: { display_name: 'Gast', color: FARBEN[1] } });
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

/** Wartet auf den Zähler **dieses** Spielers (eine spätere Zahl eines anderen ist keine Antwort auf die Handlung). */
const zaehler = (client, spielerId, from) => client.waitFor(m => m.type === 'player_hand_count' && m.player_id === spielerId, from);
const types = (list) => list.map(m => m.type);
const zone = (zones, id) => zones.find(z => z.id === id);
const handKarte = (room, id) => (room.hands.get(id) ?? []);
const amTisch = (room, id) => room.boardState.cards.find(c => c.tableId === id);

// ── FP ───────────────────────────────────────────────────────────────────────

test('FP: zwei Spieler, vier Dörfler – Anlegen, Beitreten, Starten, Zug (Rechte, Ziehen, Ausspielen, Aufnehmen, Aufdecken, Neuverbinden, Gehen)', async (t) => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId);
  const { code, hostId, gastId, host, gast } = await startedRoom(setupId, gameId, { spieler: 's2', ...VIER });
  const live = getRoom(code);

  await t.test('1. beide bekommen room_started mit den Hand-Zonen in den Farben ihrer Eigentümer – und denselben Zustand', () => {
    const [a, b] = [host, gast].map(c => c.msgs.find(m => m.type === 'room_started'));
    assert.deepEqual(a, b, 'ein Rundruf, beide bekommen dasselbe (kein Filter, Stufe A)');
    for (const [id, farbe] of [['zhand1', 'red'], ['zhand2', 'red'], ['zhand3', 'blue'], ['zhand4', 'blue']]) {
      assert.equal(zone(a.zones, id).color, farbe, id);
      assert.equal(zone(a.zones, id).exclusive, true, id);
    }
    assert.equal(zone(a.zones, 'zhand5').exclusive, false, 'Platz 5 ist kein Dörfler');
    assert.equal(a.board_state.stacks[0].cards.length, 6);
  });

  await t.test('2. Rechte am Draht: der Gast bewegt eine Karte aus der Hand-Zone des Hosts → error + wahrer Stand, der Host sieht nichts; der Host bewegt seine eigene → der Gast sieht es', async () => {
    const m1 = host.mark();
    const m2 = gast.mark();
    gast.send({ type: 'card_move', table_id: 'inhand1', x: FREI.x + 200, y: FREI.y });
    const wahr = await gast.waitFor(m => m.type === 'card_move', m2);
    const fehler = gast.since(m2).find(m => m.type === 'error');
    assert.match(fehler.message, /Hand eines anderen Spielers/);
    assert.deepEqual([wahr.x, wahr.y], [HAND1.x, HAND1.y], 'der Stand des Servers');
    await tick();
    assert.deepEqual(host.since(m1), [], 'der Host sieht nichts');
    assert.deepEqual([amTisch(live, 'inhand1').x, amTisch(live, 'inhand1').y], [HAND1.x, HAND1.y], 'der Server hat nichts geändert');

    // der Host verschiebt seine eigene Karte (innerhalb seiner Zone)
    const m3 = gast.mark();
    host.send({ type: 'card_move', table_id: 'inhand1', x: HAND1.x + 10, y: HAND1.y });
    const gesehen = await gast.next('card_move', m3);
    assert.equal(gesehen.x, HAND1.x + 10);
    assert.equal(gesehen.from_player_id, hostId);
    host.send({ type: 'card_move', table_id: 'inhand1', x: HAND1.x, y: HAND1.y });
    await gast.waitFor(m => m.type === 'card_move' && m.x === HAND1.x, m3);
  });

  let gezogen;   // die zwei Karten des Hosts

  await t.test('3. Ziehen: beide bekommen stack_size_update mit removed (nur Ids), nur der Host draw_response; der Zähler des Hosts steht bei beiden auf 2; beim Gast kommt kein Name und kein Bildpfad an', async () => {
    const m1 = host.mark();
    const m2 = gast.mark();
    host.send({ type: 'card_draw_to_hand', stack_id: 'dorfereignis', count: 2 });
    await Promise.all([zaehler(host, hostId, m1), zaehler(gast, hostId, m2)]);

    const antwort = host.since(m1).find(m => m.type === 'draw_response');
    gezogen = antwort.cards;
    assert.deepEqual(gezogen.map(c => c.tableId).sort(), ['ev5', 'ev6']);
    assert.ok(gezogen.every(c => c.handId && c.name && c.image_path));
    for (const c of [host, gast]) {
      const upd = c.since(c === host ? m1 : m2).find(m => m.type === 'stack_size_update');
      assert.equal(upd.size, 4);
      assert.deepEqual([...upd.removed].sort(), ['ev5', 'ev6']);
      assert.deepEqual(Object.keys(upd).sort(), ['from_player_id', 'removed', 'size', 'stack_id', 'timestamp', 'type']);
    }
    for (const c of [host, gast]) assert.deepEqual(c.since(c === host ? m1 : m2).filter(m => m.type === 'player_hand_count').map(m => [m.player_id, m.count]), [[hostId, 2]]);
    assert.equal(gast.since(m2).some(m => m.type === 'draw_response'), false, 'der Gast bekommt kein draw_response');

    const beimGast = JSON.stringify(gast.since(m2));
    for (const wort of ['Ereignis 5', 'Ereignis 6', 'ereignis5', 'ereignis6', 'cev5', 'cev6']) {
      assert.equal(beimGast.includes(wort), false, `„${wort}“ steht in keiner Nachricht, die der Gast seit dem Ziehen empfing`);
    }
  });

  let verdeckt;   // die Karte, die der Host in seine Hand-Zone gelegt hat

  await t.test('4. Ausspielen: in die eigene Hand-Zone → der Gast bekommt card.faceDown true; offen auf den Tisch → false; der Gast legt in die Hand-Zone des Hosts → error, die Karte bleibt in seiner Hand', async () => {
    const [zuerst, danach] = gezogen;
    let m2 = gast.mark();
    host.send({ type: 'card_play_from_hand', hand_id: zuerst.handId, x: HAND2.x, y: HAND2.y });
    const a = await gast.next('card_play_from_hand', m2);
    verdeckt = a.card;
    assert.equal(a.card.faceDown, true, 'der Server setzt es: verdeckt');
    assert.equal(a.hand_id, zuerst.handId);
    assert.equal(amTisch(live, zuerst.tableId).faceDown, true);

    m2 = gast.mark();
    host.send({ type: 'card_play_from_hand', hand_id: danach.handId, x: FREI.x + 400, y: FREI.y + 400 });
    const b = await gast.next('card_play_from_hand', m2);
    assert.equal(b.card.faceDown, false, 'auf freier Fläche: offen');
    assert.deepEqual([b.x, b.y], [FREI.x + 400, FREI.y + 400]);

    // der Gast zieht eine Karte und versucht, sie in die Hand-Zone des Hosts zu legen
    const g1 = gast.mark();
    gast.send({ type: 'card_draw_to_hand', stack_id: 'dorfereignis', count: 1 });
    const seine = (await gast.next('draw_response', g1)).cards[0];
    await gast.waitFor(m => m.type === 'player_hand_count' && m.player_id === gastId, g1);
    const h1 = host.mark();
    const g2 = gast.mark();
    gast.send({ type: 'card_play_from_hand', hand_id: seine.handId, x: HAND1.x, y: HAND1.y });
    await gast.next('error', g2);
    await tick();
    assert.deepEqual(types(gast.since(g2)), ['error'], 'nur error');
    assert.equal(host.since(h1).some(m => m.type === 'card_play_from_hand'), false, 'der Host sieht nichts davon');
    assert.deepEqual(handKarte(live, gastId).map(c => c.handId), [seine.handId], 'die Karte bleibt in seiner Hand');
    assert.equal(live.players.get(gastId).handCardCount, 1, 'der Zähler ist unverändert');

    // in die **eigene** (verankerte) Hand-Zone des Gastes: verdeckt – der Host sieht die Rückseite kommen
    const h2 = host.mark();
    gast.send({ type: 'card_play_from_hand', hand_id: seine.handId, x: HAND3.x, y: HAND3.y });
    const c = await host.next('card_play_from_hand', h2);
    assert.equal(c.card.faceDown, true, 'die verankerte Hand 3 gehört dem Gast');
    assert.equal(handKarte(live, gastId).length, 0);
  });

  await t.test('5. Aufnehmen: der Host nimmt die Karte aus seiner Hand-Zone wieder auf → beide bekommen card_removed, der Host draw_response, der Zähler stimmt', async () => {
    const m1 = host.mark();
    const m2 = gast.mark();
    host.send({ type: 'card_pickup_to_hand', table_id: verdeckt.tableId });
    await Promise.all([zaehler(host, hostId, m1), zaehler(gast, hostId, m2)]);

    for (const [c, from] of [[host, m1], [gast, m2]]) assert.equal(c.since(from).find(m => m.type === 'card_removed').table_id, verdeckt.tableId);
    assert.equal(host.since(m1).find(m => m.type === 'draw_response').cards[0].tableId, verdeckt.tableId);
    assert.equal(gast.since(m2).some(m => m.type === 'draw_response'), false);
    assert.equal(amTisch(live, verdeckt.tableId), undefined);
    assert.deepEqual(gast.since(m2).filter(m => m.type === 'player_hand_count' && m.player_id === hostId).map(m => m.count), [1]);
    assert.equal(live.players.get(hostId).handCardCount, 1);
  });

  await t.test('6. Aufdecken: der Host dreht eine Karte seiner Hand-Zone um → der Gast bekommt card_flip mit face_down false', async () => {
    const m2 = gast.mark();
    host.send({ type: 'card_flip', table_id: 'inhand1', face_down: false });
    const flip = await gast.next('card_flip', m2);
    assert.equal(flip.face_down, false);
    assert.equal(amTisch(live, 'inhand1').faceDown, false);
  });

  await t.test('7. Neuverbinden: das neue welcome des Hosts trägt dieselben Zonen, denselben Zustand und seine Hand; der Gast bekommt keine Hand des Hosts; die Rechte gelten weiter', async () => {
    const zonenVorher = plain(live.zones);
    const g1 = gast.mark();
    host.ws.close();
    await host.closed();
    const neu = open(code, hostId);
    const welcome = await neu.next('welcome');

    assert.deepEqual(welcome.zones, zonenVorher, 'dieselben Zonen (Farbe, exclusive)');
    assert.deepEqual(welcome.board_state, plain(live.boardState), 'derselber Zustand');
    assert.equal(welcome.hand.length, 1, 'seine Hand: die aufgenommene Karte');
    assert.equal(welcome.hand[0].tableId, verdeckt.tableId);
    assert.equal(welcome.players.find(p => p.id === hostId).handCardCount, 1);

    await tick();
    assert.ok(gast.since(g1).every(m => ['player_disconnected', 'player_connected'].includes(m.type)), 'der Gast bekommt nur Anwesenheitsmeldungen');
    assert.equal(JSON.stringify(gast.since(g1)).includes('handId'), false, 'keine Hand des Hosts beim Gast');

    // die Rechte gelten weiter
    const g2 = gast.mark();
    gast.send({ type: 'card_move', table_id: 'inhand1', x: FREI.x, y: FREI.y });
    await gast.next('error', g2);
    assert.deepEqual([amTisch(live, 'inhand1').x, amTisch(live, 'inhand1').y], [HAND1.x, HAND1.y]);
    neu.ws.close();
    await neu.closed();
  });

  await t.test('8. Gehen: nur getrennt bleibt die Hand-Zone gesperrt; verlässt der Host den Raum, ist sie für den Gast offen', async () => {
    // der Host hat in Schritt 7 seine Verbindung geschlossen und nicht neu verbunden: getrennt, nicht gegangen
    await tick();
    assert.equal(live.players.get(hostId).isConnected, false);
    let g = gast.mark();
    gast.send({ type: 'card_move', table_id: 'inhand1', x: FREI.x, y: FREI.y });
    await gast.next('error', g);
    assert.deepEqual([amTisch(live, 'inhand1').x, amTisch(live, 'inhand1').y], [HAND1.x, HAND1.y], 'getrennt: weiter gesperrt');

    const res = await app.inject({ method: 'DELETE', url: `/api/rooms/${code}/leave`, headers, payload: { player_id: hostId } });
    assert.equal(res.statusCode, 200, res.body);
    g = gast.mark();
    gast.send({ type: 'card_move', table_id: 'inhand1', x: FREI.x, y: FREI.y });
    await tick();
    assert.equal(gast.since(g).some(m => m.type === 'error'), false, 'gegangen: kein error');
    assert.deepEqual([amTisch(live, 'inhand1').x, amTisch(live, 'inhand1').y], [FREI.x, FREI.y], 'die Karte wurde aus der früheren Hand-Zone des Hosts geholt');
  });
});

test('FP 9: Solo-Gegenprobe – derselbe Aufbau mit s1 und zwei Spielern: alles am Tisch gemeinsam, Ziehen/Ausspielen/Aufnehmen laufen, nichts liegt verdeckt', async () => {
  const gameId = await createGame();
  const setupId = await createSetup(gameId);
  const { code, hostId, gastId, host, gast } = await startedRoom(setupId, gameId, { spieler: 's1' });
  const live = getRoom(code);

  const [a, b] = [host, gast].map(c => c.msgs.find(m => m.type === 'room_started'));
  assert.deepEqual(a, b);
  assert.deepEqual(a.zones, plain(MIT_PLATZ), 'nichts gebunden: die Zonen sind die der Daten');

  // der Gast greift die Karte in der Hand-Zone des Hosts an
  let h = host.mark();
  gast.send({ type: 'card_move', table_id: 'inhand1', x: FREI.x + 100, y: FREI.y });
  const bewegt = await host.next('card_move', h);
  assert.equal(bewegt.x, FREI.x + 100);
  gast.send({ type: 'card_flip', table_id: 'inhand1', face_down: false });
  await host.next('card_flip', h);
  assert.equal(gast.msgs.some(m => m.type === 'error'), false, 'kein error');

  // 3: Ziehen
  h = host.mark();
  let g = gast.mark();
  gast.send({ type: 'card_draw_to_hand', stack_id: 'dorfereignis', count: 2 });
  await Promise.all([zaehler(host, gastId, h), zaehler(gast, gastId, g)]);
  const karten = gast.since(g).find(m => m.type === 'draw_response').cards;
  assert.equal(karten.length, 2);
  assert.equal(host.since(h).some(m => m.type === 'draw_response'), false);
  assert.ok(host.since(h).find(m => m.type === 'stack_size_update').removed.length === 2);

  // 4: Ausspielen – in jede Zone **offen**, auch in die (hier eigentümerlose) Hand-Zone des Hosts
  h = host.mark();
  gast.send({ type: 'card_play_from_hand', hand_id: karten[0].handId, x: HAND1.x, y: HAND1.y });
  const a1 = await host.next('card_play_from_hand', h);
  assert.equal(a1.card.faceDown, false);
  gast.send({ type: 'card_play_from_hand', hand_id: karten[1].handId, x: FREI.x + 500, y: FREI.y });
  const a2 = await host.waitFor(m => m.type === 'card_play_from_hand' && m.hand_id === karten[1].handId, h);
  assert.equal(a2.card.faceDown, false);

  // 5: Aufnehmen
  h = host.mark();
  g = gast.mark();
  gast.send({ type: 'card_pickup_to_hand', table_id: karten[0].tableId });
  await Promise.all([host.next('card_removed', h), gast.next('draw_response', g)]);
  assert.equal(live.players.get(gastId).handCardCount, 1);
  assert.equal(gast.msgs.some(m => m.type === 'error'), false);
  assert.equal(host.msgs.some(m => m.type === 'error'), false);
  assert.equal(live.players.get(hostId).handCardCount, 0);
});
