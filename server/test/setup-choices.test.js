// CW / Spec M27.3 — `client/src/utils/setupChoices.js`: die Wahl in der Adresse.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Client hat keine Testinfrastruktur, also steht die Rechnung hier - reine
// Funktionen, ohne DOM. Die Wahl reist in der Adresse
// (`?setupId=…&opt=partie:lang&opt=troedel:ohne`), damit ein Neuladen derselben
// Adresse denselben Aufbau baut. **Was die Wahl bedeutet**, rechnet nicht diese
// Datei: dafür gibt es `resolveChoices` (shared/setupOptions.js) - hier wird nur
// aus Text eine Wahl und zurück.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { parseChoices, formatChoices, choicesFromSearch } = await import('../../client/src/utils/setupChoices.js');
const { resolveTableSource } = await import('../../client/src/utils/tableSource.js');
const { resolveChoices } = await import('../../shared/setupOptions.js');

test('CW: `parseChoices` liest Option:Wahl-Paare', () => {
  assert.deepEqual(parseChoices(['partie:lang', 'troedel:ohne']), { choices: { partie: 'lang', troedel: 'ohne' }, problems: [] });
});

test('CW: keine Einträge – eine leere Wahl, und das heißt „die Vorgaben"', () => {
  for (const none of [[], undefined, null]) {
    assert.deepEqual(parseChoices(none), { choices: {}, problems: [] });
  }
});

test('CW: ein Eintrag ohne `:`, mit leerem Teil oder kein Text ist ein Problem – nicht das Default', () => {
  for (const bad of ['partie', ':lang', 'partie:', ':', '', '  ', 3, null]) {
    const r = parseChoices([bad]);
    assert.equal(r.problems.length, 1, JSON.stringify(bad));
    assert.deepEqual(r.choices, {}, 'mit einem Problem gibt es keine Wahl');
  }
  assert.match(parseChoices(['partie']).problems[0], /"partie"/);
});

test('CW: dieselbe Option zweimal ist ein Problem, auch mit demselben Wert', () => {
  for (const list of [['partie:lang', 'partie:kurz'], ['partie:lang', 'partie:lang']]) {
    const r = parseChoices(list);
    assert.equal(r.problems.length, 1);
    assert.match(r.problems[0], /partie.*twice/);
  }
});

test('CW: `formatChoices` schreibt die Parameter – und Hin und Zurück ergibt dasselbe', () => {
  assert.equal(formatChoices({ partie: 'lang', troedel: 'ohne' }), 'opt=partie:lang&opt=troedel:ohne');
  assert.equal(formatChoices({}), '');
  assert.equal(formatChoices(undefined), '');
  const choices = { partie: 'lang', troedel: 'ohne' };
  assert.deepEqual(choicesFromSearch(`?setupId=x&${formatChoices(choices)}`), { choices, problems: [] });
  assert.deepEqual(parseChoices(new URLSearchParams(formatChoices(choices)).getAll('opt')).choices, choices);
});

test('CW: `choicesFromSearch` ohne `opt` ist die leere Wahl – alte Lesezeichen bauen die Vorgaben', () => {
  assert.deepEqual(choicesFromSearch('?setupId=abc'), { choices: {}, problems: [] });
  assert.deepEqual(choicesFromSearch(''), { choices: {}, problems: [] });
});

test('CW: `opt=partie:xxx` – lesbar, aber unbekannt: `resolveChoices` meldet es, und es wird nichts aufgebaut', () => {
  const { choices, problems } = choicesFromSearch('?opt=partie:xxx');
  assert.deepEqual(problems, []);
  const options = { partie: { default: 'kurz', choices: { kurz: {}, lang: {} } } };
  const r = resolveChoices(options, choices);
  assert.equal(r.problems.length, 1);
  assert.deepEqual(r.choices, {});
});

test('CW: `resolveTableSource` bleibt unverändert – `opt` ist kein Quellenparameter', () => {
  const base = { setupId: 'abc' };
  assert.deepEqual(resolveTableSource({ ...base, opt: ['partie:lang'] }), resolveTableSource(base));
  assert.deepEqual(resolveTableSource(base), { kind: 'setup', saveId: null, setupId: 'abc', setupMode: false });
});

// ── optionsOfSetup: was der Dialog und das Modal fragen ──────────────────────

const { optionsOfSetup } = await import('../../client/src/utils/setupChoices.js');

test('CW: `optionsOfSetup` liest die Optionen aus der Zeile – als Text oder als Objekt, sonst null', () => {
  const options = { partie: { default: 'kurz', choices: { kurz: {}, lang: {} } } };
  assert.deepEqual(optionsOfSetup({ scenario_data: JSON.stringify({ bosses: {}, options }) }), options);
  assert.deepEqual(optionsOfSetup({ scenario_data: { options } }), options);
  // Kein Dialog, wo es nichts zu wählen gibt: die beiden anderen Aufbauten.
  for (const none of [null, undefined, {}, { scenario_data: null }, { scenario_data: '{}' }, { scenario_data: '[]' },
    { scenario_data: 'kein JSON' }, { scenario_data: JSON.stringify({ options: {} }) },
    { scenario_data: JSON.stringify({ options: [] }) }, { scenario_data: JSON.stringify({ options: 'x' }) }]) {
    assert.equal(optionsOfSetup(none), null, JSON.stringify(none));
  }
});
