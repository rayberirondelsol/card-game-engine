// M10.4 – Karten verschmelzen beim Ablegen still zu Stapeln.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Derselbe Grund wie bei library-shelf.test.js und pick-topmost.test.js: der
// Client hat keine Testinfrastruktur, also liegt der entscheidbare Teil – wem
// eine losgelassene Karte beitritt – in einem reinen Modul.
//
// Aufgaben: docs/tasks-ablegen.md, J1 und J3.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { stackAt } = await import('../../client/src/utils/cardDrop.js');

/** Ein Stapel an (x,y) mit den Tischmaßen einer Karte (getCardDims: 100x140). */
function stack(id, x, y, w = 100, h = 140) {
  return { id, x, y, w, h };
}

test('J1 Abnahme 1: auf dem Stapel abgelegt tritt man ihm bei', () => {
  assert.equal(stackAt({ x: 400, y: 300 }, [stack('s1', 400, 300)]), 's1');
});

test('J1 Abnahme 2: das Nachbarfeld (80 px Raster) ist kein Beitritt', () => {
  const stacks = [stack('s1', 400, 300)];
  assert.equal(stackAt({ x: 480, y: 300 }, stacks), null, 'in der Breite: 80 > 50');
  assert.equal(stackAt({ x: 400, y: 380 }, stacks), null, 'in der Hoehe: 80 > 70');
  assert.equal(stackAt({ x: 480, y: 380 }, stacks), null, 'diagonal');
});

test('J1: der Rand der Kartenflaeche gehoert noch dazu', () => {
  const stacks = [stack('s1', 400, 300)];
  assert.equal(stackAt({ x: 450, y: 370 }, stacks), 's1', 'genau die Ecke');
  assert.equal(stackAt({ x: 451, y: 300 }, stacks), null);
  assert.equal(stackAt({ x: 400, y: 371 }, stacks), null);
});

test('J1 Abnahme 3: von zwei ueberlappenden Stapeln gewinnt der naehere', () => {
  const stacks = [stack('s1', 400, 300), stack('s2', 430, 300)];
  assert.equal(stackAt({ x: 425, y: 300 }, stacks), 's2');
  // Und andersherum, damit nicht die Listenreihenfolge gewinnt.
  assert.equal(stackAt({ x: 405, y: 300 }, stacks), 's1');
  assert.equal(stackAt({ x: 405, y: 300 }, [stacks[1], stacks[0]]), 's1');
});

test('J1 Abnahme 4: leere und unbrauchbare Eingaben werfen nicht', () => {
  assert.equal(stackAt({ x: 0, y: 0 }, []), null);
  assert.equal(stackAt({ x: 0, y: 0 }, undefined), null);
  assert.equal(stackAt(undefined, [stack('s1', 0, 0)]), null);
  assert.equal(stackAt({ x: NaN, y: 0 }, [stack('s1', 0, 0)]), null);
  assert.equal(stackAt({ x: 0, y: 0 }, [{ id: 's1' }, stack('s2', 0, 0)]), 's2');
  assert.equal(stackAt({ x: 0, y: 0 }, [{ x: 0, y: 0, w: 100, h: 140 }]), null, 'ohne id kein Ziel');
});

test('J1: ohne Masse gelten die Tischmasse einer Karte', () => {
  assert.equal(stackAt({ x: 40, y: 60 }, [{ id: 's1', x: 0, y: 0 }]), 's1');
  assert.equal(stackAt({ x: 60, y: 0 }, [{ id: 's1', x: 0, y: 0 }]), null);
});

// Der belegte Schadensfall der dritten Solopartie: die aufgedeckte Karte liegt
// auf der `Ablage`, der Verhaltensstapel liegt ein Rasterfeld daneben. Mit der
// alten 80-Pixel-Umkreisfrage wurde sie verschluckt (Abstand 70 < 80), mit der
// Flaechenfrage bleibt sie liegen.
test('J3: die Karte auf der Ablage faellt nicht in den Nachziehstapel daneben', () => {
  const deck = stack('verhalten', 400, 300);
  assert.equal(stackAt({ x: 470, y: 300 }, [deck]), null);
  // Wer wirklich auf den Stapel legt, rastet auf dessen Stelle ein.
  assert.equal(stackAt({ x: 400, y: 300 }, [deck]), 'verhalten');
});

// ─── M10.9 / U6: die beiden Kandidatenlisten ────────────────────────────────
//
// `dropCandidates` stand als Funktion in `GameTable.jsx` und war damit
// ungeprueft. Sie zieht hierher um und bekommt eine Schwester fuer die losen
// Karten – beide fuettern dasselbe `stackAt`. "Liegt die Karte auf der
// anderen?" ist dieselbe Frage wie "liegt sie auf dem Stapel?"; eine zweite
// Geometrie waere eine zweite Antwort.
//
// Aufgaben: docs/tasks-ergonomie.md, U6.

const { stackCandidates, looseCandidates } = await import('../../client/src/utils/cardDrop.js');

/** Eine Tischkarte, so wie `tableCards` sie fuehrt. */
function card(tableId, x, y, extra = {}) {
  return { tableId, x, y, inStack: null, ...extra };
}

test('U6 Abnahme 1: zwei Karten desselben Stapels geben einen Kandidaten', () => {
  const cards = [
    card('a', 400, 300, { inStack: 's1' }),
    card('b', 400, 300, { inStack: 's1' }),
  ];
  assert.deepEqual(stackCandidates(cards, null), [{ id: 's1', x: 400, y: 300, w: 100, h: 140 }]);
});

test('U6 Abnahme 2: der eigene Stapel ist nie Kandidat', () => {
  const cards = [
    card('a', 400, 300, { inStack: 's1' }),
    card('b', 800, 300, { inStack: 's2' }),
  ];
  assert.deepEqual(stackCandidates(cards, 's1').map(c => c.id), ['s2']);
});

test('U6: lose Karten sind keine Stapelkandidaten', () => {
  assert.deepEqual(stackCandidates([card('a', 400, 300)], null), []);
});

test('U6 Abnahme 3: eine Karte in einem Stapel ist kein loser Kandidat', () => {
  const cards = [card('a', 400, 300, { inStack: 's1' }), card('b', 500, 300)];
  assert.deepEqual(looseCandidates(cards, new Set()).map(c => c.id), ['b']);
});

test('U6 Abnahme 2: ausgeschlossene Karten sind keine Kandidaten', () => {
  const cards = [card('a', 400, 300), card('b', 500, 300), card('c', 600, 300)];
  assert.deepEqual(looseCandidates(cards, new Set(['a', 'c'])).map(c => c.id), ['b']);
  // Ein Array tut es auch – der Aufrufer haelt die Auswahl mal so, mal so.
  assert.deepEqual(looseCandidates(cards, ['b']).map(c => c.id), ['a', 'c']);
});

test('U6 Abnahme 4: Karten ohne Masse bekommen die Tischmasse 100 x 140', () => {
  assert.deepEqual(looseCandidates([card('a', 10, 20)], new Set()), [
    { id: 'a', x: 10, y: 20, w: 100, h: 140 },
  ]);
});

test('U6 Abnahme 4: eine Querformat-Karte bringt ihre eigenen Masse mit', () => {
  const [hit] = looseCandidates([card('a', 0, 0, { width: 200, height: 100 })], new Set());
  assert.equal(hit.w, 140);
  assert.equal(hit.h, 70);
});

test('U6 Abnahme 5: nichts Lesbares gibt [] und wirft nicht', () => {
  assert.deepEqual(stackCandidates(null, null), []);
  assert.deepEqual(stackCandidates(undefined, 's1'), []);
  assert.deepEqual(looseCandidates(null, null), []);
  assert.deepEqual(looseCandidates([card('a', 1, 2)], null).map(c => c.id), ['a']);
});

test('U6: die Kandidaten passen in stackAt – eine Karte auf der anderen trifft', () => {
  const cards = [card('a', 400, 300), card('b', 480, 300)];
  assert.equal(stackAt({ x: 400, y: 300 }, looseCandidates(cards, new Set(['b']))), 'a');
  // Das Nachbarfeld (80 px) trifft nicht, genau wie bei einem Stapel.
  assert.equal(stackAt({ x: 320, y: 300 }, looseCandidates(cards, new Set(['b']))), null);
});

// ── M17.3/BE: der Stapel schlägt die Zone, die ihn ablehnt ───────────────────
//
// Befund F3 der neunten Solopartie, viermal: der Nachschubstapel liegt im
// Einzugsbereich der Zone `Bösewicht-Tableau` (`accepts: ['asset']`). Jedes
// Zurücklegen endete mit „zone 'Bösewicht-Tableau' does not accept cards"; eine
// Karte liegt seither offen daneben, der Vorrat zählt 24 statt 25.
//
// Der Karten-Zweig hatte keine Vorrangregel: `zoneAt` zuerst, und eine
// Abweisung kehrte um, bevor `stackAt` überhaupt gefragt wurde. Der Token-Zweig
// hat die Regel längst (`findNearestCardCorner` vor `zoneAt`) – das Besondere
// schlägt das Allgemeine. Keine zweite Regel daneben: `resolveDrop` ersetzt den
// einen `stackAt`-Aufruf, den `handleCardDragEnd` ohnehin macht.

const { resolveDrop } = await import('../../client/src/utils/cardDrop.js');

test('BE Abnahme 1: ein Stapel unter dem Punkt schlägt die Abweisung', () => {
  const hit = resolveDrop({
    point: { x: 400, y: 300 },
    stacks: [stack('s1', 400, 300)],
    refusal: 'zone "Bösewicht-Tableau" does not accept cards',
  });
  assert.deepEqual(hit, { stack: 's1', refusal: null });
});

test('BE Abnahme 2: ohne Stapel bleibt die Abweisung stehen', () => {
  const hit = resolveDrop({
    point: { x: 320, y: 300 },
    stacks: [stack('s1', 400, 300)],
    refusal: 'zone "Bösewicht-Tableau" does not accept cards',
  });
  assert.deepEqual(hit, { stack: null, refusal: 'zone "Bösewicht-Tableau" does not accept cards' });
});

test('BE: ohne Abweisung ändert sich nichts an der bisherigen Antwort', () => {
  assert.deepEqual(resolveDrop({ point: { x: 400, y: 300 }, stacks: [stack('s1', 400, 300)] }),
    { stack: 's1', refusal: null });
  assert.deepEqual(resolveDrop({ point: { x: 320, y: 300 }, stacks: [stack('s1', 400, 300)] }),
    { stack: null, refusal: null });
});

test('BE: nichts Lesbares gibt dieselbe Antwort wie stackAt und wirft nicht', () => {
  assert.deepEqual(resolveDrop({}), { stack: null, refusal: null });
  assert.deepEqual(resolveDrop({ point: null, stacks: null, refusal: '' }), { stack: null, refusal: null });
});

// ── BT / M21.1: in einer Zone, die ein Ablagestapel ist, ist der Haufen ein
// Stapel ───────────────────────────────────────────────────────────────────────
//
// `layout: 'stack'` war bis hierher nur eine Ortsregel (`stackPoint`, M12.5):
// dreizehn abgeworfene Boesewicht-Aktionen lagen als dreizehn lose Karten mit
// 6 Punkt Versatz auf der `Ablage`, und ohne Stapel gibt es kein Mischen.
// Aufgabe BT in docs/tasks-partie12.md.

const { pileUp } = await import('../../client/src/utils/cardDrop.js');

/** Die `Ablage` des Aufbaus *TFT Kurzpartie*, am Tisch gemessen. */
const ablage = { label: 'Ablage', layout: 'stack', shape: 'rect', x: 1479.6, y: 638.921, width: 117, height: 179.82 };
const MITTE = { x: ablage.x + ablage.width / 2, y: ablage.y + ablage.height / 2 };

/** Eine lose Karte auf der Ablage, `n` Lagen hoch gestaffelt (6 px je Lage). */
function abgelegt(id, n) {
  return { tableId: id, x: MITTE.x + n * 6, y: MITTE.y + n * 6, zIndex: 10 + n, inStack: null };
}

test('BT Abnahme 1: zwei abgelegte Karten werden ein Stapel, auf dem Stapelplatz', () => {
  const out = pileUp([abgelegt('a', 0), abgelegt('b', 1)], ablage, 's-neu');
  assert.deepEqual(out.map(c => c.inStack), ['s-neu', 's-neu']);
  for (const c of out) {
    assert.equal(c.x, MITTE.x);
    assert.equal(c.y, MITTE.y);
  }
});

test('BT Abnahme 1: die Reihenfolge bleibt – unten bleibt unten', () => {
  const out = pileUp([abgelegt('b', 1), abgelegt('a', 0), abgelegt('c', 2)], ablage, 's');
  const byZ = [...out].sort((p, q) => p.zIndex - q.zIndex).map(c => c.tableId);
  assert.deepEqual(byZ, ['a', 'b', 'c']);
  // Fortlaufend, damit "oberste Karte" eindeutig bleibt.
  assert.deepEqual([...out].map(c => c.zIndex).sort((p, q) => p - q), [10, 11, 12]);
});

test('BT Abnahme 2: ein vorhandener Stapel behaelt seine Id – sonst zaehlt #n neu', () => {
  const vorhanden = [
    { tableId: 'a', x: MITTE.x, y: MITTE.y, zIndex: 10, inStack: 's-alt' },
    { tableId: 'b', x: MITTE.x, y: MITTE.y, zIndex: 11, inStack: 's-alt' },
  ];
  const out = pileUp([...vorhanden, abgelegt('c', 1)], ablage, 's-neu');
  assert.deepEqual(out.map(c => c.inStack), ['s-alt', 's-alt', 's-alt']);
  // Die Hinzukommende liegt oben.
  assert.equal(out.find(c => c.tableId === 'c').zIndex, 12);
});

test('BT Abnahme 4: eine gesperrte Karte tritt nicht bei', () => {
  const out = pileUp([{ ...abgelegt('a', 0), locked: true }, abgelegt('b', 1), abgelegt('c', 2)], ablage, 's');
  assert.equal(out.find(c => c.tableId === 'a').inStack, null);
  assert.equal(out.find(c => c.tableId === 'b').inStack, 's');
  assert.equal(out.find(c => c.tableId === 'c').inStack, 's');
});

test('BT: nichts zu tun gibt die Liste unveraendert zurueck', () => {
  const eine = [abgelegt('a', 0)];
  assert.equal(pileUp(eine, ablage, 's'), eine, 'eine Karte ist kein Stapel');
  const row = { ...ablage, layout: 'row', capacity: 3 };
  const zwei = [abgelegt('a', 0), abgelegt('b', 1)];
  assert.equal(pileUp(zwei, row, 's'), zwei, 'nur eine Stapel-Zone staplt');
  const schon = zwei.map(c => ({ ...c, x: MITTE.x, y: MITTE.y, inStack: 's-alt' }));
  assert.equal(pileUp(schon, ablage, 's'), schon, 'liegt schon alles in einem Stapel');
  assert.equal(pileUp(null, ablage, 's'), null);
});

test('BT: was neben der Zone liegt, bleibt liegen – gefragt ist die Form', () => {
  const daneben = { tableId: 'x', x: ablage.x - 10, y: MITTE.y, zIndex: 20, inStack: null };
  const out = pileUp([abgelegt('a', 0), abgelegt('b', 1), daneben], ablage, 's');
  assert.equal(out.find(c => c.tableId === 'x').inStack, null);
  assert.equal(out.find(c => c.tableId === 'x').x, daneben.x);
});

test('BT: ein Stapel aus zwei Stapeln bekommt eine neue Id, und keine zweite bleibt', () => {
  const mix = [
    { tableId: 'a', x: MITTE.x, y: MITTE.y, zIndex: 1, inStack: 's1' },
    { tableId: 'b', x: MITTE.x, y: MITTE.y, zIndex: 2, inStack: 's1' },
    { tableId: 'c', x: MITTE.x + 6, y: MITTE.y + 6, zIndex: 3, inStack: 's2' },
  ];
  const out = pileUp(mix, ablage, 's-neu');
  assert.deepEqual(new Set(out.map(c => c.inStack)), new Set(['s-neu']));
});
