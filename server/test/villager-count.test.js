// Tests für `$doerflerzahl` und `villagerCount` (M31.2/M31.4, Aufgabe EK): die Zahl
// der Dörfler am Tisch, gelesen aus dem Tisch.
//
// Gezählt wird, **wo ein Tableau liegt** - nicht, wen die Daten kennen (ein
// Dörfler ohne Roster-Eintrag sitzt trotzdem), und nicht, was sonst auf dem Tisch
// herumliegt (ein Spielstein ist kein Dörfler). Bei 0 ist der Platzhalter **nicht
// gebunden**: „keiner sitzt" ist etwas anderes als „null dazuzählen".
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { build, run, fx, scenarioData, LINEUP, counterNamed, copy } from './villager-table.js';
import * as V from '../../shared/villagers.js';
import { validateOptions } from '../../shared/setupOptions.js';

const villagers = scenarioData.villagers;
const zwei = () => run({}, LINEUP.slice(0, 2)).state;
const assetId = (name) => fx.assets.find(a => a.name === name).id;
const { seatVars } = V;
const count = (state, v = villagers) => V.villagerCount(state, fx.assets, v);

// Ein Zähler auf 0, dann `+$doerflerzahl` darauf: was drinsteht, ist die gebundene Zahl.
const probe = { type: 'place_counter', name: 'Probe', value: 0, x: 0, y: 0 };
const plus = { type: 'set_counter', name: 'Probe', value: '+$doerflerzahl' };

test('villagerCount: drei, zwei, keiner, ohne Dörferdaten', () => {
  assert.equal(count(build()), 3);
  assert.equal(count(zwei()), 2);
  assert.equal(count({}), 0);
  assert.equal(count({ tokens: [] }), 0);
  for (const none of [undefined, null, {}, { seats: [], roster: {} }]) {
    assert.equal(V.villagerCount(build(), fx.assets, none), 0, `Daten ${JSON.stringify(none)}`);
  }
});

test('villagerCount: ein Tableau, dessen Dörfler nicht im Roster steht, zählt mit', () => {
  const v = copy(villagers);
  delete v.roster['Granny Melba'];
  assert.equal(count(build(), v), 3);
  // ... aber `$V3` bleibt ungebunden: geraten wird nicht.
  const vars = seatVars(build(), fx.assets, v);
  assert.equal(vars.doerflerzahl, '3');
  assert.equal(vars.V3, undefined);
});

test('villagerCount: ein Marker oder eine Figur ohne Tableau zählt nicht', () => {
  const lose = (assetName, label) => ({ id: `lose-${label}`, label, assetId: assetId(assetName), x: 10, y: 10, shape: 'image', size: 50 });
  // Der Tisch hat zwei Tableaus; dazu die Figur und der Spielstein des dritten Dörflers.
  const s = zwei();
  s.tokens.push(lose('Henlo Bulwark', 'Henlo Bulwark'), lose('Henlo', 'Henlo'));
  assert.equal(count(s), 2);
  // Und auf einem Tisch ganz ohne Tableau: 0, nicht 2.
  assert.equal(count({ tokens: [lose('Henlo Bulwark', 'Henlo Bulwark'), lose('Henlo', 'Henlo')] }), 0);
});

test('seatVars: doerflerzahl als Text; bei 0 fehlt der Schlüssel', () => {
  assert.equal(seatVars(build(), fx.assets, villagers).doerflerzahl, '3');
  assert.equal(seatVars(zwei(), fx.assets, villagers).doerflerzahl, '2');
  for (const [state, v] of [[{}, villagers], [build(), {}], [build(), undefined]]) {
    const vars = seatVars(state, fx.assets, v);
    assert.equal('doerflerzahl' in vars, false);
  }
});

test('der Schritt dahinter: +3 bei drei, +2 bei zwei; bei keinem skipped, nicht +0', () => {
  const einmal = (state, over) => run(state, [probe, plus], over);
  assert.equal(counterNamed(einmal(build()).state, 'Probe').value, 3);
  assert.equal(counterNamed(einmal(zwei()).state, 'Probe').value, 2);

  const r = einmal({});
  assert.deepEqual(r.log.map(e => e.status), ['ok', 'skipped']);
  assert.match(r.log[1].reason, /\$doerflerzahl is not bound/);
  assert.equal(counterNamed(r.state, 'Probe').value, 0);
});

test('im Aufbau neu gebunden: die Zahl, die der Lauf bis hierher gesetzt hat', () => {
  const sit = (seat, villager) => ({ type: 'seat_villager', seat, villager });
  const zaehl = (steps) => {
    const r = run({}, [probe, ...steps, plus]);
    assert.deepEqual(r.log.filter(e => e.status !== 'ok'), []);
    return counterNamed(r.state, 'Probe').value;
  };
  assert.equal(zaehl([sit(1, 'Henlo Bulwark'), sit(2, 'Fridgette Jones')]), 2);
  assert.equal(zaehl([sit(1, 'Henlo Bulwark'), sit(2, 'Fridgette Jones'), sit(3, 'Granny Melba')]), 3);
  // Vor dem ersten Dörfler ist sie noch nicht da - und wird auch nicht für später vorgemerkt.
  const r = run({}, [probe, plus, sit(1, 'Henlo Bulwark')]);
  assert.equal(r.log[1].status, 'skipped');
  assert.equal(counterNamed(r.state, 'Probe').value, 0);
});

test('swap_villager ändert die Zahl nicht', () => {
  for (const [state, n] of [[build(), 3], [zwei(), 2]]) {
    const r = run(state, [probe, { type: 'swap_villager', seat: 1, villager: 'Judy Marks' }, plus]);
    assert.deepEqual(r.log.filter(e => e.status !== 'ok'), []);
    assert.equal(counterNamed(r.state, 'Probe').value, n);
    assert.equal(count(r.state), n);
  }
});

test('eine Quelle: seatVars zeigt, was villagerCount sagt; der Executor trägt keine zweite Zählung', () => {
  const tische = [build(), zwei(), {}, run({}, LINEUP.slice(0, 1)).state];
  for (const s of tische) {
    const n = count(s);
    assert.equal(seatVars(s, fx.assets, villagers).doerflerzahl, n > 0 ? String(n) : undefined);
  }
  // Den Namen der Variablen (kleingeschrieben, wie der Platzhalter: die Ersetzung unterscheidet Gross und Klein) kennt nur `shared/villagers.js` - der Executor ersetzt
  // Platzhalter, ohne ihn zu kennen, und rechnet keine Zahl der Dörfler selbst.
  const src = (f) => fs.readFileSync(new URL(`../../shared/${f}`, import.meta.url), 'utf8');
  const hits = fs.readdirSync(new URL('../../shared/', import.meta.url)).filter(f => f.endsWith('.js') && /(?<!\$)\bdoerflerzahl\b/.test(src(f)));
  assert.deepEqual(hits, ['villagers.js']);
  // Und er zählt die Sitzenden auch unter keinem anderen Namen: er fragt nur, welche Plätze besetzt sind.
  assert.doesNotMatch(src('sequenceExecutor.js'), /seatedVillagers\([^)]*\)\s*\.length/);
});

test('validateOptions: ein $doerflerzahl in einer Aktion ist erlaubt', () => {
  const options = { a: { label: 'A', default: 'x', choices: { x: { label: 'x', vars: { A: '1' } } } } };
  const action = (value) => [{ id: 'k', steps: [{ type: 'set_counter', name: 'Münzen', value }] }];
  assert.deepEqual(validateOptions(options, [], action('+$doerflerzahl')), []);
  // Gegenprobe: `$opt…` bleibt verboten - der Prüfer schaut also hin.
  assert.equal(validateOptions(options, [], action('+$optA')).length, 1);
});
