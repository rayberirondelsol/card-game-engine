// CQ / Spec M27.1 — `seat_villager { seat, villager }`: der Aufbau liest die
// Dörferdaten, statt sie noch einmal zu tragen.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Gebaut wird gegen denselben Auszug der Produktion wie in `villagers.test.js`
// (Assets, Karten, die Zonen des Bausteins und die zwölf Leisten). Die alte
// Folge – 39 hartverdrahtete Schritte, wie sie bis M27 in der Datenbank stand –
// liegt als `sequenceHardwired` in der Fixture, **nur** für den
// Gleichwertigkeitstest: er ist die Abnahme 1 aus M27.1.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { seatedVillagers, seatVars } from '../../shared/villagers.js';
import { VILLAGERS, ROSTER } from '../../scripts/doerfler-daten.mjs';
import {
  fx, run, copy, scenarioData, tokenNamed, counterNamed, cardNamed, inZone, LINEUP,
} from './villager-table.js';

const seat = (n, villager) => ({ type: 'seat_villager', seat: n, villager });
const asset = (name) => fx.assets.find(a => a.name === name);
const unveraendert = (vorher, nachher) => assert.equal(JSON.stringify(nachher), JSON.stringify(vorher));
const gestellt = (steps = LINEUP, over = {}) => run({}, steps, over);
// Ein Schritt legt die leeren Listen an, auch wenn er überspringt – leer heißt: nichts liegt.
const leer = (state) => assert.deepEqual(
  [state.tokens, state.counters, state.cards, state.boards, state.stacks].map(l => l.length), [0, 0, 0, 0, 0]);

// ── Ein Dörfler an einem leeren Platz ───────────────────────────────────────

test('CQ: Henlo an Platz 1 – Tableau, Spielstein, vier Zähler, vier Marker, Startausrüstung', () => {
  const { state, log } = gestellt([seat(1, 'Henlo Bulwark')]);
  assert.deepEqual(log.map(e => e.status), ['ok'], log.map(e => e.reason).join('\n'));

  const [tableau] = tokenNamed(state, 'Tableau: Henlo Bulwark');
  assert.ok(tableau, 'das Tableau liegt da');
  assert.deepEqual([tableau.x, tableau.y], [300, 1600]);
  assert.equal(tableau.locked, true, 'das Tableau ist gesperrt, wie die Schritte es waren');
  // Henlos Tableau ist das Platz-Asset selbst – `anchorId` wäre dieselbe Id und steht dann nicht da.
  assert.equal(tableau.anchorId, undefined);
  assert.equal(tableau.assetId, asset('Tableau: Henlo Bulwark').id);

  assert.equal(tokenNamed(state, 'Henlo').length, 1, 'der Spielstein');
  const leben = counterNamed(state, 'Henlo: Leben');
  assert.deepEqual([leben.value, leben.max, leben.x, leben.y], [3, 3, 360, -110]);
  const mumm = counterNamed(state, 'Henlo: Mumm');
  assert.deepEqual([mumm.value, mumm.base, mumm.max], [2, 2, undefined]);
  assert.equal(counterNamed(state, 'Henlo: Präzision').value, -1);

  for (const stat of ['Leben', 'Bewegung', 'Mumm', 'Präzision']) {
    assert.equal(tokenNamed(state, `Marker 1: ${stat}`).length, 1, `Marker 1: ${stat}`);
  }
  assert.ok(inZone(state, cardNamed(state, 'ROSTIGE SICHEL'), 'Dörfler 1: Rechte Hand'));
  assert.ok(inZone(state, cardNamed(state, 'BAUERNLATZHOSE'), 'Dörfler 1: Beine'));
});

test('CQ: der Spielstein liegt auf der Leiste, die `barZone` nennt', () => {
  const { state } = gestellt([seat(1, 'Henlo Bulwark')]);
  const [stein] = tokenNamed(state, 'Henlo');
  assert.ok(stein.x >= 100 && stein.x <= 160 && stein.y >= 100 && stein.y <= 400, `${stein.x}, ${stein.y}`);
});

test('CQ: die Schritte dahinter sehen den Dörfler – `$F1` und `$V1` sind gebunden', () => {
  const { state, log } = gestellt([
    seat(1, 'Henlo Bulwark'),
    { type: 'place_asset', assetName: '$F1', x: 10, y: 20 },
    { type: 'set_counter', name: '$V1: Bewegung', value: '+1' },
  ]);
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok', 'ok'], log.map(e => e.reason).join('\n'));
  assert.equal(tokenNamed(state, 'Henlo Bulwark').length, 1);
  assert.equal(counterNamed(state, 'Henlo: Bewegung').value, 6);
  assert.equal(seatVars(state, fx.assets, VILLAGERS).F1, 'Henlo Bulwark');
});

// ── Ein Dörfler, der nicht der Platzhalter ist: Judy, Georgie ───────────────

test('CQ: Judy an Platz 1 – ihr Tableau trägt die Id des Platzes, ihre Gemälde liegen im Vorrat', () => {
  const { state, log } = gestellt([seat(1, 'Judy Marks')]);
  assert.deepEqual(log.map(e => e.status), ['ok'], log.map(e => e.reason).join('\n'));
  const [tableau] = tokenNamed(state, 'Tableau: Judy Marks');
  assert.equal(tableau.anchorId, asset('Tableau: Henlo Bulwark').id, 'die Zonen hängen an der Id des Platzes');
  assert.equal(seatedVillagers(state, fx.assets, VILLAGERS)[0].name, 'Judy Marks');
  assert.equal(counterNamed(state, 'Judy: Präzision').value, 1);
  for (const c of ['„ACH, WIE SCHÖN!“', '„KLARER HIMMEL“', '„DIE GROSSE REISE“']) {
    assert.ok(inZone(state, cardNamed(state, c), 'Ausrüstung Dörfler 1'), `${c} liegt im Vorrat`);
  }
  assert.ok(inZone(state, cardNamed(state, 'RIESENPINSEL'), 'Dörfler 1: Rechte Hand'));
});

test('CQ: die Aktionen laufen danach durch – `$V1` ist Judy', () => {
  const { state } = gestellt([seat(1, 'Judy Marks'), seat(2, 'Fridgette Jones'), seat(3, 'Granny Melba')]);
  const v = seatVars(state, fx.assets, VILLAGERS);
  assert.deepEqual([v.V1, v.F1, v.V1LEB, v.V1PRZ], ['Judy', 'Judy Marks', '3', '1']);
  const r = run(state, [{ type: 'set_counter', name: '$V1: Mumm', value: '+1' }]);
  assert.equal(r.log[0].status, 'ok');
  assert.equal(counterNamed(r.state, 'Judy: Mumm').value, 4);
});

test('CQ: Georgie Irongut sitzt – und der Schritt meldet, dass seine Werte ungeprüft sind', () => {
  const { state, log } = gestellt([seat(2, 'Georgie Irongut')]);
  assert.equal(log[0].status, 'note');
  assert.match(log[0].reason, /Foto/);
  assert.equal(tokenNamed(state, 'Tableau: Georgie Irongut').length, 1);
});

// ── Die Regeln des Schritts: nichts wird überschrieben, nichts halb gestellt ──

test('CQ: ein belegter Platz bleibt, wie er ist – und der Grund nennt `swap_villager`', () => {
  const s = gestellt([seat(1, 'Henlo Bulwark')]).state;
  const { state, log } = run(s, [seat(1, 'Judy Marks')]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /seat 1 holds "Henlo Bulwark"/);
  assert.match(log[0].reason, /swap_villager/);
  unveraendert(s, state);
});

test('CQ: ein Dörfler sitzt nur einmal', () => {
  const s = gestellt([seat(1, 'Henlo Bulwark')]).state;
  const { state, log } = run(s, [seat(2, 'Henlo Bulwark')]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /already sits at seat 1/);
  unveraendert(s, state);
  // Auch ein Dörfler mit fremdem Tableau-Platz: Judy an Platz 1, Judy an Platz 2.
  const j = gestellt([seat(1, 'Judy Marks')]).state;
  const zweimal = run(j, [seat(2, 'Judy Marks')]);
  assert.equal(zweimal.log[0].status, 'skipped');
  unveraendert(j, zweimal.state);
});

test('CQ: ein Platz ohne Geometrie bleibt leer – nichts wird halb gestellt', () => {
  const ohneTableau = copy(scenarioData);
  delete ohneTableau.villagers.seats[0].tableau;
  const a = gestellt([seat(1, 'Henlo Bulwark')], { scenarioData: ohneTableau });
  assert.equal(a.log[0].status, 'skipped');
  assert.match(a.log[0].reason, /no tableau position/);
  leer(a.state);

  const ohneZaehler = copy(scenarioData);
  delete ohneZaehler.villagers.seats[0].counters.Mumm;
  const b = gestellt([seat(1, 'Henlo Bulwark')], { scenarioData: ohneZaehler });
  assert.equal(b.log[0].status, 'skipped');
  assert.match(b.log[0].reason, /no counter position for Mumm/);
  leer(b.state);

  const ohneLeiste = copy(scenarioData);
  delete ohneLeiste.villagers.barZone;
  const c = gestellt([seat(1, 'Henlo Bulwark')], { scenarioData: ohneLeiste });
  assert.equal(c.log[0].status, 'skipped');
  assert.match(c.log[0].reason, /no barZone/);
  leer(c.state);
});

test('CQ: fehlt ein Asset oder eine Karte, bleibt der Tisch leer – alles oder nichts', () => {
  const ohneMarker = fx.assets.filter(a => a.name !== 'Marker 1: Mumm');
  const a = gestellt([seat(1, 'Henlo Bulwark')], { assets: ohneMarker });
  assert.notEqual(a.log[0].status, 'ok');
  assert.match(a.log[0].reason, /Marker 1: Mumm/);
  leer(a.state);

  const ohneKarte = fx.cards.filter(c => c.name !== 'ROSTIGE SICHEL');
  const b = gestellt([seat(1, 'Henlo Bulwark')], { cards: ohneKarte });
  assert.notEqual(b.log[0].status, 'ok');
  assert.match(b.log[0].reason, /ROSTIGE SICHEL/);
  leer(b.state);
});

test('CQ: unbekannter Platz, unbekannter Dörfler, keine Dörferdaten – jeweils übersprungen, Tisch unberührt', () => {
  for (const [step, over, was] of [
    [seat(0, 'Henlo Bulwark'), {}, /no seat/],
    [seat(4, 'Henlo Bulwark'), {}, /no seat/],
    [seat('x', 'Henlo Bulwark'), {}, /no seat/],
    [seat('', 'Henlo Bulwark'), {}, /no seat/],
    [seat(1, 'Niemand Namenlos'), {}, /Niemand Namenlos/],
    [seat(1, ''), {}, /not in the roster/],
    [seat(1, 'Henlo Bulwark'), { scenarioData: {} }, /no villager data/],
  ]) {
    const { state, log } = gestellt([step], over);
    assert.equal(log[0].status, 'skipped', JSON.stringify(step));
    assert.match(log[0].reason, was);
    leer(state);
  }
});

test('CQ: der Platz muss ein Tableau-Asset haben – ohne ihn weiß der Tisch nicht, wer dort sitzt', () => {
  const ohne = fx.assets.filter(a => a.name !== 'Tableau: Henlo Bulwark');
  const { state, log } = gestellt([seat(1, 'Judy Marks')], { assets: ohne });
  assert.notEqual(log[0].status, 'ok');
  assert.match(log[0].reason, /Tableau: Henlo Bulwark/);
  leer(state);
});

// ── Die Daten steuern den Aufbau (Abnahme 2) ────────────────────────────────

test('CQ: ändert man im Roster Henlos Leben von 3 auf 4, steht am Tisch 4 / 4 – ohne einen Schritt anzufassen', () => {
  const data = copy(scenarioData);
  data.villagers.roster['Henlo Bulwark'].start.Leben = 4;
  const { state, log } = gestellt(LINEUP, { scenarioData: data });
  assert.deepEqual(log.filter(e => e.status !== 'ok'), []);
  const leben = counterNamed(state, 'Henlo: Leben');
  assert.deepEqual([leben.value, leben.max], [4, 4]);
  assert.equal(ROSTER['Henlo Bulwark'].start.Leben, 3, 'die Konstante des Skripts ist unberührt');
});

// ── Die Gleichwertigkeit (Abnahme 1) ────────────────────────────────────────

/**
 * Der Tisch ohne das, was bei jedem Lauf anders ist: die zufälligen Ids, und die
 * Reihenfolge, in der die Objekte angelegt wurden. Verglichen wird, **was am
 * Tisch liegt** – `locked` und `anchorId` eingeschlossen.
 */
function gleich(state) {
  const strip = (v) => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v)
        .filter(([k]) => !['id', 'tableId', 'stackId'].includes(k))
        .map(([k, x]) => [k, strip(x)]));
    }
    return v;
  };
  const key = (o) => `${o.assetId ?? o.cardId ?? o.name ?? o.label ?? ''}|${o.x}|${o.y}`;
  const out = {};
  for (const k of Object.keys(state).sort()) {
    out[k] = Array.isArray(state[k]) ? strip(state[k]).sort((a, b) => key(a).localeCompare(key(b))) : strip(state[k]);
  }
  return out;
}

test('CQ: drei `seat_villager` bauen denselben Tisch wie die 39 hartverdrahteten Schritte', () => {
  assert.equal(fx.sequenceHardwired.length, 39);
  const alt = run({}, fx.sequenceHardwired);
  const neu = gestellt(LINEUP);
  assert.deepEqual(alt.log.filter(e => e.status !== 'ok'), [], 'die alte Folge baut ohne Beanstandung');
  assert.deepEqual(neu.log.filter(e => e.status !== 'ok'), [], neu.log.map(e => e.reason).join('\n'));
  // Nicht leer verglichen: 3 Tableaus, 3 Steine, 12 Zähler, 6 Karten, 12 Marker.
  const g = gleich(alt.state);
  assert.equal(g.tokens.length, 18);
  assert.equal(g.counters.length, 12);
  assert.equal(g.cards.length, 6);
  assert.deepEqual(gleich(neu.state), g);
});
