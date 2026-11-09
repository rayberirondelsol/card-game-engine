// Tests für das Produkt im Zählerwert (M31.4, Aufgabe EL): `"15*3"`, `"+6*3"`,
// `"+6*$doerflerzahl"` – gefaltet von **einer** Funktion, `foldProduct`.
//
// Der Anlass steht im ersten Test: `place_counter` machte aus `"15*3"` still einen
// Zähler auf 0 (`Number("15*3")` ist `NaN`, `normalizeCounter` macht daraus 0). Genau
// dieser stille Nullwert wäre der Münzzähler geworden. Die zweite Hälfte ist genauso
// wichtig: was **kein** Produkt ist, bleibt unverändert und wird zu `skipped`, nicht
// zu einer geratenen Zahl - und das Vorzeichen bleibt, wie es geschrieben steht
// („dazuzählen" gegen „setzen").
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { build, run, fx, scenarioData, LINEUP, counterNamed, tokenNamed, copy } from './villager-table.js';
import { foldProduct, counterValueForm, counterValue, counterEdit } from '../../shared/counters.js';
import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';

const { validateStep } = await import('../../client/src/utils/sequenceSteps.js');

const probe = (value) => ({ type: 'place_counter', name: 'Probe', value, x: 0, y: 0 });
const lay = (value) => executeSequenceWithLog({}, [probe(value)], [], {});

// ── 1. Die stille 0 – der Grund der ganzen Aufgabe ──────────────────────────

test('place_counter: "15*3" ist ein Zähler auf 45, nicht auf 0', () => {
  const { state, log } = lay('15*3');
  assert.equal(state.counters.length, 1);
  assert.equal(state.counters[0].value, 45);
  assert.equal(log[0].status, 'ok');
});

// ── 2. foldProduct ───────────────────────────────────────────────────────────

test('foldProduct: ein Produkt zweier ganzer Zahlen, das Vorzeichen bleibt', () => {
  assert.equal(foldProduct('15*3'), '45');
  assert.equal(foldProduct('+6*3'), '+18');
  assert.equal(foldProduct('-2*3'), '-6');
  assert.equal(foldProduct('+6*0'), '+0');
  assert.equal(foldProduct('0*5'), '0');
  assert.equal(foldProduct('007*3'), '21');
  assert.equal(foldProduct(' 15*3 '), '45', 'Rand-Leerzeichen wie überall bei Zählerwerten');
});

test('foldProduct: eine Zahl und ein Text ohne * kommen unverändert zurück', () => {
  for (const raw of ['45', '+6', '-2', 'max', 'base', '', '  ', 'abc', '$x', '1.5']) {
    assert.equal(foldProduct(raw), raw, JSON.stringify(raw));
  }
  for (const raw of [45, -2, 0, undefined, null]) assert.equal(foldProduct(raw), raw, String(raw));
});

test('foldProduct: unlesbar bleibt unverändert - nie eine geratene Zahl', () => {
  for (const raw of ['6*', '*3', '2*3*4', '1.5*2', '2*1.5', 'a*b', '6 * 3', '6* 3', '6 *3', '+-6*3', '--6*3', '6*-3', '*', '**', '6**3', '6*3x', '1e2*3', '0x10*2']) {
    assert.equal(foldProduct(raw), raw, JSON.stringify(raw));
  }
  // Ein Produkt, das keine sichere ganze Zahl mehr ist, ist kein Wert: sonst stünde 1e21 am Tisch.
  assert.equal(foldProduct('99999999999*99999999999'), '99999999999*99999999999');
});

// ── 3. Die Leser ─────────────────────────────────────────────────────────────

test('counterValueForm: ein Produkt hat die Form seines Vorzeichens', () => {
  assert.equal(counterValueForm('+6*3'), 'add');
  assert.equal(counterValueForm('-2*3'), 'add');
  assert.equal(counterValueForm('15*3'), 'set');
  assert.equal(counterValueForm(' 15*3 '), 'set');
  for (const raw of ['6*', '*3', '2*3*4', '1.5*2', 'a*b', '6 * 3']) assert.equal(counterValueForm(raw), null, raw);
  // Unverändert: Zahl, Zahl-Text, max, base.
  assert.equal(counterValueForm(6), 'set');
  assert.equal(counterValueForm('+6'), 'add');
  assert.equal(counterValueForm('max'), 'max');
  assert.equal(counterValueForm('base'), 'base');
});

test('counterValue: "+6*3" zählt dazu, "15*3" setzt, Unlesbares ist null', () => {
  assert.equal(counterValue({ value: 5 }, '+6*3'), 23);
  assert.equal(counterValue({ value: 5 }, '-2*3'), -1);
  assert.equal(counterValue({ value: 5 }, '15*3'), 45);
  assert.equal(counterValue({ value: 5 }, '+6*0'), 5);
  for (const raw of ['6*', '*3', '2*3*4', '1.5*2', 'a*b', '6 * 3']) assert.equal(counterValue({ value: 5 }, raw), null, raw);
});

test('counterEdit: ein Produkt gilt, "6*" nennt den Satz "cannot read"', () => {
  assert.deepEqual(counterEdit({ value: 5 }, '+6*3'), { value: 23 });
  assert.match(counterEdit({ value: 5 }, '6*').reason, /cannot read/);
  assert.match(counterEdit({ value: 5 }, '6 * 3').reason, /cannot read/);
});

// ── 4. place_counter: unlesbar heißt skipped, ohne * wie heute ───────────────

test('place_counter: ein unlesbares Produkt ist skipped und legt keinen Zähler', () => {
  for (const raw of ['6*', '*3', '2*3*4', '1.5*2', 'a*b', '6 * 3']) {
    const { state, log } = lay(raw);
    assert.deepEqual(state.counters ?? [], [], raw);
    assert.equal(log.length, 1, raw);
    assert.equal(log[0].status, 'skipped', raw);
    assert.match(log[0].reason, /Probe/, raw);
    assert.ok(log[0].reason.includes(raw.trim()), `die Zeile nennt "${raw}": ${log[0].reason}`);
  }
});

test('place_counter: Text ohne * verhält sich wie heute (Zahl, Zahl-Text, Unlesbares wird 0)', () => {
  const value = (raw) => lay(raw).state.counters[0].value;
  assert.equal(value(45), 45);
  assert.equal(value('45'), 45);
  assert.equal(value('+6'), 6);
  assert.equal(value('-2'), -2);
  assert.equal(value('abc'), 0, 'wie bisher: kein Produkt, also kein neuer Halt');
  assert.equal(value(''), 0);
  assert.equal(value(undefined), 0);
});

test('place_counter: max und base ändern sich nicht', () => {
  const { state } = executeSequenceWithLog({}, [{ type: 'place_counter', name: 'P', value: '5*2', max: 12, base: 10, x: 1, y: 2 }], [], {});
  assert.deepEqual({ v: state.counters[0].value, max: state.counters[0].max, base: state.counters[0].base }, { v: 10, max: 12, base: 10 });
});

test('set_counter: "+6*3" und "15*3" auf einem Zähler; unlesbar bleibt skipped und unangetastet', () => {
  const start = { counters: [{ id: 'c', name: 'Probe', value: 5, x: 0, y: 0, locked: false }] };
  const go = (value) => executeSequenceWithLog(copy(start), [{ type: 'set_counter', name: 'Probe', value }], [], {});
  assert.equal(go('+6*3').state.counters[0].value, 23);
  assert.equal(go('15*3').state.counters[0].value, 45);
  for (const raw of ['6*', '2*3*4', '6 * 3']) {
    const r = go(raw);
    assert.equal(r.state.counters[0].value, 5, raw);
    assert.equal(r.log[0].status, 'skipped', raw);
  }
});

// ── 5. Mit Platzhaltern (EK) ─────────────────────────────────────────────────

const zwei = () => run({}, LINEUP.slice(0, 2)).state;

/** Fünf Dörfler, synthetisch: zwei zusätzliche Plätze mit einem Tableau am Tisch. */
function fuenf() {
  const extra = ['Tableau: Blopsy', 'Tableau: Yancy'];
  const assets = [...fx.assets, ...extra.map((name, i) => ({ id: `extra-${i}`, name }))];
  const villagers = copy(scenarioData.villagers);
  extra.forEach((anchor) => villagers.seats.push({ ...copy(villagers.seats[2]), anchor }));
  const state = build();
  extra.forEach((label, i) => state.tokens.push({ id: `t-extra-${i}`, assetId: `extra-${i}`, label, x: 10 + i, y: 10, shape: 'image', size: 50 }));
  return { state, assets, scenarioData: { ...scenarioData, villagers } };
}

const OPTIONS = {
  partie: {
    label: 'Spiellänge', default: 'kurz',
    choices: {
      kurz: { label: 'Kurz', vars: { MuenzenJeDoerfler: '15' } },
      lang: { label: 'Lang', vars: { MuenzenJeDoerfler: '10' } },
    },
  },
};
const withOptions = { scenarioData: { ...scenarioData, options: OPTIONS } };
const MUENZEN = { type: 'place_counter', name: 'Münzen', value: '$optMuenzenJeDoerfler*$doerflerzahl', x: 5, y: 5 };
const DAZU = { type: 'set_counter', name: 'Münzen', value: '+6*$doerflerzahl' };
const stand = (r) => counterNamed(r.state, 'Münzen').value;

test('set_counter "+6*$doerflerzahl": +18 bei drei, +12 bei zwei, +30 bei fünf', () => {
  const lege = { type: 'place_counter', name: 'Münzen', value: 0, x: 0, y: 0 };
  assert.equal(stand(run(build(), [lege, DAZU])), 18);
  assert.equal(stand(run(zwei(), [lege, DAZU])), 12);
  const f = fuenf();
  assert.equal(stand(run(f.state, [lege, DAZU], { assets: f.assets, scenarioData: f.scenarioData })), 30);
});

test('place_counter "$optMuenzenJeDoerfler*$doerflerzahl": 45/30 bei drei, 30/20 bei zwei, 75/50 bei fünf', () => {
  const lauf = (state, choices, over = {}) => run(state, [MUENZEN], { ...withOptions, choices, ...over });
  assert.equal(stand(lauf(build(), { partie: 'kurz' })), 45);
  assert.equal(stand(lauf(build(), { partie: 'lang' })), 30);
  assert.equal(stand(lauf(zwei(), { partie: 'kurz' })), 30);
  assert.equal(stand(lauf(zwei(), { partie: 'lang' })), 20);
  const f = fuenf();
  const over = { assets: f.assets };
  const mit = (partie) => run(f.state, [MUENZEN], { ...over, scenarioData: { ...f.scenarioData, options: OPTIONS }, choices: { partie } });
  assert.equal(stand(mit('kurz')), 75);
  assert.equal(stand(mit('lang')), 50);
});

test('Platzhalter ohne Dörfler: skipped mit "is not bound", kein Zähler, keine 0', () => {
  const r = run({}, [MUENZEN], { ...withOptions, choices: { partie: 'kurz' } });
  assert.equal(r.log.at(-1).status, 'skipped');
  assert.match(r.log.at(-1).reason, /\$doerflerzahl is not bound/);
  assert.equal((r.state.counters ?? []).length, 0);
});

// ── 6. Der Tisch von heute ───────────────────────────────────────────────────

test('der Aufbau mit dem Produkt ist derselbe Zustand wie der mit "$optMuenzen" und Muenzen "45"', () => {
  const alt = {
    options: { partie: { label: 'Spiellänge', default: 'kurz', choices: { kurz: { label: 'Kurz', vars: { Muenzen: '45' } }, lang: { label: 'Lang', vars: { Muenzen: '30' } } } } },
    aufbau: { type: 'place_counter', name: 'Münzen (gemeinsam)', value: '$optMuenzen', x: 2000, y: 1040 },
    dorfphase: { type: 'set_counter', name: 'Münzen (gemeinsam)', value: '+18' },
  };
  const neu = {
    options: OPTIONS,
    aufbau: { ...alt.aufbau, value: '$optMuenzenJeDoerfler*$doerflerzahl' },
    dorfphase: { ...alt.dorfphase, value: '+6*$doerflerzahl' },
  };
  for (const partie of ['kurz', 'lang']) {
    const lauf = (v) => run({}, [...LINEUP, v.aufbau, v.dorfphase], { scenarioData: { ...scenarioData, options: v.options }, choices: { partie } });
    const a = lauf(alt), n = lauf(neu);
    assert.deepEqual(n.log.filter(e => e.status !== 'ok'), [], partie);
    // Ids und `tableId` sind zufällig (`crypto.randomUUID`) - verglichen wird alles andere.
    const ohneId = (list) => list.map(({ id, tableId, ...rest }) => rest);
    for (const was of ['counters', 'tokens', 'cards']) assert.deepEqual(ohneId(n.state[was]), ohneId(a.state[was]), `${partie}: ${was}`);
    // ... und es ist der Tisch von heute: 45 + 18 bzw. 30 + 18.
    assert.equal(counterNamed(n.state, 'Münzen (gemeinsam)').value, (partie === 'kurz' ? 45 : 30) + 18);
  }
});

// ── 7. Der Editor ────────────────────────────────────────────────────────────

test('validateStep: set_counter mit einem Produkt', () => {
  const step = (value) => ({ type: 'set_counter', name: 'Münzen', value });
  assert.deepEqual(validateStep(step('+6*3'), {}), []);
  assert.deepEqual(validateStep(step('15*3'), {}), []);
  assert.deepEqual(validateStep(step('+6*$doerflerzahl'), {}), []);
  const p = validateStep(step('6*'), {});
  assert.equal(p.length, 1);
  assert.match(p[0], /6\*/);
  assert.equal(validateStep(step('6 * 3'), {}).length, 1);
});

// ── Eine Stelle (M6) ─────────────────────────────────────────────────────────

test('eine Stelle: das Produkt faltet nur shared/counters.js, die Leser rufen foldProduct', () => {
  const src = (f) => fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
  // Wer `*` als Rechenzeichen liest, steht in counters.js - der Executor und der Editor haben keine eigene Regel.
  for (const f of ['shared/sequenceExecutor.js', 'client/src/utils/sequenceSteps.js']) {
    assert.doesNotMatch(src(f), /split\(['"]\*['"]\)|\\\*\(|\\d\+\)\\\*/, `${f} rechnet nicht selbst`);
  }
  const counters = src('shared/counters.js');
  const calls = (counters.match(/foldProduct\(/g) || []).length;
  assert.ok(calls >= 3, `counterValueForm, counterValue und die Definition: ${calls} Vorkommen`);
  assert.match(src('shared/sequenceExecutor.js'), /foldProduct\(step\.value\)/);
});
