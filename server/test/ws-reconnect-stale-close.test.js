// Ein Reconnect darf nicht vom Close des ersetzten alten Sockets zunichtegemacht werden.
//
// Nach Netzwechsel/Sleep verbindet sich der Client neu (Socket 2), der Server bemerkt den toten
// Socket 1 erst beim Heartbeat. Dessen Close loeschte bisher die lebende Verbindung von Socket 2.
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
const { closeDatabase } = await import('../src/database.js');
const { setupWebSocketServer, closeWebSocketServer, WS_SUBPROTOCOL } =
  await import('../src/websocket/roomWs.js');
const { createRoom, addPlayer, getRoom } = await import('../src/roomStore.js');
const { broadcast } = await import('../src/websocket/broadcast.js');
const { authHeaders } = await import('./helpers.js');

const ROOM_CODE = 'RECON1';
let app;
let port;
let token;
const sockets = [];

before(async () => {
  app = await buildApp({ logger: false });
  await app.listen({ port: 0, host: '127.0.0.1' });
  setupWebSocketServer(app.server);
  port = app.server.address().port;
  token = authHeaders().authorization.slice(7);

  createRoom({ roomCode: ROOM_CODE, gameId: 'game-1', hostPlayerId: 'A' });
  addPlayer(ROOM_CODE, { id: 'A', displayName: 'A', color: 'red', seat: 1, isHost: true });
  addPlayer(ROOM_CODE, { id: 'B', displayName: 'B', color: 'blue', seat: 2 });
});

after(async () => {
  for (const ws of sockets) ws.terminate();
  closeWebSocketServer();
  if (app) await app.close();
  closeDatabase();
  rmSync(TMP, { recursive: true, force: true });
});

const tick = () => new Promise(r => setTimeout(r, 150));

/** Verbindet und sammelt alle Nachrichten; wartet auf das welcome. */
async function open(playerId) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/rooms/${ROOM_CODE}?player_id=${playerId}`, [WS_SUBPROTOCOL, token]);
  sockets.push(ws);
  const msgs = [];
  ws.on('message', (d) => msgs.push(JSON.parse(d.toString())));
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  await tick();
  return { ws, msgs };
}

test('Close eines ersetzten Sockets laesst den neuen verbunden und stoert niemanden', async () => {
  const b = await open('B');
  const a1 = await open('A');
  const a2 = await open('A');          // Reconnect, a1 ist ersetzt
  const bVorClose = b.msgs.length;

  a1.ws.close();
  await tick();

  const room = getRoom(ROOM_CODE);
  assert.equal(room.players.get('A').isConnected, true, 'A muss verbunden bleiben');
  assert.equal(room.connections.get('A').readyState, WebSocket.OPEN);
  assert.deepEqual(
    b.msgs.slice(bVorClose).filter(m => m.type === 'player_disconnected'), [],
    'B darf kein player_disconnected sehen',
  );

  const a2Vor = a2.msgs.length;
  broadcast(room, { type: 'ping_test' });
  await tick();
  assert.ok(a2.msgs.slice(a2Vor).some(m => m.type === 'ping_test'), 'Broadcast muss auf Socket 2 ankommen');
});

test('Close des aktuellen Sockets trennt weiterhin', async () => {
  const room = getRoom(ROOM_CODE);
  const b = await open('B');
  const a = await open('A');
  const bVor = b.msgs.length;
  a.ws.close();
  await tick();
  assert.equal(room.players.get('A').isConnected, false);
  assert.ok(b.msgs.slice(bVor).some(m => m.type === 'player_disconnected' && m.player_id === 'A'));
});

test('Reconnect des Hosts stoppt den Gnadentimer, es wird kein neuer Host ernannt', async () => {
  const room = getRoom(ROOM_CODE);
  const b = await open('B');
  const a1 = await open('A');
  a1.ws.close();
  await tick();
  const timer = room.hostDisconnectTimer;
  assert.ok(timer, 'Host-Close muss den Gnadentimer setzen');

  await open('A');                     // Host kommt innerhalb der Gnadenfrist zurueck
  assert.equal(timer._destroyed, true, 'Timer muss gestoppt sein');
  assert.ok(!room.hostDisconnectTimer, 'Feld muss zurueckgesetzt sein');
  assert.equal(room.hostPlayerId, 'A');
  assert.deepEqual(b.msgs.filter(m => m.type === 'host_changed'), []);
});
