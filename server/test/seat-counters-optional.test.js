// DY / Spec M30.5 — Zähler am Platz sind optional: ein Platz ohne `counters` legt keine
// und sagt dazu nichts; ein Platz mit `counters` verhält sich wie bisher.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Code bekommt die Fähigkeit, das Weglassen der Zähler aus den Daten (`ED`)
// kommt später: mit den heutigen Daten muss der neue Code den Tisch von heute
// bauen (Test 4) - das ist der Beweis, dass er vor den Daten deploybar ist.
//
// **Eine Regel** (Test 1): `counters` fehlt, ist `null` oder `{}` → „der Platz hat
// keine" (in Ordnung). Jede **Teil-Angabe** ist der Fehler - die Daten sagen dann
// etwas, das sie nicht zu Ende sagen, und der Aufbau stellt nichts halb hin.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { seatGeometryProblems, validateVillagers, seatedVillagers, STATS } from '../../shared/villagers.js';
import { zoneSlotNumberAt } from '../../shared/zoneGeometry.js';
import { VILLAGERS } from '../../scripts/doerfler-daten.mjs';
import { ohneIds } from '../../scripts/auslagen-daten.mjs';
import {
  fx, ZONES, scenarioData, run, copy, build, LINEUP, tokenNamed, counterNamed, resolved,
} from './villager-table.js';

/** Die Szenariodaten von heute, die Zähler an allen Plätzen gelöscht. */
const ohneZaehler = (() => {
  const d = copy(scenarioData);
  for (const s of d.villagers.seats) delete s.counters;
  return d;
})();
const bauen = (data, steps = LINEUP) => run({}, steps, { scenarioData: data });
const seatOf = (data, n = 1) => data.villagers.seats[n - 1];
const unguenstig = (log) => log.filter(e => e.status !== 'ok');
const WERTE = STATS.map(st => st.key);

// ── Die Geometrie ───────────────────────────────────────────────────────────

test('DY 1: seatGeometryProblems – ohne `counters` in Ordnung, vollständig in Ordnung, Teil-Angabe ist der Fehler', () => {
  const seat = copy(seatOf(scenarioData));
  assert.deepEqual(seatGeometryProblems(seat, 1), [], 'vier Stellen: wie heute');

  for (const keine of [undefined, null, {}]) {
    const s = { ...seat, counters: keine };
    assert.deepEqual(seatGeometryProblems(s, 1), [], `counters ${JSON.stringify(keine)}: der Platz hat keine`);
  }
  delete seat.counters;
  assert.deepEqual(seatGeometryProblems(seat, 1), [], 'counters fehlt ganz');

  const teil = { ...seat, counters: { Leben: { x: 1, y: 2 } } };
  assert.deepEqual(seatGeometryProblems(teil, 1), [
    'seat 1: no counter position for Bewegung',
    'seat 1: no counter position for Mumm',
    'seat 1: no counter position for Präzision',
  ]);
  // Das Tableau bleibt Pflicht, auch ohne Zähler.
  assert.deepEqual(seatGeometryProblems({ ...seat, tableau: undefined }, 1), ['seat 1: no tableau position']);
});

test('DY 2: validateVillagers – Daten ohne Zähler und die heutigen Daten melden nichts', () => {
  const ctx = { assets: fx.assets, cards: fx.cards, zones: ZONES };
  assert.deepEqual(validateVillagers(ohneZaehler.villagers, ctx), []);
  assert.deepEqual(validateVillagers(scenarioData.villagers, ctx), []);
});

// ── Der Aufbau ──────────────────────────────────────────────────────────────

test('DY 3: Aufbau ohne Zähler – keine Zähler, zwölf Marker auf den Startwerten, sonst alles wie sonst', () => {
  const { state, log } = bauen(ohneZaehler);
  assert.deepEqual(unguenstig(log), [], log.map(e => e.reason).join('\n'));
  assert.deepEqual(state.counters, []);

  const zonen = resolved(state);
  const sitzende = seatedVillagers(state, fx.assets, ohneZaehler.villagers);
  assert.equal(sitzende.length, 3);
  for (const s of sitzende) {
    assert.equal(s.token.locked, true, `Tableau ${s.n} gesperrt`);
    assert.equal(tokenNamed(state, s.data.short).length, 1, `Spielstein ${s.data.short}`);
    for (const st of STATS) {
      const [m] = tokenNamed(state, `Marker ${s.n}: ${st.key}`);
      assert.ok(m, `Marker ${s.n}: ${st.key}`);
      const zone = zonen.find(z => z.label === `Dörfler ${s.n}: ${st.key}`);
      assert.equal(zoneSlotNumberAt(zone, m.x, m.y), s.data.start[st.key], `${s.data.short}: ${st.key} liegt auf seinem Startwert`);
    }
  }
  assert.equal(state.tokens.filter(t => /^Marker /.test(t.label)).length, 12);
  assert.ok(state.cards.length > 0, 'die Ausrüstung liegt in den Plätzen');
});

test('DY 4: derselbe Rest – mit Zählern und ohne gleichen sich in Tokens und Karten, nur `counters` unterscheidet (12 gegen 0)', () => {
  const mit = bauen(scenarioData);
  const ohne = bauen(ohneZaehler);
  assert.deepEqual(unguenstig(mit.log), []);
  assert.deepEqual(ohneIds(ohne.state.tokens), ohneIds(mit.state.tokens));
  assert.deepEqual(ohneIds(ohne.state.cards), ohneIds(mit.state.cards));
  assert.equal(mit.state.counters.length, 12);
  assert.equal(ohne.state.counters.length, 0);
  // Und die Meldungen sind dieselben: ohne Zähler kein Hinweis je Wert.
  assert.deepEqual(ohne.log.map(e => e.status), mit.log.map(e => e.status));
  assert.deepEqual(ohne.log.map(e => e.reason), mit.log.map(e => e.reason));
});

test('DY 5: der Startwert bleibt geprüft – auch ohne Zähler am Platz, und nichts wird gelegt', () => {
  const kaputt = copy(ohneZaehler);
  delete kaputt.villagers.roster['Henlo Bulwark'].start.Mumm;
  const { state, log } = bauen(kaputt, [{ type: 'seat_villager', seat: 1, villager: 'Henlo Bulwark' }]);
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /no start value for Mumm/);
  // Alles oder nichts: kein Marker auf Platz 1 der Leiste, nichts sonst.
  assert.deepEqual([state.tokens, state.counters, state.cards].map(l => l.length), [0, 0, 0]);
});

// ── Der Tausch ──────────────────────────────────────────────────────────────

const tausch = (state, data, villager = 'Judy Marks') => run(state, [{ type: 'swap_villager', seat: 1, villager }], { scenarioData: data });

test('DY 6: Tausch ohne Zähler am Platz – ok, kein Hinweis je Wert, Judys Marker auf den Startwerten, keine Zähler', () => {
  const s = bauen(ohneZaehler).state;
  const { state, log } = tausch(s, ohneZaehler);
  assert.deepEqual(log.map(e => e.status), ['ok'], log.map(e => e.reason).join('\n'));
  assert.deepEqual(state.counters, []);

  const judy = scenarioData.villagers.roster['Judy Marks'];
  const zonen = resolved(state);
  for (const st of STATS) {
    const [m] = tokenNamed(state, `Marker 1: ${st.key}`);
    assert.equal(tokenNamed(state, `Marker 1: ${st.key}`).length, 1);
    const zone = zonen.find(z => z.label === `Dörfler 1: ${st.key}`);
    assert.equal(zoneSlotNumberAt(zone, m.x, m.y), judy.start[st.key], `Judy: ${st.key}`);
  }
});

test('DY 7: Tausch mit alten Zählern am Tisch, Platz ohne Zählerstellen – die alten gehen, neue entstehen nicht, kein Hinweis', () => {
  const s = build();                       // Zähler von heute am Tisch
  assert.ok(counterNamed(s, 'Henlo: Leben'));
  const { state, log } = tausch(s, ohneZaehler);
  assert.deepEqual(log.map(e => e.status), ['ok'], log.map(e => e.reason).join('\n'));
  for (const w of WERTE) {
    assert.equal(counterNamed(state, `Henlo: ${w}`), undefined, `Henlo: ${w} ist weg`);
    assert.equal(counterNamed(state, `Judy: ${w}`), undefined, `Judy: ${w} entsteht nicht`);
  }
  assert.equal(state.counters.length, 8, 'die Zähler der anderen beiden Dörfler bleiben');
});

test('DY 8: Tausch mit Zählerstellen – unverändert: die vier neuen Zähler stehen an den Stellen der alten', () => {
  const s = build();
  const alt = counterNamed(s, 'Henlo: Mumm');
  const { state, log } = tausch(s, scenarioData);
  assert.deepEqual(log.map(e => e.status), ['ok'], log.map(e => e.reason).join('\n'));
  const neu = counterNamed(state, 'Judy: Mumm');
  assert.deepEqual([neu.x, neu.y], [alt.x, alt.y]);
  assert.equal(WERTE.filter(w => counterNamed(state, `Judy: ${w}`)).length, 4);
});

test('DY 8b: Tausch mit Zählerstellen und ohne Zähler am Tisch – der Hinweis bleibt (der Fall, für den er geschrieben wurde)', () => {
  const s = bauen(ohneZaehler).state;
  const { state, log } = tausch(s, scenarioData);
  assert.deepEqual(log.map(e => e.status), ['note']);
  assert.equal((log[0].reason.match(/no counter "Henlo: /g) || []).length, 4);
  assert.deepEqual(state.counters, []);
});

// ── Teil-Angabe ─────────────────────────────────────────────────────────────

test('DY 9: Teil-Angabe – seat_villager meldet `no counter position for …` und stellt nichts; der Prüfer sagt dasselbe', () => {
  const teil = copy(ohneZaehler);
  seatOf(teil).counters = { Leben: copy(seatOf(scenarioData).counters.Leben) };
  const { state, log } = bauen(teil, [{ type: 'seat_villager', seat: 1, villager: 'Henlo Bulwark' }]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /no counter position for Bewegung/);
  assert.match(log[0].reason, /no counter position for Präzision/);
  assert.deepEqual([state.tokens, state.counters, state.cards].map(l => l.length), [0, 0, 0]);

  const probleme = validateVillagers(teil.villagers, { assets: fx.assets, cards: fx.cards, zones: ZONES });
  assert.deepEqual(probleme, [
    'seat 1: no counter position for Bewegung',
    'seat 1: no counter position for Mumm',
    'seat 1: no counter position for Präzision',
  ]);
});
