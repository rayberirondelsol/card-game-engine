// CY / Spec M27.1, M27.2, M27.5 — die Daten: `scripts/auslagen-daten.mjs`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Dieselbe Bauart wie `doerfler-daten.test.js`: die Zahlen stehen im Skript und
// werden hier gegen die Maschinerie geprüft, die sie am Tisch ausführt. Die
// Bibliothek (Assets, Karten, Zonen, Raster, der Zustand und die drei Spalten
// **vor** M27) kommt aus einem Auszug der Produktionsdatenbank
// (`fixtures/auslagen-kurzpartie.json`) - der Test lädt nichts aus dem Netz.
//
// Der Kern ist, was **nicht** geschieht: `bosses` und `roster` bleiben byteweise,
// 23 der 31 Schritte bleiben Zeichen für Zeichen, ein zweiter Lauf findet nichts,
// und ein abweichender Wert bricht ab, statt überschrieben zu werden.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  OPTIONS, ROLLEN, SHERIFF_CATEGORIES, COMBINATIONS, hardwiredSteps, seatSteps,
  patchSequence, patchScenario, patchActions, actionDiff, beweiseScenarioUnveraendert, bauen, ohneIds,
} from '../../scripts/auslagen-daten.mjs';
import { VILLAGERS, patchScenario as doerflerPatchScenario } from '../../scripts/doerfler-daten.mjs';
import { validateOptions } from '../../shared/setupOptions.js';
import { validateVillagers } from '../../shared/villagers.js';
import { validateScenarioData } from '../../shared/scenarioData.js';
import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { findCardByName } from '../../shared/cardSearch.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { resolveGrids } from '../../shared/gridGeometry.js';

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));
const { assets, cards, zones, grids, state } = fx;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const copy = (x) => JSON.parse(JSON.stringify(x));

const seq = patchSequence(fx.sequenceBefore);
const sce = patchScenario(fx.scenarioBefore);
const act = patchActions(fx.actionsBefore);
const env = { state, zones, grids, assets, cards };
const bau = (choices, over = {}, seed = 1) => bauen({ ...env, sequence: seq.next, scenarioData: sce.next, ...over }, choices, seed);

// ── sequence_data: 65 → 31 ──────────────────────────────────────────────────

test('CY: die Ausgangsfolge hat 65 Schritte, und es gibt keine Beanstandung', () => {
  assert.equal(fx.sequenceBefore.length, 65);
  assert.deepEqual(seq.complaints, []);
  assert.deepEqual(sce.complaints, []);
  assert.deepEqual(act.complaints, []);
});

test('CY: aus 65 werden 31 – 39 raus, 3 `seat_villager` an die Stelle des Schritts 23, zwei neue davor', () => {
  assert.equal(seq.next.length, 31);
  assert.equal(seq.next.filter(s => s.type === 'seat_villager').length, 3);
  // Die Stelle: hinter dem Austeilen der Heldentaten (vorher Schritt 22), vor den Münzen (vorher 50).
  // Der Index ist 25, nicht 23: davor liegen jetzt der Rollenstapel und `draw_assets` - zwei neue Schritte.
  const at = seq.next.findIndex(s => s.type === 'seat_villager');
  assert.equal(at, 25);
  assert.deepEqual(seq.next.slice(at, at + 3), seatSteps());
  assert.deepEqual(seq.next[at - 1], fx.sequenceBefore[22]);
  assert.equal(seq.next[at + 3].name, 'Münzen (gemeinsam)');
  // Kein hartverdrahteter Dörfler-Schritt ist übrig.
  assert.equal(hardwiredSteps().length, 39);
  for (const h of hardwiredSteps()) assert.ok(!seq.next.some(s => same(s, h)), JSON.stringify(h));
});

test('CY: die 39 Schritte sind **genau** die, die in der Datenbank standen – aus den Dörferdaten abgeleitet, nicht abgetippt', () => {
  const key = (s) => JSON.stringify(Object.fromEntries(Object.entries(s).sort()));
  const hart = hardwiredSteps().map(key).sort();
  const dbSchritte = [...fx.sequenceBefore.slice(23, 50), ...fx.sequenceBefore.slice(53, 65)].map(key).sort();
  assert.equal(dbSchritte.length, 39);
  assert.deepEqual(hart, dbSchritte);
});

test('CY: Schritt 5 trägt `category: ["$optNachschub"]`, die Münzen `value: "$optMuenzen"` – sonst nichts davon', () => {
  const nachschub = seq.next.find(s => s.label === 'Nachschub (Tante Emma)');
  assert.deepEqual(nachschub, { type: 'place_stack', category: ['$optNachschub'], label: 'Nachschub (Tante Emma)', x: 1780, y: 640, faceDown: true });
  assert.equal(seq.next.indexOf(nachschub), 5);
  assert.deepEqual(seq.next.find(s => s.type === 'place_counter' && s.name === 'Münzen (gemeinsam)'),
    { type: 'place_counter', name: 'Münzen (gemeinsam)', value: '$optMuenzen', x: 2080, y: 1430 });
});

test('CY: sechs Schritte tragen das Gate – Marker, drei benannte Bösewichte, `draw_assets` lang, der Rollenstapel', () => {
  const gated = seq.next.filter(s => s.onlyChoice);
  assert.equal(gated.length, 6);
  assert.deepEqual(gated.map(s => [s.type, s.assetName ?? s.pool ?? s.label, s.onlyChoice]), [
    ['place_stack', 'Rollen', { troedel: 'mit' }],
    ['place_asset', 'Kurzpartie: erste Runde überspringen', { partie: 'kurz' }],
    ['place_asset', 'Bösewicht: Deputy Waggums', { partie: 'kurz' }],
    ['place_asset', 'Bösewicht: Virginia Fitz', { partie: 'kurz' }],
    ['place_asset', 'Bösewicht: The Bundits', { partie: 'kurz' }],
    ['draw_assets', 'Bösewichte', { partie: 'lang' }],
  ]);
  const draw = seq.next.find(s => s.type === 'draw_assets');
  assert.deepEqual(draw, { type: 'draw_assets', pool: 'Bösewichte', count: 4, targetZoneLabel: 'Bösewicht-Leiste', faceDown: true, onlyChoice: { partie: 'lang' } });
  // Kein `needsScenario`: Weg C ist gegangen, alle zwanzig haben Szenariodaten.
  assert.ok(!('needsScenario' in draw));
});

test('CY: der Rest ist Zeichen für Zeichen wie vorher – 20 Schritte unverändert, 6 geändert, 2 neu, 3 `seat_villager`', () => {
  const vorher = fx.sequenceBefore.map(s => JSON.stringify(s));
  const unveraendert = seq.next.filter(s => vorher.includes(JSON.stringify(s)));
  // Die 31 minus: 3 seat_villager, 2 neue, 6 geänderte (Nachschub, Münzen, Marker, 3 Bösewichte).
  assert.equal(unveraendert.length, 20);
  assert.equal(seq.next.length - unveraendert.length, 11);
  // Reihenfolge der unveränderten bleibt.
  const idx = unveraendert.map(s => vorher.indexOf(JSON.stringify(s)));
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
});

test('CY: das Gate steht nur in `sequence_data` – keine Aktion trägt `onlyChoice` oder `$opt…`', () => {
  assert.ok(!JSON.stringify(act.next).includes('onlyChoice'));
  assert.ok(!JSON.stringify(act.next).includes('$opt'));
});

// ── scenario_data: nur Schlüssel dazu ───────────────────────────────────────

test('CY: `scenario_data` bekommt nur Schlüssel dazu – `bosses` und `roster` sind byteweise gleich', () => {
  const a = fx.scenarioBefore, b = sce.next;
  assert.equal(JSON.stringify(b.bosses), JSON.stringify(a.bosses));
  assert.equal(Object.keys(b.bosses).length, 20);
  assert.equal(JSON.stringify(b.villagers.roster), JSON.stringify(a.villagers.roster));
  for (const k of ['gridLabel', 'cardZoneLabel']) assert.equal(JSON.stringify(b[k]), JSON.stringify(a[k]), k);
  assert.equal(b.villagers.fightZone, a.villagers.fightZone);
  assert.deepEqual(Object.keys(b), [...Object.keys(a), 'options']);
  assert.deepEqual(beweiseScenarioUnveraendert(a, b), []);
  // Die Plätze behalten, was ihnen gehörte, und bekommen Tableau und Zähler dazu.
  b.villagers.seats.forEach((seat, i) => {
    for (const k of ['anchor', 'zones', 'markers', 'vorrat']) assert.equal(seat[k], a.villagers.seats[i][k]);
    assert.deepEqual(seat.tableau, VILLAGERS.seats[i].tableau);
    assert.deepEqual(seat.counters, VILLAGERS.seats[i].counters);
  });
  assert.equal(b.villagers.barZone, "Buyin'/Beatin'-Leiste");
});

test('CY: `villagers` ist danach Zeichen für Zeichen die Konstante von `doerfler-daten.mjs` – deren zweiter Lauf ändert nichts', () => {
  assert.equal(JSON.stringify(sce.next.villagers), JSON.stringify(VILLAGERS));
  // Befund 10: das alte Skript ersetzte `villagers` durch die Konstante. Jetzt ist das ein No-op.
  const nachDoerfler = doerflerPatchScenario(sce.next);
  assert.equal(JSON.stringify(nachDoerfler), JSON.stringify(sce.next));
});

test('CY: die Beweisfunktion schlägt an, wenn etwas Fremdes sich ändert', () => {
  const a = fx.scenarioBefore;
  for (const mutate of [
    (b) => { b.bosses['Deputy Waggums'].scenario = 'x'; },
    (b) => { delete b.bosses['Patches']; },
    (b) => { b.villagers.roster['Henlo Bulwark'].start.Leben = 4; },
    (b) => { b.gridLabel = 'anders'; },
    (b) => { b.fremd = 1; },
    (b) => { b.villagers.seats[0].anchor = 'x'; },
  ]) {
    const b = copy(sce.next);
    mutate(b);
    assert.ok(beweiseScenarioUnveraendert(a, b).length > 0, mutate.toString());
  }
});

// ── Die Prüfungen gegen die echte Bibliothek ────────────────────────────────

test('CY: `validateOptions`, `validateVillagers` und `validateScenarioData` melden 0 Probleme', () => {
  assert.deepEqual(validateOptions(sce.next.options, seq.next, act.next), []);
  assert.deepEqual(validateVillagers(sce.next.villagers, { assets, cards, zones }), []);
  assert.deepEqual(validateScenarioData(sce.next, { assets, grids }), []);
  // Nicht leer geprüft.
  assert.equal(assets.length, 212);
  assert.equal(cards.length, 1087);
});

test('CY: „lang" zieht aus **allen zwanzig** – jeder Bösewicht des Pools hat Szenariodaten', () => {
  const pool = assets.filter(a => a.category === 'Bösewichte').map(a => a.name.replace(/^Bösewicht: /, ''));
  assert.equal(pool.length, 20);
  for (const n of pool) assert.ok(n in sce.next.bosses, n);
});

// ── Vier Kombinationen ──────────────────────────────────────────────────────

const stack = (s, label) => s.stacks.find(x => x.label === label);
const onBar = (s) => s.tokens.filter(t => /^Bösewicht: |^Kurzpartie/.test(t.label ?? ''));

test('CY: vier Kombinationen – das Protokoll ist leer, die Bauteile sind da oder fehlen', () => {
  const erwartet = {
    'kurz/mit': { nachschub: 30, rollen: true, muenzen: 45, leiste: 4, marker: true },
    'kurz/ohne': { nachschub: 177, rollen: false, muenzen: 45, leiste: 4, marker: true },
    'lang/mit': { nachschub: 30, rollen: true, muenzen: 30, leiste: 4, marker: false },
    'lang/ohne': { nachschub: 177, rollen: false, muenzen: 30, leiste: 4, marker: false },
  };
  for (const choices of COMBINATIONS) {
    const key = `${choices.partie}/${choices.troedel}`;
    const { state: s, log } = bau(choices);
    assert.deepEqual(log.filter(e => e.status !== 'ok'), [], key);
    const e = erwartet[key];
    // Zehn liegen offen in der Auslage, der Rest im Stapel (Abnahme 3).
    assert.equal(stack(s, 'Nachschub (Tante Emma)').cards.length + 10, e.nachschub, `${key}: Nachschub`);
    assert.equal(Boolean(stack(s, 'Rollen')), e.rollen, `${key}: Rollen`);
    assert.equal(s.counters.find(c => c.name === 'Münzen (gemeinsam)').value, e.muenzen, `${key}: Münzen`);
    assert.equal(onBar(s).length, e.leiste, `${key}: Leiste`);
    assert.equal(onBar(s).some(t => /^Kurzpartie/.test(t.label)), e.marker, `${key}: Marker`);
    assert.equal(s.counters.length, 12 + 3, `${key}: zwölf Dörflerzähler, Münzen, zwei Bösewichtzähler`);
  }
});

test('CY: der Nachschub enthält ohne Toller Trödel genau die 177 Karten von `Nachschub` – keine von `(freischaltbar)`; mit genau die 30', () => {
  const ohne = bau({ partie: 'kurz', troedel: 'ohne' }).state;
  const alle = [...stack(ohne, 'Nachschub (Tante Emma)').cards, ...ohne.cards.filter(c => c.category === 'Nachschub')];
  assert.equal(alle.length, 177);
  assert.ok(alle.every(c => c.category === 'Nachschub'));
  assert.equal(ohne.cards.filter(c => c.category === 'Nachschub (freischaltbar)').length, 0);
  const mit = bau({ partie: 'kurz', troedel: 'mit' }).state;
  const dreissig = [...stack(mit, 'Nachschub (Tante Emma)').cards, ...mit.cards.filter(c => c.category === 'Toller Trödel: Nachschub (Nr. 1-30)')];
  assert.equal(dreissig.length, 30);
  assert.equal(mit.cards.filter(c => c.category === 'Nachschub').length, 0, 'mit Toller Trödel kein normaler Nachschub');
  // Zehn offen in der Auslage.
  assert.equal(mit.cards.filter(c => c.category === 'Toller Trödel: Nachschub (Nr. 1-30)').length, 10);
});

test('CY: der Rollenstapel – 20 Karten, offen, ungemischt, hochkant; ohne Toller Trödel keiner und **keine Protokollzeile**', () => {
  const mit = bau({ partie: 'kurz', troedel: 'mit' });
  const rollen = stack(mit.state, 'Rollen');
  assert.equal(rollen.cards.length, 20);
  assert.ok(rollen.cards.every(c => c.faceDown === false), 'offen');
  assert.ok(rollen.cards.every(c => c.width === 825 && c.height === 1424));
  assert.deepEqual(rollen.cards.map(c => c.zIndex), [...Array(20)].map((_, i) => i + 1), 'ungemischt, in Bibliotheksreihenfolge');
  assert.deepEqual([rollen.x, rollen.y], [ROLLEN.x, ROLLEN.y]);
  const ohne = bau({ partie: 'kurz', troedel: 'ohne' });
  assert.equal(stack(ohne.state, 'Rollen'), undefined);
  // Kein Schritt für den Rollenstapel im Protokoll - weder ok noch skipped.
  assert.ok(!ohne.log.some(e => e.target === 'Toller Trödel: Rollen' || e.target === 'Rollen'));
});

test('CY: lang – kein Marker auf dem ersten Platz, vier verdeckte Bösewichte aus dem Pool; kurz – Marker und drei benannte', () => {
  const lang = bau({ partie: 'lang', troedel: 'mit' }).state;
  const bosses = onBar(lang);
  assert.equal(bosses.length, 4);
  assert.ok(bosses.every(t => t.faceDown === true));
  assert.equal(new Set(bosses.map(t => t.label)).size, 4, 'vier verschiedene');
  const kurz = bau({ partie: 'kurz', troedel: 'mit' }).state;
  assert.deepEqual(onBar(kurz).map(t => t.label).sort(),
    ['Bösewicht: Deputy Waggums', 'Bösewicht: The Bundits', 'Bösewicht: Virginia Fitz', 'Kurzpartie: erste Runde überspringen']);
  assert.equal(onBar(kurz).filter(t => t.faceDown).length, 3, 'nur die drei Bösewichte liegen verdeckt');
});

test('CY: lang zieht über viele Läufe nie zweimal denselben und nur aus dem Pool', () => {
  const pool = new Set(assets.filter(a => a.category === 'Bösewichte').map(a => a.name));
  const gesehen = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const bosses = onBar(bau({ partie: 'lang', troedel: 'ohne' }, {}, seed).state);
    assert.equal(bosses.length, 4, `seed ${seed}`);
    assert.equal(new Set(bosses.map(t => t.label)).size, 4);
    for (const t of bosses) { assert.ok(pool.has(t.label), t.label); gesehen.add(t.label); }
  }
  assert.ok(gesehen.size >= 15, `über 40 Läufe kamen ${gesehen.size} verschiedene vor`);
});

test('CY: kurz/mit baut **denselben Tisch** wie der Aufbau vor M27 – bis auf den neuen Rollenstapel', () => {
  const alt = bauen({ ...env, sequence: fx.sequenceBefore, scenarioData: fx.scenarioBefore }, undefined, 1);
  assert.deepEqual(alt.log.filter(e => e.status !== 'ok'), []);
  const neu = bau({ partie: 'kurz', troedel: 'mit' });
  const key = (o) => `${o.assetId ?? o.cardId ?? o.name ?? o.label ?? ''}|${o.x}|${o.y}`;
  const flach = (s) => Object.fromEntries(Object.keys(s).sort().map(k => [k, Array.isArray(s[k]) ? ohneIds(s[k]).sort((a, b) => key(a).localeCompare(key(b))) : ohneIds(s[k])]));
  const ohneRollen = { ...neu.state, stacks: neu.state.stacks.filter(s => s.label !== 'Rollen') };
  assert.deepEqual(flach(ohneRollen), flach(alt.state));
  // Und nicht leer verglichen: 3 Tableaus samt Steinen, 15 Zähler, Auslagen, vier Leistenobjekte.
  assert.deepEqual([alt.state.tokens.length, alt.state.counters.length, alt.state.cards.length, alt.state.stacks.length], [24, 15, 22, 3]);
  assert.equal(neu.state.stacks.length, alt.state.stacks.length + 1, 'der Rollenstapel ist der eine Unterschied');
});

test('CY: ohne Wahl gilt der Vorgabewert – derselbe Tisch wie `kurz/mit` (alte Lesezeichen)', () => {
  const a = bau({});
  const b = bau({ partie: 'kurz', troedel: 'mit' });
  assert.deepEqual(ohneIds(a.state), ohneIds(b.state));
});

test('CY: der Rollenstapel liegt neben dem Nachschub und überlappt **nichts** – gemessen am echten Tisch', () => {
  const { state: s } = bau({ partie: 'kurz', troedel: 'mit' });
  const boxes = anchorBoxes(s.boards, s.tokens);
  const rz = resolveZones(zones, boxes);
  const rg = resolveGrids(grids, boxes);
  const dims = (c) => { const k = Math.min(100 / c.width, 140 / c.height); return { w: Math.round(c.width * k), h: Math.round(c.height * k) }; };
  const out = [];
  const add = (kind, name, x, y, w, h) => out.push({ kind, name, x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 });
  for (const b of s.boards) add('board', b.label, b.x, b.y, b.width ?? b.size ?? 0, b.height ?? b.size ?? 0);
  for (const t of s.tokens) add('token', t.label, t.x, t.y, t.width ?? t.size ?? 0, t.height ?? t.size ?? 0);
  for (const c of s.cards) { const d = dims(c); add('card', c.name, c.x, c.y, d.w, d.h); }
  for (const st of s.stacks.filter(x => x.label !== 'Rollen')) { const d = dims(st.cards[0]); add('stack', st.label, st.x, st.y, d.w, d.h); }
  for (const c of s.counters) out.push({ kind: 'counter', name: c.name, x0: c.x - 70, y0: c.y - 40, x1: c.x - 70 + 185, y1: c.y - 40 + 102 });
  for (const z of rz) out.push({ kind: 'zone', name: z.label, x0: z.x, y0: z.y, x1: z.x + z.width, y1: z.y + z.height });
  for (const g of rg) out.push({ kind: 'grid', name: g.label, x0: g.origin.x, y0: g.origin.y, x1: g.origin.x + g.cols * g.cell, y1: g.origin.y + g.rows * g.cell });

  const r = stack(s, 'Rollen');
  const d = dims(r.cards[0]);
  assert.deepEqual([d.w, d.h], [81, 140]);
  const box = { x0: r.x - d.w / 2, y0: r.y - d.h / 2, x1: r.x + d.w / 2, y1: r.y + d.h / 2 };
  const hits = out.filter(o => !(o.x1 <= box.x0 || o.x0 >= box.x1 || o.y1 <= box.y0 || o.y0 >= box.y1));
  assert.deepEqual(hits.map(h => `${h.kind}:${h.name}`), []);
  // Neben dem Nachschub, und mit Luft: nichts näher als 30 Punkte.
  const nachschub = stack(s, 'Nachschub (Tante Emma)');
  assert.equal(r.x, nachschub.x, 'in der Spalte der Dauerstapel');
  assert.ok(r.y > nachschub.y && r.y - nachschub.y < 200);
  for (const o of out) {
    const dx = Math.max(o.x0 - box.x1, box.x0 - o.x1, 0), dy = Math.max(o.y0 - box.y1, box.y0 - o.y1, 0);
    assert.ok(Math.hypot(dx, dy) >= 29.5, `${o.kind} ${o.name} liegt ${Math.hypot(dx, dy).toFixed(1)} Punkte entfernt`);
  }
});

test('CY: der Rollenstapel liegt in keiner Zone – kein Aufräumschritt der Aktionen fasst ihn an', () => {
  const { state: s } = bau({ partie: 'kurz', troedel: 'mit' });
  const rz = resolveZones(zones, anchorBoxes(s.boards, s.tokens));
  const r = stack(s, 'Rollen');
  assert.ok(!rz.some(z => r.x >= z.x && r.x <= z.x + z.width && r.y >= z.y && r.y <= z.y + z.height));
});

// ── Die Aktionen laufen in allen vier Kombinationen durch (Abnahme 7) ───────

test('CY: „Laden nachfüllen", „Dorfphase beginnen" und „Kampf beginnen" laufen in allen vier Kombinationen ohne eine Änderung', () => {
  for (const choices of COMBINATIONS) {
    const key = `${choices.partie}/${choices.troedel}`;
    let s = bau(choices).state;
    for (const id of ['kampf-beginnen', 'dorfphase-beginnen', 'laden-nachfuellen']) {
      const a = act.next.find(x => x.id === id);
      const r = executeSequenceWithLog(s, a.steps, zones, { assets, cards, grids, scenarioData: sce.next, rng: () => 0.5 });
      assert.deepEqual(r.log.filter(e => e.status !== 'ok' && e.status !== 'note'), [], `${key}: ${id}`);
      s = r.state;
    }
    // Der Nachschubstapel heißt in jeder Variante gleich - die Aktionen finden ihn.
    assert.ok(stack(s, 'Nachschub (Tante Emma)'), key);
  }
});

// ── action_data: genau ein Schritt (M27.5) ──────────────────────────────────

test('CY: `action_data` ändert sich an **genau einer** Stelle – *Kampf beginnen* 17 bekommt `category`', () => {
  assert.deepEqual(actionDiff(fx.actionsBefore, act.next), ['kampf-beginnen 17']);
  const step = act.next.find(a => a.id === 'kampf-beginnen').steps[17];
  assert.deepEqual(step, { type: 'place_card', cardName: '$SHERIFF', targetZoneLabel: 'Terrain-Auslage', onlyFinal: true, category: ['Einzigartige Ausrüstung', 'Einzigartige Ausrüstung (Neue Nachbarn)'] });
  assert.deepEqual(SHERIFF_CATEGORIES, step.category);
  // Alle anderen Schritte aller Aktionen sind byteweise gleich.
  fx.actionsBefore.forEach((a, i) => a.steps.forEach((s, k) => {
    if (a.id === 'kampf-beginnen' && k === 17) return;
    assert.equal(JSON.stringify(act.next[i].steps[k]), JSON.stringify(s), `${a.id} ${k}`);
  }));
});

test('CY: mit der Angabe findet `place_card` die TRILLERPFEIFE der Einzigartigen Ausrüstung – ohne sie bleibt sie mehrdeutig', () => {
  assert.equal(findCardByName(cards, 'TRILLERPFEIFE').ambiguous, true, 'die Bibliothek führt sie zweimal');
  const zone = { id: 'z', label: 'Terrain-Auslage', x: 0, y: 0, width: 600, height: 100, accepts: ['card'], capacity: null, layout: 'row' };
  const step = act.next.find(a => a.id === 'kampf-beginnen').steps[17];
  // Der Schritt trägt `onlyFinal: true` - hier läuft er als Endkampf-Schritt, ohne Gate.
  const { onlyFinal, ...ohneGate } = step;
  assert.equal(onlyFinal, true);
  const mit = executeSequenceWithLog({}, [{ ...ohneGate, cardName: 'TRILLERPFEIFE' }], [zone], { cards });
  assert.deepEqual(mit.log.map(e => e.status), ['ok'], mit.log[0].reason);
  assert.equal(mit.state.cards[0].category, 'Einzigartige Ausrüstung');
  const ohne = executeSequenceWithLog({}, [{ type: 'place_card', cardName: 'TRILLERPFEIFE', targetZoneLabel: 'Terrain-Auslage' }], [zone], { cards });
  assert.equal(ohne.log[0].status, 'failed');
});

test('CY: die Sheriff-Karte jedes Bösewichts, der eine hat, wird mit der Angabe gefunden – eindeutig', () => {
  const pool = cards.filter(c => SHERIFF_CATEGORIES.includes(c.category));
  const ohne = [];
  let n = 0;
  for (const [boss, data] of Object.entries(sce.next.bosses)) {
    const name = data.final?.stats?.SHERIFF;
    if (!name) { ohne.push(boss); continue; }
    const r = findCardByName(pool, name);
    assert.ok(r.card, `${boss}: ${name} – ${r.reason}`);
    n++;
  }
  // Neunzehn von zwanzig. **Tilda Fields** hat keine: ihr Sheriff bekommt kein benanntes
  // Teil, sondern die oberste Karte des Gartendecks (`docs/szenariodaten-erweiterung.md`
  // §8) - dort bleibt `$SHERIFF` ungebunden und der Schritt übersprungen, **gewollt**.
  assert.equal(n, 19);
  assert.deepEqual(ohne, ['Tilda Fields']);
});

// ── Ein zweiter Lauf, und was abbricht ──────────────────────────────────────

test('CY: ein zweiter Lauf findet nichts mehr zu tun – und ändert nichts', () => {
  const again = [patchSequence(seq.next), patchScenario(sce.next), patchActions(act.next)];
  for (const p of again) {
    assert.deepEqual(p.changes, []);
    assert.deepEqual(p.complaints, []);
  }
  assert.equal(JSON.stringify(again[0].next), JSON.stringify(seq.next));
  assert.equal(JSON.stringify(again[1].next), JSON.stringify(sce.next));
  assert.equal(JSON.stringify(again[2].next), JSON.stringify(act.next));
});

test('CY: ein abweichender Dörfler-Schritt bricht ab – es wird nichts ersetzt', () => {
  const kaputt = copy(fx.sequenceBefore);
  kaputt[28] = { ...kaputt[28], value: 9 };   // Henlo: Leben
  const r = patchSequence(kaputt);
  assert.ok(r.complaints.length > 0);
  assert.ok(r.complaints.some(c => /Henlo: Leben/.test(c)), r.complaints.join('\n'));
  assert.ok(!r.next.some(s => s.type === 'seat_villager'), 'solange nicht jeder Schritt stimmt, kommt kein seat_villager');
});

test('CY: ein fehlender Dörfler-Schritt oder ein hartverdrahteter Rest neben `seat_villager` bricht ab', () => {
  const fehlt = fx.sequenceBefore.filter((_, i) => i !== 40);
  assert.ok(patchSequence(fehlt).complaints.length > 0);
  const gemischt = [...seq.next, fx.sequenceBefore[39]];
  assert.ok(patchSequence(gemischt).complaints.some(c => /hartverdrahtet/.test(c)));
  const andere = copy(seq.next);
  const k = andere.findIndex(s => s.type === 'seat_villager');
  andere[k] = { ...andere[k], villager: 'Judy Marks' };
  assert.ok(patchSequence(andere).complaints.some(c => /seat_villager/.test(c)));
});

test('CY: ein vorhandener, abweichender Wert wird nicht überschrieben – Nachschub, Münzen, Gate, `draw_assets`, Rollen', () => {
  const mut = (fn) => { const s = copy(fx.sequenceBefore); fn(s); return patchSequence(s); };
  assert.ok(mut(s => { s[5].category = ['Nachschub']; }).complaints.some(c => /Nachschub: category/.test(c)));
  assert.ok(mut(s => { s[50].value = 40; }).complaints.some(c => /Münzen: value/.test(c)));
  assert.ok(mut(s => { s[11].onlyChoice = { partie: 'lang' }; }).complaints.some(c => /onlyChoice/.test(c)));
  const mitDraw = copy(seq.next);
  mitDraw.find(s => s.type === 'draw_assets').count = 3;
  assert.ok(patchSequence(mitDraw).complaints.some(c => /draw_assets/.test(c)));
  const mitRollen = copy(seq.next);
  mitRollen.find(s => s.label === 'Rollen').x = 1;
  assert.ok(patchSequence(mitRollen).complaints.some(c => /Rollenstapel/.test(c)));

  const sc = copy(fx.scenarioBefore);
  sc.options = { partie: { label: 'anders' } };
  assert.ok(patchScenario(sc).complaints.some(c => /options/.test(c)));
  const sc2 = copy(sce.next);
  sc2.villagers.barZone = 'Andere Leiste';
  assert.ok(patchScenario(sc2).complaints.some(c => /barZone/.test(c)));
  const sc3 = copy(sce.next);
  sc3.villagers.seats[1].tableau = { x: 1, y: 2 };
  assert.ok(patchScenario(sc3).complaints.some(c => /seats\[1\]\.tableau/.test(c)));

  const ac = copy(fx.actionsBefore);
  ac.find(a => a.id === 'kampf-beginnen').steps[17].targetZoneLabel = 'Woanders';
  assert.ok(patchActions(ac).complaints.length > 0);
  const ac2 = copy(act.next);
  ac2.find(a => a.id === 'kampf-beginnen').steps[17].category = ['Etwas anderes'];
  assert.ok(patchActions(ac2).complaints.some(c => /category/.test(c)));
});

test('CY: das Skript fasst nur `Kampf beginnen` an – kein anderer Schritt, keine andere Aktion', () => {
  const ac = copy(fx.actionsBefore);
  // Ein zweiter `place_card "$SHERIFF"` irgendwo anders wäre mehrdeutig - Abbruch statt Raten.
  ac.find(a => a.id === 'kampf-beginnen').steps.push({ type: 'place_card', cardName: '$SHERIFF', targetZoneLabel: 'X' });
  assert.ok(patchActions(ac).complaints.some(c => /2 Schritte/.test(c)));
  assert.ok(patchActions([]).complaints.length > 0);
});

// ── Das Skript selbst, gegen eine echte SQLite-Datei ────────────────────────
//
// Die reinen Umschreibungen oben beweisen die Rechnung. Hier läuft `main` - lesen,
// prüfen, schreiben, neu lesen - gegen eine Datenbank mit dem echten Schema und den
// Zeilen aus dem Auszug. Es fand schon einen Fehler, den die reinen Tests nicht
// sehen konnten: der zweite Lauf verglich die **neuen** Daten mit sich selbst als
// „alten Aufbau" und meldete eine Abweichung, statt „nichts zu schreiben".

import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const { main, GAME_ID, SETUP_ID, fingerprint } = await import('../../scripts/auslagen-daten.mjs');
const { default: Database } = await import('better-sqlite3');

function frischeDatenbank() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'cge-auslagen-'));
  const file = path.join(tmp, 'test.db');
  // Das echte Schema: `setupDatabase` legt es an (CGE_DB_PATH wird beim Import gelesen).
  execFileSync(process.execPath, ['--input-type=module', '-e',
    'const { setupDatabase, closeDatabase } = await import("./src/database.js"); await setupDatabase(); closeDatabase();'],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, CGE_DB_PATH: file }, stdio: 'pipe' });
  const db = new Database(file);
  db.prepare("insert into games (id, name) values (?, 'TFT')").run(GAME_ID);
  const cat = new Map();
  const catId = (name) => {
    if (!name) return null;
    if (!cat.has(name)) { cat.set(name, randomUUID()); db.prepare('insert into categories (id, game_id, name) values (?, ?, ?)').run(cat.get(name), GAME_ID, name); }
    return cat.get(name);
  };
  for (const a of assets) {
    db.prepare('insert into table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(a.id, GAME_ID, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category));
  }
  for (const c of cards) {
    db.prepare('insert into cards (id, game_id, category_id, name, image_path, width, height) values (?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, GAME_ID, catId(c.category), c.name, c.image_path, c.width, c.height);
  }
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Kurzpartie', JSON.stringify(state), JSON.stringify(zones), JSON.stringify(fx.sequenceBefore),
      JSON.stringify(grids), JSON.stringify(fx.actionsBefore), JSON.stringify(fx.scenarioBefore));
  // Ein Aufbau daneben, den das Skript nicht anfassen darf, und ein Spielstand.
  db.prepare("insert into setups (id, game_id, name, sequence_data, scenario_data, action_data) values (?, ?, 'Grundaufbau', '[{\"type\":\"shuffle\"}]', '{}', '[]')").run(randomUUID(), GAME_ID);
  db.prepare("insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, 'Partie 14', '{\"a\":1}', ?)").run(randomUUID(), GAME_ID, SETUP_ID);
  db.close();
  return { tmp, file };
}

/** `main` laufen lassen und aufschreiben, was es ausgibt. */
async function lauf(args) {
  const zeilen = [];
  const orig = console.log;
  console.log = (...a) => zeilen.push(a.join(' '));
  try {
    const code = await main(args, { Database });
    return { code, out: zeilen.join('\n') };
  } finally {
    console.log = orig;
  }
}

const spalten = (file) => {
  const db = new Database(file, { readonly: true });
  const r = db.prepare('select sequence_data, scenario_data, action_data, zone_data, grid_data, state_data from setups where id = ?').get(SETUP_ID);
  const fp = fingerprint(db);
  db.close();
  return { r, fp };
};

test('CY: `--check` ändert nichts, `--write` schreibt genau die drei Spalten, ein zweiter Lauf schreibt nichts', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = spalten(file);

    const check = await lauf(['--check', file]);
    assert.equal(check.code, 0, check.out);
    assert.match(check.out, /Trockenlauf: 0 Beanstandungen/);
    assert.deepEqual(spalten(file).r, vorher.r, '--check hat nichts geschrieben');

    const write = await lauf(['--write', file]);
    assert.equal(write.code, 0, write.out);
    assert.match(write.out, /Fingerabdruck aller Tabellen .* unverändert: true/);
    assert.match(write.out, /bosses byteweise gleich: true/);
    assert.match(write.out, /villagers.roster byteweise gleich: true/);
    assert.match(write.out, /action_data: Schritte geändert: kampf-beginnen 17/);
    const nachher = spalten(file);
    assert.equal(nachher.r.sequence_data, JSON.stringify(seq.next));
    assert.equal(nachher.r.scenario_data, JSON.stringify(sce.next));
    assert.equal(nachher.r.action_data, JSON.stringify(act.next));
    // Was nicht geschrieben wird, bleibt gleich - Spalte für Spalte und als Fingerabdruck.
    for (const c of ['zone_data', 'grid_data', 'state_data']) assert.equal(nachher.r[c], vorher.r[c], c);
    assert.deepEqual(nachher.fp, vorher.fp);

    const zweiter = await lauf(['--write', file]);
    assert.equal(zweiter.code, 0, zweiter.out);
    assert.match(zweiter.out, /nichts zu schreiben/);
    assert.deepEqual(spalten(file).r, nachher.r, 'der zweite Lauf hat nichts überschrieben');
    const check2 = await lauf(['--check', file]);
    assert.equal(check2.code, 0, check2.out);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('CY: weicht ein vorhandener Wert ab, bricht `--write` ab – und die Datenbank bleibt, wie sie war', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const db = new Database(file);
    // Jemand hat `options` schon anders hingeschrieben.
    const sc = copy(fx.scenarioBefore);
    sc.options = { partie: { label: 'eigene Arbeit' } };
    db.prepare('update setups set scenario_data = ? where id = ?').run(JSON.stringify(sc), SETUP_ID);
    db.close();
    const vorher = spalten(file);

    const r = await lauf(['--write', file]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /options steht schon da und weicht ab/);
    assert.deepEqual(spalten(file), vorher, 'nichts geschrieben');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('CY: trifft der UPDATE keine Zeile (die Spalten haben sich seit dem Lesen geändert), wird nichts geschrieben', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    // Ein zweiter Schreiber zwischen Lesen und Schreiben lässt sich hier nicht
    // zeitlich treffen; ein Trigger, der den UPDATE ignoriert, ist derselbe Fall von
    // außen: der Vergleich-und-Tausch findet keine Zeile, und die Transaktion bricht ab.
    const db = new Database(file);
    db.exec(`create trigger fremd before update on setups when old.id = '${SETUP_ID}' begin select raise(ignore); end;`);
    db.close();
    const vorher = spalten(file);
    const r = await lauf(['--write', file]).catch(e => ({ code: 'wirft', out: String(e.message) }));
    assert.equal(r.code, 'wirft', 'ein UPDATE ohne Treffer ist kein Erfolg');
    assert.match(r.out, /seit dem Lesen geändert/);
    assert.deepEqual(spalten(file), vorher);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ── Der Rauchtest (CZ) läuft gegen dieselbe Datenbank ───────────────────────

const { rauchtest, bekannt } = await import('../../scripts/auslagen-rauchtest.mjs');
const { ergaenze, ZUORDNUNG } = await import('../../scripts/gelaendekarten-zuordnung.mjs');
const { berichtige } = await import('../../scripts/szenariodaten-berichtigung.mjs');

/**
 * M29/DO: der Rauchtest verlangt die Tabelle `terrainCards` (Abschnitt 0). `frischeDatenbank` hat sie nicht, und `--write`
 * dieses Skripts schreibt sie nicht (es ist M27) — wer einen sauberen Rauchtest will, legt sie dazu, wie M29 es an der
 * Produktion tut: hinten an `scenario_data`. `nachM28` berichtigt vorher die sieben Einträge, damit die Daten der
 * Produktion nach M28 entsprechen (die Zahlen in M29.9 gelten für sie).
 */
function mitTabelle(file, { nachM28 = false, tabelle } = {}) {
  const db = new Database(file);
  const roh = db.prepare('select scenario_data from setups where id = ?').get(SETUP_ID).scenario_data;
  let sc = JSON.parse(roh);
  if (nachM28) sc = berichtige(sc).next;
  sc = ergaenze(sc);
  if (tabelle !== undefined) sc.terrainCards = tabelle;
  db.prepare('update setups set scenario_data = ? where id = ?').run(JSON.stringify(sc), SETUP_ID);
  db.close();
}

test('CZ: der Rauchtest findet nach dem Schreiben nichts – vier Kombinationen, 20 Bösewichte im Vor- und Endkampf', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    assert.equal((await lauf(['--write', file])).code, 0);
    mitTabelle(file);   // M29/DO: der Rauchtest verlangt die Tabelle
    const db = new Database(file);
    // Ohne den Platzhalter-Spielstand aus der Hilfe: nur der Aufbau und seine Aktionen.
    db.prepare('delete from save_states').run();
    const r = rauchtest(db);
    db.close();
    assert.deepEqual(r.problems, [], r.out.filter(l => /!!/.test(l)).join('\n'));
    const text = r.out.join('\n');
    // Nicht leer: alle vier Kombinationen, 40 Kämpfe, Handsy mit leerem Protokoll und seiner Karte.
    for (const k of ['kurz/mit', 'kurz/ohne', 'lang/mit', 'lang/ohne']) assert.match(text, new RegExp(k));
    assert.equal((text.match(/^  .{17} Vorkampf: /gm) || []).length, 20);
    assert.equal((text.match(/^  .{17} Endkampf: /gm) || []).length, 20);
    // Handsys Protokoll ist nicht wörtlich leer: `build_scenario` meldet als Hinweis die Geländeplättchen
    // ohne Karte (bekannt, M25.2). Der Schritt mit der TRILLERPFEIFE steht auf „ok", und die Karte liegt da.
    assert.match(text, /Handsy-Endkampf: \d+ Zeilen, ohne ok und unbekannt: 0, bekannte Hinweise: [1-9]\d*; Karten in der Terrain-Auslage: Einzigartige Ausrüstung$/m);
    assert.match(text, /Endkämpfe, in denen die Sheriff-Karte liegt: 19 von 20; ohne Karte \(gewollt\): Tilda Fields/);
    // Nach jedem der 40 Kämpfe räumt *Dorfphase beginnen* das Verhaltensdeck dieses Bösewichts ab - auch bei den
    // 17, deren `Aktionen: …`-Kategorie die Aktion nicht beim Namen nennt (`docs/szenariodaten-grundspiel.md` §13.1).
    assert.match(text, /Dorfphase beginnen nach jedem dieser Kämpfe: .* 40 von 40/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('CZ: der Rauchtest schlägt an – vor dem Schreiben (alte Daten) kennt der Aufbau die Wahl nicht, und ein Spielstand ohne Stapel wird genannt', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    // Alte Daten: kein `options`, kein `seat_villager`. Die vier Kombinationen können so nicht stimmen.
    const alt = new Database(file, { readonly: true });
    const r1 = rauchtest(alt);
    alt.close();
    assert.ok(r1.problems.length > 0, 'mit den alten Daten muss der Rauchtest etwas finden');
    // Neue Daten, aber ein Spielstand, dem die Stapel fehlen (die Hilfe legt einen an).
    assert.equal((await lauf(['--write', file])).code, 0);
    mitTabelle(file);   // M29/DO: der Rauchtest verlangt die Tabelle
    const neu = new Database(file, { readonly: true });
    const r2 = rauchtest(neu);
    neu.close();
    // Der Spielstand ohne Stapel wird beim Namen genannt, samt den Folgen auf seinem leeren Tisch -
    // und **nur** er: die vier Kombinationen und alle Kämpfe sind in Ordnung.
    assert.ok(r2.problems.length >= 1, 'ein Spielstand ohne Stapel muss auffallen');
    assert.ok(r2.problems.some(p => /Partie 14: Stapel fehlen: Nachschub \(Tante Emma\), Heldentaten, Dorf-Ereignisse/.test(p)), r2.problems.join('\n'));
    assert.ok(r2.problems.every(p => /^Partie 14/.test(p)), r2.problems.join('\n'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ── DO / Spec M29.9: der Rauchtest und die Sperre für die drei Namen ────────
//
// `bekannt()` ist ein Ausdruck auf den **allgemeinen** Wortlaut („keine Karte in dieser Bibliothek“) und lässt
// jedes Plättchen ohne Karte durch. Fiele die Tabelle aus — Daten zurückgeschrieben, Karte gelöscht, Deploy
// zurückgenommen —, bliebe der Rauchtest grün, und die drei Namen stünden wieder in den Meldungen. Die Sperre
// schließt das: ein Hinweis, der eines der drei Plättchen **namentlich** nennt, ist keiner mehr, und der
// Abschnitt 0 verlangt die Tabelle.

const DREI = Object.keys(ZUORDNUNG);
const hinweis = (...namen) => ({
  type: 'build_scenario', status: 'note',
  reason: `${namen.length} terrain tiles on the table have no terrain card in this library (nothing to do): ${namen.map(n => `"${n}"`).join(', ')}`,
});

test('DO: die Sperre in Isolation – ein Hinweis, der eines der drei Plättchen nennt, ist nicht mehr bekannt; ein echt fehlendes bleibt es', () => {
  assert.equal(bekannt('Virginia Fitz', hinweis('Dichter Wald 2')), false);
  assert.equal(bekannt('Virginia Fitz', hinweis('Sprengstoff')), false);
  assert.equal(bekannt('Virginia Fitz', hinweis('Auslöser')), false);
  assert.equal(bekannt('Virginia Fitz', hinweis('Grabhügel / Grabhügel ausgehoben (14)')), true);
  // Gemischt: ein einziger der drei genügt, um den Hinweis zu verwerfen.
  assert.equal(bekannt('Virginia Fitz', hinweis('Auslöser', 'Grabhügel / Grabhügel ausgehoben (14)')), false);
  assert.equal(bekannt('Virginia Fitz', hinweis('Grabhügel / Grabhügel ausgehoben (14)', 'Sprengstoff')), false);
  // Der Name muss als ganzer Name dastehen: ein längerer Name, der ihn enthält, ist ein anderes Plättchen.
  assert.equal(bekannt('Virginia Fitz', hinweis('Auslöser-Falle')), true);
  // Der allgemeine Ausdruck ändert sich nicht: die übrigen bekannten Fälle gelten wie vorher.
  assert.equal(bekannt('Tilda Fields', { type: 'place_card', status: 'skipped', reason: '$SHERIFF is not bound' }), true);
  assert.equal(bekannt('Barry Bluff', { type: 'set_counter', status: 'skipped', reason: 'Equal to the highest MVMT' }), true);
  assert.equal(bekannt('Virginia Fitz', { type: 'place_card', status: 'failed', reason: 'x' }), false);
});

test('DO: mit Tabelle (Daten wie nach M28 und M29) ist der Rauchtest sauber – Abschnitt 0 und die Zeilen aus M29.9', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    assert.equal((await lauf(['--write', file])).code, 0);
    mitTabelle(file, { nachM28: true });
    const db = new Database(file);
    db.prepare('delete from save_states').run();
    const r = rauchtest(db);
    db.close();
    assert.deepEqual(r.problems, [], r.out.filter(l => /!!/.test(l)).join('\n'));
    const text = r.out.join('\n');
    // Abschnitt 0: die Tabelle ist da, genau die drei Paare, der Prüfer meldet nichts.
    assert.match(text, /^0\. .*Zuordnung/m);
    assert.match(text, /^ {2}terrainCards: da, genau die drei Paare; validateScenarioData: 0 Probleme$/m);
    // Abschnitt 1: der zweite Kampf (kurz: der Mischer zieht Virginia Fitz) hatte 1 ohne ok mit den drei Namen, jetzt 0.
    assert.equal((text.match(/zweiter Kampf beginnen: 17 Zeilen\/0 ohne ok$/gm) || []).length, 4, 'alle vier Kombinationen');
    // Abschnitt 2: Virginia Fitz – Vorkampf 0, Endkampf nennt nur noch die fünf Grabhügel.
    assert.match(text, /^ {2}Virginia Fitz {5}Vorkampf: \d+ Zeilen, ohne ok: 0$/m);
    const virginiaEnd = text.split('\n').find(l => /^ {2}Virginia Fitz {5}Endkampf: /.test(l));
    assert.match(virginiaEnd, /ohne ok: 1 \(davon 1 bekannte Hinweise: /);
    assert.equal((virginiaEnd.match(/Grabhügel \/ Grabhügel ausgehoben \(\d+\)/g) || []).length, 5);
    for (const name of DREI) assert.ok(!virginiaEnd.includes(name), `${name} steht nicht mehr in den Meldungen`);
    // Qing & Kween: beide Läufe ohne Hinweis.
    assert.match(text, /^ {2}Qing & Kween +Vorkampf: \d+ Zeilen, ohne ok: 0$/m);
    assert.match(text, /^ {2}Qing & Kween +Endkampf: \d+ Zeilen, ohne ok: 0;/m);
    // Barry Bluff: 5 → 4 – die vier übrigen sind die bekannten `Equal to …`-Schritte, keine Plättchennamen mehr.
    for (const lauf2 of ['Vorkampf', 'Endkampf']) {
      const l = text.split('\n').find(x => new RegExp(`^ {2}Barry Bluff +${lauf2}: `).test(x));
      assert.match(l, /ohne ok: 4 /, l);
      for (const name of DREI) assert.ok(!l.includes(name), l);
    }
    // Handsy: der bestehende Ausdruck gilt weiter (mindestens ein bekannter Hinweis: die Bürger).
    assert.match(text, /Handsy-Endkampf: \d+ Zeilen, ohne ok und unbekannt: 0, bekannte Hinweise: [1-9]\d*; Karten in der Terrain-Auslage: Einzigartige Ausrüstung$/m);
    // Keine der Zeilen, die sich ändern, nennt noch eines der drei Plättchen.
    for (const name of DREI) assert.ok(!text.includes(`: ${name}`) && !text.includes(`, ${name}`), `${name} steht irgendwo in der Ausgabe`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('DO: ohne Tabelle schlägt der Rauchtest an – Abschnitt 0 und je Lauf, in dem eines der drei Plättchen ohne Karte dasteht (die Sperre)', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    assert.equal((await lauf(['--write', file])).code, 0);
    // Daten wie nach M28, aber **ohne** die Tabelle: der Stand vor M29.
    const db0 = new Database(file);
    const sc = berichtige(JSON.parse(db0.prepare('select scenario_data from setups where id = ?').get(SETUP_ID).scenario_data)).next;
    db0.prepare('update setups set scenario_data = ? where id = ?').run(JSON.stringify(sc), SETUP_ID);
    db0.prepare('delete from save_states').run();
    db0.close();
    const db = new Database(file, { readonly: true });
    const r = rauchtest(db);
    db.close();
    // Abschnitt 0: eine Beanstandung, die die Tabelle nennt.
    assert.ok(r.problems.some(p => /^terrainCards fehlt/.test(p)), r.problems.join('\n'));
    assert.match(r.out.join('\n'), /^ {2}terrainCards: FEHLT; validateScenarioData: 0 Probleme$/m);
    // Je Lauf: die acht betroffenen Bösewichte (16 Läufe) stehen mit Namen da, und die Meldung sagt, warum das nicht mehr geht.
    const lauf16 = r.problems.filter(p => /^(\S.*?) +(Vorkampf|Endkampf): /.test(p) && DREI.some(n => p.includes(`"${n}"`)));
    assert.ok(lauf16.length >= 16, `${lauf16.length} Beanstandungen je Lauf\n${r.problems.join('\n')}`);
    for (const boss of ['Virginia Fitz', 'Red Atrocious', 'Barry Bluff', 'The Door Knockers', 'Handsy', 'Lawman Dozy', 'Qing & Kween', 'Umbrello']) {
      for (const art of ['Vorkampf', 'Endkampf']) {
        assert.ok(lauf16.some(p => p.startsWith(boss) && p.includes(art)), `${boss} ${art}`);
      }
    }
    assert.ok(lauf16.every(p => /steht wieder ohne Karte da, obwohl die Zuordnung es abdeckt/.test(p)), lauf16[0]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('DO: eine fehlerhafte Tabelle – ein Ziel, das es nicht gibt – ist eine Beanstandung aus Abschnitt 0, mit dem Schlüssel in der Meldung', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    assert.equal((await lauf(['--write', file])).code, 0);
    mitTabelle(file, { nachM28: true, tabelle: { ...ZUORDNUNG, Sprengstoff: 'Gibt es nicht' } });
    const db = new Database(file);
    db.prepare('delete from save_states').run();
    const r = rauchtest(db);
    db.close();
    assert.ok(r.problems.some(p => /^validateScenarioData: .*"Sprengstoff".*Gibt es nicht/.test(p)), r.problems.join('\n'));
    assert.ok(r.problems.some(p => /^terrainCards lautet anders/.test(p)), r.problems.join('\n'));
    assert.match(r.out.join('\n'), /^ {2}terrainCards: ANDERS; validateScenarioData: [1-9]\d* Probleme$/m);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ── DX / Spec M30.5 Nr. 7: der Rauchtest erkennt die Wache aus `require_marker` ─────────────────────────────
//
// Die Prüfung stand als Einzeiler in der Schleife über die Spielstände; sie ist eine Funktion, damit ein Test
// sie hält. Eine Wache ist ein Schritt, der die Folge **angehalten** hat (`… further steps skipped`) - eine Auskunft
// über den Stand, kein Fehler des Aufbaus.

const { istWache } = await import('../../scripts/auslagen-rauchtest.mjs');

test('DX: `istWache` erkennt require_marker wie require_counter und require_zone – und nichts sonst', () => {
  const halt = 'Alle besiegt. [Dörfler 1: Leben: no marker] (2 further steps skipped)';
  assert.equal(istWache({ type: 'require_marker', status: 'skipped', reason: halt }), true);
  assert.equal(istWache({ type: 'require_counter', status: 'skipped', reason: halt }), true);
  assert.equal(istWache({ type: 'require_zone', status: 'skipped', reason: halt }), true);
  assert.equal(istWache({ type: 'require_marker', status: 'skipped', reason: 'a marker cannot be read (1 further step skipped)' }), true);
  assert.equal(istWache({ type: 'place_asset', status: 'skipped', reason: halt }), false);
  // Eine Wache ohne Halt (die Folge lief weiter) ist keine Auskunft über den Stand.
  assert.equal(istWache({ type: 'require_marker', status: 'skipped', reason: 'zone "X" not found' }), false);
  assert.equal(istWache({ type: 'require_marker', status: 'ok' }), false);
});

// ── EY / Spec M31.9, M31.13: der Rauchtest kennt die Dörflerzahl ─────────────────────────────────────────────
//
// Eingang: der Zielstand aus EX, **aus der Fixture** mit den Bausteinen aus `scripts/doerflerzahl-daten.mjs` gerechnet
// (nicht aus der Produktion). Vorher-Stand: der Stand nach EV, vor EW und EX; er gibt die Abschnitte 0 bis 2 von
// `EV-rauchtest-nachher.txt` (die Produktion vor EW/EX) wieder. Die Zahlen unten sind eine **unabhängige** Abschrift
// der Spec; BEW/LEB und die Endkampf-Zahlen liest der Test aus `SPALTEN` und `MESSUNG` (dort steht die Messung einmal).

import { createHash } from 'node:crypto';
const { seededRng } = await import('../../scripts/auslagen-daten.mjs');

const EYD = await import('../../scripts/doerflerzahl-daten.mjs');
const { laden, dorflerFaelle } = await import('../../scripts/auslagen-rauchtest.mjs');
const { SPALTEN, MESSUNG, zahlBei } = EYD;

const eyDzFx = JSON.parse(fs.readFileSync(new URL('./fixtures/doerflerzahl-kurzpartie.json', import.meta.url), 'utf8'));
const eyH12 = (t) => createHash('sha256').update(t).digest('hex').slice(0, 12);

/** Vor EW und EX (nach EV): die Produktion, wie `EV-rauchtest-nachher.txt` sie zeigt. */
const eyVor = {
  scenario: EYD.patchWerte(EYD.patchGelaende(JSON.parse(eyDzFx.scenario)).scenario).scenario,
  sequence: JSON.parse(eyDzFx.sequence),
  action: JSON.parse(eyDzFx.actions),
  zone: EYD.patchZonen(zones).zone,
  assets: EYD.patchAssets(assets).assets,
};
/** Der Zielstand nach EX, aus demselben Vorher-Stand gerechnet. */
const eyZiel = (() => {
  const action = EYD.patchAktionen(eyVor.action).action;
  const s = EYD.patchSchalter(eyVor.scenario, eyVor.sequence, { zone: eyVor.zone, assets: eyVor.assets, action });
  assert.equal(s.art, 'zu-schreiben', (s.probleme ?? []).join(' | '));
  return { scenario: s.scenario, sequence: s.sequence, action, zone: eyVor.zone, assets: eyVor.assets };
})();

/** Eine Wegwerf-Datenbank mit diesem Stand (das echte Schema); `fn(db)` läuft darauf, danach ist sie weg. */
function eyDb(z, fn) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'cge-ey-'));
  const file = path.join(tmp, 'ey.db');
  try {
    execFileSync(process.execPath, ['--input-type=module', '-e',
      'const { setupDatabase, closeDatabase } = await import("./src/database.js"); await setupDatabase(); closeDatabase();'],
    { cwd: new URL('..', import.meta.url), env: { ...process.env, CGE_DB_PATH: file }, stdio: 'pipe' });
    const db = new Database(file);
    db.prepare("insert into games (id, name) values (?, 'TFT')").run(GAME_ID);
    const cat = new Map();
    const catId = (name) => {
      if (!name) return null;
      if (!cat.has(name)) { cat.set(name, randomUUID()); db.prepare('insert into categories (id, game_id, name) values (?, ?, ?)').run(cat.get(name), GAME_ID, name); }
      return cat.get(name);
    };
    for (const a of z.assets) {
      db.prepare('insert into table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(a.id, GAME_ID, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category));
    }
    for (const c of cards) {
      db.prepare('insert into cards (id, game_id, category_id, name, image_path, width, height) values (?, ?, ?, ?, ?, ?, ?)')
        .run(c.id, GAME_ID, catId(c.category), c.name, c.image_path, c.width, c.height);
    }
    db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(SETUP_ID, GAME_ID, 'TFT Aufbau', JSON.stringify(state), JSON.stringify(z.zone), JSON.stringify(z.sequence),
        JSON.stringify(grids), JSON.stringify(z.action), JSON.stringify(z.scenario));
    try { return fn(db); } finally { db.close(); }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
/** Die Umgebung, die der Rauchtest selbst lädt (`laden`), je Stand zwischengespeichert. */
const eyUmgebungen = new Map();
const eyUmgebung = (z) => {
  if (!eyUmgebungen.has(z)) eyUmgebungen.set(z, eyDb(z, (db) => laden(db)));
  return eyUmgebungen.get(z);
};
const eyZielU = () => eyUmgebung(eyZiel);
const eyVorU = () => eyUmgebung(eyVor);
let eyFaelleCache;
const eyFaelle = () => (eyFaelleCache ??= dorflerFaelle(eyZielU()));

test('EY 0: der Zielstand aus der Fixture ist die Produktion nach EX – Länge und Hash aller vier Spalten', () => {
  const t = (x) => JSON.stringify(x);
  assert.deepEqual([t(eyZiel.scenario).length, eyH12(t(eyZiel.scenario))], [25284, '7368e504b85a']);
  assert.deepEqual([t(eyZiel.sequence).length, eyH12(t(eyZiel.sequence))], [2878, '712f93e99e1a']);
  assert.deepEqual([t(eyZiel.action).length, eyH12(t(eyZiel.action))], [7564, '9f41211076a4']);
  assert.deepEqual([t(eyZiel.zone).length, eyH12(t(eyZiel.zone))], [39886, 'efe0b0743364']);
});

test('EY 1 (Prüfpunkt 1): ein Gate `onlySeated` auf einem leeren Platz hinterlässt keine Zeile – auf einem besetzten Platz läuft der Schritt', () => {
  const u = eyZielU();
  const aufbau = bauen({ state: u.row.state_data, sequence: u.sequence, zones: u.zones, grids: u.grids, assets: u.assets, cards: u.cards, scenarioData: u.scenarioData }, {}, 1);
  const lauf = (gate) => executeSequenceWithLog(aufbau.state, [{ type: 'place_counter', name: 'Probe', value: '1', x: 10, y: 10, onlySeated: gate }],
    u.zones, { assets: u.assets, cards: u.cards, grids: u.grids, scenarioData: u.scenarioData });
  // Vorgabe zwei: Platz 3 ist leer. Kein Eintrag im Protokoll, kein Zähler – das ist richtig, kein Fehler.
  const leer = lauf(3);
  assert.deepEqual(leer.log, []);
  assert.equal(leer.state.counters.some(c => c.name === 'Probe'), false);
  // Platz 2 sitzt: der Schritt läuft.
  const da = lauf(2);
  assert.deepEqual(da.log.map(e => e.status), ['ok']);
  assert.equal(da.state.counters.some(c => c.name === 'Probe'), true);
});

test('EY 2: der Rauchtest auf dem Zielstand meldet nichts – 0 Beanstandungen', () => {
  const r = eyDb(eyZiel, (db) => rauchtest(db));
  assert.deepEqual(r.problems, [], r.problems.join('\n'));
  assert.match(r.out.join('\n'), /^Rauchtest: 0 Beanstandungen$/m);
});

test('EY 3: der Abschnitt 4 steht im Bericht – hinter Abschnitt 3, vor der Summe; fehlende Daten sind eine Beanstandung und zählen in der Summe', () => {
  const r = eyDb(eyZiel, (db) => rauchtest(db));
  const t = r.out.join('\n');
  const i3 = t.indexOf('\n3. Spielstände'), i4 = t.indexOf('\n4. Dörflerzahl'), iS = t.indexOf('\nRauchtest: ');
  assert.ok(i3 > 0 && i4 > i3 && iS > i4, `Reihenfolge 3 < 4 < Summe: ${i3} ${i4} ${iS}`);
  // Ohne Dörfler 5 im Schalter ist das ein Befund, kein Schweigen.
  const kaputt = { ...eyZiel, scenario: structuredClone(eyZiel.scenario) };
  delete kaputt.scenario.options.doerfler5;
  const r2 = eyDb(kaputt, (db) => rauchtest(db));
  assert.ok(r2.problems.some(p => /doerfler5|Dörfler 5/.test(p)), r2.problems.join('\n'));
  assert.match(r2.out.join('\n'), /^Rauchtest: [1-9]\d* Beanstandungen$/m);
});

test('EY 4 (a): Vorgabe zwei – zwei Dörfler, Münzen 30 (kurz) und 20 (lang), Dorfphase 28 Zeilen ohne Ausfall, Münzen +12', () => {
  const z = eyFaelle().zahlen;
  assert.equal(z.n[2].kurz.muenzen0, 30);
  assert.equal(z.n[2].lang.muenzen0, 20);
  assert.equal(z.n[2].kurz.dorfZeilen, 28);
  assert.equal(z.n[2].kurz.dorfNichtOk, 0);
  assert.equal(z.n[2].kurz.dorfPlus, 12);
  // Die Vorgabe ohne jede Dörfler-Wahl ist dieselbe Partie wie „zwei“.
  assert.equal(z.vorgabe.muenzen0, 30);
  assert.equal(z.vorgabe.dorfZeilen, 28);
});

test('EY 5 (b): doerfler3 Granny – der Tisch von vor M31: 45 Münzen (kurz), 30 (lang), Dorfphase 33 Zeilen, +18', () => {
  const z = eyFaelle().zahlen;
  assert.equal(z.n[3].kurz.muenzen0, 45);
  assert.equal(z.n[3].lang.muenzen0, 30);
  assert.equal(z.n[3].kurz.dorfZeilen, 33);
  assert.equal(z.n[3].kurz.dorfPlus, 18);
  assert.equal(z.n[3].kurz.dorfNichtOk, 0);
});

test('EY 6 (c): vier und fünf Dörfler – Münzen 60 / 75 (kurz), 40 / 50 (lang); Dorfphase 38 / 43 Zeilen; Münzen +24 / +30; Ereignis 1 + n Zeilen; n Figuren', () => {
  const z = eyFaelle().zahlen;
  assert.equal(z.n[4].kurz.muenzen0, 60); assert.equal(z.n[5].kurz.muenzen0, 75);
  assert.equal(z.n[4].lang.muenzen0, 40); assert.equal(z.n[5].lang.muenzen0, 50);
  assert.equal(z.n[4].kurz.dorfZeilen, 38); assert.equal(z.n[5].kurz.dorfZeilen, 43);
  assert.equal(z.n[4].kurz.dorfPlus, 24); assert.equal(z.n[5].kurz.dorfPlus, 30);
  for (const n of [2, 3, 4, 5]) {
    assert.equal(z.n[n].kurz.ereignisZeilen, 1 + n, `Dorf-Ereignis bei ${n}`);
    assert.equal(z.n[n].kurz.dorfNichtOk, 0, `Dorfphase bei ${n}: keine Zeile als skipped`);
    assert.equal(z.n[n].figuren, n, `Figuren auf dem Feld bei ${n}`);
  }
});

test('EY 7 (d): alle Bösewichte mit 2 / 3 / 4 / 5 Dörflern – BEW und LEB gleich der Spalte aus §5.5; Barry Bluff legt keinen Zahlen-Marker', () => {
  const z = eyFaelle().bosse;
  for (const name of Object.keys(SPALTEN)) for (const n of [2, 3, 4, 5]) {
    assert.deepEqual(z[name][n], { BEW: SPALTEN[name].BEW[n - 2], LEB: SPALTEN[name].LEB[n - 2] }, `${name} bei ${n}`);
  }
  // Barry Bluff trägt Formeln statt Zahlen: es gibt keinen Wert, den der Rauchtest messen könnte.
  for (const n of [2, 3, 4, 5]) assert.equal(z['Barry Bluff'][n], null, `Barry Bluff bei ${n}`);
  assert.equal(Object.keys(z).length, 20);
});

test('EY 8 (e): der Endkampf der acht gemessenen Bösewichte – 2 / 3 / 4 / 5 Plättchen bei Deputy, Pepin, Samuel; die festen Zahlen bei jeder Zahl', () => {
  const z = eyFaelle().endkampf;
  for (const name of Object.keys(MESSUNG)) for (const n of [2, 3, 4, 5]) {
    assert.equal(z[name][n], zahlBei(name, n), `${name} Endkampf bei ${n}`);
  }
  assert.deepEqual(['Deputy Waggums', 'Pepin Milkfrog', 'Samuel Strawman'].map(k => [2, 3, 4, 5].map(n => z[k][n])), [[2, 3, 4, 5], [2, 3, 4, 5], [2, 3, 4, 5]]);
  assert.deepEqual(['Virginia Fitz', 'Handsy', 'The Bundits', 'Tilda Fields', 'Umbrello'].map(k => z[k][5]), [5, 5, 1, 1, 1]);
});

test('EY 9 (g): die Wache mit zwei Dörflern – beide Lebensmarker weg hält mit Rückfrage ohne das Wort „drei“; einer liegt noch: sie läuft', () => {
  const w = eyFaelle().wache;
  assert.equal(w.zweiWeg.gehalten, true);
  assert.equal(w.zweiWeg.rueckfrage, true);
  assert.equal(w.zweiWeg.ohneDrei, true);
  assert.equal(w.einerWeg.gehalten, false);
});

test('EY 10 (h): die Doppelwahl – Judy / Judy / keiner und Judy / Judy / Granny: genau die erwarteten Zeilen, nichts anderes', () => {
  const d = eyFaelle().doppel;
  assert.deepEqual(d.keiner.aufbau, [[26, 'seat_villager', 'skipped']]);
  assert.deepEqual(d.keiner.kampf, [[5, 'build_scenario', 'failed'], [6, 'place_asset', 'skipped'], [7, 'place_asset', 'skipped'],
    [8, 'place_asset', 'skipped'], [9, 'place_asset', 'skipped'], [10, 'place_asset', 'skipped']]);
  assert.deepEqual(d.keiner.dorf, [[12, 'clear_table', 'skipped'], [27, 'place_asset', 'skipped'], [28, 'place_asset', 'skipped'], [29, 'place_asset', 'skipped'], [30, 'place_asset', 'skipped']]);
  assert.equal(d.keiner.muenzen, 21);
  assert.deepEqual(d.granny.aufbau, [[26, 'seat_villager', 'skipped']]);
  assert.deepEqual(d.granny.kampf, [[10, 'place_asset', 'skipped']]);
  assert.deepEqual(d.granny.dorf, [[12, 'clear_table', 'skipped'], [27, 'place_asset', 'skipped'], [28, 'place_asset', 'skipped'], [29, 'place_asset', 'skipped'], [30, 'place_asset', 'skipped']]);
  assert.equal(d.granny.muenzen, 42);
});

test('EY 11 (i): die „Wer ist dran?"-Leiste – bei n Dörflern liegen die Steine auf den Plätzen 1 … n; die Dorfphase dreht sie um eine Stelle; fünf passen', () => {
  const l = eyFaelle().leiste;
  for (const n of [2, 3, 4, 5]) {
    const { vor, nach } = l[n];
    const plaetze = Array.from({ length: n }, (_, i) => i + 1);
    assert.deepEqual([...nach.values()].sort((a, b) => a - b), plaetze, `Plätze nach der Dorfphase bei ${n}`);
    assert.deepEqual([...vor.values()].sort((a, b) => a - b), plaetze, `Plätze davor bei ${n}`);
    for (const [name, p] of vor) assert.equal(nach.get(name), ((p - 2 + n) % n) + 1, `${name}: eine Stelle weiter bei ${n}`);
  }
});

test('EY 12 (Prüfpunkt 3): die Abschnitte 0 bis 2 – Zeile für Zeile wie vor M31 (drei Dörfler, Granny); nur die Kopfzeile ändert sich', () => {
  const alt = eyDb(eyVor, (db) => rauchtest(db).out.join('\n'));
  const neu = eyDb(eyZiel, (db) => rauchtest(db).out.join('\n'));
  const abschnitte = (t) => t.slice(t.indexOf('\n0. '), t.indexOf('\n3. Spielstände'));
  assert.equal(abschnitte(neu), abschnitte(alt));
});

test('EY 13 (b, Zeilenfolge): Aufbau, Kampf, Dorfphase und Ereignis mit Granny – dieselben Zeilen wie vor M31 (Index, Ziel der Wache und Zahl der übersprungenen Schritte ausgenommen)', () => {
  const laufen = (u, choices) => {
    const r = bauen({ state: u.row.state_data, sequence: u.sequence, zones: u.zones, grids: u.grids, assets: u.assets, cards: u.cards, scenarioData: u.scenarioData }, choices, 3);
    const lauf = (id, st) => executeSequenceWithLog(st, u.actions.find(a => a.id === id).steps, u.zones, { assets: u.assets, cards: u.cards, grids: u.grids, scenarioData: u.scenarioData, rng: seededRng(7) });
    const muenzen = (st) => st.counters.find(c => c.name === 'Münzen (gemeinsam)')?.value;
    const zeilen = (log) => log.map(e => [e.type, e.status, e.type === 'require_marker' ? null : (e.reason ?? '').replace(/\s*\(\d+ further steps? skipped\)/, '')]);
    const k = lauf('kampf-beginnen', r.state), d = lauf('dorfphase-beginnen', k.state), e = lauf('dorfereignis', d.state);
    return { aufbau: zeilen(r.log), kampf: zeilen(k.log), dorf: zeilen(d.log), ereignis: zeilen(e.log), muenzen: [muenzen(r.state), muenzen(d.state)] };
  };
  const wahl = { partie: 'kurz', troedel: 'mit', doerfler3: 'Granny' };
  const vorher = laufen(eyVorU(), wahl);
  const nachher = laufen(eyZielU(), wahl);
  assert.deepEqual(nachher.muenzen, [45, 63]);
  assert.deepEqual(nachher.aufbau, vorher.aufbau);
  assert.deepEqual(nachher.kampf, vorher.kampf);
  assert.deepEqual(nachher.dorf, vorher.dorf);
  assert.deepEqual(nachher.ereignis, vorher.ereignis);
});

test('EY 14: die Prüfung der Prüfung – fünf eingebaute Fehler im Zielstand, und der Abschnitt 4 nennt jeden beim Namen', () => {
  const kopie = () => structuredClone(eyZiel);
  const fehler = {
    // A: die Münzen je Dörfler falsch (16 statt 15): der Aufbau mit zwei Dörflern hat 32 statt 30.
    muenzen: (z) => { z.scenario.options.partie.choices.kurz.vars.MuenzenJeDoerfler = '16'; },
    // B: ein Plättchen erscheint eine Dörflerzahl zu spät (FF3 ab vier statt drei): Deputy legt bei drei nur zwei.
    endkampf: (z) => { z.scenario.bosses['Deputy Waggums'].final.terrain.find(t => t.fromCount === 3).fromCount = 4; },
    // C: ein BEW-Wert im Spalten-Eintrag falsch: Virginia bei vier Dörflern.
    werte: (z) => { z.scenario.bosses['Virginia Fitz'].statsByCount['4'].BEW = 99; },
    // D: die Wache fragt nicht mehr zurück (kein `confirm`).
    wache: (z) => {
      const dorf = z.action.find(a => a.id === 'dorfphase-beginnen');
      const w = dorf.steps.find(s => s.type === 'require_marker');
      delete w.confirm;
    },
    // E: die Dorfphase hat einen Schritt zu viel, der nicht läuft: die Doppelwahl bekommt eine Zeile, die sie nicht erwartet.
    doppel: (z) => {
      const dorf = z.action.find(a => a.id === 'dorfphase-beginnen');
      dorf.steps.push({ type: 'place_asset', assetName: 'Gibt es nicht', targetZoneLabel: 'Bösewicht-Tableau' });
    },
  };
  const erwartet = {
    muenzen: /Münzen im Aufbau 32, erwartet 30/,
    endkampf: /Deputy Waggums, Endkampf bei 3 Dörflern: 2 Plättchen, erwartet 3/,
    werte: /Virginia Fitz, 4 Dörfler: BEW null \/ LEB 18, erwartet 6 \/ 18/,
    wache: /Wache, zwei Dörfler/,
    doppel: /Doppelwahl Judy\/Judy\/keiner: andere Zeilen als erwartet/,
  };
  for (const [name, falsch] of Object.entries(fehler)) {
    const z = kopie();
    falsch(z);
    const r = eyDb(z, (db) => rauchtest(db));
    const treffer = r.problems.filter(p => erwartet[name].test(p));
    assert.ok(treffer.length >= 1, `Fehler ${name}: der Abschnitt 4 nennt ihn nicht – Beanstandungen: ${r.problems.join(' | ').slice(0, 600)}`);
    assert.match(r.out.join('\n'), /^Rauchtest: [1-9]\d* Beanstandungen$/m, `Fehler ${name}: die Summe zählt ihn nicht`);
  }
});
