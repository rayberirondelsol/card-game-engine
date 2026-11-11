// FU / Spec M32.6 – die private Hand im Raum: der Server hält sie (`room.hands`) und ist ihre einzige Quelle.
//
// Ziehen → private Hand → offen auf den Tisch oder verdeckt in die eigene Hand-Zone; Aufnehmen bringt eine lose Karte
// zurück. Der Client sendet Wünsche und wendet an, was der Server zurückmeldet (keine optimistische Änderung).
//
// Aufruf wie in `ownership-handlers.test.js`: `handleMessage(room, playerId, JSON)` mit gefälschten Verbindungen, die die
// Nachrichten je Spieler sammeln; die Hand-Zonen kommen aus der echten Fixture (`auslagen-kurzpartie.json`, EU + FF,
// `platz` 1 … 5 vom Test gesetzt, mit `bindZones` gebunden). `welcome.hand` und `dealStartingHands` prüft
// `room-hand-start.test.js` (echter Raumstart, echte Verbindungen).
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { handleMessage } from '../src/websocket/messageHandler.js';
import { ownersOfPlayers, bindZones, resolveServerZones, ownZoneAt } from '../../shared/ownership.js';
import { zoneSlots } from '../../shared/zoneGeometry.js';
import * as dz from '../../scripts/doerflerzahl-daten.mjs';

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const FF = dz.patchHaende(dz.patchZonen(lies('auslagen-kurzpartie.json').zones).zone).zone;
const MIT_PLATZ = FF.map(z => (/^zhand(\d)$/.test(z.id) ? { ...z, platz: Number(z.id.slice(5)) } : z));
const SPIELER = [{ id: 'p1', color: 'red', seat: 1 }, { id: 'p2', color: 'blue', seat: 2 }];
const OWNERS = ownersOfPlayers({ players: 2, villagers: 4, kind: 'mehrfach' }, SPIELER);
const GEBUNDEN = bindZones(MIT_PLATZ, OWNERS).zones;     // Eigentum: Hand 1 und 2 gehören rot (p1), Hand 3 und 4 blau (p2)
const SOLO = MIT_PLATZ;                                   // dieselben Zonen ohne Farbe: keine Eigentümer
const TABLEAU3 = { id: 't3', assetId: 'bad13f49-c614-4551-9e81-fe8603dbf09a', x: 1460, y: 1600, width: 300, height: 400 };

const mitte = (zones, id) => {
  const z = resolveServerZones({ tokens: [TABLEAU3], boards: [] }, zones).find(x => x.id === id);
  return { x: z.x + z.width / 2, y: z.y + z.height / 2 };
};
const IN_ROT = mitte(GEBUNDEN, 'zhand1');    // Zone von rot (p1), snap, 4 Plätze in einer Reihe
const IN_BLAU = mitte(GEBUNDEN, 'zhand3');   // Zone von blau (p2), verankert
const FREI = { x: 5, y: 5 };                 // in keiner Zone

const GEHEIM = ['Geheimname', 'geheim.png'];  // was in keiner Nachricht an den anderen stehen darf

const eineKarte = (n, z) => ({
  tableId: n, cardId: `c${n}`, name: `Geheimname ${n}`, image_path: `/uploads/geheim${n}.png`,
  card_back_id: 'rueck', width: 100, height: 150, zIndex: z, faceDown: true, rotation: 0,
});
const stapel = (stackId, x, y, n) => {
  const cards = Array.from({ length: n }, (_, i) => eineKarte(`${stackId}${i + 1}`, i + 1));
  return { stackId, label: stackId, x, y, cards, card_ids: cards.map(c => c.cardId), table_ids: cards.map(c => c.tableId) };
};

/**
 * Ein Raum mit zwei Spielern und je einer Verbindung, die mitschreibt. Karten: `rot` liegt in der Zone von rot, `blau` in der
 * von blau, `lose` auf freier Fläche. Stapel: `sev` (5 Karten, frei), `szwei` (2, frei), `sblau` (2, in der Zone von blau).
 */
function makeRoom({ zones = GEBUNDEN, mitHands = true } = {}) {
  const inbox = { p1: [], p2: [] };
  const room = {
    players: new Map(SPIELER.map(p => [p.id, { ...p, isConnected: true, handCardCount: 0 }])),
    connections: new Map(['p1', 'p2'].map(id => [id, { readyState: 1, send: (d) => inbox[id].push(JSON.parse(d)) }])),
    zones,
    boardState: {
      cards: [
        { tableId: 'rot', ...IN_ROT, name: 'Rot', image_path: '/uploads/rot.png', faceDown: true, rotation: 0, zIndex: 3, gridId: 'g1', cell: 'C7' },
        { tableId: 'blau', ...IN_BLAU, name: 'Blau', image_path: '/uploads/blau.png', faceDown: true, rotation: 90, zIndex: 4 },
        { tableId: 'lose', ...FREI, name: 'Lose', image_path: '/uploads/lose.png', faceDown: false, rotation: 0, zIndex: 9 },
      ],
      stacks: [
        stapel('sev', 300, 300, 5),
        stapel('szwei', 700, 300, 2),
        { ...stapel('sblau', IN_BLAU.x, IN_BLAU.y, 2) },
      ],
      tokens: [{ ...TABLEAU3 }],
      boards: [],
      counters: [],
      dice: [],
      notes: [],
      customDice: [],
    },
  };
  if (mitHands) room.hands = new Map();
  return { room, inbox };
}

const send = (room, from, msg) => handleMessage(room, from, JSON.stringify(msg));
const types = (list) => list.map(m => m.type);
const stack = (room, id) => room.boardState.stacks.find(s => s.stackId === id);
const tisch = (room, id) => room.boardState.cards.find(c => c.tableId === id);
const hand = (room, id) => room.hands.get(id) ?? [];
const ohne = (list, ...typen) => list.filter(m => !typen.includes(m.type));

/** Zieht `n` Karten vom Stapel `sev` und gibt die Hand des Ziehenden zurück (die Nachrichten sind danach geleert). */
function ziehe(room, inbox, von = 'p1', n = 2, stackId = 'sev') {
  send(room, von, { type: 'card_draw_to_hand', stack_id: stackId, count: n });
  const h = [...hand(room, von)];
  inbox.p1.length = 0;
  inbox.p2.length = 0;
  return h;
}

// ── 1. Ziehen ────────────────────────────────────────────────────────────────

test('FU 1: card_draw_to_hand – der Ziehende bekommt draw_response mit handId, alle stack_size_update mit den entfernten Ids', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'sev', count: 2 });

  const antwort = inbox.p1.find(m => m.type === 'draw_response');
  assert.equal(antwort.cards.length, 2);
  assert.ok(antwort.cards.every(c => typeof c.handId === 'string' && c.handId.length > 0), 'jede Karte hat eine handId');
  assert.equal(new Set(antwort.cards.map(c => c.handId)).size, 2, 'verschiedene handIds');
  assert.deepEqual(antwort.cards.map(c => c.tableId).sort(), ['sev4', 'sev5']);
  assert.ok(antwort.cards.every(c => c.name && c.image_path && c.cardId), 'der Ziehende bekommt Name, Bild, cardId');

  for (const box of [inbox.p1, inbox.p2]) {
    const upd = box.find(m => m.type === 'stack_size_update');
    assert.equal(upd.stack_id, 'sev');
    assert.equal(upd.size, 3);
    assert.deepEqual([...upd.removed].sort(), ['sev4', 'sev5']);
  }
  assert.equal(inbox.p2.some(m => m.type === 'draw_response'), false, 'der andere bekommt kein draw_response');
});

test('FU 1: die Nachrichten an den anderen tragen keinen Namen und kein Bild der gezogenen Karten', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'sev', count: 2 });
  assert.ok(inbox.p2.length > 0);
  const json = JSON.stringify(inbox.p2);
  for (const wort of [...GEHEIM, 'rueck', 'cardId', 'c4']) assert.equal(json.includes(wort), false, `„${wort}“ steht nicht in den Nachrichten an den anderen`);
  assert.deepEqual(types(inbox.p2), ['stack_size_update', 'player_hand_count']);
});

test('FU 1: die Karten sind in room.hands des Ziehenden, nicht mehr im Stapel und nicht in boardState; table_ids/card_ids sind aktuell', () => {
  const { room } = makeRoom();
  send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'sev', count: 2 });

  assert.equal(hand(room, 'p1').length, 2);
  assert.equal(hand(room, 'p2').length, 0);
  const s = stack(room, 'sev');
  assert.deepEqual(s.cards.map(c => c.tableId), ['sev1', 'sev2', 'sev3']);
  assert.deepEqual(s.table_ids, ['sev1', 'sev2', 'sev3']);
  assert.deepEqual(s.card_ids, ['csev1', 'csev2', 'csev3']);
  const gezogen = new Set(hand(room, 'p1').map(c => c.tableId));
  assert.equal(room.boardState.cards.some(c => gezogen.has(c.tableId)), false, 'nicht lose am Tisch');
  assert.equal(room.boardState.stacks.some(st => st.cards.some(c => gezogen.has(c.tableId))), false, 'in keinem Stapel');
});

test('FU 1: die letzte Karte → stack_removed an alle, der Stapel verschwindet; count größer als der Stapel: so viele wie da sind', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'szwei', count: 9 });

  assert.equal(stack(room, 'szwei'), undefined);
  assert.equal(inbox.p1.find(m => m.type === 'draw_response').cards.length, 2);
  for (const box of [inbox.p1, inbox.p2]) {
    assert.ok(box.some(m => m.type === 'stack_removed' && m.stack_id === 'szwei'));
    assert.equal(box.some(m => m.type === 'stack_size_update'), false);
  }
  assert.equal(hand(room, 'p1').length, 2);
});

test('FU 1: bleibt eine Karte im Stapel, ist es kein Stapel mehr – sie liegt lose am Tisch (wie der Client es tut, performSplit)', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'szwei', count: 1 });

  assert.equal(stack(room, 'szwei'), undefined, 'der Stapel mit einer Karte löst sich auf');
  const rest = tisch(room, 'szwei1');
  assert.deepEqual([rest.x, rest.y], [700, 300], 'an der Stelle des Stapels');
  assert.equal(rest.name, 'Geheimname szwei1');
  assert.equal(inbox.p2.find(m => m.type === 'stack_size_update').size, 1, 'der Client löst ihn mit removeDrawn genauso auf');
  assert.deepEqual(inbox.p2.find(m => m.type === 'stack_size_update').removed, ['szwei2']);
});

test('FU 1: ein unbekannter Stapel gibt ein leeres draw_response (wie bisher); ein Stapel in fremder Hand-Zone wird abgewiesen', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'gibtsnicht', count: 1 });
  assert.deepEqual(inbox.p1, [{ type: 'draw_response', cards: [] }]);
  assert.deepEqual(inbox.p2, []);

  inbox.p1.length = 0;
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'sblau', count: 1 });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), ['error']);
  assert.equal(inbox.p1[0].message, 'Das ist die Hand eines anderen Spielers.');
  assert.deepEqual(inbox.p2, []);
  assert.equal(hand(room, 'p1').length, 0);
});

test('FU 1: eine unsinnige Zahl zieht eine Karte, nie eine negative Zahl', () => {
  for (const count of [undefined, 0, -3, 'x', null]) {
    const { room } = makeRoom();
    send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'sev', count });
    assert.equal(hand(room, 'p1').length, 1, `count ${String(count)}`);
    assert.equal(stack(room, 'sev').cards.length, 4);
  }
});

test('FU 1: ein Raum ohne room.hands (alte Form, wie in stack-move-room.test.js) zieht trotzdem', () => {
  const { room } = makeRoom({ mitHands: false });
  send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'sev', count: 1 });
  assert.equal(room.hands.get('p1').length, 1);
});

// ── 2. Der Zähler ist abgeleitet ─────────────────────────────────────────────

test('FU 2: nach Ziehen, Ausspielen, Aufnehmen bekommen alle player_hand_count mit der Länge der Hand', () => {
  const { room, inbox } = makeRoom();
  const zaehler = (box) => box.filter(m => m.type === 'player_hand_count').map(m => [m.player_id, m.count]);

  send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'sev', count: 2 });
  assert.deepEqual(zaehler(inbox.p1), [['p1', 2]], 'auch der Ziehende bekommt ihn');
  assert.deepEqual(zaehler(inbox.p2), [['p1', 2]]);
  assert.equal(room.players.get('p1').handCardCount, 2);

  const [karte] = hand(room, 'p1');
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: karte.handId, x: FREI.x, y: FREI.y });
  assert.deepEqual(zaehler(inbox.p2).at(-1), ['p1', 1]);
  assert.equal(room.players.get('p1').handCardCount, 1);

  send(room, 'p1', { type: 'card_pickup_to_hand', table_id: 'lose' });
  assert.deepEqual(zaehler(inbox.p2).at(-1), ['p1', 2]);
  assert.deepEqual(zaehler(inbox.p1).at(-1), ['p1', 2]);
  assert.equal(room.players.get('p1').handCardCount, 2);
  assert.equal(room.players.get('p2').handCardCount, 0);
});

test('FU 2: hand_count_update des Clients ändert nichts – der Server ignoriert es, auch mit einer erfundenen Zahl', () => {
  const { room, inbox } = makeRoom();
  ziehe(room, inbox, 'p1', 2);
  send(room, 'p1', { type: 'hand_count_update', count: 99 });
  send(room, 'p1', { type: 'hand_count_update', count: 0 });

  assert.equal(room.players.get('p1').handCardCount, 2, 'unverändert (so stand es nach dem Ziehen)');
  assert.deepEqual(inbox.p1, [], 'keine Antwort');
  assert.deepEqual(inbox.p2, [], 'kein Rundruf');
});

// ── 3. Ausspielen, offen ─────────────────────────────────────────────────────

test('FU 3: card_play_from_hand auf freier Fläche – offen, obenauf, nicht mehr in der Hand; alle (auch der Absender) bekommen es', () => {
  const { room, inbox } = makeRoom();
  const [karte] = ziehe(room, inbox, 'p1', 2);
  const hoechster = Math.max(...room.boardState.cards.map(c => c.zIndex), ...room.boardState.stacks.flatMap(s => s.cards.map(c => c.zIndex)));

  send(room, 'p1', { type: 'card_play_from_hand', hand_id: karte.handId, x: 400, y: 500 });

  const gelegt = tisch(room, karte.tableId);
  assert.equal(gelegt.faceDown, false);
  assert.deepEqual([gelegt.x, gelegt.y], [400, 500]);
  assert.ok(gelegt.zIndex > hoechster, 'obenauf');
  assert.equal(gelegt.inStack ?? null, null);
  assert.equal(gelegt.name, karte.name);
  assert.equal('handId' in gelegt, false, 'die Tischkarte trägt keine handId');
  assert.equal(hand(room, 'p1').some(c => c.handId === karte.handId), false);
  assert.equal(hand(room, 'p1').length, 1);

  for (const box of [inbox.p1, inbox.p2]) {
    const m = box.find(x => x.type === 'card_play_from_hand');
    assert.equal(m.hand_id, karte.handId);
    assert.deepEqual([m.x, m.y], [400, 500]);
    assert.equal(m.card.tableId, karte.tableId);
    assert.equal(m.card.faceDown, false);
    assert.equal(m.from_player_id, 'p1');
  }
});

test('FU 3: eine Karte, die schon eine Rotation oder ein Rasterfeld trug, kommt gerade und ohne Feld wieder heraus', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_pickup_to_hand', table_id: 'rot' });      // trägt gridId g1 / cell C7
  const [karte] = hand(room, 'p1');
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: karte.handId, x: 600, y: 600 });
  const gelegt = tisch(room, 'rot');
  assert.equal(gelegt.rotation, 0);
  assert.equal(gelegt.gridId ?? null, null);
  assert.equal(gelegt.cell ?? null, null);
  assert.equal(inbox.p1.some(m => m.type === 'error'), false);
});

// ── 4. Ausspielen in die eigene Hand-Zone ────────────────────────────────────

test('FU 4: Ziel in der eigenen Hand-Zone – verdeckt (der Server setzt es, auch wenn die Karte offen in der Hand lag), die Nachricht trägt faceDown: true', () => {
  const { room, inbox } = makeRoom();
  room.boardState.cards = room.boardState.cards.filter(c => c.tableId !== 'rot');
  room.boardState.stacks[0].cards.at(-1).faceDown = false;             // die oberste Karte liegt offen im Stapel
  const [karte] = ziehe(room, inbox, 'p1', 1);
  assert.equal(karte.faceDown, false, 'die Karte war offen');

  send(room, 'p1', { type: 'card_play_from_hand', hand_id: karte.handId, x: IN_ROT.x, y: IN_ROT.y });
  assert.equal(tisch(room, karte.tableId).faceDown, true);
  for (const box of [inbox.p1, inbox.p2]) assert.equal(box.find(m => m.type === 'card_play_from_hand').card.faceDown, true);
});

test('FU 4: hat die Zone snap, liegt die Karte auf dem nächsten freien Platz; eine volle Zone nimmt den nächsten Platz, wie snapPoint es tut', () => {
  const { room, inbox } = makeRoom();
  room.boardState.cards = room.boardState.cards.filter(c => c.tableId !== 'rot');
  const zone = resolveServerZones(room.boardState, room.zones).find(z => z.id === 'zhand1');
  const plaetze = zoneSlots(zone);
  assert.equal(plaetze.length, 4);

  const karten = ziehe(room, inbox, 'p1', 5);
  const orte = [];
  for (const k of karten) {
    send(room, 'p1', { type: 'card_play_from_hand', hand_id: k.handId, x: IN_ROT.x, y: IN_ROT.y });
    const c = tisch(room, k.tableId);
    orte.push([c.x, c.y]);
    assert.equal(c.faceDown, true);
  }
  for (const [x, y] of orte.slice(0, 4)) {
    assert.ok(plaetze.some(p => Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5), `(${x}, ${y}) liegt auf einem Platz`);
  }
  assert.equal(new Set(orte.slice(0, 4).map(o => o.join(','))).size, 4, 'vier Karten, vier verschiedene freie Plätze');
  assert.ok(plaetze.some(p => Math.abs(p.x - orte[4][0]) < 0.5 && Math.abs(p.y - orte[4][1]) < 0.5), 'die fünfte nimmt einen Platz, ohne Fehler');
  assert.equal(inbox.p1.some(m => m.type === 'error'), false);
  const nachricht = inbox.p2.filter(m => m.type === 'card_play_from_hand').at(0);
  assert.deepEqual([nachricht.x, nachricht.y], orte[0], 'x/y der Nachricht sind der gesetzte Platz');
  assert.deepEqual([nachricht.card.x, nachricht.card.y], orte[0]);
});

// ── 5. Ausspielen in eine fremde Hand-Zone ───────────────────────────────────

test('FU 5: Ziel in fremder Hand-Zone – error an den Absender, sonst nichts; die Karte bleibt in der Hand', () => {
  const { room, inbox } = makeRoom();
  const [karte] = ziehe(room, inbox, 'p1', 2);
  const vorher = JSON.stringify(room.boardState);

  send(room, 'p1', { type: 'card_play_from_hand', hand_id: karte.handId, x: IN_BLAU.x, y: IN_BLAU.y });

  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.equal(hand(room, 'p1').length, 2, 'die Karte bleibt in der Hand');
  assert.equal(room.players.get('p1').handCardCount, 2);
  assert.deepEqual(types(inbox.p1), ['error']);
  assert.equal(inbox.p1[0].message, 'Das ist die Hand eines anderen Spielers.');
  assert.deepEqual(inbox.p2, []);
});

// ── 6. Der Server nimmt die Karte aus der Hand, nicht aus der Nachricht ──────

test('FU 6: eine unbekannte hand_id → error, nichts ändert sich', () => {
  const { room, inbox } = makeRoom();
  ziehe(room, inbox, 'p1', 1);
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: 'gibtsnicht', x: FREI.x, y: FREI.y });
  send(room, 'p1', { type: 'card_play_from_hand', x: FREI.x, y: FREI.y });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), ['error', 'error']);
  assert.deepEqual(inbox.p2, []);
  assert.equal(hand(room, 'p1').length, 1);
});

test('FU 6: eine hand_id aus der Hand eines anderen Spielers wird abgewiesen – seine Hand bleibt', () => {
  const { room, inbox } = makeRoom();
  const [seine] = ziehe(room, inbox, 'p2', 1);
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: seine.handId, x: FREI.x, y: FREI.y });

  assert.deepEqual(types(inbox.p1), ['error']);
  assert.deepEqual(inbox.p2, []);
  assert.equal(hand(room, 'p2').length, 1);
  assert.equal(tisch(room, seine.tableId), undefined);
});

test('FU 6: eine in der Nachricht mitgeschickte card (der alte Weg) wird nicht gelesen', () => {
  const { room, inbox } = makeRoom();
  const [karte] = ziehe(room, inbox, 'p1', 1);
  const n = room.boardState.cards.length;
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: karte.handId, x: 400, y: 400, card: { tableId: 'faelschung', name: 'Fälschung', faceDown: false } });

  assert.equal(room.boardState.cards.length, n + 1);
  assert.equal(tisch(room, 'faelschung'), undefined);
  assert.equal(tisch(room, karte.tableId).name, karte.name);

  // ohne hand_id hilft die Karte in der Nachricht nicht
  send(room, 'p1', { type: 'card_play_from_hand', x: 400, y: 400, card: { tableId: 'faelschung2', name: 'Fälschung' } });
  assert.equal(tisch(room, 'faelschung2'), undefined);
  assert.equal(inbox.p1.filter(m => m.type === 'error').length, 1);
});

test('FU 6: ein Ziel ohne Zahlen wird abgewiesen, die Karte bleibt in der Hand', () => {
  const { room, inbox } = makeRoom();
  const [karte] = ziehe(room, inbox, 'p1', 1);
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: karte.handId, x: 'a', y: null });
  assert.deepEqual(types(inbox.p1), ['error']);
  assert.equal(hand(room, 'p1').length, 1);
});

// ── 7. Aufnehmen ─────────────────────────────────────────────────────────────

test('FU 7: card_pickup_to_hand an einer losen Karte – sie geht in die Hand; er bekommt draw_response, alle card_removed', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_pickup_to_hand', table_id: 'lose' });

  assert.equal(tisch(room, 'lose'), undefined);
  assert.equal(hand(room, 'p1').length, 1);
  const h = hand(room, 'p1')[0];
  assert.equal(h.tableId, 'lose');
  assert.equal(h.name, 'Lose');
  assert.ok(h.handId);

  const antwort = inbox.p1.find(m => m.type === 'draw_response');
  assert.deepEqual(antwort.cards.map(c => c.handId), [h.handId]);
  assert.equal(inbox.p2.some(m => m.type === 'draw_response'), false);
  for (const box of [inbox.p1, inbox.p2]) assert.equal(box.find(m => m.type === 'card_removed').table_id, 'lose');
});

test('FU 7: aus der eigenen Hand-Zone geht es, aus der fremden nicht (error, nichts ändert sich); der Rundlauf Aufnehmen → Ausspielen ist verlustfrei', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_pickup_to_hand', table_id: 'rot' });
  assert.equal(tisch(room, 'rot'), undefined, 'die eigene Zone: aufgenommen');
  inbox.p1.length = 0;
  inbox.p2.length = 0;

  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'card_pickup_to_hand', table_id: 'blau' });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), ['error']);
  assert.equal(inbox.p1[0].message, 'Das ist die Hand eines anderen Spielers.');
  assert.deepEqual(inbox.p2, []);
  assert.equal(hand(room, 'p1').length, 1);

  const [karte] = hand(room, 'p1');
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: karte.handId, x: FREI.x + 300, y: FREI.y });
  assert.equal(tisch(room, 'rot').name, 'Rot');
  assert.equal(tisch(room, 'rot').faceDown, false);
});

test('FU 7: eine Karte im Stapel und eine unbekannte Id → error', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'card_pickup_to_hand', table_id: 'sev3' });         // liegt im Stapel
  send(room, 'p1', { type: 'card_pickup_to_hand', table_id: 'gibtsnicht' });
  send(room, 'p1', { type: 'card_pickup_to_hand' });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), ['error', 'error', 'error']);
  assert.deepEqual(inbox.p2, []);
  assert.equal(hand(room, 'p1').length, 0);
});

// ── 10. Jeder Raum, nichts sonst ─────────────────────────────────────────────

test('FU 10: ein Solo-Raum (Zonen ohne Farbe) mit zwei Spielern – Ziehen, Ausspielen, Aufnehmen wie in 1–7; Ausspielen in jede Zone ist offen', () => {
  const { room, inbox } = makeRoom({ zones: SOLO });
  const [a, b, c] = ziehe(room, inbox, 'p1', 3);

  // dieselbe Stelle, die mit Eigentum gesperrt (blau) bzw. verdeckt (rot) wäre: hier offen und angewandt
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: a.handId, x: IN_BLAU.x, y: IN_BLAU.y });
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: b.handId, x: IN_ROT.x, y: IN_ROT.y });
  assert.equal(tisch(room, a.tableId).faceDown, false);
  assert.equal(tisch(room, b.tableId).faceDown, false);
  assert.equal(inbox.p1.some(m => m.type === 'error'), false);
  assert.deepEqual(types(inbox.p2), ['card_play_from_hand', 'player_hand_count', 'card_play_from_hand', 'player_hand_count']);

  // aufnehmen auch aus der „fremden" Zone: dort gibt es keinen Eigentümer
  send(room, 'p1', { type: 'card_pickup_to_hand', table_id: 'blau' });
  assert.equal(tisch(room, 'blau'), undefined);
  assert.equal(hand(room, 'p1').length, 2);
  assert.ok(hand(room, 'p1').some(h => h.handId === c.handId));
  assert.equal(inbox.p1.some(m => m.type === 'error'), false);
});

test('FU 10: dieselbe Änderung mit und ohne Eigentum – dieselben Nachrichten (nur faceDown in der eigenen Zone unterscheidet)', () => {
  const lauf = (zones) => {
    const { room, inbox } = makeRoom({ zones });
    const karten = ziehe(room, inbox, 'p1', 2);
    send(room, 'p1', { type: 'card_play_from_hand', hand_id: karten[0].handId, x: 400, y: 400 });
    send(room, 'p1', { type: 'card_pickup_to_hand', table_id: karten[0].tableId });
    send(room, 'p1', { type: 'card_draw_to_hand', stack_id: 'szwei', count: 1 });
    return [types(inbox.p1), types(inbox.p2)];
  };
  assert.deepEqual(lauf(GEBUNDEN), lauf(SOLO));
});

test('FU 10: alle anderen Nachrichten verhalten sich wie vorher – Würfel, Zähler, Token, Notizen, card_move auf neutraler Fläche', () => {
  const { room, inbox } = makeRoom({ zones: SOLO });
  room.boardState.counters.push({ id: 'c1', value: 1, x: 0, y: 0 });
  send(room, 'p1', { type: 'counter_update', counter_id: 'c1', value: 7 });
  send(room, 'p1', { type: 'card_move', table_id: 'lose', x: IN_BLAU.x, y: IN_BLAU.y });
  send(room, 'p1', { type: 'card_flip', table_id: 'blau', face_down: false });
  assert.equal(room.boardState.counters[0].value, 7);
  assert.equal(tisch(room, 'blau').faceDown, false);
  assert.deepEqual(types(inbox.p2), ['counter_update', 'card_move', 'card_flip']);
  assert.deepEqual(inbox.p1, []);
});

test('FU: ownZoneAt – die Hand-Zone der eigenen Farbe am Punkt; null für die fremde, ohne Farbe, ohne Eigentümer, daneben', () => {
  const zonen = resolveServerZones({ tokens: [TABLEAU3], boards: [] }, GEBUNDEN);
  assert.equal(ownZoneAt(zonen, 'red', IN_ROT.x, IN_ROT.y).id, 'zhand1');
  assert.equal(ownZoneAt(zonen, 'blue', IN_BLAU.x, IN_BLAU.y).id, 'zhand3', 'auch die verankerte Hand, nach der Auflösung');
  assert.equal(ownZoneAt(zonen, 'blue', IN_ROT.x, IN_ROT.y), null, 'fremd');
  assert.equal(ownZoneAt(zonen, null, IN_ROT.x, IN_ROT.y), null, 'Hotseat: keine Farbe');
  assert.equal(ownZoneAt(zonen, 'red', FREI.x, FREI.y), null, 'daneben');
  assert.equal(ownZoneAt(resolveServerZones({ tokens: [TABLEAU3] }, SOLO), 'red', IN_ROT.x, IN_ROT.y), null, 'ohne Eigentümer');
  assert.equal(ownZoneAt(null, 'red', 1, 1), null);
});
