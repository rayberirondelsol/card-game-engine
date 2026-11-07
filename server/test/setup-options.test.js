// CS / Spec M27.3 — `shared/setupOptions.js`: die eine Stelle für die Regel, wie
// aus den Optionen eines Setups und einer Wahl die Platzhalter werden.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Dieselbe Funktion rufen später der Dialog (Vorbelegung), der Server (beim
// Anlegen eines Raums) und der Executor (als letzte Wache). Es gibt keine zweite
// Rechnung - darum steht hier, was sie meldet.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveChoices, validateOptions, describeChoices, checkGate, optionVarName } from '../../shared/setupOptions.js';

// So steht es in `scenario_data.options` (Spec M27.2).
const OPTIONS = {
  partie: {
    label: 'Spiellänge', default: 'kurz',
    choices: {
      kurz: { label: 'Kurz (3-Runden-Modus)', vars: { Muenzen: '45' } },
      lang: { label: 'Lang (4 Runden)', vars: { Muenzen: '30' } },
    },
  },
  troedel: {
    label: 'Toller Trödel', default: 'mit',
    choices: {
      mit: { label: 'mit Toller Trödel', vars: { Nachschub: 'Toller Trödel: Nachschub (Nr. 1-30)' } },
      ohne: { label: 'ohne Toller Trödel', vars: { Nachschub: 'Nachschub' } },
    },
  },
};
const copy = (x) => JSON.parse(JSON.stringify(x));

// ── resolveChoices ──────────────────────────────────────────────────────────

test('CS: nichts gegeben – jede Option bekommt ihr default', () => {
  const r = resolveChoices(OPTIONS, {});
  assert.deepEqual(r.choices, { partie: 'kurz', troedel: 'mit' });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(resolveChoices(OPTIONS, undefined).choices, { partie: 'kurz', troedel: 'mit' });
});

test('CS: teilweise gegeben – der Rest bekommt default', () => {
  const r = resolveChoices(OPTIONS, { partie: 'lang' });
  assert.deepEqual(r.choices, { partie: 'lang', troedel: 'mit' });
  assert.deepEqual(r.problems, []);
});

test('CS: `vars` kommt als `opt<Name>` – Text, auch bei Zahlen', () => {
  const r = resolveChoices(OPTIONS, { partie: 'lang', troedel: 'ohne' });
  assert.deepEqual(r.vars, { optMuenzen: '30', optNachschub: 'Nachschub' });
  assert.equal(optionVarName('Muenzen'), 'optMuenzen');
  // Eine Zahl in den Daten wird Text, wie jeder Platzhalter.
  const num = copy(OPTIONS);
  num.partie.choices.kurz.vars.Muenzen = 45;
  assert.equal(resolveChoices(num, {}).vars.optMuenzen, '45');
});

test('CS: eine unbekannte Option oder Wahl ist ein Problem – nicht stillschweigend default', () => {
  const a = resolveChoices(OPTIONS, { partie: 'mittel' });
  assert.equal(a.problems.length, 1);
  assert.match(a.problems[0], /partie/);
  assert.match(a.problems[0], /mittel/);
  assert.match(a.problems[0], /kurz, lang/, 'die Meldung nennt, was es gibt');

  const b = resolveChoices(OPTIONS, { laenge: 'kurz' });
  assert.equal(b.problems.length, 1);
  assert.match(b.problems[0], /no option "laenge"/);
});

test('CS: eine Wahl, die kein Text ist, ist ein Problem', () => {
  for (const bad of [3, true, null, ['kurz'], {}]) {
    const r = resolveChoices(OPTIONS, { partie: bad });
    assert.equal(r.problems.length, 1, JSON.stringify(bad));
    assert.match(r.problems[0], /partie/);
  }
});

test('CS: mit Problemen gibt es keine Wahl und keine Variablen – es wird nichts aufgebaut', () => {
  const r = resolveChoices(OPTIONS, { partie: 'mittel' });
  assert.deepEqual(r.choices, {});
  assert.deepEqual(r.vars, {});
});

test('CS: ein Setup ohne options – leer; eine Wahl dafür ist ein Problem (Tippfehler in der Adresse)', () => {
  for (const none of [undefined, null, {}, 'x']) {
    assert.deepEqual(resolveChoices(none, undefined), { choices: {}, vars: {}, problems: [] });
    assert.deepEqual(resolveChoices(none, {}), { choices: {}, vars: {}, problems: [] });
  }
  const r = resolveChoices(undefined, { partie: 'lang' });
  assert.deepEqual(r.problems, ['setup has no option "partie"']);
  assert.deepEqual(r.choices, {});
});

// ── describeChoices ─────────────────────────────────────────────────────────

test('CS: die Meldung nach dem Laden nennt die Bezeichnungen, in der Reihenfolge der Optionen', () => {
  assert.equal(describeChoices(OPTIONS, { troedel: 'ohne', partie: 'lang' }), 'Lang (4 Runden), ohne Toller Trödel');
  assert.equal(describeChoices(OPTIONS, { partie: 'kurz', troedel: 'mit' }), 'Kurz (3-Runden-Modus), mit Toller Trödel');
  assert.equal(describeChoices(undefined, {}), '');
  // Eine Wahl ohne Bezeichnung zeigt ihren Schlüssel.
  const ohneLabel = copy(OPTIONS);
  delete ohneLabel.partie.choices.lang.label;
  assert.equal(describeChoices(ohneLabel, { partie: 'lang', troedel: 'mit' }), 'lang, mit Toller Trödel');
});

// ── checkGate ───────────────────────────────────────────────────────────────

test('CS: das Gate – UND über Optionen, eine Liste trifft jeden ihrer Werte', () => {
  const choices = { partie: 'kurz', troedel: 'mit' };
  assert.deepEqual(checkGate({ partie: 'kurz' }, OPTIONS, choices), { ok: true, applies: true });
  assert.deepEqual(checkGate({ partie: 'lang' }, OPTIONS, choices), { ok: true, applies: false });
  assert.deepEqual(checkGate({ partie: 'kurz', troedel: 'ohne' }, OPTIONS, choices), { ok: true, applies: false });
  assert.deepEqual(checkGate({ partie: 'kurz', troedel: 'mit' }, OPTIONS, choices), { ok: true, applies: true });
  assert.deepEqual(checkGate({ partie: ['kurz', 'lang'] }, OPTIONS, { partie: 'lang', troedel: 'mit' }), { ok: true, applies: true });
});

test('CS: das Gate scheitert laut – unbekannte Option, unbekannte Wahl, kein Objekt, keine Optionen', () => {
  const choices = { partie: 'kurz', troedel: 'mit' };
  for (const [gate, was] of [
    [{ laenge: 'kurz' }, /no option "laenge"/],
    [{ partie: 'mittel' }, /"mittel".*kurz, lang/],
    [{ partie: ['kurz', 'mittel'] }, /"mittel"/],
    [{ partie: 3 }, /partie/],
    ['kurz', /onlyChoice/],
    [['partie'], /onlyChoice/],
    [{}, /names no option/],
  ]) {
    const r = checkGate(gate, OPTIONS, choices);
    assert.equal(r.ok, false, JSON.stringify(gate));
    assert.match(r.problem, was, JSON.stringify(gate));
  }
  // Ohne Optionen im Setup kennt kein Gate seine Option.
  assert.equal(checkGate({ partie: 'kurz' }, undefined, {}).ok, false);
  // Eine Option, für die der Lauf keine Wahl hat, ist keine Antwort „trifft nicht zu".
  assert.equal(checkGate({ partie: 'kurz' }, OPTIONS, {}).ok, false);
});

// ── validateOptions ─────────────────────────────────────────────────────────

const noProblems = (options, seq = [], actions = []) => validateOptions(options, seq, actions);

test('CS: die Optionen aus der Spec bestehen die Prüfung', () => {
  assert.deepEqual(noProblems(OPTIONS), []);
  assert.deepEqual(noProblems(undefined), []);
});

test('CS: das default muss eine der Wahlen sein', () => {
  const o = copy(OPTIONS);
  o.partie.default = 'mittel';
  const p = noProblems(o);
  assert.equal(p.length, 1);
  assert.match(p[0], /partie/);
  assert.match(p[0], /default "mittel"/);
  delete o.partie.default;
  assert.match(noProblems(o)[0], /no default/);
});

test('CS: jede Option hat Wahlen, und jede Wahl einen Schlüssel aus Buchstaben und Ziffern', () => {
  const o = copy(OPTIONS);
  o.leer = { label: 'x', default: 'a', choices: {} };
  assert.ok(noProblems(o).some(x => /leer.*no choices/.test(x)));
  const k = copy(OPTIONS);
  k.partie.choices['über lang'] = { label: 'x' };
  assert.ok(noProblems(k).some(x => /partie.*"über lang"/.test(x)));
  const n = copy(OPTIONS);
  n['Toller Trödel'] = n.troedel;
  assert.ok(noProblems(n).some(x => /option "Toller Trödel".*name/.test(x)));
});

test('CS: ein Variablenname mit ü, Leerzeichen oder einem Anfang, der ein Platzhalter von sonst wäre, wird gemeldet', () => {
  for (const name of ['Münzen', 'Zwei Worte', 'V1', 'F2', 'V1LEB', 'revealed', 'revealedBase', '1x']) {
    const o = copy(OPTIONS);
    o.partie.choices.kurz.vars = { [name]: '45' };
    o.partie.choices.lang.vars = { [name]: '30' };
    const p = noProblems(o);
    assert.ok(p.some(x => x.includes(`"${name}"`)), `${name}: ${p.join('\n')}`);
    assert.ok(p.every(x => /partie/.test(x)), `${name}: jede Meldung nennt die Option`);
  }
  for (const gut of ['Muenzen', 'Runden', 'Vorrat', 'Fertig', 'Revealer']) {
    const o = copy(OPTIONS);
    o.partie.choices.kurz.vars = { [gut]: '45' };
    o.partie.choices.lang.vars = { [gut]: '30' };
    assert.deepEqual(noProblems(o), [], gut);
  }
});

test('CS: ein Wert, der kein Text und keine Zahl ist, wird gemeldet', () => {
  const o = copy(OPTIONS);
  o.partie.choices.kurz.vars.Muenzen = { x: 1 };
  assert.ok(noProblems(o).some(x => /Muenzen/.test(x) && /text/.test(x)));
});

test('CS: eine Wahl, die eine Variable nicht setzt, die eine andere derselben Option setzt, wird gemeldet', () => {
  const o = copy(OPTIONS);
  delete o.troedel.choices.ohne.vars.Nachschub;
  const p = noProblems(o, [{ type: 'place_stack', category: ['$optNachschub'], label: 'x' }]);
  assert.ok(p.some(x => /troedel/.test(x) && /ohne/.test(x) && /Nachschub/.test(x)), p.join('\n'));
});

test('CS: zwei Optionen, die denselben Variablennamen setzen, stoßen zusammen', () => {
  const o = copy(OPTIONS);
  o.troedel.choices.mit.vars.Muenzen = '1';
  o.troedel.choices.ohne.vars.Muenzen = '2';
  const p = noProblems(o);
  assert.ok(p.some(x => /Muenzen/.test(x) && /partie/.test(x) && /troedel/.test(x)), p.join('\n'));
});

test('CS: ein Schritt der Folge mit `onlyChoice` nennt eine Option oder Wahl, die es nicht gibt', () => {
  const seq = [
    { type: 'shuffle', stackLabel: 'a' },
    { type: 'place_asset', assetName: 'Marker', onlyChoice: { partie: 'kurz' } },
    { type: 'place_asset', assetName: 'Marker', onlyChoice: { laenge: 'kurz' } },
    { type: 'place_asset', assetName: 'Marker', onlyChoice: { partie: 'mittel' } },
    { type: 'place_asset', assetName: 'Marker', onlyChoice: { partie: ['kurz', 'riesig'] } },
    { type: 'place_asset', assetName: 'Marker', onlyChoice: 'kurz' },
  ];
  const p = noProblems(OPTIONS, seq);
  assert.equal(p.length, 4, p.join('\n'));
  assert.match(p[0], /step 3/);
  assert.match(p[0], /"laenge"/);
  assert.match(p[1], /step 4/);
  assert.match(p[1], /"mittel"/);
  assert.match(p[2], /step 5/);
  assert.match(p[2], /"riesig"/);
  assert.match(p[3], /step 6/);
});

test('CS: ein Platzhalter `$opt…` in der Folge, den keine Option setzt, wird gemeldet', () => {
  const seq = [
    { type: 'place_stack', category: ['$optNachschub'], label: 'x', x: 1, y: 2 },
    { type: 'place_counter', name: 'M', value: '$optMuenzen', x: 1, y: 2 },
    { type: 'place_counter', name: 'M', value: '$optGibtEsNicht', x: 1, y: 2 },
  ];
  const p = noProblems(OPTIONS, seq);
  assert.equal(p.length, 1, p.join('\n'));
  assert.match(p[0], /step 3/);
  assert.match(p[0], /\$optGibtEsNicht/);
});

test('CS: ein Schritt **einer Aktion** mit `onlyChoice` oder `$opt…` wird gemeldet – Spielstände kennen die Wahl nicht', () => {
  const actions = [
    { id: 'kampf-beginnen', label: 'Kampf beginnen', steps: [
      { type: 'shuffle', stackLabel: 'a' },
      { type: 'place_asset', assetName: 'M', onlyChoice: { partie: 'kurz' } },
      { type: 'place_stack', category: ['$optNachschub'], label: 'x', x: 1, y: 2 },
    ] },
  ];
  const p = noProblems(OPTIONS, [], actions);
  assert.equal(p.length, 2, p.join('\n'));
  assert.match(p[0], /kampf-beginnen/);
  assert.match(p[0], /step 2/);
  assert.match(p[0], /onlyChoice/);
  assert.match(p[1], /step 3/);
  assert.match(p[1], /\$optNachschub/);
});

test('CS: Aktionen ohne Wahl-Bezug bestehen auch ohne options', () => {
  const actions = [{ id: 'a', steps: [{ type: 'shuffle', stackLabel: 'a' }] }];
  assert.deepEqual(noProblems(undefined, [], actions), []);
  // Auch ohne `options` ist ein `onlyChoice` in der Folge ein Fehler: es gibt nichts, was es lesen könnte.
  const p = noProblems(undefined, [{ type: 'shuffle', stackLabel: 'a', onlyChoice: { partie: 'kurz' } }], []);
  assert.equal(p.length, 1);
});
