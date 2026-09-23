// M4a – Zähler gehören in den Aufbau (docs/spec-setup-system.md, „M4a").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Wie sequence-deal-fields.test.js: der Executor und das Schrittvokabular sind
// reine Module im Client-Bundle und werden direkt importiert. Das Zähler-Modell
// selbst liegt seit M4a in client/src/utils/counters.js – genau damit die
// Speicher-/Ladewege keine eigene Feldliste mehr führen, an der `max` hängen
// bleiben könnte (docs/audit-dead-controls.md).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../client/src/utils/sequenceExecutor.js');
const { STEP_TYPES, stepFields, defaultStep, describeStep, validateStep } = await import('../../client/src/utils/sequenceSteps.js');
const { normalizeCounter } = await import('../../client/src/utils/counters.js');

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });

const run = (step) => executeSequence(emptyState(), [step], []);
const runWithLog = (step) => executeSequenceWithLog(emptyState(), [step], []);

// ── Der Schritt legt den Zähler an ───────────────────────────────────────────

test('place_counter legt einen Zähler mit Name, Startwert und Position an', () => {
  const out = run({ type: 'place_counter', name: 'Münzen', value: 30, x: 120, y: -40 });
  assert.equal(out.counters.length, 1);
  const c = out.counters[0];
  assert.equal(c.name, 'Münzen');
  assert.equal(c.value, 30);
  assert.equal(c.x, 120);
  assert.equal(c.y, -40);
  assert.ok(c.id, 'ein Zähler ohne id ist am Tisch nicht adressierbar');
  assert.equal(c.locked, false);
});

test('place_counter übernimmt max', () => {
  const out = run({ type: 'place_counter', name: 'Leben', value: 2, max: 3, x: 0, y: 0 });
  assert.equal(out.counters[0].max, 3);
});

test('ohne max bleibt das Feld leer und der Zähler verhält sich wie bisher', () => {
  const out = run({ type: 'place_counter', name: 'Münzen', value: 0, x: 0, y: 0 });
  const c = out.counters[0];
  assert.equal(c.max, undefined);
  assert.ok(!('max' in c) || c.max === undefined);
  assert.deepEqual(Object.keys(c).sort(), ['id', 'locked', 'name', 'value', 'x', 'y']);
});

test('ohne Startwert beginnt der Zähler bei 0', () => {
  const out = run({ type: 'place_counter', name: 'Münzen', x: 0, y: 0 });
  assert.equal(out.counters[0].value, 0);
});

test('mehrere place_counter legen mehrere Zähler an, vorhandene bleiben', () => {
  const state = { ...emptyState(), counters: [{ id: 'alt', name: 'Alt', value: 1, x: 0, y: 0, locked: false }] };
  const out = executeSequence(state, [
    { type: 'place_counter', name: 'A', value: 1, x: 10, y: 10 },
    { type: 'place_counter', name: 'B', value: 2, max: 5, x: 20, y: 20 },
  ], []);
  assert.deepEqual(out.counters.map(c => c.name), ['Alt', 'A', 'B']);
});

// ── Fehlende Angaben ─────────────────────────────────────────────────────────

test('ohne Namen wird der Schritt übersprungen statt einen namenlosen Zähler zu legen', () => {
  const { state, log } = runWithLog({ type: 'place_counter', value: 1, x: 0, y: 0 });
  assert.equal((state.counters || []).length, 0);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /name/i);
});

test('ohne Position wird der Schritt übersprungen', () => {
  const { state, log } = runWithLog({ type: 'place_counter', name: 'Münzen', value: 1 });
  assert.equal((state.counters || []).length, 0);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /position/i);
});

test('der Protokolleintrag nennt den Zähler beim Namen', () => {
  const { log } = runWithLog({ type: 'place_counter', name: 'Münzen', value: 1, x: 0, y: 0 });
  assert.equal(log[0].target, 'Münzen');
  assert.equal(log[0].status, 'ok');
});

// ── Das Schrittvokabular kennt den Typ ───────────────────────────────────────

test('place_counter steht im Schrittvokabular mit seinen fünf Feldern', () => {
  const spec = STEP_TYPES.find(t => t.value === 'place_counter');
  assert.ok(spec, 'place_counter fehlt in STEP_TYPES – der Editor böte den Schritt nicht an');
  assert.deepEqual(spec.fields, ['name', 'value', 'max', 'x', 'y']);
  assert.deepEqual(stepFields({ type: 'place_counter' }), ['name', 'value', 'max', 'x', 'y']);
});

test('ein frischer place_counter-Schritt ist bis auf den Namen ausgefüllt', () => {
  const step = defaultStep('place_counter', {});
  assert.equal(step.type, 'place_counter');
  assert.equal(step.value, 0);
  assert.equal(step.x, 0);
  assert.equal(step.y, 0);
  assert.equal(step.max, undefined, 'max ist optional und wird nicht geraten');
});

test('die Zusammenfassung nennt Name, Startwert und Stelle', () => {
  const line = describeStep({ type: 'place_counter', name: 'Münzen', value: 30, x: 10, y: 20 });
  assert.match(line, /Münzen/);
  assert.match(line, /30/);
  assert.match(line, /10, 20/);
  assert.ok(!line.includes('/'), `ohne max keine Obergrenze in der Zeile: ${line}`);
});

test('die Zusammenfassung zeigt die Obergrenze, wenn es eine gibt', () => {
  const line = describeStep({ type: 'place_counter', name: 'Leben', value: 2, max: 3, x: 0, y: 0 });
  assert.match(line, /2 \/ 3/);
});

test('die Validierung meldet einen fehlenden Namen', () => {
  assert.deepEqual(validateStep({ type: 'place_counter', value: 0, x: 0, y: 0 }, {}), ['no counter name given']);
  assert.deepEqual(validateStep({ type: 'place_counter', name: '  ', value: 0, x: 0, y: 0 }, {}), ['no counter name given']);
});

test('die Validierung meldet eine fehlende Position', () => {
  const problems = validateStep({ type: 'place_counter', name: 'Münzen', value: 0 }, {});
  assert.ok(problems.some(p => /position/i.test(p)), `erwartet Positionsmeldung, war: ${problems.join('; ')}`);
});

test('ein vollständiger place_counter-Schritt ist fehlerfrei, mit und ohne max', () => {
  assert.deepEqual(validateStep({ type: 'place_counter', name: 'Münzen', value: 30, x: 0, y: 0 }, {}), []);
  assert.deepEqual(validateStep({ type: 'place_counter', name: 'Leben', value: 2, max: 3, x: 0, y: 0 }, {}), []);
});

test('die Validierung meldet ein max, das keine Zahl ist', () => {
  const problems = validateStep({ type: 'place_counter', name: 'Leben', value: 2, max: 'drei', x: 0, y: 0 }, {});
  assert.ok(problems.some(p => /max/i.test(p)), `erwartet max-Meldung, war: ${problems.join('; ')}`);
});

// ── Speichern und Laden ──────────────────────────────────────────────────────
//
// getGameState und loadGameState in GameTable.jsx bauen den Zähler beide über
// normalizeCounter neu auf. Was diese Funktion nicht kennt, überlebt den Weg
// durch die Datenbank nicht – deshalb wird sie hier und nicht die JSX geprüft.

test('ein gespeicherter und wieder geladener Zähler behält max', () => {
  const placed = run({ type: 'place_counter', name: 'Leben', value: 2, max: 3, x: 5, y: 6 }).counters[0];
  const saved = JSON.parse(JSON.stringify(normalizeCounter(placed)));
  const loaded = normalizeCounter(saved);
  assert.deepEqual(loaded, placed);
  assert.equal(loaded.max, 3);
});

test('ein Zähler ohne max bekommt beim Laden auch keins', () => {
  const placed = run({ type: 'place_counter', name: 'Münzen', value: 30, x: 5, y: 6 }).counters[0];
  const loaded = normalizeCounter(JSON.parse(JSON.stringify(placed)));
  assert.equal(loaded.max, undefined);
  assert.equal('max' in loaded, false);
});

test('normalizeCounter füllt einen alten Zähler ohne id und locked auf', () => {
  const loaded = normalizeCounter({ name: 'Alt', value: 3, x: 1, y: 2 });
  assert.ok(loaded.id);
  assert.equal(loaded.locked, false);
  assert.equal(loaded.value, 3);
});

test('normalizeCounter wirft ein unbrauchbares max weg statt "2 / NaN" anzuzeigen', () => {
  assert.equal(normalizeCounter({ id: 'a', name: 'x', value: 1, max: 'drei', x: 0, y: 0 }).max, undefined);
  assert.equal(normalizeCounter({ id: 'a', name: 'x', value: 1, max: null, x: 0, y: 0 }).max, undefined);
  assert.equal(normalizeCounter({ id: 'a', name: 'x', value: 1, max: '3', x: 0, y: 0 }).max, 3);
});
