// EJ / Spec M31.5 — die Leiter und der Plus-Knopf: `optionalOf` (ist diese Option aus?)
// und `ladderOf` (welche Option zeigt ein Feld, welche das Plus, welche nichts, wer trägt
// das Minus?). Die Zeichnung (`SetupChoiceFields.jsx`) lässt sich aus `server/test/` nicht
// laden (kein JSX-Transform) und rechnet darum nichts - sie fragt diese zwei Funktionen.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der wichtigste Fall ist die Lücke (Dörfler 3 aus, Dörfler 5 an): eine Leiter, die nur
// „zähle die angeschalteten" rechnet, fällt darauf herein.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { optionalOf, ladderOf, resolveChoices, validateOptions, describeChoices } from '../../shared/setupOptions.js';
import { seatedVillagers } from '../../shared/villagers.js';
import { ROSTER, VILLAGERS } from '../../scripts/doerfler-daten.mjs';
import { fx, run, scenarioData } from './villager-table.js';

const copy = (x) => JSON.parse(JSON.stringify(x));

// --- Optionen wie M31.5 sie beschreibt -------------------------------------------------

const doerfler = (n, def, on, nth) => ({
  label: `Dörfler ${n}`, default: def,
  ...(on ? { optional: { off: 'keiner', on, addLabel: 'Weiteren Dörfler hinzufügen' } } : {}),
  choices: {
    Henlo: { label: 'Henlo Bulwark', vars: { [`Doerfler${n}`]: 'Henlo Bulwark' } },
    Granny: { label: 'Granny Gearhart', vars: { [`Doerfler${n}`]: 'Granny Gearhart' } },
    Blopsy: { label: 'Blopsy Twins', vars: { [`Doerfler${n}`]: 'Blopsy Twins' } },
    Yancy: { label: 'Yancy Plover', vars: { [`Doerfler${n}`]: 'Yancy Plover' } },
    ...(on ? { keiner: { label: `kein ${nth} Dörfler`, vars: { [`Doerfler${n}`]: '' } } } : {}),
  },
});
const OPTIONS = {
  partie: { label: 'Spiellänge', default: 'kurz', choices: { kurz: { label: 'Kurz', vars: { Muenzen: '45' } }, lang: { label: 'Lang', vars: { Muenzen: '30' } } } },
  troedel: { label: 'Toller Trödel', default: 'mit', choices: { mit: { label: 'mit', vars: { Troedel: 'mit' } }, ohne: { label: 'ohne', vars: { Troedel: 'ohne' } } } },
  doerfler1: doerfler(1, 'Henlo'),
  doerfler2: doerfler(2, 'Granny'),
  doerfler3: doerfler(3, 'keiner', 'Granny', 'dritter'),
  doerfler4: doerfler(4, 'keiner', 'Blopsy', 'vierter'),
  doerfler5: doerfler(5, 'keiner', 'Yancy', 'fünfter'),
};
const TRIO = ['doerfler3', 'doerfler4', 'doerfler5'];

// --- 1. optionalOf ---------------------------------------------------------------------

test('EJ: optionalOf – eine Option ohne `optional` ist immer `null`', () => {
  assert.equal(optionalOf(OPTIONS.partie, 'kurz'), null);
  assert.equal(optionalOf(OPTIONS.doerfler1, undefined), null);
  assert.equal(optionalOf(undefined, 'x'), null);
});

test('EJ: optionalOf – `off` gewählt heißt aus, jede andere Wahl heißt an', () => {
  const o = OPTIONS.doerfler3;
  const want = { off: 'keiner', on: 'Granny', addLabel: 'Weiteren Dörfler hinzufügen' };
  assert.deepEqual(optionalOf(o, 'keiner'), { isOff: true, ...want });
  assert.deepEqual(optionalOf(o, 'Henlo'), { isOff: false, ...want });
  assert.deepEqual(optionalOf(o, 'Granny'), { isOff: false, ...want });
});

test('EJ: optionalOf – fehlt die Wahl, zählt `default`', () => {
  assert.equal(optionalOf(OPTIONS.doerfler3, undefined).isOff, true);                 // default keiner
  assert.equal(optionalOf({ ...OPTIONS.doerfler3, default: 'Henlo' }, undefined).isOff, false);
  assert.equal(optionalOf(OPTIONS.doerfler3, null).isOff, true);
});

test('EJ: optionalOf – ein unbrauchbares `optional` ist `null` (die Option bleibt ein gewöhnliches Feld)', () => {
  const o = OPTIONS.doerfler3;
  const mit = (optional) => optionalOf({ ...o, optional }, 'keiner');
  assert.equal(mit('keiner'), null, 'kein Objekt');
  assert.equal(mit(['keiner']), null, 'Liste');
  assert.equal(mit(null), null);
  assert.equal(mit({ off: 'nix', on: 'Granny', addLabel: 'x' }), null, 'off keine Wahl');
  assert.equal(mit({ off: 'keiner', on: 'nix', addLabel: 'x' }), null, 'on keine Wahl');
  assert.equal(mit({ off: 'keiner', on: 'keiner', addLabel: 'x' }), null, 'on === off');
  assert.equal(mit({ off: 'keiner', on: 'Granny' }), null, 'addLabel fehlt');
  assert.equal(mit({ off: 'keiner', on: 'Granny', addLabel: 7 }), null, 'addLabel kein Text');
});

// --- 2. ladderOf -----------------------------------------------------------------------

// `{ kinds: { <Option>: 'field' | 'plus' | 'hidden' }, minus }` – hier flach, zum Lesen.
const kinds = (choices, options = OPTIONS) => {
  const { kinds: k, minus } = ladderOf(options, choices);
  return { ...k, minus };
};
const trio = (l) => [l.doerfler3, l.doerfler4, l.doerfler5];

test('EJ: ladderOf – alle drei aus: Plus bei Dörfler 3, die übrigen versteckt, kein Minus', () => {
  const l = kinds({});
  assert.deepEqual(trio(l), ['plus', 'hidden', 'hidden']);
  assert.equal(l.minus, null);
});

test('EJ: ladderOf – gewöhnliche Optionen sind immer ein Feld', () => {
  for (const choices of [{}, { doerfler3: 'Granny' }, { doerfler3: 'Granny', doerfler4: 'Blopsy', doerfler5: 'Yancy' }, { doerfler5: 'Yancy' }]) {
    const l = kinds(choices);
    for (const n of ['partie', 'troedel', 'doerfler1', 'doerfler2']) assert.equal(l[n], 'field', `${n} bei ${JSON.stringify(choices)}`);
  }
});

test('EJ: ladderOf – Dörfler 3 an: Feld, Plus bei 4, 5 versteckt, Minus bei 3', () => {
  const l = kinds({ doerfler3: 'Granny' });
  assert.deepEqual(trio(l), ['field', 'plus', 'hidden']);
  assert.equal(l.minus, 'doerfler3');
});

test('EJ: ladderOf – Dörfler 3 und 4 an: Plus bei 5, Minus bei 4', () => {
  const l = kinds({ doerfler3: 'Granny', doerfler4: 'Blopsy' });
  assert.deepEqual(trio(l), ['field', 'field', 'plus']);
  assert.equal(l.minus, 'doerfler4');
});

test('EJ: ladderOf – alle drei an: kein Plus, Minus bei 5', () => {
  const l = kinds({ doerfler3: 'Granny', doerfler4: 'Blopsy', doerfler5: 'Yancy' });
  assert.deepEqual(trio(l), ['field', 'field', 'field']);
  assert.equal(Object.values(l).includes('plus'), false, 'kein einziges Plus');
  assert.equal(l.minus, 'doerfler5');
});

test('EJ: ladderOf – die LÜCKE (3 aus, 5 an): Plus bei 3, 4 versteckt, 5 ein Feld, Minus bei 5', () => {
  const l = kinds({ doerfler3: 'keiner', doerfler5: 'Yancy' });
  assert.deepEqual(trio(l), ['plus', 'hidden', 'field']);
  assert.equal(l.minus, 'doerfler5');
});

test('EJ: ladderOf – weitere Lücken: 3 an, 4 aus, 5 an → Plus bei 4, Minus bei 5; nur 4 an → Plus bei 3, Minus bei 4', () => {
  let l = kinds({ doerfler3: 'Granny', doerfler5: 'Yancy' });
  assert.deepEqual(trio(l), ['field', 'plus', 'field']);
  assert.equal(l.minus, 'doerfler5');
  l = kinds({ doerfler4: 'Blopsy' });
  assert.deepEqual(trio(l), ['plus', 'field', 'hidden']);
  assert.equal(l.minus, 'doerfler4');
});

test('EJ: ladderOf – höchstens ein Plus und genau ein Minus bei der letzten angeschalteten, bei jeder der acht Stellungen', () => {
  for (let m = 0; m < 8; m++) {
    const choices = {};
    TRIO.forEach((n, i) => { if (m & (1 << i)) choices[n] = OPTIONS[n].optional.on; });
    const l = kinds(choices);
    const plus = TRIO.filter(n => l[n] === 'plus');
    const an = TRIO.filter(n => choices[n]);
    assert.equal(plus.length, an.length === 3 ? 0 : 1, JSON.stringify(choices));
    assert.equal(l.minus, an.length ? an[an.length - 1] : null, JSON.stringify(choices));
    // Das Plus steht bei der ersten ausgeschalteten.
    if (plus.length) assert.equal(plus[0], TRIO.find(n => !choices[n]));
    // Was ein Feld zeigt, ist an; was an ist, zeigt ein Feld.
    for (const n of TRIO) assert.equal(l[n] === 'field', Boolean(choices[n]), `${n} bei ${JSON.stringify(choices)}`);
  }
});

test('EJ: ladderOf – ohne jede optionale Option: alles ein Feld, kein Plus, kein Minus', () => {
  const { doerfler3, doerfler4, doerfler5, ...ohne } = OPTIONS;
  const r = ladderOf(ohne, {});
  assert.deepEqual(r.kinds, { partie: 'field', troedel: 'field', doerfler1: 'field', doerfler2: 'field' });
  assert.equal(r.minus, null);
});

test('EJ: ladderOf – die Reihenfolge der Schlüssel ist die Leiter, nicht der Name', () => {
  const umgestellt = { doerfler1: OPTIONS.doerfler1, doerfler5: OPTIONS.doerfler5, doerfler3: OPTIONS.doerfler3 };
  const l = kinds({}, umgestellt);
  assert.equal(l.doerfler5, 'plus');
  assert.equal(l.doerfler3, 'hidden');
});

test('EJ: ladderOf – eine gewöhnliche Option mitten in der Leiter oder dahinter ist immer ein Feld', () => {
  const dazwischen = { doerfler1: OPTIONS.doerfler1, doerfler3: OPTIONS.doerfler3, troedel: OPTIONS.troedel, doerfler4: OPTIONS.doerfler4, partie: OPTIONS.partie };
  for (const choices of [{}, { doerfler3: 'Granny' }, { doerfler3: 'Granny', doerfler4: 'Blopsy' }]) {
    const l = kinds(choices, dazwischen);
    for (const n of ['doerfler1', 'troedel', 'partie']) assert.equal(l[n], 'field', `${n} bei ${JSON.stringify(choices)}`);
  }
  // … und sie verschiebt die Leiter nicht: ein Plus gibt es weiter nur eins.
  assert.deepEqual(Object.values(kinds({}, dazwischen)).filter(k => k === 'plus').length, 1);
});

test('EJ: ladderOf – fehlende Wahl zählt `default`; ein kaputtes `optional` ist ein Feld, kein Plus', () => {
  const an = { ...OPTIONS, doerfler3: { ...OPTIONS.doerfler3, default: 'Granny' } };
  assert.deepEqual(trio(kinds({}, an)), ['field', 'plus', 'hidden']);
  const kaputt = { ...OPTIONS, doerfler3: { ...OPTIONS.doerfler3, optional: { off: 'nix' } } };
  const l = kinds({}, kaputt);
  assert.equal(l.doerfler3, 'field');
  assert.equal(l.doerfler4, 'plus');
});

test('EJ: ladderOf – schlechte Eingaben werfen nicht', () => {
  for (const options of [undefined, null, [], 'x', {}]) {
    assert.deepEqual(ladderOf(options, {}), { kinds: {}, minus: null });
  }
  assert.doesNotThrow(() => ladderOf(OPTIONS, undefined));
  assert.doesNotThrow(() => ladderOf(OPTIONS, null));
  assert.deepEqual(trio(kinds(undefined)), ['plus', 'hidden', 'hidden']);
});

// --- 3. resolveChoices -----------------------------------------------------------------

test('EJ: resolveChoices – `keiner` setzt die Variable mit leerem Text; die Vorgabe ist `keiner` an 3, 4, 5', () => {
  const r = resolveChoices(OPTIONS, { doerfler3: 'keiner' });
  assert.deepEqual(r.problems, []);
  assert.equal(r.choices.doerfler3, 'keiner');
  assert.equal(r.vars.optDoerfler3, '');
  const d = resolveChoices(OPTIONS, {});
  for (const n of TRIO) assert.equal(d.choices[n], 'keiner', n);
  for (const n of [3, 4, 5]) assert.equal(d.vars[`optDoerfler${n}`], '');
  assert.equal(d.vars.optDoerfler1, 'Henlo Bulwark');
});

test('EJ: `keiner` besteht den Schlüsselprüfer (KEY) – er reist in der Adresse', () => {
  assert.deepEqual(validateOptions(OPTIONS), []);
  const r = resolveChoices(OPTIONS, { doerfler5: 'Yancy' });
  assert.equal(r.choices.doerfler5, 'Yancy');
  assert.equal(r.vars.optDoerfler5, 'Yancy Plover');
});

// --- 4. validateOptions ----------------------------------------------------------------

const mitOptional = (optional) => ({ ...OPTIONS, doerfler3: { ...OPTIONS.doerfler3, optional } });
const problemsOf = (optional) => validateOptions(mitOptional(optional));
const OK = { off: 'keiner', on: 'Granny', addLabel: 'Weiteren Dörfler hinzufügen' };

test('EJ: validateOptions – gültige Optionen (mit `optional`) → []', () => {
  assert.deepEqual(validateOptions(OPTIONS), []);
  assert.deepEqual(problemsOf(OK), []);
});

test('EJ: validateOptions – `optional` ohne Struktur → ein Problem mit Optionsname', () => {
  for (const bad of ['keiner', 5, true, [], ['keiner'], null]) {
    const p = problemsOf(bad);
    assert.equal(p.length, 1, `${JSON.stringify(bad)}: ${p.join(' | ')}`);
    assert.match(p[0], /option "doerfler3"/);
    assert.match(p[0], /optional/);
  }
});

test('EJ: validateOptions – `off` und `on` müssen Wahlen sein → je ein Problem mit Optionsname', () => {
  let p = problemsOf({ ...OK, off: 'nix' });
  assert.equal(p.length, 1, p.join(' | '));
  assert.match(p[0], /option "doerfler3".*optional\.off.*"nix"/);
  p = problemsOf({ ...OK, on: 'nix' });
  assert.equal(p.length, 1, p.join(' | '));
  assert.match(p[0], /option "doerfler3".*optional\.on.*"nix"/);
  p = problemsOf({ addLabel: 'x' });
  assert.equal(p.length, 2, p.join(' | '));
});

test('EJ: validateOptions – `on === off` → ein Problem (das Plus täte nichts)', () => {
  const p = problemsOf({ ...OK, on: 'keiner' });
  assert.equal(p.length, 1, p.join(' | '));
  assert.match(p[0], /option "doerfler3".*differ/);
});

test('EJ: validateOptions – `addLabel` muss Text sein', () => {
  for (const bad of [undefined, 7, null, ['x'], {}]) {
    const p = problemsOf({ off: 'keiner', on: 'Granny', addLabel: bad });
    assert.equal(p.length, 1, `${JSON.stringify(bad)}: ${p.join(' | ')}`);
    assert.match(p[0], /option "doerfler3".*addLabel/);
  }
});

test('EJ: validateOptions – `off` muss dieselben Variablen setzen wie die anderen Wahlen (bestehende Regel)', () => {
  const o = copy(OPTIONS);
  o.doerfler3.choices.keiner.vars = {};
  const p = validateOptions(o);
  assert.equal(p.length, 1, p.join(' | '));
  assert.match(p[0], /option "doerfler3", choice "keiner": does not set "Doerfler3"/);
});

// --- 5. describeChoices ----------------------------------------------------------------

test('EJ: describeChoices – `keiner` zeigt sein `label`', () => {
  assert.match(describeChoices(OPTIONS, { doerfler3: 'keiner' }), /kein dritter Dörfler/);
  assert.match(describeChoices(OPTIONS, { doerfler4: 'keiner' }), /kein vierter Dörfler/);
});

// --- 6. Der Aufbau ---------------------------------------------------------------------

test('EJ: der Aufbau – `onlyChoice { doerfler3: "!keiner" }`: `keiner` lässt Platz 3 leer, ohne eine Zeile; `Granny` setzt drei', () => {
  const alle = (n) => Object.fromEntries(Object.entries(ROSTER).map(([name, v]) => [v.short, { label: name, vars: { [`Doerfler${n}`]: name } }]));
  const opts = {
    doerfler1: { label: 'Dörfler 1', default: 'Henlo', choices: alle(1) },
    doerfler2: { label: 'Dörfler 2', default: 'Fridgette', choices: alle(2) },
    doerfler3: {
      label: 'Dörfler 3', default: 'keiner', optional: { off: 'keiner', on: 'Granny', addLabel: 'Weiteren Dörfler hinzufügen' },
      choices: { ...alle(3), keiner: { label: 'kein dritter Dörfler', vars: { Doerfler3: '' } } },
    },
  };
  assert.deepEqual(validateOptions(opts), []);
  const folge = [
    { type: 'seat_villager', seat: 1, villager: '$optDoerfler1' },
    { type: 'seat_villager', seat: 2, villager: '$optDoerfler2' },
    { type: 'seat_villager', seat: 3, villager: '$optDoerfler3', onlyChoice: { doerfler3: '!keiner' } },
  ];
  const bauen = (choices) => run({}, folge, { scenarioData: { ...scenarioData, options: opts }, choices });
  const sitzen = (state) => seatedVillagers(state, fx.assets, VILLAGERS).map(s => s.n);

  const keiner = bauen({ doerfler3: 'keiner' });
  assert.deepEqual(sitzen(keiner.state), [1, 2]);
  assert.deepEqual(keiner.log.filter(e => e.status === 'failed' || e.status === 'skipped'), []);
  assert.equal(keiner.log.length, 2, 'der gegatete Schritt hinterlässt keine Zeile');

  const granny = bauen({ doerfler3: 'Granny' });
  assert.deepEqual(sitzen(granny.state), [1, 2, 3]);
  assert.deepEqual(granny.log.filter(e => e.status !== 'ok'), []);

  // Ohne Angabe gilt die Vorgabe `keiner`.
  assert.deepEqual(sitzen(bauen({}).state), [1, 2]);
});
