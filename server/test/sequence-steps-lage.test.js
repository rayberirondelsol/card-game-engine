// Tests für den Editor und die Gates `onlyLage` und `onlyCounter` (M31.15, Aufgabe FD).
//
// Zwilling von `sequence-steps-seated.test.js` (EP). Der Editor fasst Schritte zusammen
// (`describeStep`) und prüft sie (`validateStep`); die zwei neuen Gates aus FA und FB kannte er
// nicht. Er ist die Stelle, die Tippfehler in den Daten **vor** dem Schreiben fängt - im Lauf
// gewinnt das erste „nein", ein kaputtes Gate hinter einem ablehnenden meldet sich dort nicht.
//
// Ein Eingabefeld für die Gates bekommt der Editor **nicht**: sie stehen in den Daten, der
// Editor zeigt sie und lässt sie unangetastet (wie `onlySeated`).
//
// Die Regeln selbst stehen schon, und der Editor erfindet keine zweite: die drei Wörter in
// `LAGEN`/`lageValuesOf` (shared/setupOptions.js, FA), die Syntax von `onlyCounter` in
// `parseCounterGate` (shared/counters.js, FB - seit FD dort, damit Executor und Editor
// dieselbe Antwort geben). Die Einigkeit mit dem Lauf prüft der Test unten am Verhalten.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { build, run, counterNamed } from './villager-table.js';
import { LAGEN } from '../../shared/setupOptions.js';

const {
  STEP_TYPES, stepFields, defaultStep, describeStep, validateStep, toggleChoice,
} = await import('../../client/src/utils/sequenceSteps.js');
const counters = await import('../../shared/counters.js');

const shuffle = (extra = {}) => ({ type: 'shuffle', stackLabel: 'Deck', ...extra });
const CTX = { stackLabels: ['Deck'], zoneLabels: ['Zone A'], pools: ['Pool'], assetNames: ['Marker'], cardCategories: ['Kat'], grids: [{ label: 'G' }] };
const MUENZEN = 'Münzen (gemeinsam)';

// ── Punkt 1: describeStep ────────────────────────────────────────────────────

test('ohne die neuen Gates zeichengleich: jeder Schritttyp mit `defaultStep`, dazu die bisherigen Gates', () => {
  // Gemessen am Stand vor FD (dieselbe Tabelle wie in EP, nur die Gates davor): die Zeile trägt
  // weder „lage" noch „counter", wenn das Gate fehlt.
  for (const t of STEP_TYPES) {
    const line = describeStep(defaultStep(t.value, CTX));
    assert.ok(!/ · only in the lage| · only if counter/.test(line), `${t.value}: ${line}`);
  }
  assert.equal(describeStep(shuffle()), 'Shuffle "Deck"');
  assert.equal(describeStep(shuffle({ onlyFinal: true })), 'Shuffle "Deck" · only in the final fight');
  assert.equal(describeStep(shuffle({ onlyChoice: { partie: 'kurz' }, onlySeated: 3 })),
    'Shuffle "Deck" · only with partie=kurz · only with a villager at seat 3');
  assert.equal(describeStep({ type: 'place_counter', name: 'M', value: 5, x: 1, y: 2 }),
    'Place counter "M" at 1, 2 starting at 5');
});

test('describeStep: onlyLage als Nachsatz, Liste „mehrfach or normal"', () => {
  assert.equal(describeStep(shuffle({ onlyLage: 'solo' })), 'Shuffle "Deck" · only in the lage solo');
  assert.equal(describeStep(shuffle({ onlyLage: ['mehrfach', 'normal'] })), 'Shuffle "Deck" · only in the lage mehrfach or normal');
  assert.equal(describeStep(shuffle({ onlyLage: ['normal'] })), 'Shuffle "Deck" · only in the lage normal');
});

test('describeStep: onlyCounter als Nachsatz, mit „!" davor „does not exist"', () => {
  assert.equal(describeStep(shuffle({ onlyCounter: MUENZEN })), `Shuffle "Deck" · only if counter "${MUENZEN}" exists`);
  assert.equal(describeStep(shuffle({ onlyCounter: `!${MUENZEN}` })), `Shuffle "Deck" · only if counter "${MUENZEN}" does not exist`);
  // Leerraum rund um den Namen steht nicht da (der Lauf vergleicht über `norm`) - das `!` aber muss
  // **ganz vorn** stehen: `"  !x"` ist beim Lauf ein Name mit `!` darin, also ein Problem (gemessen, FB).
  assert.equal(describeStep(shuffle({ onlyCounter: `! ${MUENZEN} ` })), `Shuffle "Deck" · only if counter "${MUENZEN}" does not exist`);
  assert.equal(describeStep(shuffle({ onlyCounter: `  ${MUENZEN} ` })), `Shuffle "Deck" · only if counter "${MUENZEN}" exists`);
  assert.equal(describeStep(shuffle({ onlyCounter: `  !${MUENZEN}` })), 'Shuffle "Deck"');
});

test('describeStep: Unverstandenes steht nicht da - validateStep meldet es (wie bei onlySeated)', () => {
  for (const bad of ['duo', '', 0, [], {}, null, true, ['solo', 'duo'], ['solo', 5]]) {
    assert.equal(describeStep(shuffle({ onlyLage: bad })), 'Shuffle "Deck"', `onlyLage ${JSON.stringify(bad)}`);
  }
  for (const bad of ['', '!', '!!x', '  ', '! ', 5, 0, true, [], [MUENZEN], {}, null]) {
    assert.equal(describeStep(shuffle({ onlyCounter: bad })), 'Shuffle "Deck"', `onlyCounter ${JSON.stringify(bad)}`);
  }
});

test('describeStep: alle Gates zugleich - Reihenfolge Wahl, Platz, Lage, Zähler, Endkampf', () => {
  assert.equal(
    describeStep(shuffle({ onlyFinal: true, onlyCounter: MUENZEN, onlyLage: 'solo', onlySeated: 3, onlyChoice: { partie: 'kurz' } })),
    `Shuffle "Deck" · only with partie=kurz · only with a villager at seat 3 · only in the lage solo · only if counter "${MUENZEN}" exists · only in the final fight`);
});

// ── Punkt 2: validateStep, Folge ─────────────────────────────────────────────

test('validateStep: onlyLage - jedes der drei Wörter und jede Liste davon ist gültig', () => {
  assert.deepEqual(LAGEN, ['solo', 'mehrfach', 'normal'], 'die drei Wörter stehen in shared/setupOptions.js');
  for (const w of LAGEN) assert.deepEqual(validateStep(shuffle({ onlyLage: w }), CTX), [], w);
  for (const ok of [['solo', 'mehrfach'], ['mehrfach', 'normal'], [...LAGEN], ['normal']]) {
    assert.deepEqual(validateStep(shuffle({ onlyLage: ok }), CTX), [], JSON.stringify(ok));
  }
});

test('validateStep: onlyLage - „duo" und anderes Unverstandenes je eine Beanstandung, die den Wert nennt', () => {
  for (const bad of ['duo', 'Solo', '', 0, 3, [], {}, null, true, ['solo', 'duo'], ['duo']]) {
    const p = validateStep(shuffle({ onlyLage: bad }), CTX);
    assert.equal(p.length, 1, `Wert ${JSON.stringify(bad)}: ${JSON.stringify(p)}`);
    assert.match(p[0], /onlyLage/);
    assert.match(p[0], /solo, mehrfach, normal/, 'die Wörter kommen aus LAGEN, der Satz nennt sie');
  }
  assert.match(validateStep(shuffle({ onlyLage: 'duo' }), CTX)[0], /"duo"/);
});

test('validateStep: onlyCounter - ein Name, auch mit einem „!" davor, ist gültig', () => {
  for (const ok of [MUENZEN, `!${MUENZEN}`, 'x', '!x', `  ${MUENZEN} `, `! ${MUENZEN}`]) {
    assert.deepEqual(validateStep(shuffle({ onlyCounter: ok }), CTX), [], JSON.stringify(ok));
  }
});

test('validateStep: onlyCounter - leer, nur „!", „!!x", Zahl, Liste, Objekt je eine Beanstandung', () => {
  for (const bad of ['', '!', '!!x', '  ', '! ', 5, 0, true, [], [MUENZEN], {}, null]) {
    const p = validateStep(shuffle({ onlyCounter: bad }), CTX);
    assert.equal(p.length, 1, `Wert ${JSON.stringify(bad)}: ${JSON.stringify(p)}`);
    assert.match(p[0], /onlyCounter/);
  }
});

test('validateStep: der Editor und der Lauf sind sich einig - dieselbe Syntax, am Verhalten gemessen', () => {
  // Gleiche Werte wie in sequence-only-counter.test.js: was der Lauf als Problem meldet, beanstandet
  // der Editor, und umgekehrt. Eine zweite Regel neben der ersten würde hier auseinanderlaufen.
  const probe = (gate) => ({ type: 'place_counter', name: 'Probe', value: 1, x: 0, y: 0, onlyCounter: gate });
  const values = ['', '!', '!!x', '  ', '! ', 5, 0, true, [], [MUENZEN], {}, null,
    MUENZEN, `!${MUENZEN}`, 'MÜNZEN (gemeinsam)', '  ! x ', 'x', '!x', '!!', '! !x'];
  for (const v of values) {
    const r = run(build(), [probe(v)]);
    const laufMeldet = r.log.some(e => e.status === 'failed' && /onlyCounter/.test(e.reason));
    assert.equal(validateStep(probe(v), CTX).length > 0, laufMeldet, `Wert ${JSON.stringify(v)}`);
  }
  // Und der Helfer selbst, auf dem beide stehen:
  assert.equal(typeof counters.parseCounterGate, 'function', 'shared/counters.js führt die Regel');
  assert.deepEqual(counters.parseCounterGate('! Münzen '), { ok: true, not: true, name: 'Münzen', key: 'münzen' });
  assert.deepEqual(counters.parseCounterGate('Münzen'), { ok: true, not: false, name: 'Münzen', key: 'münzen' });
  for (const bad of ['', '!', '!!x', 5, [], null]) assert.equal(counters.parseCounterGate(bad).ok, false, JSON.stringify(bad));
  assert.ok(counterNamed(run(build(), [probe('!Gibt es nicht')]).state, 'Probe'));
});

test('validateStep: beide Gates an einem Schritt - jedes für sich beanstandet', () => {
  const p = validateStep(shuffle({ onlyLage: 'duo', onlyCounter: '' }), CTX);
  assert.equal(p.length, 2);
  assert.ok(p.some(x => /onlyLage/.test(x)) && p.some(x => /onlyCounter/.test(x)));
  assert.deepEqual(validateStep(shuffle({ onlyLage: 'solo', onlyCounter: `!${MUENZEN}` }), CTX), []);
});

// ── Punkt 3: validateStep, Aktion ────────────────────────────────────────────

test('validateStep in einer Aktion: onlyLage verboten, onlyCounter erlaubt', () => {
  const ctx = { ...CTX, inAction: true };
  const lage = validateStep(shuffle({ onlyLage: 'solo' }), ctx);
  assert.equal(lage.length, 1);
  assert.match(lage[0], /onlyLage does not belong in an action/);
  // Auch ein kaputter Wert ist dort nur **eine** Beanstandung: der Ort ist das Problem, nicht der Wert.
  assert.equal(validateStep(shuffle({ onlyLage: 'duo' }), ctx).length, 1);
  // onlyCounter liest den Tisch, den die Aktion sieht - erlaubt; der Wert wird weiter geprüft.
  assert.deepEqual(validateStep(shuffle({ onlyCounter: MUENZEN }), ctx), []);
  assert.deepEqual(validateStep(shuffle({ onlyCounter: `!${MUENZEN}` }), ctx), []);
  assert.equal(validateStep(shuffle({ onlyCounter: '' }), ctx).length, 1);
  // Und der Ton ist der von onlyChoice.
  assert.match(validateStep(shuffle({ onlyChoice: { a: 'b' } }), ctx)[0], /^onlyChoice does not belong in an action: a saved game does not know the choice$/);
  assert.match(lage[0], /^onlyLage does not belong in an action: a saved game does not know the lage$/);
});

// ── Punkt 4: nichts geht verloren ────────────────────────────────────────────

const JSX = fs.readFileSync(new URL('../../client/src/components/SetupSequenceEditor.jsx', import.meta.url), 'utf8');

test('kein Eingabefeld für die neuen Gates: kein Typ führt sie, der Editor zeichnet sie nicht', () => {
  for (const gate of ['onlyLage', 'onlyCounter']) {
    for (const t of STEP_TYPES) assert.ok(!t.fields.includes(gate), `${gate} ${t.value}`);
    for (const t of STEP_TYPES) assert.ok(!stepFields({ ...defaultStep(t.value, CTX), [gate]: 'solo' }).includes(gate), `${gate} ${t.value}`);
    assert.ok(!new RegExp(gate).test(JSX), gate);
  }
});

test('nichts geht verloren (Helfer): das Umschalten einer Wahl lässt beide Gates und Unbekanntes stehen', () => {
  const step = shuffle({
    onlyLage: ['mehrfach', 'normal'], onlyCounter: `!${MUENZEN}`, onlySeated: 3,
    onlyChoice: { partie: 'kurz' }, mystery: { a: 1 },
  });
  const gate = toggleChoice(step.onlyChoice, 'partie', 'lang', true);
  assert.deepEqual(gate, { partie: ['kurz', 'lang'] });
  const next = { ...step, onlyChoice: gate };
  assert.deepEqual(next.onlyLage, ['mehrfach', 'normal']);
  assert.equal(next.onlyCounter, `!${MUENZEN}`);
  assert.equal(next.onlySeated, 3);
  assert.deepEqual(next.mystery, { a: 1 });
  // Wird die letzte Wahl abgeschaltet, entfällt nur `onlyChoice` - die neuen Gates bleiben.
  const none = toggleChoice({ partie: 'kurz' }, 'partie', 'kurz', false);
  assert.equal(none, undefined);
  const without = { ...step };
  if (none === undefined) delete without.onlyChoice;
  assert.equal(without.onlyLage.length, 2);
  assert.equal(without.onlyCounter, `!${MUENZEN}`);
});

test('nichts geht verloren (JSX): jeder Feld-Handler kopiert { ...step, … }', () => {
  // Wie in EP: der Client hat keine Testinfrastruktur, also hält der Test am Quelltext fest, was der
  // Auftrag „bestätigen" nennt. Drei Stellen rufen `onChange`, und alle gehen vom ganzen Schritt aus;
  // ein Handler, der einen Schritt aus Teilen baut, verlöre onlyLage und onlyCounter still.
  const calls = [...JSX.matchAll(/(?<![=\w])onChange\(([^)\n]*)/g)].map(m => m[1]);
  assert.deepEqual(calls, ['{ ...step, ...patch }', 'next', 's']);
  assert.match(JSX, /const next = \{ \.\.\.step \};/);
  assert.match(JSX, /const s = \{ \.\.\.step \};/);
  assert.ok(!/onChange\(\{(?! \.\.\.step)/.test(JSX));
});
