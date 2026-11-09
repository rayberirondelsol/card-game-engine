// EI / Spec M31.3 — die Verneinung in `onlyChoice`: `{ doerfler3: "!keiner" }` heißt
// „jede Wahl außer `keiner`". Der Aufbau braucht sie für die Schritte der Plätze 3–5,
// ohne die neun Namen aufzuzählen (eine zweite Quelle für den Roster).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Verneinung bleibt **laut**: sie steht allein, ein Text mit `!` ohne bekannte Wahl
// ist ein Problem, keine Mischung und kein stilles „trifft zu".

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { checkGate, validateOptions } = await import('../../shared/setupOptions.js');
const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

const OPTIONS = {
  doerfler3: {
    label: 'Dörfler 3', default: 'keiner',
    choices: {
      Henlo: { label: 'Henlo Bulwark', vars: { Doerfler3: 'Henlo Bulwark' } },
      Granny: { label: 'Granny Gearhart', vars: { Doerfler3: 'Granny Gearhart' } },
      keiner: { label: 'kein dritter Dörfler', vars: { Doerfler3: '' } },
    },
  },
};

const gate = (onlyChoice, choices = { doerfler3: 'Henlo' }) => checkGate(onlyChoice, OPTIONS, choices);

test('EI: `!keiner` trifft auf jede andere Wahl zu, auf `keiner` nicht', () => {
  assert.deepEqual(gate({ doerfler3: '!keiner' }, { doerfler3: 'Henlo' }), { ok: true, applies: true });
  assert.deepEqual(gate({ doerfler3: '!keiner' }, { doerfler3: 'Granny' }), { ok: true, applies: true });
  assert.deepEqual(gate({ doerfler3: '!keiner' }, { doerfler3: 'keiner' }), { ok: true, applies: false });
});

test('EI: die Verneinung ist UND-verknüpft mit den anderen Optionen des Gates', () => {
  const opts = { ...OPTIONS, partie: { label: 'P', default: 'kurz', choices: { kurz: { vars: {} }, lang: { vars: {} } } } };
  const g = { doerfler3: '!keiner', partie: 'kurz' };
  assert.equal(checkGate(g, opts, { doerfler3: 'Henlo', partie: 'kurz' }).applies, true);
  assert.equal(checkGate(g, opts, { doerfler3: 'Henlo', partie: 'lang' }).applies, false);
  assert.equal(checkGate(g, opts, { doerfler3: 'keiner', partie: 'kurz' }).applies, false);
});

test('EI: Unverstandenes bleibt laut – `!` allein, unbekannte Wahl, Liste, Mischung, doppeltes `!`', () => {
  for (const [form, wahl] of [
    ['!', '"!"'],
    ['!gibtsnicht', 'gibtsnicht'],
    [['!keiner'], '!keiner'],
    [['Henlo', '!keiner'], '!keiner'],
    ['!!keiner', '!!keiner'],
  ]) {
    const r = gate({ doerfler3: form });
    assert.equal(r.ok, false, JSON.stringify(form));
    assert.equal(r.applies, undefined, JSON.stringify(form));
    assert.match(r.problem, /doerfler3/, `Option genannt: ${JSON.stringify(form)}`);
    assert.ok(r.problem.includes(wahl.replace(/"/g, '')), `Wahl genannt (${wahl}): ${r.problem}`);
  }
});

test('EI: ohne gemachte Wahl scheitert die Verneinung wie jedes Gate', () => {
  const r = gate({ doerfler3: '!keiner' }, {});
  assert.equal(r.ok, false);
  assert.match(r.problem, /no choice made.*doerfler3/);
  assert.equal(checkGate({ doerfler3: '!keiner' }, OPTIONS, undefined).ok, false);
});

test('EI: `validateOptions` – `!keiner` besteht, `!nobody` nennt Schritt (1-basiert) und Option', () => {
  const step = (o) => ({ type: 'place_counter', name: 'X', value: 1, x: 0, y: 0, onlyChoice: o });
  assert.deepEqual(validateOptions(OPTIONS, [step({ doerfler3: '!keiner' })], []), []);
  const p = validateOptions(OPTIONS, [step({ doerfler3: 'Henlo' }), step({ doerfler3: '!nobody' })], []);
  assert.equal(p.length, 1);
  assert.match(p[0], /^step 2:/);
  assert.match(p[0], /doerfler3/);
  assert.match(p[0], /nobody/);
  // Die Verneinung ist in einer Aktion so verboten wie jedes onlyChoice.
  const a = validateOptions(OPTIONS, [], [{ id: 'a', steps: [step({ doerfler3: '!keiner' })] }]);
  assert.equal(a.length, 1);
  assert.match(a[0], /not allowed in an action/);
});

test('EI: der Executor – der Schritt läuft für Henlo, nicht für keiner, und ohne Protokollzeile', () => {
  const steps = [
    { type: 'place_counter', name: 'immer', value: 1, x: 0, y: 0 },
    { type: 'place_counter', name: 'dritter', value: 1, x: 0, y: 0, onlyChoice: { doerfler3: '!keiner' } },
  ];
  const run = (doerfler3) => executeSequenceWithLog({}, steps, [], {
    assets: [], cards: [], scenarioData: { options: OPTIONS }, choices: { doerfler3 },
  });
  const mit = run('Henlo');
  assert.deepEqual(mit.state.counters.map(c => c.name), ['immer', 'dritter']);
  assert.deepEqual(mit.log.map(e => e.status), ['ok', 'ok']);
  const ohne = run('keiner');
  assert.deepEqual(ohne.state.counters.map(c => c.name), ['immer']);
  assert.deepEqual(ohne.log.map(e => e.index), [0], 'keine Zeile für den übersprungenen Schritt');
});

test('EI: der Executor – ein kaputtes `!`-Gate scheitert laut und der Schritt läuft nicht', () => {
  const steps = [{ type: 'place_counter', name: 'X', value: 1, x: 0, y: 0, onlyChoice: { doerfler3: ['Henlo', '!keiner'] } }];
  const { state, log } = executeSequenceWithLog({}, steps, [], {
    assets: [], cards: [], scenarioData: { options: OPTIONS }, choices: { doerfler3: 'Henlo' },
  });
  assert.deepEqual(state.counters ?? [], []);
  assert.equal(log.length, 1);
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /onlyChoice/);
});
