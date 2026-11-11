// Stapelgriffe im Raum (docs/tasks-stapel-raum.md, GA–GD) – die Handler: `stack_flip`, `stack_create`, `stack_merge`,
// `stack_split`, `stack_take_top`. Aufruf wie in `ownership-handlers.test.js`: `handleMessage(room, playerId, JSON)` mit
// gefälschten Verbindungen, die die Nachrichten je Spieler sammeln. Die Rückmeldung eines Stapelgriffs geht an **alle**,
// auch an den Absender (Entscheidung 1: im Raum ändert sich der Tisch erst mit ihr, eine Ablehnung braucht kein Zurückstellen).
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { handleMessage } from '../src/websocket/messageHandler.js';
import { ownersOfPlayers, bindZones, resolveServerZones } from '../../shared/ownership.js';
import * as dz from '../../scripts/doerflerzahl-daten.mjs';

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const FF = dz.patchHaende(dz.patchZonen(lies('auslagen-kurzpartie.json').zones).zone).zone;
const MIT_PLATZ = FF.map(z => (/^zhand(\d)$/.test(z.id) ? { ...z, platz: Number(z.id.slice(5)) } : z));
const SPIELER = [{ id: 'p1', color: 'red', seat: 1 }, { id: 'p2', color: 'blue', seat: 2 }];
const OWNERS = ownersOfPlayers({ players: 2, villagers: 4, kind: 'mehrfach' }, SPIELER);
const GEBUNDEN = bindZones(MIT_PLATZ, OWNERS).zones;
const TABLEAU3 = { id: 't3', assetId: 'bad13f49-c614-4551-9e81-fe8603dbf09a', x: 1460, y: 1600, width: 300, height: 400 };

const mitte = (zones, state, id) => {
  const z = resolveServerZones(state, zones).find(x => x.id === id);
  return { x: z.x + z.width / 2, y: z.y + z.height / 2 };
};
const STATE0 = { tokens: [TABLEAU3], boards: [] };
const IN_ROT = mitte(GEBUNDEN, STATE0, 'zhand1');     // Zone von rot (p1)
const IN_BLAU = mitte(GEBUNDEN, STATE0, 'zhand3');    // Zone von blau (p2), verankert
const FREMD = 'Das ist die Hand eines anderen Spielers.';

/** Eine Stapelkarte, wie `getGameState` sie schreibt: ohne Ort. */
const sk = (tableId, z, faceDown = true) => ({ tableId, cardId: `c-${tableId}`, name: tableId, faceDown, rotation: 0, zIndex: z });

/**
 * Zwei Spieler, je eine mitschreibende Verbindung. Tisch: lose `l1`–`l3` (frei), `rot` (in der Zone von rot);
 * Stapel `s3` (frei, a b c, a unten), `sblau` (in der Zone von blau, k1 k2), `s2` (frei, zwei Karten).
 */
function makeRoom({ zones = GEBUNDEN } = {}) {
  const inbox = { p1: [], p2: [] };
  const room = {
    players: new Map(SPIELER.map(p => [p.id, { ...p, isConnected: true }])),
    connections: new Map(['p1', 'p2'].map(id => [id, { readyState: 1, send: (d) => inbox[id].push(JSON.parse(d)) }])),
    zones,
    boardState: {
      cards: [
        { tableId: 'l1', cardId: 'c-l1', x: 10, y: 10, zIndex: 3, faceDown: false, rotation: 0, gridId: 'g1', cell: 'C7' },
        { tableId: 'l2', cardId: 'c-l2', x: 20, y: 20, zIndex: 4, faceDown: true, rotation: 90 },
        { tableId: 'l3', cardId: 'c-l3', x: 30, y: 30, zIndex: 5, faceDown: false, rotation: 0 },
        { tableId: 'rot', cardId: 'c-rot', ...IN_ROT, zIndex: 6, faceDown: true, rotation: 0 },
      ],
      stacks: [
        { stackId: 's3', x: 300, y: 300, cards: [sk('a', 1), sk('b', 2, false), sk('c', 3)] },
        { stackId: 'sblau', x: IN_BLAU.x, y: IN_BLAU.y, cards: [sk('k1', 1), sk('k2', 2)] },
        { stackId: 's2', x: 500, y: 500, cards: [sk('p', 1), sk('q', 2)] },
      ],
      tokens: [{ ...TABLEAU3 }],
      boards: [], counters: [], dice: [], notes: [], customDice: [],
    },
  };
  return { room, inbox };
}

const send = (room, from, msg) => handleMessage(room, from, JSON.stringify(msg));
const types = (list) => list.map(m => m.type);
const stack = (room, id) => room.boardState.stacks.find(s => s.stackId === id);
const loose = (room, id) => room.boardState.cards.find(c => c.tableId === id);
const ids = (s) => s.cards.map(c => c.tableId);

// ── GA: Stapel umdrehen ──────────────────────────────────────────────────────

test('GA 1: stack_flip kehrt jede Karte um (gemischt bleibt gemischt, nur andersherum); die Rückmeldung geht an alle und trägt absolute Seiten', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'stack_flip', stack_id: 's3' });
  assert.deepEqual(stack(room, 's3').cards.map(c => c.faceDown), [false, true, false]);
  const msg = { type: 'stack_flip', stack_id: 's3', face_down: { a: false, b: true, c: false } };
  for (const p of ['p1', 'p2']) {
    assert.equal(inbox[p].length, 1);
    assert.deepEqual({ ...inbox[p][0], from_player_id: undefined, timestamp: undefined }, { ...msg, from_player_id: undefined, timestamp: undefined });
    assert.equal(inbox[p][0].from_player_id, 'p1');
  }
  // zweimal = wieder wie vorher
  send(room, 'p2', { type: 'stack_flip', stack_id: 's3' });
  assert.deepEqual(stack(room, 's3').cards.map(c => c.faceDown), [true, false, true]);
});

test('GA 2: ein unbekannter Stapel – error, nichts ändert sich, kein Rundruf', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'stack_flip', stack_id: 'gibtsnicht' });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), ['error']);
  assert.deepEqual(inbox.p2, []);
});

test('GA 3: ein Stapel in fremder Hand-Zone wird nicht umgedreht – error, nichts ändert sich, kein anderer bekommt etwas; der Eigentümer darf', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'stack_flip', stack_id: 'sblau' });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(inbox.p1, [{ type: 'error', message: FREMD }]);
  assert.deepEqual(inbox.p2, []);

  send(room, 'p2', { type: 'stack_flip', stack_id: 'sblau' });
  assert.deepEqual(stack(room, 'sblau').cards.map(c => c.faceDown), [false, false]);
  assert.deepEqual(types(inbox.p2), ['stack_flip']);
});

test('GA 3b: ein Raum ohne Eigentümer (Zonen ohne Farbe, ohne Zonen) dreht jeden Stapel um', () => {
  for (const zones of [MIT_PLATZ, [], null]) {
    const { room, inbox } = makeRoom({ zones });
    send(room, 'p1', { type: 'stack_flip', stack_id: 'sblau' });
    assert.deepEqual(stack(room, 'sblau').cards.map(c => c.faceDown), [false, false]);
    assert.deepEqual(types(inbox.p2), ['stack_flip']);
  }
});

// ── Nachtrag zu GA: card_flip / card_rotate finden Stapelkarten ──────────────

test('GA 6: card_flip und card_rotate ändern auch eine Karte IM Stapel (vorher: Rundruf ohne Zustand)', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_flip', table_id: 'b', face_down: true });
  send(room, 'p1', { type: 'card_rotate', table_id: 'b', rotation: 180 });
  const b = stack(room, 's3').cards[1];
  assert.equal(b.faceDown, true);
  assert.equal(b.rotation, 180);
  assert.deepEqual(types(inbox.p2), ['card_flip', 'card_rotate']);
  assert.deepEqual(inbox.p1, []);
});

test('GA 6: eine Stapelkarte in fremder Hand-Zone wird nicht angefasst – error und der wahre Stand', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_flip', table_id: 'k1', face_down: false });
  send(room, 'p1', { type: 'card_rotate', table_id: 'k1', rotation: 90 });
  assert.equal(stack(room, 'sblau').cards[0].faceDown, true);
  assert.equal(stack(room, 'sblau').cards[0].rotation, 0);
  assert.deepEqual(types(inbox.p1), ['error', 'card_flip', 'error', 'card_rotate']);
  assert.deepEqual(inbox.p1[1], { type: 'card_flip', table_id: 'k1', face_down: true });
  assert.deepEqual(inbox.p2, []);
});
