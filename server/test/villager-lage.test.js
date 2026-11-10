// Tests für `lageOf` und das Gate `onlyLage` (M31.14/M31.15, Aufgabe FA).
//
// Die Lage - solo / mehrfach / normal - ist **abgeleitet** (Spielerzahl `S`, Dörflerzahl `D`
// aus der Leiter), nie ein Feld. `lageOf` ist die eine Stelle; der Aufbau fragt sie über das
// Gate `onlyLage`. Ohne `villagers.lage` in den Daten (alle Daten von heute) gibt es
// keine Rechnung: `null`, lautlos.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Namespace statt benanntem Import: fehlt `lageOf`, soll jeder Test einzeln rot werden,
// nicht die ganze Datei am Import sterben.
import * as villagers from '../../shared/villagers.js';
import { validateOptions, resolveChoices } from '../../shared/setupOptions.js';
import { run, scenarioData, counterNamed, copy, build } from './villager-table.js';

const lageOf = (...a) => villagers.lageOf(...a);

const NAMES = ['keiner', 'Henlo', 'Granny', 'Judy', 'Blopsy', 'Yancy'];
const choicesOf = (names) => Object.fromEntries(names.map(n => [n, { label: n }]));
const seat = (def, on) => ({
  label: 'Dörfler', default: def, choices: choicesOf(NAMES),
  ...(on ? { optional: { off: 'keiner', on, addLabel: 'Dörfler dazu' } } : {}),
});
const OPTIONS = {
  // Der Schlüssel ist der Bezeichner (er reist in der Adresse, `KEY`), das Label ist für Menschen.
  spieler: { label: 'Spieler', default: 's1', choices: Object.fromEntries([1, 2, 3, 4, 5].map(n => [`s${n}`, { label: String(n) }])) },
  doerfler1: seat('Henlo'),
  doerfler2: seat('Granny'),
  doerfler3: seat('keiner', 'Granny'),
  doerfler4: seat('keiner', 'Blopsy'),
  doerfler5: seat('keiner', 'Yancy'),
};
const LAGE = { players: 'spieler', seats: ['doerfler1', 'doerfler2', 'doerfler3', 'doerfler4', 'doerfler5'] };
const data = () => ({ options: copy(OPTIONS), villagers: { lage: copy(LAGE) } });

/** Spielerzahl `s`, `n` Dörfler: 1 und 2 immer, dann 3 … n angeschaltet. */
const choose = (s, n) => ({
  spieler: `s${s}`,
  ...(n >= 3 && { doerfler3: 'Granny' }), ...(n >= 4 && { doerfler4: 'Blopsy' }), ...(n >= 5 && { doerfler5: 'Yancy' }),
});

// ── 1. die Rechnung ──────────────────────────────────────────────────────────

test('solo: Spielerzahl 1 bei jeder Dörflerzahl 2 … 5', () => {
  for (let n = 2; n <= 5; n++) {
    assert.deepEqual(lageOf(data(), choose(1, n)), { players: 1, villagers: n, kind: 'solo', problems: [] }, `${n} Dörfler`);
  }
});

test('mehrfach: 1 < S < D; normal: S = D; Zahlen sind Zahlen', () => {
  assert.deepEqual(lageOf(data(), choose(2, 4)), { players: 2, villagers: 4, kind: 'mehrfach', problems: [] });
  assert.equal(lageOf(data(), choose(2, 3)).kind, 'mehrfach');
  assert.equal(lageOf(data(), choose(2, 2)).kind, 'normal');
  assert.equal(lageOf(data(), choose(3, 3)).kind, 'normal');
  assert.equal(lageOf(data(), choose(5, 5)).kind, 'normal');
  const r = lageOf(data(), choose(3, 5));
  assert.equal(typeof r.players, 'number');
  assert.equal(typeof r.villagers, 'number');
});

// ── 2. die Nebenbedingung S ≤ D ──────────────────────────────────────────────

test('S > D: ein Problem mit beiden Zahlen und dem Namen der Option, und keine Lage', () => {
  const r = lageOf(data(), choose(3, 2));
  assert.equal(r.kind, null);
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /spieler/);
  assert.match(r.problems[0], /\b3\b/);
  assert.match(r.problems[0], /\b2\b/);
  assert.equal(r.players, 3);
  assert.equal(r.villagers, 2);

  const f = lageOf(data(), choose(5, 4));
  assert.equal(f.kind, null);
  assert.equal(f.problems.length, 1);
});

test('Dörfler 1 und 2 zählen immer - auch wenn niemand sonst gewählt ist', () => {
  assert.equal(lageOf(data(), { spieler: 's2' }).villagers, 2);
  assert.equal(lageOf(data(), {}).villagers, 2);   // spieler: Vorgabe 1
});

test('die Dörflerzahl folgt der Leiter: Lücken werden nicht geschlossen', () => {
  const r = lageOf(data(), { spieler: 's3', doerfler3: 'keiner', doerfler5: 'Yancy' });
  assert.equal(r.villagers, 3);
  assert.equal(r.kind, 'normal');
  assert.deepEqual(r.problems, []);
  // 3 und 5 an, 4 aus: vier
  assert.equal(lageOf(data(), { spieler: 's1', doerfler3: 'Granny', doerfler5: 'Yancy' }).villagers, 4);
});

test('eine gewöhnliche Option zählt auch dann, wenn ihre Wahl "keiner" heißt', () => {
  const d = data();
  d.options.doerfler2.default = 'keiner';
  assert.equal(lageOf(d, {}).villagers, 2);
});

// ── 3. keine Daten, keine Rechnung; kaputte Daten sind laut ──────────────────

test('ohne villagers.lage: null, lautlos', () => {
  for (const sd of [{}, { options: OPTIONS }, { options: OPTIONS, villagers: {} }, { villagers: { seats: [] } }, undefined, null]) {
    assert.doesNotThrow(() => lageOf(sd, choose(2, 3)));
    assert.equal(lageOf(sd, choose(2, 3)), null);
  }
  assert.equal(lageOf(scenarioData, {}), null);   // die Daten von heute
});

test('eine Option, die lage nennt und es nicht gibt, ist ein Problem', () => {
  const a = data(); a.villagers.lage.players = 'mitspieler';
  const r = lageOf(a, {});
  assert.equal(r.kind, null);
  assert.match(r.problems.join(' '), /mitspieler/);

  const b = data(); b.villagers.lage.seats.push('doerfler6');
  const s = lageOf(b, choose(1, 2));
  assert.equal(s.kind, null);
  assert.match(s.problems.join(' '), /doerfler6/);
});

test('eine lage ohne brauchbare Form ist ein Problem - und wirft nie', () => {
  for (const bad of [null, 'solo', 7, [], { players: 'spieler' }, { seats: ['doerfler1'] },
    { players: 1, seats: ['doerfler1'] }, { players: 'spieler', seats: [] }, { players: 'spieler', seats: 'doerfler1' },
    { players: 'spieler', seats: ['doerfler1', 2] }, { players: '', seats: ['doerfler1'] }]) {
    const d = data(); d.villagers.lage = bad;
    let r;
    assert.doesNotThrow(() => { r = lageOf(d, choose(1, 2)); }, JSON.stringify(bad));
    assert.ok(r, `Wert ${JSON.stringify(bad)}`);
    assert.equal(r.kind, null, `Wert ${JSON.stringify(bad)}`);
    assert.ok(r.problems.length >= 1, `Wert ${JSON.stringify(bad)}`);
  }
});

/** `lageOf` mit nur dieser Spielerwahl (Schlüssel `key`) und zwei Dörflern. */
const mitSchluessel = (key, dort = 'spieler') => {
  const d = data();
  d.options[dort].choices[key] = { label: key };
  return lageOf(d, { [dort]: key });
};

test('die Spielerzahl steht in den Ziffern am Ende des Schlüssels: s3, 3, spieler5 zählen gleich', () => {
  assert.equal(mitSchluessel('s2').players, 2);
  assert.equal(mitSchluessel('2').players, 2);
  assert.equal(mitSchluessel('spieler2').players, 2);
  assert.equal(mitSchluessel('s1').kind, 'solo');
  assert.equal(mitSchluessel('s12').players, 12);   // mehrstellig: die ganze Ziffernfolge
  // Führende Nullen werden als Zahl gelesen (s03 = 3), nicht gemeldet.
  assert.equal(mitSchluessel('s02').players, 2);
  assert.equal(mitSchluessel('s02').kind, 'normal');
});

test('ohne Ziffern am Ende oder s0: ein Problem, das sagt, was erwartet wird', () => {
  for (const key of ['solo', 's', 'sx', '3x', 's0', 's00', '0']) {
    const r = mitSchluessel(key);
    assert.equal(r.kind, null, key);
    assert.equal(r.problems.length, 1, key);
    assert.match(r.problems[0], /spieler/, key);
    assert.match(r.problems[0], /must end in the number of players/, key);
    assert.match(r.problems[0], /s3/, key);
  }
});

test('eine fehlende Spielerwahl nimmt das default; ein kaputtes default ist ein Problem - nie ein Wurf', () => {
  assert.equal(lageOf(data(), {}).kind, 'solo');                // default s1
  assert.doesNotThrow(() => lageOf(data(), undefined));
  assert.doesNotThrow(() => lageOf(data(), { spieler: undefined }));
  const d = data();
  d.options.spieler.default = 'x';
  assert.equal(lageOf(d, {}).kind, null);
  assert.ok(lageOf(d, {}).problems.length >= 1);
});

test('Zusammenspiel: eine realistische spieler-Option besteht validateOptions UND lageOf rechnet mit ihr', () => {
  // Zwei Prüfungen, die nie gegeneinander laufen dürfen: der Schlüssel muss das Muster `KEY` bestehen
  // (er reist in der Adresse) und zugleich eine Zahl tragen, die `lageOf` liest.
  assert.deepEqual(validateOptions(copy(OPTIONS), [], []), []);
  for (const n of [1, 2, 3, 4, 5]) {
    assert.ok(`s${n}` in OPTIONS.spieler.choices);
    const r = lageOf(data(), { spieler: `s${n}`, doerfler3: 'Granny', doerfler4: 'Blopsy', doerfler5: 'Yancy' });
    assert.equal(r.players, n);
    assert.deepEqual(r.problems, []);
  }
  // und mit der Wahl im Aufbau: aufgelöst wie im Dialog, dann gerechnet
  const l = lageOf(data(), resolveChoices(OPTIONS, { spieler: 's2' }).choices);
  assert.deepEqual([l.players, l.villagers, l.kind], [2, 2, 'normal']);
});

// ── 4. das Gate onlyLage im Aufbau ───────────────────────────────────────────

const probe = (gate, name = 'Probe') => ({ type: 'place_counter', name, value: 1, x: 0, y: 0, onlyLage: gate });
// Die Dörferdaten von heute (`scenarioData.villagers`) bleiben, nur `lage` und die Optionen kommen dazu.
const withLage = (sd) => ({ ...copy(scenarioData), options: sd.options, villagers: { ...copy(scenarioData.villagers), ...sd.villagers } });
const go = (steps, choices = choose(1, 2), sd = data()) => run(build(), steps, { scenarioData: withLage(sd), choices });
const lines = (log) => log.filter(e => e.status !== 'ok');

test('onlyLage: ein Schritt läuft nur, wenn die Lage passt - sonst ohne Protokollzeile', () => {
  const solo = go([probe('solo')], choose(1, 3));
  assert.deepEqual(solo.log.map(e => e.status), ['ok']);
  assert.ok(counterNamed(solo.state, 'Probe'));

  for (const gate of ['normal', 'mehrfach', ['mehrfach', 'normal']]) {
    const r = go([probe(gate)], choose(1, 3));
    assert.deepEqual(r.log, [], JSON.stringify(gate));
    assert.equal(counterNamed(r.state, 'Probe'), undefined, JSON.stringify(gate));
  }
  assert.ok(counterNamed(go([probe('normal')], choose(2, 2)).state, 'Probe'));
  assert.ok(counterNamed(go([probe(['mehrfach', 'normal'])], choose(2, 4)).state, 'Probe'));
  assert.ok(counterNamed(go([probe(['mehrfach', 'normal'])], choose(3, 3)).state, 'Probe'));
  assert.deepEqual(go([probe('solo')], choose(2, 4)).log, []);
});

test('onlyLage fail-loud: Unverstandenes läuft nicht und meldet failed mit onlyLage', () => {
  for (const bad of ['duo', [], {}, 1, '', null, ['solo', 'duo'], ['solo', 1], true]) {
    const r = go([probe(bad)]);
    assert.equal(r.log.length, 1, `Wert ${JSON.stringify(bad)}`);
    assert.equal(r.log[0].status, 'failed', `Wert ${JSON.stringify(bad)}`);
    assert.match(r.log[0].reason, /onlyLage/, `Wert ${JSON.stringify(bad)}`);
    assert.equal(counterNamed(r.state, 'Probe'), undefined, `Wert ${JSON.stringify(bad)}`);
  }
});

test('onlyLage ohne villagers.lage: das Gate meldet "no lage"; bei S > D hält schon der Executor (FC)', () => {
  // keine villagers.lage in den Daten: das Gate antwortet
  const a = go([probe('solo')], {}, { options: copy(OPTIONS) });
  assert.equal(a.log.length, 1);
  assert.equal(a.log[0].status, 'failed');
  assert.match(a.log[0].reason, /no lage/);
  assert.equal(counterNamed(a.state, 'Probe'), undefined);

  // S > D: seit FC (M31.15) erreicht diese Wahl das Gate nicht mehr - die Lage ist hier nicht
  // abwesend, sondern ungültig, und der Executor hält vor dem ersten Schritt: eine Zeile
  // `index: -1`, nichts gebaut. Diese Hälfte prüft darum den Halt, nicht das Gate.
  const b = go([probe('solo')], choose(3, 2));
  assert.equal(b.log.length, 1);
  assert.equal(b.log[0].index, -1);
  assert.equal(b.log[0].status, 'failed');
  assert.match(b.log[0].reason, /lage:/);
  assert.match(b.log[0].reason, /\b3\b/);
  assert.match(b.log[0].reason, /\b2\b/);
  assert.match(b.log[0].reason, /nothing was built/);
  assert.equal(counterNamed(b.state, 'Probe'), undefined);
});

test('ctx.lage steht zu Beginn: die Lage gilt auch hinter einem Schritt, der den Tisch ändert', () => {
  const r = go([
    { type: 'swap_villager', seat: 1, villager: 'Judy Marks' },
    probe('solo', 'danach'),
  ], choose(1, 2));
  assert.deepEqual(lines(r.log), []);
  assert.ok(counterNamed(r.state, 'danach'));
});

test('ein Aufruf ohne Wahl (eine Aktion) hat keine Lage: onlyLage dort failed', () => {
  const r = run(build(), [probe('solo')], { scenarioData: withLage(data()), choices: undefined });
  assert.equal(r.log.length, 1);
  assert.equal(r.log[0].status, 'failed');
  assert.match(r.log[0].reason, /no lage/);
  assert.equal(counterNamed(r.state, 'Probe'), undefined);
});

test('ohne Gate ändert sich nichts: Daten ohne lage, Schritt ohne onlyLage', () => {
  const r = run(build(), [{ type: 'place_counter', name: 'Probe', value: 1, x: 0, y: 0 }], { scenarioData });
  assert.deepEqual(r.log.map(e => e.status), ['ok']);
});

// ── 5. validateOptions kennt das Gate ────────────────────────────────────────

test('onlyLage in einer Aktion: ein Problem, mit der Begründung von onlyChoice', () => {
  const p = validateOptions({}, [], [{ id: 'a1', steps: [probe('solo')] }]);
  assert.equal(p.length, 1);
  assert.match(p[0], /onlyLage is not allowed in an action/);
  assert.match(p[0], /a saved game does not know the choice/);
  assert.match(p[0], /a1/);
  // auch mit unverständlichem Wert genau ein Problem
  assert.equal(validateOptions({}, [], [{ id: 'a1', steps: [probe('duo')] }]).length, 1);
});

test('onlyLage in der Folge: solo/mehrfach/normal (und Listen) erlaubt, sonst ein Problem mit dem Schritt', () => {
  for (const ok of ['solo', 'mehrfach', 'normal', ['mehrfach', 'normal'], ['solo']]) {
    assert.deepEqual(validateOptions({}, [probe(ok)], []), [], JSON.stringify(ok));
  }
  for (const bad of ['duo', [], {}, 1, '', null, ['solo', 'duo'], true]) {
    const p = validateOptions({}, [{ type: 'noop' }, probe(bad)], []);
    assert.equal(p.length, 1, JSON.stringify(bad));
    assert.match(p[0], /step 2/, JSON.stringify(bad));
    assert.match(p[0], /onlyLage/, JSON.stringify(bad));
  }
});

test('validateOptions braucht dafür keine Lage in den Daten und lernt nichts über TFT', () => {
  assert.deepEqual(validateOptions({}, [probe('solo')], []), []);
  assert.deepEqual(validateOptions(undefined, [probe('normal')], []), []);
});
