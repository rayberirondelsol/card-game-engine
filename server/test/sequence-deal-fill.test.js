// M11.2 – auf eine Zahl auffüllen ist etwas anderes als n Karten austeilen.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Der Befund aus der vierten Solopartie: `#23 deal_to_zone "Heldentaten" —
// failed: 5 of 6 cards stayed in the stack`. Die Dorfphase teilt stur sechs
// aus, obwohl fünf schon liegen. Das Ergebnis ist zufällig richtig, die
// Meldung ist Lärm – und sie erzeugt das Meldeband aus M11.1 Befund A.
//
// `fill` ist ein Feld am vorhandenen Schritt, keine dritte Lesart von `count`:
// `count <= 0` heißt heute „der ganze Stapel", eine negative Zahl wäre also
// eine stille Umdeutung vorhandener Aufbauten.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { STEP_TYPES, stepFields, describeStep, defaultStep, validateStep } =
  await import('../../client/src/utils/sequenceSteps.js');

const AUSLAGE = {
  id: 'z1', label: 'Heldentaten-Auslage',
  x: 0, y: 0, width: 600, height: 100,
  accepts: ['card'], capacity: 6,
};

/** Ein Stapel mit `n` Karten und `laid` Karten, die schon in der Zone liegen. */
function table(n, laid) {
  return {
    stacks: [{
      stackId: 's1', label: 'Heldentaten', x: 900, y: 900,
      cards: Array.from({ length: n }, (_, i) => ({
        tableId: `c${i}`, cardId: `card${i}`, name: `Heldentat ${i}`,
        x: 900, y: 900, zIndex: i + 1, width: 70, height: 100,
      })),
    }],
    cards: Array.from({ length: laid }, (_, i) => ({
      tableId: `l${i}`, cardId: `laid${i}`, name: `Liegt ${i}`,
      x: 50 + i * 90, y: 50, zIndex: i + 1, width: 70, height: 100,
    })),
    tokens: [], boards: [], counters: [],
  };
}

const deal = (extra) => ({
  type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 6,
  targetZoneLabel: 'Heldentaten-Auslage', faceDown: false, ...extra,
});

const run = (state, step) => executeSequenceWithLog(state, [step], [AUSLAGE]);

test('Abnahme 1: liegen schon sechs, teilt fill keine aus und meldet nichts', () => {
  const { state, log } = run(table(10, 6), deal({ fill: true }));
  assert.equal(log.length, 1);
  assert.equal(log[0].status, 'ok', `meldet doch: ${log[0].reason}`);
  assert.ok(!log[0].reason, `kein Protokollgrund, steht aber: ${log[0].reason}`);
  assert.equal(state.cards.length, 6, 'nichts dazugelegt');
  assert.equal(state.stacks[0].cards.length, 10, 'der Stapel bleibt unangetastet');
});

test('Abnahme 2: liegen zwei, teilt fill vier aus', () => {
  const { state, log } = run(table(10, 2), deal({ fill: true }));
  assert.equal(log[0].status, 'ok', `meldet doch: ${log[0].reason}`);
  assert.equal(state.cards.length, 6, 'zwei plus vier');
  assert.equal(state.stacks[0].cards.length, 6, 'vier haben den Stapel verlassen');
});

test('liegt nichts, füllt fill auf die volle Zahl – wie ein festes deal', () => {
  const { state, log } = run(table(10, 0), deal({ fill: true }));
  assert.equal(log[0].status, 'ok');
  assert.equal(state.cards.length, 6);
});

test('Abnahme 3: ein gewöhnliches deal_to_zone verhält sich unverändert', () => {
  // Genau der Befund: fünf liegen, sechs werden verlangt, einer passt noch.
  const { state, log } = run(table(10, 5), deal());
  assert.equal(log[0].status, 'failed', 'die feste Zahl meldet weiterhin');
  assert.match(log[0].reason, /5 of 6 cards stayed in the stack/);
  assert.equal(state.cards.length, 6);

  // Und die leere Zone: sechs verlangt, sechs ausgeteilt, keine Meldung.
  const clean = run(table(10, 0), deal());
  assert.equal(clean.log[0].status, 'ok');
  assert.equal(clean.state.cards.length, 6);
});

test('fill meldet weiterhin, wenn der Stapel nicht genug hergibt', () => {
  // Zwei liegen, vier fehlen, der Stapel hat drei. Das ist kein Lärm, sondern
  // eine Auskunft: die Auslage ist danach unvollständig.
  const { state, log } = run(table(3, 2), deal({ fill: true }));
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /held only 3 of 4/);
  assert.equal(state.cards.length, 5);
});

test('fill rechnet über alle Zielzonen derselben Beschriftung', () => {
  const zones = [
    { ...AUSLAGE, id: 'z1', capacity: 3 },
    { ...AUSLAGE, id: 'z2', x: 0, y: 200, capacity: 3 },
  ];
  // Zwei liegen in der oberen Zone, vier fehlen also auf sechs.
  const { state, log } = executeSequenceWithLog(table(10, 2), [deal({ fill: true })], zones);
  assert.equal(log[0].status, 'ok', `meldet doch: ${log[0].reason}`);
  assert.equal(state.cards.length, 6);
});

test('eine Zone, die gar keine Karten nimmt, meldet auch mit fill', () => {
  const zones = [{ ...AUSLAGE, accepts: ['asset'] }];
  const { log } = executeSequenceWithLog(table(10, 0), [deal({ fill: true })], zones);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /does not accept cards/);
});

// ── Der Schritt im Editor ────────────────────────────────────────────────────

test('der Editor kennt das Feld – sonst wäre fill nur über die Datenbank setzbar', () => {
  assert.ok(stepFields('deal_to_zone').includes('fill'), 'deal_to_zone hat kein Feld "fill"');
  // Nur dort. Ein Häkchen an `draw_assets` verspräche etwas, das der Handler
  // nicht liest – genau das Muster aus docs/audit-dead-controls.md.
  for (const t of STEP_TYPES.map(s => s.value).filter(s => s !== 'deal_to_zone')) {
    assert.ok(!stepFields(t).includes('fill'), `${t} bietet fill an, ohne es zu lesen`);
  }
});

test('ein frischer Schritt teilt aus, er füllt nicht – Abnahme 3 gilt auch im Editor', () => {
  assert.equal(defaultStep('deal_to_zone', { stackLabels: ['Heldentaten'] }).fill, false);
});

test('die Zeile sagt, welche der beiden Lesarten gilt', () => {
  const fixed = describeStep(deal());
  const upTo = describeStep(deal({ fill: true }));
  assert.notEqual(fixed, upTo, '"sechs austeilen" und "auf sechs auffüllen" lesen sich gleich');
  assert.match(fixed, /^Deal 6 /);
  assert.match(upTo, /up to 6/);
});

test('validateStep hat an fill nichts auszusetzen, und das Feld ist keins zu viel', () => {
  const ctx = { stackLabels: ['Heldentaten'], zoneLabels: ['Heldentaten-Auslage'] };
  const step = deal({ fill: true });
  assert.deepEqual(validateStep(step, ctx), []);
  const allowed = new Set([...stepFields(step), 'type']);
  for (const key of Object.keys(step)) assert.ok(allowed.has(key), `kein Editorfeld für "${key}"`);
});
