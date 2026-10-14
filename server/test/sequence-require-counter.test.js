// BM / Spec M19.5 — der Tisch fragt nach, wenn alle Lebenszähler auf 0 stehen.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund der zehnten Partie: nach einer Niederlage — alle drei Dörfler besiegt —
// lässt sich „Dorfphase beginnen" anstandslos auslösen, und das
// Bösewicht-Tableau wandert in `Besiegte Bösewichte`, als wäre er erledigt.
// Laut [DE S.22] ist die Partie an dieser Stelle zu Ende.
//
// **Den Zustand „besiegt" gibt es nicht** (docs/tasks-partie10.md, „Wo die Spec
// nicht stimmt", 6). Der Tisch kennt Zähler, Zonen, Raster und Stapel — und es
// gab kein Schrittwort, das einen Zähler als Bedingung liest. Die Definition
// („besiegt heißt, der Lebenszähler steht auf 0") steht deshalb im **Aufbau**,
// nicht in der Maschine — dieselbe Arbeitsteilung wie bei `require_zone`, wo
// der Satz „Erst den Kampf beenden" auch im Setup steht.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { STEP_TYPES, stepFields, describeStep, validateStep, defaultStep } =
  await import('../../client/src/utils/sequenceSteps.js');

const LEBEN = ['Henlo: Leben', 'Fridgette: Leben', 'Granny: Leben'];
const SATZ = 'Alle drei Lebenszähler stehen auf 0. Nach [DE S.22] ist die Partie damit zu Ende.';

function tableState(values) {
  return {
    cards: [], stacks: [], tokens: [], boards: [],
    counters: LEBEN.map((name, i) => ({ name, value: values[i], max: 10, base: 10, x: 0, y: 0 })),
  };
}

const guard = (over = {}) => ({
  type: 'require_counter', name: LEBEN, above: 0, confirm: true, message: SATZ, ...over,
});
/** Ein harmloser Schritt dahinter, an dem sich der Halt ablesen lässt. */
const after = { type: 'clear_zone', zoneLabel: 'Gibts Nicht' };

test('BM Abnahme 1: steht ein Zähler über 0, läuft die Folge durch', () => {
  const { log } = executeSequenceWithLog(tableState([0, 3, 0]), [guard(), after], []);
  assert.equal(log[0].status, 'ok');
  assert.equal(log.length, 2, 'der Schritt dahinter kommt dran');
});

test('BM Abnahme 1: stehen alle auf 0, hält die Folge an und trägt die Meldung', () => {
  const { log } = executeSequenceWithLog(tableState([0, 0, 0]), [guard(), after], []);
  assert.equal(log[0].status, 'skipped');
  assert.equal(log[0].message, SATZ, 'der Satz für den Spieler steht für sich');
  assert.match(log[0].reason, /Henlo: Leben: 0/, 'die Zählerstände stehen im Protokoll');
  assert.match(log[0].reason, /1 further step skipped/);
  assert.equal(log.length, 1, 'kein Schritt dahinter läuft');
});

test('BM Abnahme 1: ein unbekannter Zählername hält an', () => {
  // Eine Bedingung, die sich nicht prüfen lässt, ist keine erfüllte - dieselbe
  // Entscheidung wie bei `require_zone`.
  const { log } = executeSequenceWithLog(
    tableState([5, 5, 5]), [guard({ name: ['Henlo: Leben', 'Tippfehler'] }), after], []);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /no counter named "Tippfehler"/);
  assert.equal(log.length, 1);
});

test('BM Abnahme 1: ohne Namen hält der Schritt an, statt durchzuwinken', () => {
  const { log } = executeSequenceWithLog(tableState([0, 0, 0]), [guard({ name: [] }), after], []);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /no counter name given/);
  assert.equal(log.length, 1);
});

test('BM Abnahme 1: `above` ist frei wählbar und fällt auf 0 zurück', () => {
  const unter2 = [guard({ above: 2, message: '' })];
  assert.equal(executeSequenceWithLog(tableState([0, 1, 2]), unter2, []).log[0].status, 'skipped');
  assert.equal(executeSequenceWithLog(tableState([0, 1, 3]), unter2, []).log[0].status, 'ok');
  const ohne = [guard({ above: undefined, message: '' })];
  assert.equal(executeSequenceWithLog(tableState([0, 0, 1]), ohne, []).log[0].status, 'ok');
});

test('BM Abnahme 1: `confirm` steht am Protokolleintrag, damit der Tisch fragen kann', () => {
  const mit = executeSequenceWithLog(tableState([0, 0, 0]), [guard()], []);
  assert.equal(mit.log[0].confirm, true);
  const ohne = executeSequenceWithLog(tableState([0, 0, 0]), [guard({ confirm: false })], []);
  assert.ok(!ohne.log[0].confirm, 'ohne das Feld ist es eine Wache wie jede andere');
});

test('BM Abnahme 2: der Schritt steht im Vokabular', () => {
  assert.ok(STEP_TYPES.find(t => t.value === 'require_counter'), 'require_counter fehlt');
  assert.deepEqual(stepFields({ type: 'require_counter' }), ['name', 'above', 'confirm', 'message']);
  assert.deepEqual(defaultStep('require_counter'), {
    type: 'require_counter', name: [], above: 0, confirm: true, message: '',
  });
  assert.match(describeStep(guard()), /"Henlo: Leben"/);
  assert.match(describeStep(guard()), /above 0/);
  assert.match(describeStep(guard()), /ask/i);
});

test('BM Abnahme 2: validateStep meldet den fehlenden Namen', () => {
  assert.deepEqual(validateStep(guard(), {}), []);
  assert.match(validateStep(guard({ name: [] }), {}).join(' '), /no counter name given/);
});

test('BM Abnahme 3: der Tisch fragt nach und läuft danach ohne die Wache', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');
  // Die Rückfrage ist ein SwipeModal wie bei M14.7 - kein `window.confirm`,
  // die Umgebung beantwortet Browserdialoge am Tisch nicht (M12.2).
  assert.match(source, /data-testid="action-confirm-modal"/);
  assert.ok(!/(^|[^`])window\.confirm\s*\(/.test(source), 'kein Browserdialog');
  // Bestätigt läuft dieselbe Aktion ohne genau diesen Schritt - kein zweiter
  // Weg durch den Executor, kein Zustandsbit.
  assert.match(source, /steps:\s*\(action\.steps \|\| \[\]\)\.filter/);
});
