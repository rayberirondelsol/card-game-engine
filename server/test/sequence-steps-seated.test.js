// Tests für den Editor und das Gate `onlySeated` samt Verneinung (M31.3, Aufgabe EP).
//
// Der Editor fasst Schritte zusammen (`describeStep`) und prüft sie (`validateStep`);
// `onlySeated` und `"!keiner"` in `onlyChoice` kannte er nicht. Ein Eingabefeld für
// `onlySeated` bekommt er **nicht** - der Auftrag sagt es ausdrücklich: das Gate steht
// in den Daten, der Editor zeigt es und lässt es unangetastet.
//
// Zwei Dinge sind leicht falsch zu machen. Erstens: Schritte **ohne** Gate bleiben
// zeichengleich - der Editor zeigt hunderte Zeilen, und der erste Test unten nagelt sie
// fest, damit eine Änderung am allgemeinen Teil auffällt. Zweitens: die **obere** Grenze
// (`seats.length`) kennt der Editor nicht, die prüft erst der Lauf (EH) - der Editor
// beanstandet `0`, `"drei"`, `2.5`, `[]`, `{}`, aber **nicht** eine 7.
//
// Die Zugabe aus EL: `describeStep` rechnete mit `Number(...)` statt mit `foldProduct`
// und zeigte für `"+6*3"` „by NaN". Sie steht am Ende, mit eigenem Test.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { build, run, counterNamed } from './villager-table.js';

const {
  STEP_TYPES, stepFields, defaultStep, describeStep, validateStep, toggleChoice,
} = await import('../../client/src/utils/sequenceSteps.js');

const shuffle = (extra = {}) => ({ type: 'shuffle', stackLabel: 'Deck', ...extra });
const DOERFLER = { doerfler3: { label: 'Dörfler 3', choices: { keiner: {}, Judy: {}, Granny: {} } } };

// ── Punkt 1: ohne Gate zeichengleich ─────────────────────────────────────────

// Gemessen am Stand vor EP (describeStep von `defaultStep` je Typ und ein paar Schritte mit den
// bisherigen Gates). Ändert jemand den allgemeinen Teil, steht hier der Unterschied.
const CTX = { stackLabels: ['Deck'], zoneLabels: ['Zone A'], pools: ['Pool'], assetNames: ['Marker'], cardCategories: ['Kat'], grids: [{ label: 'G' }] };
const FRESH = {
  shuffle: 'Shuffle "Deck"',
  set_face_down: 'Turn "Deck" face down',
  set_face_up: 'Turn "Deck" face up',
  flip_top_card: 'Flip top card of "Deck"',
  split: 'Split "Deck" into 2 stacks',
  deal_to_zone: 'Deal 1 from "Deck" to all player zones',
  move: 'Move "Deck" to 0, 0',
  place_stack: 'Place card category "Kat" as stack (none) at 0, 0',
  remove_stack: 'Remove stack "Deck" from the table',
  place_card: 'Place the card named (none) in zone "Zone A"',
  place_asset: 'Place "Marker" at 0, 0',
  draw_assets: 'Draw 1 from pool "Pool" into zone "Zone A"',
  set_asset_face: 'Turn "Marker" face down',
  lock_asset: 'Lock "Marker"',
  unlock_asset: 'Unlock "Marker"',
  place_counter: 'Place counter (none) at 0, 0 starting at 0',
  set_counter: 'Set counter (none) to 0',
  reveal_next: 'Reveal the next face-down object in zone "Zone A"',
  rotate_zone: 'Rotate zone "Zone A" by one place',
  clear_zone: 'Clear zone "Zone A" off the table',
  clear_grid: 'Clear grid "G" off the table',
  clear_table: 'Clear (nothing) off the table, wherever it lies',
  build_scenario: "Build the revealed boss's scenario, with the final fight section only from the last slot of the bar",
  require_zone: 'Require zone "Zone A" to be empty, else stop the sequence',
  require_counter: 'Require one of (no counter) to be above 0, else ask before going on',
  require_marker: 'Require one of (no zone) to carry a marker above 0, else ask before going on',
  swap_villager: 'Swap the villager at seat 1 for (none)',
  seat_villager: 'Seat (none) at seat 1',
};

test('ohne Gate zeichengleich: jeder Schritttyp, wie er vor EP dastand', () => {
  assert.deepEqual(STEP_TYPES.map(t => t.value).sort(), Object.keys(FRESH).sort(), 'ein neuer Typ gehört hier eingetragen');
  for (const t of STEP_TYPES) assert.equal(describeStep(defaultStep(t.value, CTX)), FRESH[t.value], t.value);
});

test('ohne onlySeated zeichengleich: die bisherigen Gates, in der bisherigen Reihenfolge', () => {
  assert.equal(describeStep(shuffle({ onlyFinal: true })), 'Shuffle "Deck" · only in the final fight');
  assert.equal(describeStep(shuffle({ onlyFinal: false })), 'Shuffle "Deck" · not in the final fight');
  assert.equal(describeStep(shuffle({ onlyChoice: { partie: 'kurz', troedel: ['mit', 'ohne'] } })),
    'Shuffle "Deck" · only with partie=kurz, troedel=mit or ohne');
  assert.equal(describeStep(shuffle({ onlyChoice: { partie: 'kurz' }, onlyFinal: true })),
    'Shuffle "Deck" · only with partie=kurz · only in the final fight');
  assert.equal(describeStep(shuffle({ onlyChoice: [] })), 'Shuffle "Deck"', 'kein Objekt: steht nicht da');
  assert.equal(describeStep('shuffle'), 'Shuffle (none)');
  assert.equal(describeStep(null), '(unknown step)');
});

test('ohne `*` und mit Platzhalter zeichengleich: die Zeilen von set_counter wie vor EP', () => {
  const line = (value) => describeStep({ type: 'set_counter', name: 'M', value });
  assert.equal(line('+18'), 'Set counter "M" by 18');
  assert.equal(line('-6'), 'Set counter "M" by -6');
  assert.equal(line(15), 'Set counter "M" to 15');
  assert.equal(line('15'), 'Set counter "M" to 15');
  assert.equal(line('max'), 'Set counter "M" to its maximum');
  assert.equal(line('base'), 'Set counter "M" to its starting value');
  assert.equal(line('+6*$doerflerzahl'), 'Set counter "M" to "+6*$doerflerzahl"');
  assert.equal(line('6*'), 'Set counter "M" to "6*"');
  assert.equal(line(''), 'Set counter "M" to (nothing)');
  assert.equal(line('abc'), 'Set counter "M" to "abc"');
});

// ── Punkt 2: describeStep mit Gate ───────────────────────────────────────────

test('describeStep: onlySeated als Nachsatz, Liste „4 or 5"', () => {
  assert.equal(describeStep(shuffle({ onlySeated: 3 })), 'Shuffle "Deck" · only with a villager at seat 3');
  assert.equal(describeStep(shuffle({ onlySeated: [4, 5] })), 'Shuffle "Deck" · only with a villager at seat 4 or 5');
  assert.equal(describeStep(shuffle({ onlySeated: [3] })), 'Shuffle "Deck" · only with a villager at seat 3');
  // Die obere Grenze kennt der Editor nicht: eine 7 steht da wie jede Zahl.
  assert.equal(describeStep(shuffle({ onlySeated: 7 })), 'Shuffle "Deck" · only with a villager at seat 7');
});

test('describeStep: Unverstandenes steht nicht da - validateStep meldet es (wie bei onlyChoice)', () => {
  for (const bad of [0, 'drei', 2.5, [], {}, null, true, [3, 'x']]) {
    assert.equal(describeStep(shuffle({ onlySeated: bad })), 'Shuffle "Deck"', JSON.stringify(bad));
  }
});

test('describeStep: die Verneinung in onlyChoice heißt „not", nicht „=!"', () => {
  assert.equal(describeStep({ type: 'seat_villager', seat: 3, villager: 'Judy', onlyChoice: { doerfler3: '!keiner' } }),
    'Seat "Judy" at seat 3 · only with doerfler3 not keiner');
  assert.equal(describeStep(shuffle({ onlyChoice: { partie: 'kurz', doerfler3: '!keiner' } })),
    'Shuffle "Deck" · only with partie=kurz, doerfler3 not keiner');
});

test('describeStep: alle drei Gates, Reihenfolge Wahl, Platz, Endkampf', () => {
  assert.equal(describeStep(shuffle({ onlyFinal: true, onlySeated: 3, onlyChoice: { partie: 'kurz' } })),
    'Shuffle "Deck" · only with partie=kurz · only with a villager at seat 3 · only in the final fight');
});

// ── Punkt 3: validateStep, Folge ─────────────────────────────────────────────

test('validateStep: onlySeated - gültig ist eine ganze Zahl ab 1 oder eine nicht leere Liste davon', () => {
  for (const ok of [1, 3, 5, [4, 5], [3], 7, [3, 7]]) {
    assert.deepEqual(validateStep(shuffle({ onlySeated: ok }), CTX), [], JSON.stringify(ok));
  }
});

test('validateStep: onlySeated - 0, "drei", 2.5, [], {} je eine Beanstandung, die den Wert nennt', () => {
  for (const bad of [0, -1, 'drei', '3', 2.5, [], {}, null, true, [3, 0], [3, 'x']]) {
    const p = validateStep(shuffle({ onlySeated: bad }), CTX);
    assert.equal(p.length, 1, `Wert ${JSON.stringify(bad)}: ${JSON.stringify(p)}`);
    assert.match(p[0], /onlySeated/);
    assert.match(p[0], /seat/);
  }
});

test('validateStep: die obere Grenze kennt der Editor nicht - eine 7 ist kein Fund, auch mit Dörferdaten im Setup', () => {
  const ctx = { ...CTX, options: DOERFLER, villagers: { seats: [{}, {}, {}] } };
  assert.deepEqual(validateStep(shuffle({ onlySeated: 7 }), ctx), []);
  assert.deepEqual(validateStep(shuffle({ onlySeated: [4, 99] }), ctx), []);
});

test('validateStep: der Editor und der Lauf sind sich einig, wo sie beide urteilen', () => {
  // Gleiche Werte wie in sequence-only-seated.test.js: was der Lauf als Problem meldet, beanstandet
  // der Editor - außer dem, was nur die Szenariodaten wissen (ein Platz jenseits der Plätze).
  const probe = (gate) => ({ type: 'place_counter', name: 'Probe', value: 1, x: 0, y: 0, onlySeated: gate });
  for (const v of ['drei', 0, -1, 1.5, [], {}, true, null, [1, 'x'], 3, [2, 3], [3]]) {
    const r = run(build(), [probe(v)]);
    const laufMeldet = r.log.length === 1 && r.log[0].status === 'failed';
    assert.equal(validateStep(probe(v), CTX).length > 0, laufMeldet, `Wert ${JSON.stringify(v)}`);
  }
  // Das, was nur der Lauf weiß:
  for (const v of [4, [1, 4]]) {
    assert.equal(run(build(), [probe(v)]).log[0]?.status, 'failed', `Lauf, Wert ${JSON.stringify(v)}`);
    assert.deepEqual(validateStep(probe(v), CTX), [], `Editor, Wert ${JSON.stringify(v)}`);
  }
  assert.ok(counterNamed(run(build(), [probe(3)]).state, 'Probe'));
});

test('validateStep: onlyChoice mit Verneinung - "!keiner" ist gültig, "!nobody" nicht, keine Liste', () => {
  const ctx = { ...CTX, options: DOERFLER };
  assert.deepEqual(validateStep(shuffle({ onlyChoice: { doerfler3: '!keiner' } }), ctx), []);
  const nobody = validateStep(shuffle({ onlyChoice: { doerfler3: '!nobody' } }), ctx);
  assert.equal(nobody.length, 1);
  assert.match(nobody[0], /!nobody/);
  assert.equal(validateStep(shuffle({ onlyChoice: { doerfler3: ['!keiner'] } }), ctx).length, 1, 'in einer Liste ist es keine Wahl');
  assert.equal(validateStep(shuffle({ onlyChoice: { doerfler4: '!keiner' } }), ctx).length, 1, 'unbekannte Option');
  // Ohne bekannte Optionen erfindet der Editor nichts (wie bei Pools und Zonen).
  assert.deepEqual(validateStep(shuffle({ onlyChoice: { doerfler3: '!nobody' } }), CTX), []);
});

// ── Punkt 3: validateStep, Aktion ────────────────────────────────────────────

test('validateStep in einer Aktion: onlySeated erlaubt, onlyChoice weiter verboten, $doerflerzahl kein Fund', () => {
  const ctx = { ...CTX, options: DOERFLER, inAction: true };
  assert.deepEqual(validateStep(shuffle({ onlySeated: 3 }), ctx), []);
  assert.deepEqual(validateStep(shuffle({ onlySeated: [4, 5] }), ctx), []);
  // Auch hier prüft der Editor den Wert, nicht den Ort: ein falscher Platz bleibt ein Fund.
  assert.equal(validateStep(shuffle({ onlySeated: 0 }), ctx).length, 1);
  const choice = validateStep(shuffle({ onlyChoice: { doerfler3: '!keiner' } }), ctx);
  assert.equal(choice.length, 1);
  assert.match(choice[0], /onlyChoice does not belong in an action/);
  assert.deepEqual(validateStep({ type: 'set_counter', name: 'Münzen (gemeinsam)', value: '+6*$doerflerzahl' }, ctx), []);
  assert.deepEqual(validateStep({ type: 'set_counter', name: 'Münzen (gemeinsam)', value: '+6*3' }, ctx), []);
  // ... und ein `$opt…` ist es weiterhin.
  assert.equal(validateStep({ type: 'set_counter', name: 'M', value: '+6*$optMuenzen' }, ctx).length, 1);
});

// ── Punkt 4: nichts geht verloren ────────────────────────────────────────────

const JSX = fs.readFileSync(new URL('../../client/src/components/SetupSequenceEditor.jsx', import.meta.url), 'utf8');

test('kein Eingabefeld für onlySeated: kein Typ führt es, der Editor zeichnet es nicht', () => {
  for (const t of STEP_TYPES) assert.ok(!t.fields.includes('onlySeated'), t.value);
  for (const t of STEP_TYPES) assert.ok(!stepFields({ ...defaultStep(t.value, CTX), onlySeated: 3 }).includes('onlySeated'), t.value);
  assert.ok(!/onlySeated/.test(JSX));
});

test('nichts geht verloren (Helfer): das Umschalten einer Wahl lässt onlySeated und Unbekanntes stehen', () => {
  // `toggleChoice` ist der Helfer des Editors, der ein Gate ändert; er bekommt nur das Gate, der Schritt
  // um ihn herum bleibt, wo er ist - und ein anderes Gate im Gate auch.
  const step = shuffle({ onlySeated: [4, 5], onlyChoice: { partie: 'kurz', doerfler3: '!keiner' }, mystery: { a: 1 } });
  const gate = toggleChoice(step.onlyChoice, 'partie', 'lang', true);
  assert.deepEqual(gate, { partie: ['kurz', 'lang'], doerfler3: '!keiner' });
  const next = { ...step, onlyChoice: gate };
  assert.deepEqual(next.onlySeated, [4, 5]);
  assert.deepEqual(next.mystery, { a: 1 });
  assert.equal(toggleChoice({ doerfler3: '!keiner' }, 'doerfler3', '!keiner', false), undefined);
});

test('nichts geht verloren (JSX): jeder Feld-Handler kopiert { ...step, … }', () => {
  // Der Client hat keine Testinfrastruktur; was der Auftrag „bestätigen" nennt, wird hier am Quelltext
  // festgehalten: Es gibt drei Stellen, an denen die Zeile `onChange` ruft, und alle drei gehen vom ganzen
  // Schritt aus. Ein Handler, der einen Schritt aus Teilen baut, fiele hier auf.
  const calls = [...JSX.matchAll(/(?<![=\w])onChange\(([^)\n]*)/g)].map(m => m[1]);
  assert.deepEqual(calls, ['{ ...step, ...patch }', 'next', 's']);
  assert.match(JSX, /const next = \{ \.\.\.step \};/);
  assert.match(JSX, /const s = \{ \.\.\.step \};/);
  // Und jeder Feld-Handler geht über `set(...)` (= der erste) oder über diese beiden.
  assert.ok(!/onChange\(\{(?! \.\.\.step)/.test(JSX));
});

// ── Die Zugabe aus EL: set_counter mit Produkt ───────────────────────────────

test('describeStep: ein wörtliches Produkt wird gerechnet - "+6*3" ist „by 18", "15*3" ist „to 45"', () => {
  const line = (value) => describeStep({ type: 'set_counter', name: 'M', value });
  assert.equal(line('+6*3'), 'Set counter "M" by 18');
  assert.equal(line('15*3'), 'Set counter "M" to 45');
  assert.equal(line('-6*3'), 'Set counter "M" by -18');
  assert.equal(line(' +6*3 '), 'Set counter "M" by 18');
  assert.ok(!/NaN/.test(line('+6*3') + line('15*3')));
  // Mit Gate dahinter, wie in der Dorfphase: Zeile und Nachsatz bleiben getrennt.
  assert.equal(describeStep({ type: 'set_counter', name: 'M', value: '+6*3', onlySeated: 3 }),
    'Set counter "M" by 18 · only with a villager at seat 3');
});
