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

// ── GB: Stapel bilden ────────────────────────────────────────────────────────

const erstellen = (extra = {}) => ({ type: 'stack_create', stack_id: 'neu', card_table_ids: ['l1', 'l2'], z_index: [10, 11], x: 100, y: 200, ...extra });
const ohneStempel = (m) => { const { from_player_id, timestamp, ...rest } = m; return rest; };

test('GB 1: stack_create legt den Stapel in der Reihenfolge der NACHRICHT an, mit ihren zIndex, ohne Ort an den Karten; die Karten verlassen den Tisch', () => {
  const { room } = makeRoom();
  send(room, 'p1', erstellen({ card_table_ids: ['l2', 'l1'] }));
  const s = stack(room, 'neu');
  assert.deepEqual(ids(s), ['l2', 'l1']);
  assert.deepEqual(s.cards.map(c => c.zIndex), [10, 11]);
  assert.deepEqual([s.x, s.y], [100, 200]);
  for (const c of s.cards) for (const k of ['x', 'y', 'gridId', 'cell', 'inStack']) assert.equal(k in c, false, `${k} gehört nicht an eine Stapelkarte`);
  assert.equal(loose(room, 'l1'), undefined);
  assert.equal(loose(room, 'l2'), undefined);
  assert.deepEqual(s.card_ids, ['c-l2', 'c-l1']);
  assert.deepEqual(s.table_ids, ['l2', 'l1']);
  assert.equal(s.cards[1].faceDown, false, 'sonst bleibt die Karte, wie sie war');
});

test('GB 1: die Rückmeldung geht an ALLE (auch den Absender) und nennt Reihenfolge, zIndex und Ort, wie angewandt', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', erstellen({ card_table_ids: ['l2', 'l1'] }));
  const erwartet = { type: 'stack_create', stack_id: 'neu', card_table_ids: ['l2', 'l1'], z_index: [10, 11], x: 100, y: 200 };
  assert.deepEqual(inbox.p1.map(ohneStempel), [erwartet]);
  assert.deepEqual(inbox.p2.map(ohneStempel), [erwartet]);
  assert.equal(inbox.p2[0].from_player_id, 'p1');
});

test('GB 1: ohne z_index setzt der Server die zIndex über den höchsten am Tisch (Karten in Stapeln mitgezählt)', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', erstellen({ z_index: undefined }));
  const z = stack(room, 'neu').cards.map(c => c.zIndex);
  assert.deepEqual(z, [7, 8], 'die höchste Karte am Tisch hat 6');
  assert.deepEqual(inbox.p2[0].z_index, [7, 8]);
});

test('GB 2: Karten aus anderen Stapeln werden genommen; ein Rest von einer Karte löst sich auf, ein leerer Stapel verschwindet', () => {
  const { room } = makeRoom();
  send(room, 'p1', erstellen({ card_table_ids: ['c', 'l1', 'p', 'q'], z_index: [1, 2, 3, 4] }));
  assert.deepEqual(ids(stack(room, 'neu')), ['c', 'l1', 'p', 'q']);
  assert.equal(stack(room, 's2'), undefined, 's2 hatte nur p und q');
  assert.deepEqual(ids(stack(room, 's3')), ['a', 'b'], 's3 behält zwei Karten');
  send(room, 'p1', erstellen({ stack_id: 'zwei', card_table_ids: ['a', 'l3'], z_index: [1, 2] }));
  assert.equal(stack(room, 's3'), undefined, 'b bleibt allein: lose an der Stelle des Stapels');
  assert.deepEqual([loose(room, 'b').x, loose(room, 'b').y], [300, 300]);
  assert.equal(loose(room, 'b').faceDown, false);
});

test('GB 3: eine vorhandene stack_id wird neu gefasst, wenn ALLE ihre Karten in der Liste stehen (so bildet ein Ablagestapel einen Haufen)', () => {
  const { room } = makeRoom();
  send(room, 'p1', erstellen({ stack_id: 's2', card_table_ids: ['p', 'q', 'l1'], z_index: [1, 2, 3], x: 500, y: 500 }));
  assert.deepEqual(ids(stack(room, 's2')), ['p', 'q', 'l1']);
  assert.equal(room.boardState.stacks.filter(s => s.stackId === 's2').length, 1, 'kein zweiter Stapel mit derselben Id');
});

test('GB 3: eine vorhandene stack_id mit Karten, die nicht in der Liste stehen – error, nichts ändert sich', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', erstellen({ stack_id: 's3', card_table_ids: ['a', 'l1'] }));
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), ['error']);
  assert.deepEqual(inbox.p2, []);
});

test('GB 4: weniger als zwei Karten, unbekannte Karte, doppelte Id, kein Ort, keine stack_id – error, nichts ändert sich, kein Rundruf', () => {
  for (const bad of [
    { card_table_ids: ['l1'] }, { card_table_ids: [] }, { card_table_ids: 'l1' }, { card_table_ids: undefined },
    { card_table_ids: ['l1', 'gibtsnicht'] }, { card_table_ids: ['l1', 'l1'] },
    { x: undefined }, { y: 'oben' }, { stack_id: undefined }, { stack_id: '' },
  ]) {
    const { room, inbox } = makeRoom();
    const vorher = JSON.stringify(room.boardState);
    send(room, 'p1', erstellen(bad));
    assert.equal(JSON.stringify(room.boardState), vorher, JSON.stringify(bad));
    assert.deepEqual(types(inbox.p1), ['error'], JSON.stringify(bad));
    assert.deepEqual(inbox.p2, [], JSON.stringify(bad));
  }
});

test('GB 5: die Wache – Karte aus fremder Zone, Karte in fremder Stapel-Zone, Ziel in fremder Zone: error, nichts ändert sich; die eigene Zone darf', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', erstellen({ card_table_ids: ['l1', 'k1'] }));          // k1 liegt im Stapel in der Zone von blau
  send(room, 'p1', erstellen({ x: IN_BLAU.x, y: IN_BLAU.y }));            // Ziel in der Zone von blau
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(inbox.p1, [{ type: 'error', message: FREMD }, { type: 'error', message: FREMD }]);
  assert.deepEqual(inbox.p2, []);
  send(room, 'p1', erstellen({ x: IN_ROT.x, y: IN_ROT.y }));
  assert.deepEqual(ids(stack(room, 'neu')), ['l1', 'l2']);
});

// ── GB: Stapel mergen ────────────────────────────────────────────────────────

test('GB 7: stack_merge legt die Karten oben auf den Zielstapel: Reihenfolge der Nachricht, zIndex der Nachricht, der Quellstapel ist weg', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'stack_merge', from_stack_id: 's2', to_stack_id: 's3', order: ['q', 'p'], z_index: [4, 5] });
  const s = stack(room, 's3');
  assert.deepEqual(ids(s), ['a', 'b', 'c', 'q', 'p']);
  assert.deepEqual(s.cards.map(c => c.zIndex), [1, 2, 3, 4, 5]);
  assert.equal(stack(room, 's2'), undefined);
  assert.deepEqual(s.table_ids, ['a', 'b', 'c', 'q', 'p']);
  const erwartet = { type: 'stack_merge', from_stack_id: 's2', to_stack_id: 's3', card_table_ids: ['q', 'p'], z_index: [4, 5], x: 300, y: 300 };
  assert.deepEqual(inbox.p1.map(ohneStempel), [erwartet]);
  assert.deepEqual(inbox.p2.map(ohneStempel), [erwartet]);
});

test('GB 7: passt `order` nicht genau auf den Quellstapel, gilt die Reihenfolge des Servers; ohne z_index gilt über dem höchsten des Ziels', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'stack_merge', from_stack_id: 's2', to_stack_id: 's3', order: ['p'] });
  const s = stack(room, 's3');
  assert.deepEqual(ids(s), ['a', 'b', 'c', 'p', 'q']);
  assert.deepEqual(s.cards.map(c => c.zIndex), [1, 2, 3, 4, 5]);
  assert.deepEqual(inbox.p2[0].card_table_ids, ['p', 'q']);
});

test('GB 8: stack_merge mit from_table_id legt eine LOSE Karte oben auf den Stapel; liegt sie nicht lose, error', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'stack_merge', from_table_id: 'l1', to_stack_id: 's3', z_index: [9] });
  const s = stack(room, 's3');
  assert.deepEqual(ids(s), ['a', 'b', 'c', 'l1']);
  assert.equal(s.cards[3].zIndex, 9);
  for (const k of ['x', 'y', 'gridId', 'cell']) assert.equal(k in s.cards[3], false);
  assert.equal(loose(room, 'l1'), undefined);
  assert.deepEqual(ohneStempel(inbox.p1[0]), { type: 'stack_merge', from_table_id: 'l1', to_stack_id: 's3', card_table_ids: ['l1'], z_index: [9], x: 300, y: 300 });

  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'stack_merge', from_table_id: 'a', to_stack_id: 's2' });       // a liegt im Stapel
  send(room, 'p1', { type: 'stack_merge', from_table_id: 'gibtsnicht', to_stack_id: 's2' });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), ['stack_merge', 'error', 'error']);
});

test('GB 8: unbekannter Quell- oder Zielstapel, Stapel auf sich selbst – error, nichts ändert sich, kein Rundruf', () => {
  for (const bad of [{ from_stack_id: 'gibtsnicht', to_stack_id: 's3' }, { from_stack_id: 's2', to_stack_id: 'gibtsnicht' }, { from_stack_id: 's3', to_stack_id: 's3' }, { to_stack_id: 's3' }]) {
    const { room, inbox } = makeRoom();
    const vorher = JSON.stringify(room.boardState);
    send(room, 'p1', { type: 'stack_merge', ...bad });
    assert.equal(JSON.stringify(room.boardState), vorher, JSON.stringify(bad));
    assert.deepEqual(types(inbox.p1), ['error']);
    assert.deepEqual(inbox.p2, []);
  }
});

test('GB 9: stack_merge – die Wache gilt für lose Karte und Stapel, Quelle und Ziel', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'stack_merge', from_table_id: 'l1', to_stack_id: 'sblau' });   // Ziel fremd
  assert.deepEqual(inbox.p1, [{ type: 'error', message: FREMD }]);
  assert.ok(loose(room, 'l1'));
  send(room, 'p1', { type: 'stack_merge', from_table_id: 'rot', to_stack_id: 's3' });     // Karte in der eigenen Zone: erlaubt
  assert.deepEqual(types(inbox.p1), ['error', 'stack_merge']);
  const { room: r2, inbox: i2 } = makeRoom();
  r2.boardState.cards.push({ tableId: 'fremd', cardId: 'c', ...IN_BLAU, zIndex: 1, faceDown: true });
  send(r2, 'p1', { type: 'stack_merge', from_table_id: 'fremd', to_stack_id: 's3' });     // Karte in fremder Zone
  assert.deepEqual(i2.p1, [{ type: 'error', message: FREMD }]);
  assert.ok(loose(r2, 'fremd'));
});

// ── GC: abheben und teilen ───────────────────────────────────────────────────

test('GC 1: stack_take_top hebt die OBERSTE Karte lose an die Stelle ab; sie behält Seite, Drehung und zIndex; die Rückmeldung geht an alle', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'stack_take_top', stack_id: 's3', new_x: 400, new_y: 410 });
  assert.deepEqual(ids(stack(room, 's3')), ['a', 'b']);
  const c = loose(room, 'c');
  assert.deepEqual([c.x, c.y, c.faceDown, c.rotation, c.zIndex], [400, 410, true, 0, 3]);
  assert.deepEqual(stack(room, 's3').table_ids, ['a', 'b']);
  for (const p of ['p1', 'p2']) {
    assert.deepEqual(types(inbox[p]), ['stack_take_top']);
    assert.equal(inbox[p][0].stack_id, 's3');
    assert.deepEqual([inbox[p][0].new_x, inbox[p][0].new_y], [400, 410]);
    assert.equal(inbox[p][0].card.tableId, 'c');
    assert.equal(inbox[p][0].from_player_id, 'p1');
  }
});

test('GC 1: bleibt eine Karte im Stapel, löst er sich auf (sie liegt lose an der Stelle des Stapels); die letzte Karte nimmt den Stapel mit', () => {
  const { room } = makeRoom();
  send(room, 'p1', { type: 'stack_take_top', stack_id: 's2', new_x: 1, new_y: 2 });
  assert.equal(stack(room, 's2'), undefined);
  assert.deepEqual([loose(room, 'q').x, loose(room, 'q').y], [1, 2]);
  assert.deepEqual([loose(room, 'p').x, loose(room, 'p').y], [500, 500], 'die Restkarte liegt, wo der Stapel lag');
  assert.equal(room.boardState.stacks.some(s => (s.cards || []).length < 2), false, 'kein Stapel mit weniger als zwei Karten');
});

test('GC 2: face_down und z_index der Nachricht werden angewandt (so deckt „Reveal“ auf), sonst bleibt die Karte, wie sie war', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'stack_take_top', stack_id: 's3', new_x: 7, new_y: 8, face_down: false, z_index: 99 });
  assert.deepEqual([loose(room, 'c').faceDown, loose(room, 'c').zIndex], [false, 99]);
  assert.equal(inbox.p2[0].card.faceDown, false);
  send(room, 'p1', { type: 'stack_take_top', stack_id: 's3', new_x: 7, new_y: 8, face_down: 'ja', z_index: 'hoch' });
  assert.deepEqual([loose(room, 'b').faceDown, loose(room, 'b').zIndex], [false, 2], 'Unlesbares wird nicht gelesen');
});

test('GC 1: unbekannter Stapel, unlesbarer Ort – error, nichts ändert sich, kein Rundruf', () => {
  for (const bad of [{ stack_id: 'gibtsnicht' }, { new_x: 'links' }, { new_y: undefined }]) {
    const { room, inbox } = makeRoom();
    const vorher = JSON.stringify(room.boardState);
    send(room, 'p1', { type: 'stack_take_top', stack_id: 's3', new_x: 5, new_y: 6, ...bad });
    assert.equal(JSON.stringify(room.boardState), vorher, JSON.stringify(bad));
    assert.deepEqual(types(inbox.p1), ['error']);
    assert.deepEqual(inbox.p2, []);
  }
});

test('GC 3: die Wache – abheben aus oder in die fremde Hand-Zone: error, nichts ändert sich; die eigene Zone darf', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'stack_take_top', stack_id: 'sblau', new_x: 5, new_y: 5 });            // der Stapel liegt fremd
  send(room, 'p1', { type: 'stack_take_top', stack_id: 's3', new_x: IN_BLAU.x, new_y: IN_BLAU.y }); // Ziel fremd
  send(room, 'p1', { type: 'stack_split', stack_id: 'sblau', count: 1, new_x: 5, new_y: 5 });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(inbox.p1, [1, 2, 3].map(() => ({ type: 'error', message: FREMD })));
  assert.deepEqual(inbox.p2, []);
  send(room, 'p1', { type: 'stack_take_top', stack_id: 's3', new_x: IN_ROT.x, new_y: IN_ROT.y });
  assert.ok(loose(room, 'c'));
});

const teilen = (extra = {}) => ({ type: 'stack_split', stack_id: 's3', count: 2, new_stack_id: 'halb', new_x: 600, new_y: 610, ...extra });

test('GC 5: stack_split macht die obersten `count` Karten zu einem NEUEN Stapel (Reihenfolge und zIndex bleiben), der Rest bleibt; die Rückmeldung geht an alle', () => {
  const { room, inbox } = makeRoom();
  room.boardState.stacks.find(s => s.stackId === 's2').cards.push(sk('r', 3));
  send(room, 'p1', teilen({ stack_id: 's2', count: 2 }));
  // p bleibt allein: lose an der Stelle des Stapels, der neue Stapel hat q und r
  assert.equal(stack(room, 's2'), undefined);
  assert.deepEqual(ids(stack(room, 'halb')), ['q', 'r']);
  assert.deepEqual(stack(room, 'halb').cards.map(c => c.zIndex), [2, 3]);
  assert.deepEqual([stack(room, 'halb').x, stack(room, 'halb').y], [600, 610]);
  assert.deepEqual(stack(room, 'halb').table_ids, ['q', 'r']);
  assert.deepEqual([loose(room, 'p').x, loose(room, 'p').y], [500, 500]);
  const erwartet = { type: 'stack_split', stack_id: 's2', count: 2, new_stack_id: 'halb', card_table_ids: ['q', 'r'], new_x: 600, new_y: 610 };
  assert.deepEqual(inbox.p1.map(ohneStempel), [erwartet]);
  assert.deepEqual(inbox.p2.map(ohneStempel), [erwartet]);
});

test('GC 5: bleiben mindestens zwei Karten, bleibt der Quellstapel', () => {
  const { room } = makeRoom();
  room.boardState.stacks.find(s => s.stackId === 's3').cards.push(sk('d', 4), sk('e', 5));
  send(room, 'p1', teilen({ count: 2 }));
  assert.deepEqual(ids(stack(room, 's3')), ['a', 'b', 'c']);
  assert.deepEqual(ids(stack(room, 'halb')), ['d', 'e']);
});

test('GC 6: count < 1, keine ganze Zahl, ≥ Stapelgröße, fehlende oder vorhandene new_stack_id – error, nichts ändert sich, kein Rundruf', () => {
  for (const bad of [{ count: 0 }, { count: -1 }, { count: 1.5 }, { count: '2' }, { count: 3 }, { count: 7 }, { new_stack_id: undefined }, { new_stack_id: '' }, { new_stack_id: 's2' }, { new_x: 'x' }, { stack_id: 'gibtsnicht' }]) {
    const { room, inbox } = makeRoom();
    const vorher = JSON.stringify(room.boardState);
    send(room, 'p1', teilen(bad));
    assert.equal(JSON.stringify(room.boardState), vorher, JSON.stringify(bad));
    assert.deepEqual(types(inbox.p1), ['error'], JSON.stringify(bad));
    assert.deepEqual(inbox.p2, [], JSON.stringify(bad));
  }
});

test('GC 6: count 1 verhält sich wie stack_take_top (die oberste Karte lose, Rückmeldung `stack_take_top`), auch ohne new_stack_id', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'stack_split', stack_id: 's3', count: 1, new_x: 40, new_y: 50 });
  assert.deepEqual([loose(room, 'c').x, loose(room, 'c').y], [40, 50]);
  assert.deepEqual(types(inbox.p2), ['stack_take_top']);
});

test('GC 7: stack_split – ein Stapel in fremder Hand-Zone wird nicht geteilt, nichts darf in die fremde Zone', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', teilen({ stack_id: 'sblau', count: 1, new_x: 5, new_y: 5 }));
  send(room, 'p1', teilen({ new_x: IN_BLAU.x, new_y: IN_BLAU.y, count: 2 }));
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(inbox.p1, [{ type: 'error', message: FREMD }, { type: 'error', message: FREMD }]);
});
