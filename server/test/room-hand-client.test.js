// FM Nr. 2–6 / Spec M32.5, M32.6 — die reinen Teile der Hand im Client: `client/src/utils/roomHand.js`
// (`playedCard`, `isOwnEcho`, `removeHandCard`, `removeDrawn`, `handFromServer`). Der Client hat keine
// Testinfrastruktur (`CLAUDE.md`); die Rechnung steht darum in einem reinen Modul und wird hier geprüft,
// `GameTable.jsx` ruft sie in FQ nur noch auf (Muster: `roomBoardState.js`, `tableObjectView.js`).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Karten kommen aus der echten Fixture (`auslagen-kurzpartie.json`): eine Bibliothekskarte plus Ort/Seite, so
// wie der Executor sie austeilt (`...card, tableId, x, y, faceDown, rotation, zIndex`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { playedCard, isOwnEcho, removeHandCard, removeDrawn, handFromServer } = await import('../../client/src/utils/roomHand.js');
const { tableObjectView, HIDDEN_CAPTION } = await import('../../client/src/utils/tableObjectView.js');

const auszug = JSON.parse(fs.readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));
const [K1, K2] = auszug.cards;
const copy = (x) => JSON.parse(JSON.stringify(x));

/** Die Karte, wie `card_play_from_hand` sie verteilt (M32.6). */
const verteilt = (extra = {}) => ({ ...K1, tableId: 'tc1', x: 300, y: 400, faceDown: false, rotation: 0, inStack: null, zIndex: 9, ...extra });
const msg = (card, extra = {}) => ({ type: 'card_play_from_hand', card, hand_id: 'h1', x: card.x, y: card.y, from_player_id: 'p2', ...extra });

// ── 2. playedCard ────────────────────────────────────────────────────────────

test('FM 2: `faceDown` kommt aus der Nachricht – `true` bleibt `true`, `false` bleibt `false`', () => {
  const [verdeckt] = playedCard([], msg(verteilt({ faceDown: true })), 10);
  const [offen] = playedCard([], msg(verteilt({ faceDown: false })), 10);
  assert.equal(verdeckt.faceDown, true);
  assert.equal(offen.faceDown, false);
});

test('FM 2: fehlt `faceDown` in der Nachricht: offen – das Verhalten von heute', () => {
  const karte = verteilt();
  delete karte.faceDown;
  assert.equal(playedCard([], msg(karte), 10)[0].faceDown, false);
});

test('FM 2: der Befund – die Kartenform, die der Server in eine fremde Hand-Zone verteilt (`faceDown: true`), kommt **verdeckt** an (die alte Anwendung machte sie offen)', () => {
  const [karte] = playedCard([], msg(verteilt({ faceDown: true })), 10);
  assert.equal(karte.faceDown, true);
  // die alte Anwendung, wörtlich aus `applyRemoteAction` (GameTable.jsx, vor FQ):
  const alt = { ...msg(verteilt({ faceDown: true })).card, inStack: null, faceDown: false, rotation: 0, zIndex: 10 };
  assert.equal(alt.faceDown, false);
});

test('FM 2: `inStack: null`, `zIndex` obenauf (`maxZ + 1`), `rotation` aus der Karte, Ort und Felder der Karte bleiben', () => {
  const [karte] = playedCard([], msg(verteilt({ rotation: 90, inStack: 'xyz', zIndex: 1, gridId: 'g', cell: 'C7' })), 41);
  assert.equal(karte.inStack, null);
  assert.equal(karte.zIndex, 42);
  assert.equal(karte.rotation, 90);
  assert.equal(karte.tableId, 'tc1');
  assert.equal(karte.name, K1.name);
  assert.equal(karte.image_path, K1.image_path);
  assert.deepEqual([karte.x, karte.y, karte.gridId, karte.cell], [300, 400, 'g', 'C7']);

  const ohne = verteilt();
  delete ohne.rotation;
  assert.equal(playedCard([], msg(ohne), 1)[0].rotation, 0, 'fehlt sie: 0');
});

test('FM 2: fehlt `x`/`y` an der Karte, gelten die der Nachricht', () => {
  const karte = verteilt();
  delete karte.x; delete karte.y;
  const [angelegt] = playedCard([], { ...msg(karte), x: 11, y: 22 }, 1);
  assert.deepEqual([angelegt.x, angelegt.y], [11, 22]);
});

test('FM 2: dieselbe `tableId` schon am Tisch → keine Doppelung, die Liste kommt **unverändert** zurück', () => {
  const liste = [{ ...verteilt(), zIndex: 3 }, { ...K2, tableId: 'andere', x: 0, y: 0 }];
  const vor = copy(liste);
  const neu = playedCard(liste, msg(verteilt({ faceDown: true })), 10);
  assert.equal(neu, liste);
  assert.deepEqual(liste, vor);
});

test('FM 2: eine neue Karte wird **angehängt**, die Eingabe bleibt unverändert; keine Karte in der Nachricht → unverändert', () => {
  const liste = [{ ...K2, tableId: 'andere', x: 0, y: 0 }];
  const vor = copy(liste);
  const neu = playedCard(liste, msg(verteilt()), 5);
  assert.equal(neu.length, 2);
  assert.equal(neu[0], liste[0]);
  assert.deepEqual(liste, vor);
  assert.equal(playedCard(liste, { type: 'card_play_from_hand' }, 5), liste);
  assert.equal(playedCard(liste, null, 5), liste);
});

// ── 3. Echo und Hand ─────────────────────────────────────────────────────────

test('FM 3: `isOwnEcho` – wahr, wenn `from_player_id` der eigene ist', () => {
  assert.equal(isOwnEcho({ from_player_id: 'p1' }, 'p1'), true);
  assert.equal(isOwnEcho({ from_player_id: 'p2' }, 'p1'), false);
  assert.equal(isOwnEcho({}, 'p1'), false);
  assert.equal(isOwnEcho({ from_player_id: undefined }, undefined), false, 'ohne Spieler-Id (Hotseat) nie');
  assert.equal(isOwnEcho(null, 'p1'), false);
});

test('FM 3: `removeHandCard(hand, handId)` – entfernt die Karte (Rückmeldung des Servers); unbekannte Id ändert nichts', () => {
  const hand = [{ handId: 'h1', name: 'a' }, { handId: 'h2', name: 'b' }, { handId: 'h3', name: 'c' }];
  const vor = copy(hand);
  const neu = removeHandCard(hand, 'h2');
  assert.deepEqual(neu.map(c => c.handId), ['h1', 'h3']);
  assert.deepEqual(hand, vor, 'die Eingabe bleibt');
  assert.equal(removeHandCard(hand, 'unbekannt'), hand);
  assert.deepEqual(removeHandCard(null, 'h1'), []);
});

// ── 4. removeDrawn ───────────────────────────────────────────────────────────

const stapel = (n, id = 's1') => Array.from({ length: n }, (_, i) => ({ ...K1, tableId: `${id}-${i}`, inStack: id, x: 10, y: 20, zIndex: i + 1, faceDown: true }));
/** Die Nachricht, wie der Server sie nach dem Ziehen an **alle** schickt: nur Ids und eine Zahl (FU 1). */
const gezogen = (stackId, size, removed) => ({ type: 'stack_size_update', stack_id: stackId, size, removed, from_player_id: 'p2' });

test('FM 4: `removeDrawn` entfernt genau die Karten mit diesen Ids; der Rest bleibt im Stapel, unverändert', () => {
  const liste = [...stapel(4), { ...K2, tableId: 'frei', inStack: null, x: 0, y: 0 }];
  const vor = copy(liste);
  const neu = removeDrawn(liste, gezogen('s1', 2, ['s1-2', 's1-3']));
  assert.deepEqual(neu.map(c => c.tableId), ['s1-0', 's1-1', 'frei']);
  assert.equal(neu[0].inStack, 's1');
  assert.equal(neu[1].inStack, 's1');
  assert.equal(neu[0], liste[0], 'die übrigen Karten sind dieselben Objekte');
  assert.deepEqual(liste, vor);
});

test('FM 4: bleibt **eine** Karte im Stapel, ist es keiner mehr (`inStack: null`, die Regel von `performSplit`)', () => {
  const liste = [...stapel(3), ...stapel(2, 's2')];
  const neu = removeDrawn(liste, gezogen('s1', 1, ['s1-1', 's1-2']));
  assert.deepEqual(neu.filter(c => c.tableId.startsWith('s1')).map(c => [c.tableId, c.inStack]), [['s1-0', null]]);
  assert.ok(neu.filter(c => c.inStack === 's2').length === 2, 'ein anderer Stapel bleibt unberührt');
});

test('FM 4: unbekannte Ids ändern nichts (dieselbe Liste); teils bekannte entfernen nur die bekannten', () => {
  const liste = stapel(3);
  assert.equal(removeDrawn(liste, gezogen('s1', 3, ['gibtsnicht'])), liste);
  assert.equal(removeDrawn(liste, gezogen('s1', 3, [])), liste);
  assert.equal(removeDrawn(liste, { type: 'stack_size_update', stack_id: 's1', size: 3 }), liste, '`removed` fehlt (alter Server)');
  assert.equal(removeDrawn(liste, null), liste);
  assert.deepEqual(removeDrawn(liste, gezogen('s1', 2, ['s1-2', 'gibtsnicht'])).map(c => c.tableId), ['s1-0', 's1-1']);
});

test('FM 4: `stack_removed` (die letzte Karte gezogen) bleibt, wie es ist – `removeDrawn` fasst es nicht an', () => {
  // Der bestehende Fall ist `setTableCards(prev => prev.filter(c => c.inStack !== msg.stack_id))`;
  // `removeDrawn` kennt nur `stack_size_update` mit `removed`.
  const liste = stapel(2);
  assert.equal(removeDrawn(liste, { type: 'stack_removed', stack_id: 's1' }), liste);
});

test('FM 4: kein Name, kein Bild steht in der Nachricht, die gelesen wird – nur Ids und Zahlen', () => {
  const m = gezogen('s1', 2, ['s1-2', 's1-3']);
  assert.deepEqual(Object.keys(m).sort(), ['from_player_id', 'removed', 'size', 'stack_id', 'type']);
  assert.ok(m.removed.every(id => typeof id === 'string'));
  const json = JSON.stringify(m);
  assert.ok(!json.includes(K1.name) && !json.includes('image_path') && !json.includes('/uploads/'));
  // das Ergebnis trägt die Tischkarten, die der Client schon hatte – die Funktion denkt sich nichts aus
  assert.equal(removeDrawn(stapel(4), m).length, 2);
});

// ── 5. handFromServer ────────────────────────────────────────────────────────

test('FM 5: `handFromServer` – Handkarten mit der `handId` des Servers (fehlt sie: eine neue), `cardId` aus `cardId` oder `id`', () => {
  const hand = handFromServer([
    { handId: 'h-server', cardId: 'c1', name: 'A', image_path: '/a.png', card_back_id: 'b1', width: 744, height: 744, extra: 'x' },
    { ...K2 },
  ]);
  assert.equal(hand.length, 2);
  assert.deepEqual(hand[0], { handId: 'h-server', cardId: 'c1', name: 'A', image_path: '/a.png', card_back_id: 'b1', width: 744, height: 744 });
  assert.equal(hand[1].cardId, K2.id, '`id` der Bibliothekskarte');
  assert.equal(typeof hand[1].handId, 'string');
  assert.ok(hand[1].handId.length > 8, 'eine neue Id');
  assert.equal(hand[1].name, K2.name);
  assert.equal(hand[1].image_path, K2.image_path);
  assert.equal(hand[1].card_back_id, K2.card_back_id);
  assert.equal(hand[1].width, K2.width);
});

test('FM 5: fehlende Maße → 0, fehlender Kartenrücken → `null`; zwei fehlende `handId`s sind verschieden', () => {
  const [a, b] = handFromServer([{ cardId: 'c', name: 'n', image_path: '/p' }, { cardId: 'd', name: 'm', image_path: '/q' }]);
  assert.equal(a.width, 0);
  assert.equal(a.height, 0);
  assert.equal(a.card_back_id, null);
  assert.notEqual(a.handId, b.handId);
});

test('FM 5: leere oder fehlende Liste → `[]`', () => {
  assert.deepEqual(handFromServer([]), []);
  assert.deepEqual(handFromServer(undefined), []);
  assert.deepEqual(handFromServer(null), []);
  assert.deepEqual(handFromServer('x'), []);
});

// ── 6. Die Ankunft bei den anderen ist verdeckt ──────────────────────────────

test('FM 6: eine Karte mit `faceDown: true`, wie sie in eine fremde Hand-Zone verteilt wird, gibt weder Namen noch Bildunterschrift frei', () => {
  const [karte] = playedCard([], msg(verteilt({ faceDown: true })), 10);
  const view = tableObjectView(karte);
  assert.equal(view.hidden, true);
  assert.equal(view.name, '');
  assert.equal(view.caption, HIDDEN_CAPTION);
  assert.equal(view.caption, 'Face down');
  assert.ok(!JSON.stringify(view).includes(K1.name));
  // Gegenprobe: aufgedeckt, wie die Karte offen auf den Tisch gelegt wird
  const [offen] = playedCard([], msg(verteilt({ faceDown: false })), 10);
  assert.equal(tableObjectView(offen).name, K1.name);
});
