// R2 – `rotate_zone`: die „Wer ist dran?"-Leiste rückt auf
// (docs/tasks-rundenwende.md R2; Spec M8.4 Schritt 4, Regelwerk §7 Schritt 7).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Geprüft vorab: `reveal_next` liest dieselbe `slotOrder`, verschiebt aber ein
// einzelnes Objekt in eine *andere* Zone; `clear_zone` räumt aus. Innerhalb
// derselben Zone zu drehen kann nichts davon.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// Fünf Plätze in einer Spalte: y = 120, 160, 200, 240, 280 bei x = 200.
const BAR = {
  id: 'z-bar', label: "Buyin'/Beatin'-Leiste", x: 160, y: 100, width: 80, height: 200,
  accepts: ['asset'], capacity: 5, layout: 'column',
};
const ZONES = [BAR, { id: 'z-leer', label: 'Leer', x: 900, y: 900, width: 80, height: 80, accepts: ['asset'], capacity: 2, layout: 'column' }];

const villager = (name, y, extra = {}) => ({ id: name, assetId: name, label: `Figur: ${name}`, x: 200, y, size: 40, ...extra });

// Die Startstellen holt der Test aus `zoneSlots`, damit er nicht von Hand
// nachrechnet, was die Zone ohnehin sagt.
const { zoneSlots } = await import('../../shared/zoneGeometry.js');
const SLOTS = zoneSlots(BAR);

const stateWith = (...tokens) => ({ cards: [], stacks: [], tokens, boards: [], counters: [] });
const run = (state, step) => executeSequence(state, [step], ZONES);
const logOf = (state, step) => executeSequenceWithLog(state, [step], ZONES).log[0];
const at = (out, name) => out.tokens.find(t => t.label === `Figur: ${name}`);

test('drei Dörfler: der oberste geht nach unten, die anderen rücken auf', () => {
  const state = stateWith(
    villager('Henlo', SLOTS[0].y),
    villager('Gunter', SLOTS[1].y),
    villager('Pippa', SLOTS[2].y),
  );
  const out = run(state, { type: 'rotate_zone', zoneLabel: "Buyin'/Beatin'-Leiste" });
  assert.equal(at(out, 'Henlo').y, SLOTS[2].y, 'der oberste steht jetzt unten');
  assert.equal(at(out, 'Gunter').y, SLOTS[0].y);
  assert.equal(at(out, 'Pippa').y, SLOTS[1].y);
});

test('gedreht wird über die belegten Stellen, nicht über alle Plätze der Zone', () => {
  // Die Leiste hat fünf Plätze, drei sind besetzt. „Nach unten" heißt ans Ende
  // der drei, nicht auf Platz fünf.
  const state = stateWith(
    villager('Henlo', SLOTS[0].y),
    villager('Gunter', SLOTS[1].y),
    villager('Pippa', SLOTS[2].y),
  );
  const out = run(state, { type: 'rotate_zone', zoneLabel: "Buyin'/Beatin'-Leiste" });
  assert.equal(at(out, 'Henlo').y, SLOTS[2].y);
  assert.notEqual(at(out, 'Henlo').y, SLOTS[4].y);
});

test('dreimal drehen ergibt bei drei Dörflern wieder den Ausgangszustand', () => {
  const state = stateWith(
    villager('Henlo', SLOTS[0].y),
    villager('Gunter', SLOTS[1].y),
    villager('Pippa', SLOTS[2].y),
  );
  const step = { type: 'rotate_zone', zoneLabel: "Buyin'/Beatin'-Leiste" };
  const out = executeSequence(state, [step, step, step], ZONES);
  assert.equal(at(out, 'Henlo').y, SLOTS[0].y);
  assert.equal(at(out, 'Gunter').y, SLOTS[1].y);
  assert.equal(at(out, 'Pippa').y, SLOTS[2].y);
});

test('ein einzelnes Objekt bleibt liegen, und der Schritt gilt als gelungen', () => {
  const state = stateWith(villager('Henlo', SLOTS[0].y));
  const entry = logOf(state, { type: 'rotate_zone', zoneLabel: "Buyin'/Beatin'-Leiste" });
  assert.equal(entry.status, 'ok');
  assert.equal(run(state, { type: 'rotate_zone', zoneLabel: "Buyin'/Beatin'-Leiste" }).tokens[0].y, SLOTS[0].y);
});

test('eine leere Zone zu drehen ist gelungen, nicht gescheitert', () => {
  const entry = logOf(stateWith(), { type: 'rotate_zone', zoneLabel: 'Leer' });
  assert.equal(entry.status, 'ok');
  assert.equal(entry.reason, null);
});

test('eine Zone, die es nicht gibt, wird übersprungen', () => {
  const entry = logOf(stateWith(), { type: 'rotate_zone', zoneLabel: 'Gibts nicht' });
  assert.equal(entry.status, 'skipped');
  assert.match(entry.reason, /Gibts nicht/);
});

test('ein gesperrtes Objekt bleibt stehen und steht im Protokoll', () => {
  const state = stateWith(
    villager('Henlo', SLOTS[0].y, { locked: true }),
    villager('Gunter', SLOTS[1].y),
    villager('Pippa', SLOTS[2].y),
  );
  const entry = logOf(state, { type: 'rotate_zone', zoneLabel: "Buyin'/Beatin'-Leiste" });
  assert.match(entry.reason ?? '', /Henlo/);
  const out = run(state, { type: 'rotate_zone', zoneLabel: "Buyin'/Beatin'-Leiste" });
  assert.equal(at(out, 'Henlo').y, SLOTS[0].y, 'der gesperrte bleibt, wo er ist');
  assert.equal(at(out, 'Gunter').y, SLOTS[2].y, 'die beiden anderen drehen unter sich');
  assert.equal(at(out, 'Pippa').y, SLOTS[1].y);
});

test('Karten in der Zone drehen mit', () => {
  const state = { ...stateWith(), cards: [
    { tableId: 'c1', cardId: 'c1', name: 'A', x: 200, y: SLOTS[0].y },
    { tableId: 'c2', cardId: 'c2', name: 'B', x: 200, y: SLOTS[1].y },
  ] };
  const out = run(state, { type: 'rotate_zone', zoneLabel: "Buyin'/Beatin'-Leiste" });
  assert.equal(out.cards.find(c => c.tableId === 'c1').y, SLOTS[1].y);
  assert.equal(out.cards.find(c => c.tableId === 'c2').y, SLOTS[0].y);
});
