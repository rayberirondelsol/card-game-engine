// CJ–CL / Spec M26 — die Daten der neun Dörfler, die Zählerreihe und die
// umgeschriebenen Aktionen.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Dieselbe Bauart wie `equipment-zones.test.js`: die Zahlen stehen in
// `scripts/doerfler-daten.mjs` und werden hier gegen die Maschinerie geprüft,
// die sie am Tisch ausführt. Die Bibliothek (Assets, Karten, die zwölf
// Leistenzonen, die Schritte der Kurzpartie **vor** M26) kommt aus einem
// Auszug der Produktionsdatenbank (`fixtures/doerfler-kurzpartie.json`) — der
// Test lädt nichts aus dem Netz. Begründung: `docs/tasks-doerfler.md`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  VILLAGERS, ROSTER, INITIAL, CARD_SLOTS, COUNTER_ROW,
  patchActions, patchScenario, patchZones,
} from '../../scripts/doerfler-daten.mjs';
import * as Skript from '../../scripts/doerfler-daten.mjs';
import { equipmentZones, MEASURED_ANCHORS, BAND, counterBox, COUNTER_SIZE } from '../../scripts/equipment-zones.mjs';
import { MEASURED_NEIGHBOURS, extraZones } from '../../scripts/partie13-daten.mjs';
import { resolveBox } from '../../shared/anchoring.js';
import { validateVillagers, STATS, SLOTS } from '../../shared/villagers.js';

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/doerfler-kurzpartie.json', import.meta.url), 'utf8'));

/**
 * Die neun Zählerstellen der Reihe unter dem Tableau, aus den **Platzdaten**: `{ 'Henlo: Bewegung': { x, y }, … }`.
 * Bis M27 rechnete `counterSpots()` sie für das Umschreiben der Folge; die Folge liest sie seither selbst
 * (`seat_villager`), und die Zahlen stehen in `VILLAGERS.seats[].counters`.
 */
const reihe = () => Object.fromEntries(INITIAL.flatMap((name, i) =>
  COUNTER_ROW.order.map(stat => [`${ROSTER[name].short}: ${stat}`, VILLAGERS.seats[i].counters[stat]])));

const anchors = new Map(MEASURED_ANCHORS.map(a => [a.id, a]));
const resolve = (list) => list.map(z => ({ ...z, ...resolveBox(z.anchor, anchors.get(z.anchor.assetId)) }));
const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// Die Zonen, gegen die geprüft wird: die einundzwanzig des Bausteins, die zwölf
// Leisten aus der Datenbank, die sechs Ablagen aus M23.2 und die Zonen des
// Tisches daneben (Hände, Heldentaten-Auslage).
const alleZonen = [
  ...equipmentZones(), ...fx.leisten, ...extraZones(),
].map(z => ({ ...z, ...resolveBox(z.anchor, anchors.get(z.anchor.assetId)) }));
const zonenFuerPruefung = [...alleZonen, { label: 'Bösewicht-Tableau' }, { label: "Buyin'/Beatin'-Leiste" }];

// ── CK: die Daten ───────────────────────────────────────────────────────────

test('CK: die Dörferdaten bestehen die Prüfung gegen die echte Bibliothek', () => {
  const problems = validateVillagers(VILLAGERS, { assets: fx.assets, cards: fx.cards, zones: zonenFuerPruefung });
  assert.deepEqual(problems, []);
});

test('CK: neun Dörfler, drei Plätze, die Kurzpartie setzt Henlo, Fridgette und Granny', () => {
  assert.equal(Object.keys(ROSTER).length, 9);
  assert.equal(VILLAGERS.seats.length, 3);
  assert.deepEqual(INITIAL, ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba']);
  for (const name of INITIAL) assert.ok(ROSTER[name], name);
});

test('CK: nur Georgie Irongut ist als ungeprüft markiert', () => {
  const ungeprueft = Object.entries(ROSTER).filter(([, v]) => v.unverified).map(([k]) => k);
  assert.deepEqual(ungeprueft, ['Georgie Irongut']);
  assert.match(ROSTER['Georgie Irongut'].unverified, /Foto/);
});

test('CK: die Startwerte stehen in den Spalten; Leben ist zugleich das Maximum, nicht das Spaltenende', () => {
  for (const [name, v] of Object.entries(ROSTER)) {
    for (const st of STATS) {
      const n = v.start[st.key];
      assert.ok(Number.isInteger(n) && n >= st.range[0] && n <= st.range[1], `${name}: ${st.key} ${n}`);
    }
  }
  // Die Spaltenenden stehen **nicht** in den Daten: sie gelten für alle neun.
  assert.equal(JSON.stringify(VILLAGERS).includes('"max"'), false);
  assert.equal(JSON.stringify(VILLAGERS).includes('"Max'), false);
});

test('CK: die Gegenprobe – die drei Dörfler der Kurzpartie stimmen mit den Schritten vor M26 überein', () => {
  const steps = fx.sequenceBefore;
  INITIAL.forEach((name, i) => {
    const v = ROSTER[name];
    const n = i + 1;
    for (const st of STATS) {
      const counter = steps.find(s => s.type === 'place_counter' && s.name === `${v.short}: ${st.key}`);
      assert.ok(counter, `${v.short}: ${st.key} fehlt in der Sequenz`);
      assert.equal(counter.value, v.start[st.key], `${name}: ${st.key} (value)`);
      if (st.life) assert.equal(counter.max, v.start[st.key], `${name}: Leben max ist der Startwert`);
      else assert.equal(counter.base, v.start[st.key], `${name}: ${st.key} (base)`);
      const marker = steps.find(s => s.type === 'place_asset' && s.assetName === `Marker ${n}: ${st.key}`);
      assert.equal(marker.slot, v.start[st.key], `Marker ${n}: ${st.key}`);
    }
    // Die Karten: genau die der Sequenz, kein Stück mehr oder weniger.
    const cards = steps.filter(s => s.type === 'place_card').map(s => s.cardName);
    for (const g of v.gear) assert.ok(cards.includes(g.card), `${name}: ${g.card} fehlt in der Sequenz`);
  });
  // Sechs Karten in der Sequenz, sechs in den Daten der drei.
  assert.equal(fx.sequenceBefore.filter(s => s.type === 'place_card').length,
    INITIAL.reduce((n, k) => n + ROSTER[k].gear.length, 0));
});

test('CK: Slots – Blopsy hat drei Stücke in drei Plätzen, Judy zwei Plätze und drei Gemälde im Vorrat', () => {
  const blopsy = ROSTER['Blopsy Twins'].gear;
  assert.equal(blopsy.length, 3);
  assert.equal(new Set(blopsy.map(g => g.slot)).size, 3);
  const judy = ROSTER['Judy Marks'].gear;
  assert.equal(judy.length, 5);
  assert.deepEqual(judy.filter(g => !g.slot).map(g => g.card),
    ['„ACH, WIE SCHÖN!“', '„KLARER HIMMEL“', '„DIE GROSSE REISE“']);
  assert.equal(judy.filter(g => g.slot).length, 2);
});

test('CK: in jedem Platz liegt höchstens eine Karte, und jeder Platz ist einer der sechs', () => {
  for (const [name, v] of Object.entries(ROSTER)) {
    const slots = v.gear.map(g => g.slot).filter(Boolean);
    assert.equal(new Set(slots).size, slots.length, `${name}: ein Platz doppelt belegt`);
    for (const s of slots) assert.ok(SLOTS.includes(s), `${name}: ${s}`);
  }
});

test('CK: keine Karte gehört zwei Dörflern', () => {
  const all = Object.values(ROSTER).flatMap(v => v.gear.map(g => g.card));
  assert.equal(new Set(all).size, all.length);
  assert.equal(all.length, 22);   // 15 + 7 aus Grundspiel und Neue Nachbarn, ohne Hookbox
});

test('CK: die Prüfung meldet, was sie melden soll', () => {
  const kaputt = JSON.parse(JSON.stringify(VILLAGERS));
  kaputt.roster['Henlo Bulwark'].start.Leben = 11;
  kaputt.roster['Fridgette Jones'].gear[0].card = 'GIBT ES NICHT';
  kaputt.roster['Granny Melba'].gear[1].slot = 'Rechte Hand';
  kaputt.roster['Yancy Plover'].gear[0].slot = 'Hut';
  kaputt.roster['Judy Marks'].gear[2].card = 'ROSTIGE SICHEL';
  const p = validateVillagers(kaputt, { assets: fx.assets, cards: fx.cards, zones: zonenFuerPruefung });
  assert.ok(p.some(x => /Henlo Bulwark.*Leben 11/.test(x)), p.join('\n'));
  assert.ok(p.some(x => /GIBT ES NICHT/.test(x)), p.join('\n'));
  assert.ok(p.some(x => /Granny Melba.*Rechte Hand/.test(x)), p.join('\n'));
  assert.ok(p.some(x => /"Hut" is not a slot/.test(x)), p.join('\n'));
  assert.ok(p.some(x => /ROSTIGE SICHEL.*also belongs/.test(x)), p.join('\n'));
});

// ── BY: die Ziele der Startausrüstung ──────────────────────────────────────

test('BY: jedes Ziel ist eine Platz-Zone, keines der Vorrat, keine heißt noch `Hände`', () => {
  const labels = new Set(alleZonen.map(z => z.label));
  assert.equal(Object.keys(CARD_SLOTS).length, 6);
  for (const [card, zone] of Object.entries(CARD_SLOTS)) {
    assert.ok(labels.has(zone), `${card}: Zone "${zone}" gibt es nicht`);
    assert.ok(!zone.endsWith(': Hände'), `${card}: zielt noch auf Hände`);
    assert.ok(!zone.startsWith('Ausrüstung Dörfler '), `${card}: zielt auf den Vorrat`);
  }
  // Granny trägt zwei Einhandwaffen – in zwei verschiedenen Händen.
  assert.notEqual(CARD_SLOTS['OMMAS GEHSTOCK'], CARD_SLOTS['DAS ALTE EISEN']);
});

// CZ / M27: `patchSequence` ist weg. Die 39 Dörfler-Schritte schreibt dieses Skript nicht mehr um - die Folge
// stellt die Dörfler selbst aus den Daten (`seat_villager`, `scripts/auslagen-daten.mjs`). Ein zweiter Lauf
// des alten `--write` hätte die Folge zurückgeschrieben; es gibt nichts mehr, was er schreiben könnte.
test('CZ: das Skript schreibt **keine** Folge mehr – `patchSequence`, `counterSpots` und `rowBox` sind weg', () => {
  for (const weg of ['patchSequence', 'counterSpots', 'rowBox']) assert.equal(Skript[weg], undefined, weg);
  // Was bleibt: die Daten und was zu ihnen gehört.
  for (const da of ['VILLAGERS', 'ROSTER', 'INITIAL', 'CARD_SLOTS', 'COUNTER_ROW', 'patchActions', 'patchScenario', 'patchZones']) {
    assert.notEqual(Skript[da], undefined, da);
  }
});

// ── CJ: die Zähler ──────────────────────────────────────────────────────────

test('CJ: neun Zähler in einer Reihe unter dem Tableau, drei je Dörfler, in der Reihenfolge Bewegung/Mumm/Präzision', () => {
  const spots = reihe();
  assert.equal(Object.keys(spots).length, 9);
  INITIAL.forEach((name, i) => {
    const a = MEASURED_ANCHORS[i];
    const xs = COUNTER_ROW.order.map(stat => spots[`${ROSTER[name].short}: ${stat}`].x);
    assert.deepEqual(xs, [0, 1, 2].map(k => a.x + a.width / 2 - 80 + 195 * k));
    for (const stat of COUNTER_ROW.order) assert.equal(spots[`${ROSTER[name].short}: ${stat}`].y, 1870);
  });
  // Die Werte aus der Aufgabenliste.
  assert.deepEqual(Object.values(reihe()).map(s => s.x),
    [220, 415, 610, 800, 995, 1190, 1380, 1575, 1770]);
});

test('CJ: kein Zählerkasten überlappt eine Zone, ein Tableau oder einen anderen Zähler', () => {
  const kaesten = Object.entries(reihe()).map(([name, s]) => ({ name, ...counterBox(s) }));
  // Dazu die Lebenszähler, die liegen bleiben (M23.5).
  const leben = [['Henlo: Leben', 360], ['Fridgette: Leben', 700], ['Granny: Leben', 1040]]
    .map(([name, x]) => ({ name, ...counterBox({ x, y: -110 }) }));
  const alle = [...kaesten, ...leben];
  for (let i = 0; i < kaesten.length; i++) {
    for (const z of [...alleZonen, ...MEASURED_NEIGHBOURS]) {
      assert.ok(!overlaps(kaesten[i], z), `${kaesten[i].name} liegt auf ${z.label}`);
    }
    for (const a of MEASURED_ANCHORS) assert.ok(!overlaps(kaesten[i], a), `${kaesten[i].name} liegt auf einem Tableau`);
    for (const o of alle) {
      if (o !== kaesten[i]) assert.ok(!overlaps(kaesten[i], o), `${kaesten[i].name} überlappt ${o.name}`);
    }
  }
  assert.equal(COUNTER_SIZE.width, 185);
});

test('CJ: jeder Zähler bleibt im Feld seines Dörflers und im Fenster der Ansicht „Dörfler"', () => {
  INITIAL.forEach((name, i) => {
    const a = MEASURED_ANCHORS[i];
    for (const stat of COUNTER_ROW.order) {
      const k = counterBox(reihe()[`${ROSTER[name].short}: ${stat}`]);
      assert.ok(k.x >= a.x - 1e-6 && k.x + k.width <= a.x + BAND.pitch + 1e-6, `${name}: ${stat} ragt aus dem Feld`);
      // Fenster 932 × 738 bei Zoom 0,41, Mitte 1149,5 / 1675, abzüglich der
      // Werkzeugleiste (BAND.bottom); oben beginnt die Ansicht bei 775.
      assert.ok(k.x >= 1149.5 - 932 / 2 / 0.41 && k.x + k.width <= 1149.5 + 932 / 2 / 0.41, `${name}: ${stat} liegt außerhalb in x`);
      assert.ok(k.y >= 775 && k.y + k.height <= BAND.bottom, `${name}: ${stat} liegt außerhalb in y`);
      assert.ok(k.y >= a.y + a.height, `${name}: ${stat} liegt nicht unter dem Tableau`);
    }
  });
});

// ── CL: die Aktionen ────────────────────────────────────────────────────────

const namen = /Henlo|Fridgette|Granny/;

test('CL: die Umschreibung der Aktionen fasst genau 31 Schritte an, in beiden Aktionen', () => {
  const vorher = fx.actionsBefore;
  const nachher = patchActions(vorher);
  const diffs = (id) => {
    const a = vorher.find(x => x.id === id).steps, b = nachher.find(x => x.id === id).steps;
    assert.equal(a.length, b.length);
    return b.map((s, i) => [i + 1, s, a[i]]).filter(([, s, o]) => JSON.stringify(s) !== JSON.stringify(o));
  };
  const kampf = diffs('kampf-beginnen');
  const dorf = diffs('dorfphase-beginnen');
  assert.deepEqual(kampf.map(d => d[0]), [12, 13, 14]);
  assert.deepEqual(dorf.map(d => d[0]), [2, 12, 13, 14, ...[...Array(12)].map((_, i) => 17 + i), ...[...Array(12)].map((_, i) => 34 + i)]);
  assert.equal(kampf.length + dorf.length, 31);
});

test('CL: danach steht kein Dörflername mehr in den Aktionen – nur Platzhalter', () => {
  const nachher = patchActions(fx.actionsBefore);
  for (const a of nachher) {
    for (const s of a.steps) assert.ok(!namen.test(JSON.stringify(s)), `${a.id}: ${JSON.stringify(s)}`);
  }
  const dorf = nachher.find(a => a.id === 'dorfphase-beginnen').steps;
  assert.deepEqual(dorf[1].name, ['$V1: Leben', '$V2: Leben', '$V3: Leben']);
  assert.equal(dorf[11].assetName, '$F1');
  assert.deepEqual({ n: dorf[16].name, v: dorf[16].value }, { n: '$V1: Leben', v: 'max' });
  assert.deepEqual({ a: dorf[33].assetName, s: dorf[33].slot }, { a: 'Marker 1: Leben', s: '$V1LEB' });
  assert.deepEqual({ a: dorf[44].assetName, s: dorf[44].slot }, { a: 'Marker 3: Präzision', s: '$V3PRZ' });
  assert.equal(nachher.find(a => a.id === 'kampf-beginnen').steps[12].assetName, '$F2');
});

test('CL: ein zweiter Lauf ändert nichts', () => {
  const einmal = patchActions(fx.actionsBefore);
  assert.deepEqual(patchActions(einmal), einmal);
});

// ── CK/CI: die Zonen und der Abschnitt ──────────────────────────────────────

test('CK: der Abschnitt `villagers` kommt neben `bosses`, nichts anderes ändert sich', () => {
  const vorher = { gridLabel: 'Spielfeld', bosses: { A: { scenario: 'x' } }, cardZoneLabel: 'Terrain-Auslage' };
  const nachher = patchScenario(vorher);
  assert.deepEqual(nachher.bosses, vorher.bosses);
  assert.equal(nachher.gridLabel, vorher.gridLabel);
  assert.equal(nachher.cardZoneLabel, vorher.cardZoneLabel);
  assert.deepEqual(nachher.villagers, VILLAGERS);
  assert.deepEqual(patchScenario(nachher), nachher);
  assert.deepEqual(patchScenario(undefined).villagers, VILLAGERS);
});

test('CI: `patchZones` ersetzt die fünfzehn alten Plätze, entfernt `Hände` und lässt alles andere stehen', () => {
  const fremd = { id: 'zfremd', label: 'Irgendwas', anchor: null };
  const alt = [
    { id: 'zkopf1', label: 'Dörfler 1: Kopf', capacity: 1 },
    { id: 'zhaende1', label: 'Dörfler 1: Hände', capacity: 2 },
    { id: 'zmitbringsel1', label: 'Dörfler 1: Mitbringsel', capacity: 1 },
    fremd,
  ];
  const neu = patchZones(alt);
  assert.ok(!neu.some(z => z.id === 'zhaende1'));
  assert.deepEqual(neu.find(z => z.id === 'zfremd'), fremd);
  assert.equal(neu.filter(z => /^Dörfler \d: (Kopf|Brust|Beine|Linke Hand|Rechte Hand|Mitbringsel)$/.test(z.label)).length, 18);
  assert.equal(neu.filter(z => z.label.startsWith('Ausrüstung Dörfler ')).length, 3);
  assert.equal(neu.find(z => z.id === 'zkopf1').anchor.relX, -0.4);
  assert.deepEqual(patchZones(neu), neu);
});

// ── CO / M27.1: die Platzdaten ──────────────────────────────────────────────
//
// Wohin das Tableau, wohin die Zähler, welche Leiste die Spielsteine nimmt –
// das stand nur in 18 hartverdrahteten Schritten der Folge. Hier steht es bei
// den Plätzen, und `seat_villager` (CQ) liest es von dort. Die Zahlen sind die
// **heutigen**: sie werden gegen die Schritte aus der Fixture gehalten, nicht
// noch einmal abgetippt.

const kopie = () => JSON.parse(JSON.stringify(VILLAGERS));
const pruefe = (v) => validateVillagers(v, { assets: fx.assets, cards: fx.cards, zones: zonenFuerPruefung });

test('CO: die Platzdaten bestehen die Prüfung – ein Platz hat Tableau, vier Zähler, und es gibt eine Spielsteinleiste', () => {
  assert.equal(VILLAGERS.barZone, "Buyin'/Beatin'-Leiste");
  for (const seat of VILLAGERS.seats) {
    assert.ok(Number.isFinite(seat.tableau.x) && Number.isFinite(seat.tableau.y));
    assert.deepEqual(Object.keys(seat.counters), STATS.map(s => s.key));
  }
  assert.deepEqual(pruefe(VILLAGERS), []);
});

test('CO: die Zahlen sind die der alten Schritte – Tableau, Lebenszähler und die drei Zählerreihen', () => {
  const steps = fx.sequenceHardwired;
  INITIAL.forEach((name, i) => {
    const seat = VILLAGERS.seats[i];
    const tab = steps.find(s => s.type === 'place_asset' && s.assetName === seat.anchor);
    assert.deepEqual(seat.tableau, { x: tab.x, y: tab.y }, `${name}: Tableau`);
    for (const st of STATS) {
      const c = steps.find(s => s.type === 'place_counter' && s.name === `${ROSTER[name].short}: ${st.key}`);
      assert.deepEqual(seat.counters[st.key], { x: c.x, y: c.y }, `${name}: ${st.key}`);
    }
  });
});

test('CO: ohne Tableau-Stelle meldet die Prüfung den Platz', () => {
  const v = kopie();
  delete v.seats[0].tableau;
  assert.ok(pruefe(v).includes('seat 1: no tableau position'), pruefe(v).join('\n'));
});

// M30.5/DY hat die erste Hälfte dieses Tests umgedreht: bis dahin war ein Platz
// **ohne** `counters` ein Fehler (vier Meldungen), seitdem heißt es „der Platz hat
// keine Zähler" - die Zähler der Dörfler sind durch die Marker auf den Leisten
// ersetzt. Eine **Teil**-Angabe bleibt der Fehler, der sie immer war: wer drei von
// vier Stellen nennt, hat eine vergessen, und das ist nicht dasselbe wie keine.
test('CO/M30: ohne Zähler meldet sie nichts, bei einer Teil-Angabe jeden fehlenden', () => {
  const v = kopie();
  delete v.seats[1].counters;
  assert.deepEqual(pruefe(v).filter(p => /^seat 2/.test(p)), []);

  const w = kopie();
  delete w.seats[2].counters['Mumm'];
  delete w.seats[2].counters['Präzision'];
  assert.deepEqual(pruefe(w).filter(p => /^seat 3/.test(p)),
    ['seat 3: no counter position for Mumm', 'seat 3: no counter position for Präzision']);
});

test('CO: Koordinaten sind endlich – NaN, leer und null sind keine 0', () => {
  for (const bad of [NaN, '', null, 'abc', Infinity]) {
    const v = kopie();
    v.seats[0].tableau.x = bad;
    v.seats[0].counters.Leben.y = bad;
    const p = pruefe(v);
    assert.ok(p.includes('seat 1: no tableau position'), `${String(bad)}: ${p.join('\n')}`);
    assert.ok(p.includes('seat 1: no counter position for Leben'), `${String(bad)}: ${p.join('\n')}`);
  }
});

test('CO: ohne barZone meldet sie es; eine Zone, die es nicht gibt, ebenso', () => {
  const v = kopie();
  delete v.barZone;
  assert.ok(pruefe(v).includes('no barZone'), pruefe(v).join('\n'));
  const w = kopie();
  w.barZone = 'Gibt es nicht';
  assert.ok(pruefe(w).some(p => /barZone.*"Gibt es nicht" not found/.test(p)), pruefe(w).join('\n'));
});

test('CO: `patchScenario` verliert die Platzdaten nicht und ist beim zweiten Lauf gleich', () => {
  // So sieht die Spalte nach dem Schreiben aus (CY): mit den neuen Schlüsseln und
  // einem fremden daneben. Ein Skript, das `villagers` durch eine Konstante ohne
  // sie ersetzte, ließe sie still verschwinden (Befund 10).
  const inDerDatenbank = { bosses: { A: 1 }, options: { partie: { label: 'x' } }, villagers: kopie() };
  const nachher = patchScenario(inDerDatenbank);
  assert.equal(nachher.villagers.barZone, "Buyin'/Beatin'-Leiste");
  assert.deepEqual(nachher.villagers.seats.map(s => s.tableau), VILLAGERS.seats.map(s => s.tableau));
  assert.deepEqual(nachher.villagers.seats.map(s => s.counters), VILLAGERS.seats.map(s => s.counters));
  assert.deepEqual(nachher.options, inDerDatenbank.options);
  assert.deepEqual(nachher.bosses, inDerDatenbank.bosses);
  assert.deepEqual(patchScenario(nachher), nachher);
});
