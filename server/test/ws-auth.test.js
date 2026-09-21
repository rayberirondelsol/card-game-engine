// The room WebSocket must require a valid session token, like the data API.
//
// The upgrade bypasses Fastify's hook chain (roomWs.js hangs off the raw HTTP
// server's 'upgrade' event), so the guard from src/index.js does not cover it.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Isolation: CGE_DB_PATH and CGE_UPLOADS_DIR redirect the SQLite file and the
// uploads directory into a tmpdir. They must be set BEFORE src/index.js is
// imported, hence the dynamic import below.
//
// app.inject() cannot perform a WebSocket upgrade, so the app listens on an
// ephemeral port and the `ws` client (already a dependency) connects for real.

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
const { createRoom, addPlayer } = await import('../src/roomStore.js');
const { authHeaders } = await import('./helpers.js');

const ROOM_CODE = 'TEST42';
const PLAYER_ID = 'player-1';

let app;
let port;
let token;
const sockets = [];

/** helpers.js hands out a header; the subprotocol needs the bare token. */
const mintToken = (ttlSeconds) => authHeaders(ttlSeconds).authorization.slice(7);

before(async () => {
  app = await buildApp({ logger: false });
  await app.listen({ port: 0, host: '127.0.0.1' });
  setupWebSocketServer(app.server);
  port = app.server.address().port;

  token = mintToken();

  createRoom({ roomCode: ROOM_CODE, gameId: 'game-1', hostPlayerId: PLAYER_ID });
  addPlayer(ROOM_CODE, { id: PLAYER_ID, displayName: 'Host', color: 'red', seat: 1, isHost: true });
});

after(async () => {
  for (const ws of sockets) ws.terminate();
  closeWebSocketServer();
  if (app) await app.close();
  closeDatabase();
  rmSync(TMP, { recursive: true, force: true });
});

/**
 * Open a connection and settle on whatever happens first.
 * @returns {Promise<{status?: number, error?: string, closeCode?: number, welcome?: object}>}
 */
function connect({ code = ROOM_CODE, playerId = PLAYER_ID, token: tok } = {}) {
  const url = `ws://127.0.0.1:${port}/ws/rooms/${code}?player_id=${playerId}`;
  const ws = tok === undefined
    ? new WebSocket(url)
    : new WebSocket(url, [WS_SUBPROTOCOL, tok]);
  sockets.push(ws);

  return new Promise((resolve) => {
    ws.on('unexpected-response', (_req, res) => { res.resume(); resolve({ status: res.statusCode }); });
    ws.on('error', (err) => resolve({ error: err.message }));
    ws.on('message', (data) => resolve({ ws, welcome: JSON.parse(data.toString()) }));
    ws.on('close', (closeCode) => resolve({ closeCode }));
  });
}

// ── Rejected upgrades ───────────────────────────────────────────────────────

test('an upgrade without a token is rejected with 401', async () => {
  const res = await connect({ token: undefined });
  assert.equal(res.status, 401, JSON.stringify(res));
});

test('garbage tokens are rejected with 401', async () => {
  // Must stay valid HTTP tokens: the `ws` client refuses to send anything else
  // as a subprotocol, so "garbage" here means well-formed but unknown.
  for (const bad of ['not-a-real-token', 'x', 'a'.repeat(4096)]) {
    const res = await connect({ token: bad });
    assert.equal(res.status, 401, `${bad.slice(0, 20)} -> ${JSON.stringify(res)}`);
  }
});

test('an expired session is rejected with 401', async () => {
  const res = await connect({ token: mintToken(-60) });
  assert.equal(res.status, 401, JSON.stringify(res));
});

// ── Accepted upgrades ───────────────────────────────────────────────────────

test('a valid token gets through and receives the welcome message', async () => {
  const res = await connect({ token });
  assert.equal(res.welcome?.type, 'welcome', JSON.stringify(res));
  assert.equal(res.welcome.room_code, ROOM_CODE);
  // The server selects the marker, never the token -- echoing the token back
  // would put the session into a response header for no reason.
  assert.equal(res.ws.protocol, WS_SUBPROTOCOL);
});

// ── Existing room/player checks still apply after authentication ────────────

test('an unknown room still closes with 4004', async () => {
  const res = await connect({ token, code: 'ZZZZZZ' });
  assert.equal(res.closeCode, 4004, JSON.stringify(res));
});

test('a player not in the room still closes with 4003', async () => {
  const res = await connect({ token, playerId: 'nobody' });
  assert.equal(res.closeCode, 4003, JSON.stringify(res));
});
