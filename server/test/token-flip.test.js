// M3d – ein Bild-Token von Hand umdrehen (Spec-Abschnitt "M3d — Ein Objekt von
// Hand umdrehen").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Umdrehen heißt: `faceDown` kippen UND `imageUrl` zwischen `frontImageUrl` und
// `backImageUrl` tauschen. Bisher stand diese Regel nur im Executor-Schritt
// `set_asset_face`; das Kontextmenü konnte gar nicht umdrehen. Die Regel lebt
// jetzt in `assetFace()` neben der Fabrik, und `set_asset_face` benutzt sie –
// eine Definition, nicht zwei (das war die Ursache von M3c).
//
// Was hier geprüft wird:
//   * die Regel selbst, in beide Richtungen und zweimal hintereinander
//   * ohne Rückseite wird nicht umgedreht (und nichts angefasst)
//   * `set_asset_face` verhält sich nach dem Umbau unverändert: absolute Seite,
//     und verdeckt-ohne-Rückseite nimmt das Objekt vom Tisch und meldet fail
//   * die Serveraktion `token_flip` setzt beide Felder und verrät im Broadcast
//     weder Name noch Bild-URLs

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { assetToken, assetFace } = await import('../../client/src/utils/assetToken.js');
const { executeSequenceWithLog } = await import('../../client/src/utils/sequenceExecutor.js');
const { handleMessage } = await import('../src/websocket/messageHandler.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

function boardAsset(over = {}) {
  return {
    id: 'asset-board',
    name: 'Bosstableau',
    type: 'token',
    image_path: '/uploads/front.png',
    back_image_path: '/uploads/back.png',
    width: 1200,
    height: 1000,
    ...over,
  };
}

/** Kleinstmöglicher Raum: was messageHandler und broadcast tatsächlich lesen. */
function fakeRoom(tokens) {
  const sent = [];
  const ws = { readyState: 1, send: data => sent.push(JSON.parse(data)) };
  return {
    sent,
    players: new Map([['p1', { color: 'red' }], ['p2', { color: 'blue' }]]),
    connections: new Map([['p2', ws]]), // p1 ist der Absender, bekommt nichts
    zones: [],
    boardState: { cards: [], stacks: [], tokens, counters: [], notes: [], dice: [], customDice: [] },
  };
}

// ── Die Regel ────────────────────────────────────────────────────────────────

test('flipping a face-up token shows the back and says face down', () => {
  const t = assetToken(boardAsset(), 0, 0, false);
  const face = assetFace(t, !t.faceDown);
  assert.deepStrictEqual(face, { faceDown: true, imageUrl: '/uploads/back.png' });
});

test('flipping a face-down token shows the front again', () => {
  const t = assetToken(boardAsset(), 0, 0, true);
  const face = assetFace(t, !t.faceDown);
  assert.deepStrictEqual(face, { faceDown: false, imageUrl: '/uploads/front.png' });
});

test('flipping twice restores both fields', () => {
  const t = assetToken(boardAsset(), 0, 0, false);
  const once = { ...t, ...assetFace(t, true) };
  const twice = { ...once, ...assetFace(once, false) };
  assert.equal(twice.faceDown, t.faceDown);
  assert.equal(twice.imageUrl, t.imageUrl);
  assert.deepStrictEqual(twice, t);
});

test('a token without a back side cannot be flipped, and is not touched', () => {
  const t = assetToken(boardAsset({ back_image_path: null }), 0, 0, false);
  const before = { ...t };
  assert.equal(assetFace(t, true), null, 'no back side → no flip');
  assert.deepStrictEqual(t, before, 'and nothing was mutated on the way out');
});

// ── set_asset_face bleibt, was es war ────────────────────────────────────────

const ASSETS = [
  boardAsset(),
  boardAsset({ id: 'asset-fig', name: 'Held', image_path: '/uploads/fig.png', back_image_path: null }),
];

function run(steps) {
  return executeSequenceWithLog(
    { cards: [], stacks: [], tokens: [], boards: [] },
    steps,
    [],
    { assets: ASSETS }
  );
}

test('set_asset_face still sets an absolute face, not a toggle', () => {
  const { state } = run([
    { type: 'place_asset', assetName: 'Bosstableau', x: 10, y: 10 },
    { type: 'set_asset_face', assetName: 'Bosstableau', faceDown: true },
    { type: 'set_asset_face', assetName: 'Bosstableau', faceDown: true },
  ]);
  const obj = state.tokens.find(t => t.label === 'Bosstableau');
  assert.equal(obj.faceDown, true, 'twice face down is still face down, not flipped back');
  assert.equal(obj.imageUrl, '/uploads/back.png');
});

test('set_asset_face face down without a back takes the object off the table and fails', () => {
  const { state, log } = run([
    { type: 'place_asset', assetName: 'Held', x: 10, y: 10 },
    { type: 'set_asset_face', assetName: 'Held', faceDown: true },
  ]);
  assert.equal(state.tokens.length, 0, 'rather off the table than face up by accident');
  const entry = log[log.length - 1];
  assert.equal(entry.status, 'failed');
  assert.match(entry.reason, /no back side/);
});

// ── Serveraktion token_flip ──────────────────────────────────────────────────

test('token_flip sets faceDown AND imageUrl on the server copy', () => {
  const token = assetToken(boardAsset(), 100, 100, false);
  const room = fakeRoom([token]);

  handleMessage(room, 'p1', JSON.stringify({ type: 'token_flip', token_id: token.id, face_down: true }));
  assert.equal(room.boardState.tokens[0].faceDown, true);
  assert.equal(room.boardState.tokens[0].imageUrl, '/uploads/back.png');

  handleMessage(room, 'p1', JSON.stringify({ type: 'token_flip', token_id: token.id, face_down: false }));
  assert.equal(room.boardState.tokens[0].faceDown, false);
  assert.equal(room.boardState.tokens[0].imageUrl, '/uploads/front.png');
});

test('the token_flip broadcast carries no name and no image URLs', () => {
  const token = assetToken(boardAsset(), 100, 100, false);
  const room = fakeRoom([token]);

  handleMessage(room, 'p1', JSON.stringify({ type: 'token_flip', token_id: token.id, face_down: true }));

  assert.equal(room.sent.length, 1, 'the other player is told');
  const msg = room.sent[0];
  assert.deepStrictEqual(Object.keys(msg).sort(), ['face_down', 'from_player_id', 'timestamp', 'token_id', 'type']);
  assert.equal(msg.token_id, token.id);
  assert.equal(msg.face_down, true);
  // "Verdeckt heißt überall verdeckt": weder Name noch Rückseiten-URL dürfen mit.
  const wire = JSON.stringify(msg);
  assert.ok(!wire.includes('Bosstableau'), 'the name would give away the hidden object');
  assert.ok(!wire.includes('/uploads/'), 'and so would the image URLs');
});

test('the server refuses face down for a token that has no back side', () => {
  // Das Kontextmenue bietet es fuer so ein Token gar nicht an - aber darauf
  // verlaesst sich der Server nicht. Ohne die Pruefung stuende hier
  // imageUrl: undefined, und alle saehen ein kaputtes Bild.
  const token = assetToken(boardAsset({ back_image_path: null }), 100, 100, false);
  const room = fakeRoom([token]);

  handleMessage(room, 'p1', JSON.stringify({ type: 'token_flip', token_id: token.id, face_down: true }));

  assert.equal(room.boardState.tokens[0].faceDown, false, 'unveraendert');
  assert.equal(room.boardState.tokens[0].imageUrl, '/uploads/front.png');
  assert.equal(room.sent.length, 0, 'und niemandem wird ein Umdrehen gemeldet, das nicht stattfand');
});
