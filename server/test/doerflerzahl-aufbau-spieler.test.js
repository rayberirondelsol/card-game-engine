// FH Teil 1 / Spec M31.15, M31.16, M31.17 — die Option `spieler`, der Schalter der Welle: `scripts/doerflerzahl-daten.mjs`, Schritt `aufbau-spieler`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Zu schreiben (später, Teil 2) ist in **zwei** Spalten, auf dem Stand von Welle 1 (`scenario_data` 25 284, `sequence_data` 2 878):
//   scenario_data  `options.spieler` (hinter `troedel`, vor `doerfler1`: Wahlen `s1` … `s5`, Vorgabe `s1`) und `villagers.lage = { players: "spieler", seats: [doerfler1 … doerfler5] }`;
//   sequence_data  31 → 42 Schritte: der Ereignis-Stapel bekommt `onlyLage ["solo","mehrfach"]`, **direkt dahinter** ein zweiter `place_stack` mit der dritten Kategorie
//                  (`onlyLage "normal"`); die Auslage (6 Heldentaten) und der gemeinsame Topf bekommen `onlyLage "solo"`; **ans Ende** fünf Hand-Austeilungen und fünf Töpfe
//                  `Münzen Dörfler n` (`onlyLage ["mehrfach","normal"]`, für 3 bis 5 `onlySeated`).
//
// **Wo diese Datei von der Aufgabe abweicht (vom Auftraggeber entschieden):** (1) sie ist **neu**, die Aufgabe nannte `doerflerzahl-daten.test.js`; (2) die Wahlen heißen `s1` … `s5`
// (Berichtigung aus `FA`), der Roundtrip also `?opt=spieler:s2`; (3) Nr. 12 („disjunkt zu allen anderen Schritten“) heißt hier wörtlich: **dieser Schritt rührt nur `scenario_data` und
// `sequence_data` an** — `zone_data`, `action_data`, `table_assets` und alles andere bleiben unberührt; (4) die große Probe „für jede Kombination stimmen Aufbau und Aktion überein“
// ist `FI` Nr. 2 und steht hier **nicht**; hier steht die Kette Aufbau → `kampf-beginnen` → `dorfphase-beginnen` je Lage ohne diese Probe.
//
// Eingang ist der Stand, auf dem `FH` aufsetzt: **alle Schritte von Welle 1** aus `fixtures/doerflerzahl-kurzpartie.json` gerechnet (`ES`, `ET`, `EU`, `EV`, `EW`, `EX`), dazu `FF` (die Hände
// fassen vier) und `FG` (die Aktionen der Spielerachse). Der Zielstand steht hier **ein zweites Mal ausgeschrieben** (`orakelScenario`, `orakelSequenz`, `hand`, `topf`): aus der Aufgabe,
// nicht aus dem Baustein gelesen. Die Länge und der Hash des Ziels stehen **einmal** im Skript (`SCHRITTE`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import * as dz from '../../scripts/doerflerzahl-daten.mjs';
import * as ez from '../../scripts/equipment-zones.mjs';
import { bauen, seededRng } from '../../scripts/auslagen-daten.mjs';
import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { zoneContains, ZONE_LABEL_HEIGHT, ZONE_LABEL_WIDTH } from '../../shared/zoneGeometry.js';
import { validateOptions, resolveChoices } from '../../shared/setupOptions.js';
import { validateScenarioData } from '../../shared/scenarioData.js';
import { lageOf, validateVillagers, seatedVillagers } from '../../shared/villagers.js';

const { default: Database } = await import('better-sqlite3');
const { validateStep, assetNames, assetPools } = await import('../../client/src/utils/sequenceSteps.js');
const { choicesFromSearch, formatChoices } = await import('../../client/src/utils/setupChoices.js');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const auszug = lies('auslagen-kurzpartie.json');
const dzFixture = lies('doerflerzahl-kurzpartie.json');
const { assets, cards, zones, grids, state } = auszug;
const { SETUP_ID, GAME_ID } = dz;

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const frost = (x) => { Object.values(x).forEach(v => { if (v && typeof v === 'object') frost(v); }); return Object.freeze(x); };

// ── Der Eingang: Welle 1, FF, FG ─────────────────────────────────────────────

const EU = frost(dz.patchZonen(zones).zone);                       // 82 Zonen, die Hände mit capacity 3
const FF = frost(dz.patchHaende(EU).zone);                         // die Hände fassen vier
const ASSETS = dz.patchAssets(assets).assets;                      // EV
const AKT_ALT = JSON.parse(dzFixture.actions);                     // der Stand nach M30
const W1ACT = frost(dz.patchAktionen(AKT_ALT).action);             // EW
const FG = frost(dz.patchAktionenSpieler(W1ACT).action);           // FG
const SC_PROD = dz.patchWerte(dz.patchGelaende(JSON.parse(dzFixture.scenario)).scenario).scenario;   // ES, ET
const WELLE1 = dz.patchSchalter(SC_PROD, JSON.parse(dzFixture.sequence), { zone: EU, assets: ASSETS, action: W1ACT });   // EX
const SC1 = frost(copy(WELLE1.scenario));                          // scenario_data 25 284 / 7368e504b85a
const SQ1 = frost(copy(WELLE1.sequence));                          // sequence_data 2 878 / 712f93e99e1a (31 Schritte)
const VORG = { zone: FF, assets: ASSETS, action: FG };

/** Der Zielstand, aus dem Eingang gerechnet — ein Aufruf je Test, damit ein fehlender Baustein nur den Test rot macht. */
const ziel = () => {
  const r = dz.patchSpieler(SC1, SQ1, VORG);
  assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  return { scenario: copy(r.scenario), sequence: copy(r.sequence) };
};

// ── Das Orakel: die Stücke, ausgeschrieben (Schlüsselfolge wie in der Aufgabe) ──

const SPIELER = { label: 'Spieler', default: 's1', choices: { s1: { label: '1 Spieler (Solo)' }, s2: { label: '2 Spieler' }, s3: { label: '3 Spieler' }, s4: { label: '4 Spieler' }, s5: { label: '5 Spieler' } } };
const LAGE = { players: 'spieler', seats: ['doerfler1', 'doerfler2', 'doerfler3', 'doerfler4', 'doerfler5'] };
const GEHEIM = 'Dorf-Ereignisse (geheim)';
const MEHR = ['mehrfach', 'normal'];
const platz = (n) => (n >= 3 ? { onlySeated: n } : {});
const hand = (n) => ({ type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 3, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: true, ...platz(n), onlyLage: MEHR });
const TOPF_X = [278, 858, 1438, 2018, 2598];
const topf = (n) => ({ type: 'place_counter', name: `Münzen Dörfler ${n}`, value: '$optMuenzenJeDoerfler', x: TOPF_X[n - 1], y: 1870, ...platz(n), onlyLage: MEHR });

/** `options.spieler` zwischen `troedel` und `doerfler1`, `villagers.lage` **hinten**; alles andere dieselbe Zeile. */
const orakelScenario = (sc) => {
  const o = {};
  for (const [k, v] of Object.entries(sc.options)) { o[k] = v; if (k === 'troedel') o.spieler = SPIELER; }
  return { ...sc, options: o, villagers: { ...sc.villagers, lage: LAGE } };
};
const orakelSequenz = (w) => [
  w[0],
  { ...w[1], onlyLage: ['solo', 'mehrfach'] },
  { ...w[1], category: [...w[1].category, GEHEIM], onlyLage: 'normal' },
  ...w.slice(2, 24),
  { ...w[24], onlyLage: 'solo' },
  ...w.slice(25, 30),
  { ...w[30], onlyLage: 'solo' },
  ...[1, 2, 3, 4, 5].map(hand),
  ...[1, 2, 3, 4, 5].map(topf),
];

// ── Der Tisch ─────────────────────────────────────────────────────────────────

/** Wie `ohneIds` aus `auslagen-daten.mjs`, aber auch ohne `inStack`/`card_ids`: zwei getrennte Aufbauten würfeln dort verschiedene Ids. */
function ohneIds(v) {
  if (Array.isArray(v)) return v.map(ohneIds);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !['id', 'tableId', 'stackId', 'table_ids', 'card_ids', 'inStack'].includes(k)).map(([k, x]) => [k, ohneIds(x)]));
  return v;
}
const WAHL = (n) => ({ ...(n >= 3 ? { doerfler3: 'Granny' } : {}), ...(n >= 4 ? { doerfler4: 'Blopsy' } : {}), ...(n >= 5 ? { doerfler5: 'Yancy' } : {}) });
const env = (z, zonen = FF) => ({ state, sequence: z.sequence, zones: zonen, grids, assets: ASSETS, cards, scenarioData: z.scenario });
/** Der Tisch von Welle 1 (ohne die Option `spieler`). */
const tischW1 = (choices, seed = 1) => bauen(env({ sequence: SQ1, scenario: SC1 }, EU), choices, seed);
/** Der Tisch nach FH. */
const tisch = (choices, seed = 1) => bauen(env(ziel()), choices, seed);
const lauf = (zonen, steps, st, scenario) => executeSequenceWithLog(copy(st), steps, zonen, { assets: ASSETS, cards, grids, scenarioData: scenario, rng: seededRng(7) });
const aktion = (id, st, acts = FG, zonen = FF, scenario = ziel().scenario) => lauf(zonen, acts.find(a => a.id === id).steps, st, scenario);
const aufgeloest = (zonen, st) => resolveZones(zonen, anchorBoxes(st.boards, st.tokens));
const zoneNamed = (zonen, st, label) => aufgeloest(zonen, st).find(z => z.label === label);
const inZone = (st, label, zonen = FF) => st.cards.filter(c => zoneContains(zoneNamed(zonen, st, label), c.x, c.y));
const inHand = (st, n) => inZone(st, `Hand Dörfler ${n}`);
const zaehler = (st, name) => st.counters.find(c => c.name === name);
const stapel = (st, label) => st.stacks.find(s => s.label === label)?.cards.length;
const schlecht = (r) => r.log.filter(e => e.status !== 'ok');
const zeilen = (r) => r.log.map(e => [e.type, e.target, e.status, e.reason]);
const kat = (c) => c.category;
/** Die Wahl `S` Spieler, `D` Dörfler (Platz 3 … D mit Granny, Blopsy, Yancy), Spiellänge kurz. */
const wahl = (S, D, extra = {}) => ({ spieler: `s${S}`, ...WAHL(D), ...extra });
const HELDEN_GESAMT = 75;

// ─────────────────────────────────────────────────────────────────────────────
// 1  Der Zielstand — genau diese Stücke, alles andere byteweise gleich
// ─────────────────────────────────────────────────────────────────────────────

test('FH 1: der Eingang – nach Welle 1 `scenario_data` 25 284 / 7368e504b85a, `sequence_data` 2 878 / 712f93e99e1a (31 Schritte), die Hände fassen vier, die Aktionen tragen die Spielerachse', () => {
  assert.deepEqual([text(SC1).length, sha(text(SC1))], [25284, '7368e504b85a']);
  assert.deepEqual([text(SQ1).length, sha(text(SQ1))], [2878, '712f93e99e1a']);
  assert.equal(SQ1.length, 31);
  assert.equal(FF.filter(z => /^Hand Dörfler/.test(z.label)).every(z => z.capacity === 4), true);
  assert.equal(FG.find(a => a.id === 'dorfphase-beginnen').steps.length, 53);
  assert.deepEqual(Object.keys(SC1.options), ['partie', 'troedel', 'doerfler1', 'doerfler2', 'doerfler3', 'doerfler4', 'doerfler5']);
  assert.deepEqual(Object.keys(SC1.villagers), ['fightZone', 'barZone', 'seats', 'roster', 'baseCount']);
  assert.equal(SC1.options.spieler, undefined);
  assert.equal(SC1.villagers.lage, undefined);
});

test('FH 1: Zielstand – die Option `spieler`, `villagers.lage` und 42 Schritte, **alles andere** byteweise gleich; geschrieben werden `scenario_data` und `sequence_data`, sonst nichts', () => {
  const r = dz.patchSpieler(SC1, SQ1, VORG);
  assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  assert.deepEqual(Object.keys(r).sort(), ['art', 'scenario', 'sequence'], 'zwei Spalten, sonst nichts');
  assert.equal(text(r.scenario), text(orakelScenario(SC1)), 'scenario_data: genau das Orakel');
  assert.equal(text(r.sequence), text(orakelSequenz(SQ1)), 'sequence_data: genau das Orakel');
  assert.equal(r.sequence.length, 42);
  // Die Reihenfolge der Schlüssel ist gepinnt (M30: sie ist die Reihenfolge im Dialog).
  assert.deepEqual(Object.keys(r.scenario.options), ['partie', 'troedel', 'spieler', 'doerfler1', 'doerfler2', 'doerfler3', 'doerfler4', 'doerfler5']);
  assert.deepEqual(Object.keys(r.scenario.villagers), ['fightZone', 'barZone', 'seats', 'roster', 'baseCount', 'lage']);
  assert.deepEqual(Object.keys(r.scenario), Object.keys(SC1), 'dieselben Schlüssel von scenario_data');
  assert.deepEqual(Object.keys(r.scenario.options.spieler), ['label', 'default', 'choices']);
  assert.deepEqual(Object.keys(r.scenario.options.spieler.choices), ['s1', 's2', 's3', 's4', 's5']);
  assert.equal(r.scenario.options.spieler.default, 's1');
  // Was nicht zum Schalter gehört, ist dieselbe Zeile wie in Welle 1:
  for (const k of Object.keys(SC1).filter(x => x !== 'options' && x !== 'villagers')) assert.equal(text(r.scenario[k]), text(SC1[k]), `scenario_data.${k}`);
  for (const k of Object.keys(SC1.options)) assert.equal(text(r.scenario.options[k]), text(SC1.options[k]), `options.${k}`);
  for (const k of Object.keys(SC1.villagers)) assert.equal(text(r.scenario.villagers[k]), text(SC1.villagers[k]), `villagers.${k}`);
});

test('FH 1: die Folge – 31 → 42; die ersten 24 Schritte bis auf Nr. 1 und den neuen Nr. 2 verschoben um eins; alle `seat_villager` stehen **vor** den fünf Händen und den fünf Töpfen', () => {
  const s = ziel().sequence;
  assert.deepEqual(s.slice(0, 1), SQ1.slice(0, 1));
  assert.equal(s[1].type, 'place_stack'); assert.equal(s[2].type, 'place_stack');
  assert.equal(text(s.slice(3, 25)), text(SQ1.slice(2, 24)), 'Nr. 2 … 23 stehen um eins weiter hinten, byteweise gleich');
  assert.equal(text(s.slice(26, 31)), text(SQ1.slice(25, 30)), 'die fünf seat_villager: 25–29 → 26–30');
  assert.deepEqual(s.map((x, i) => (x.type === 'seat_villager' ? i : null)).filter(i => i !== null), [26, 27, 28, 29, 30]);
  assert.equal(s[31].name, 'Münzen (gemeinsam)');
  assert.deepEqual(s.slice(32, 37).map(x => x.targetZoneLabel), [1, 2, 3, 4, 5].map(n => `Hand Dörfler ${n}`), 'erst die Hände 1 … 5');
  assert.deepEqual(s.slice(37).map(x => x.name), [1, 2, 3, 4, 5].map(n => `Münzen Dörfler ${n}`), 'dann die Töpfe 1 … 5');
});

test('FH 1: Schritt 24 und der gemeinsame Topf bekommen **nur** `onlyLage "solo"` — sonst sind sie byteweise dieselbe Zeile', () => {
  const s = ziel().sequence;
  const { onlyLage: g1, ...ohne1 } = s[25]; const { onlyLage: g2, ...ohne2 } = s[31];
  assert.equal(g1, 'solo'); assert.equal(g2, 'solo');
  assert.equal(text(ohne1), text(SQ1[24])); assert.equal(text(ohne2), text(SQ1[30]));
  assert.equal(text(Object.keys(s[25])), text([...Object.keys(SQ1[24]), 'onlyLage']), 'das Gate steht am Ende');
});

test('FH 1: die Konstanten – Ausgang ist der Zielstand von `optionen` (dieselbe Zahl, keine zweite Abschrift), Ziel ist gerechnet; **beide** Spalten', () => {
  const s = dz.SCHRITTE['aufbau-spieler'];
  assert.ok(s, 'SCHRITTE[\'aufbau-spieler\'] ist eingetragen');
  assert.deepEqual(Object.keys(s.ausgang), ['scenario', 'sequence']);
  assert.deepEqual(Object.keys(s.ziel), ['scenario', 'sequence']);
  assert.deepEqual(s.ausgang, dz.SCHRITTE.optionen.ziel);
  assert.deepEqual(s.ausgang.scenario, { laenge: 25284, sha: '7368e504b85a' });
  assert.deepEqual(s.ausgang.sequence, { laenge: 2878, sha: '712f93e99e1a' });
  const z = ziel();
  assert.deepEqual(s.ziel.scenario, { laenge: text(z.scenario).length, sha: sha(text(z.scenario)) });
  assert.deepEqual(s.ziel.sequence, { laenge: text(z.sequence).length, sha: sha(text(z.sequence)) });
  console.log(`FH Bauprotokoll: scenario_data ${s.ausgang.scenario.laenge} / ${s.ausgang.scenario.sha} -> ${s.ziel.scenario.laenge} / ${s.ziel.scenario.sha}; sequence_data ${s.ausgang.sequence.laenge} / ${s.ausgang.sequence.sha} -> ${s.ziel.sequence.laenge} / ${s.ziel.sequence.sha}`);
});

test('FH 1: Rückwärtsbeweis – ohne `spieler`, `lage`, die zehn neuen Schritte, den zweiten Ereignis-Stapel und die vier Gates ergibt den gelesenen Text, Zeichen für Zeichen (von Hand, unabhängig vom Baustein)', () => {
  const z = ziel();
  assert.deepEqual(dz.beweiseSpieler({ scenario: SC1, sequence: SQ1 }, z, VORG), []);
  const sc = copy(z.scenario); delete sc.options.spieler; delete sc.villagers.lage;
  assert.equal(text(sc), text(SC1));
  const q = copy(z.sequence).filter((s, i) => !(i === 2 || i >= 32)).map(({ onlyLage: _g, ...rest }) => rest);
  assert.equal(text(q), text(SQ1));
});

test('FH 1: der Beweis fängt, was nicht stimmt – ein falsches Gate, ein falscher Topfwert, eine fehlende Hand, eine falsche Kategorie, ein verschobener Platz, `lage` mit anderen Optionen', () => {
  const fehler = (fn) => { const z = ziel(); fn(z); return dz.beweiseSpieler({ scenario: SC1, sequence: SQ1 }, z, VORG); };
  assert.ok(fehler(z => { z.sequence[25].onlyLage = 'normal'; }).length > 0, 'falsches Gate an der Auslage');
  assert.ok(fehler(z => { z.sequence[38].value = '$optMuenzen'; }).length > 0, 'falscher Wert');
  assert.ok(fehler(z => { z.sequence.splice(34, 1); }).length > 0, 'eine Hand fehlt');
  assert.ok(fehler(z => { z.sequence[2].category = z.sequence[1].category; }).length > 0, 'zweite Kategorieliste ohne die dritte');
  assert.ok(fehler(z => { z.sequence[41].x = 2599; }).length > 0, 'ein Topf auf dem falschen Platz');
  assert.ok(fehler(z => { z.scenario.villagers.lage.seats.pop(); }).length > 0, 'lage mit vier Plätzen');
  assert.ok(fehler(z => { z.scenario.options.spieler.default = 's2'; }).length > 0, 'Vorgabe s2');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2  Prüfer — validateOptions, validateScenarioData, validateVillagers, lageOf für jede Kombination
// ─────────────────────────────────────────────────────────────────────────────

test('FH 2: `validateOptions` (Folge **und** Aktionen) → `[]`; `validateScenarioData` und `validateVillagers` → keine Probleme; `validateStep` auf jedem der 42 Schritte; der Prüfer des Skripts sagt dasselbe', () => {
  const z = ziel();
  assert.deepEqual(validateOptions(z.scenario.options, z.sequence, FG), []);
  assert.deepEqual(validateScenarioData(z.scenario), []);
  assert.deepEqual(validateVillagers(z.scenario.villagers, { assets: ASSETS, zones: FF }), []);
  const ctx = {
    stackLabels: ['Dorf-Ereignisse', 'Heldentaten', 'Nachschub (Tante Emma)', 'Rollen'], zoneLabels: FF.map(x => x.label), pools: assetPools(ASSETS),
    assetNames: assetNames(ASSETS), grids, cardCategories: [...new Set(cards.map(c => c.category).filter(Boolean))], cards, options: z.scenario.options, inAction: false,
  };
  z.sequence.forEach((s, i) => assert.deepEqual(validateStep(s, ctx), [], `Schritt ${i}: ${text(s)}`));
  assert.deepEqual(dz.pruefeSpieler(z.scenario, z.sequence, VORG), []);
  // … und er findet, was falsch ist.
  const mit = (fn) => { const c = ziel(); fn(c); return dz.pruefeSpieler(c.scenario, c.sequence, VORG); };
  assert.ok(mit(c => { c.sequence[25].onlyLage = 'duo'; }).length > 0, 'onlyLage unbekannt');
  assert.ok(mit(c => { c.scenario.options.spieler.choices.s2.label = ''; }).length >= 0);
  assert.ok(mit(c => { c.scenario.options.spieler.choices = { eins: { label: '1' }, zwei: { label: '2' } }; c.scenario.options.spieler.default = 'eins'; }).length > 0, 'Wahlen ohne Ziffer am Ende: lageOf meldet es');
  assert.ok(mit(c => { c.scenario.villagers.lage.seats = ['doerfler1', 'doerfler2']; }).length > 0, 'lage ohne die Plätze 3 bis 5');
  assert.ok(mit(c => { c.sequence.splice(37, 1); }).length > 0, 'ein Topf fehlt');
});

test('FH 2: **`lageOf` ist für JEDE Kombination `spieler` × `doerfler3–5` bestimmt** (kein `null`, wo Daten da sind): 5 × 8 = 40 Fälle, `solo` / `mehrfach` / `normal` oder ein Problem bei `S > D`; die Wahlen kommen durch `resolveChoices`', () => {
  const sc = ziel().scenario;
  const NAME = { 3: 'Granny', 4: 'Blopsy', 5: 'Yancy' };
  let n = 0;
  for (let S = 1; S <= 5; S++) {
    for (let m = 0; m < 8; m++) {
      const an = [3, 4, 5].filter((_, i) => m & (1 << i));
      const choices = { spieler: `s${S}`, ...Object.fromEntries([3, 4, 5].map(p => [`doerfler${p}`, an.includes(p) ? NAME[p] : 'keiner'])) };
      const wo = `S ${S}, Plätze ${an.join(',') || '-'}`;
      const r = resolveChoices(sc.options, choices);
      assert.deepEqual(r.problems, [], `${wo}: die Wahl gilt`);
      const lage = lageOf(sc, r.choices);
      assert.notEqual(lage, null, `${wo}: lageOf ist nicht null`);
      const D = 2 + an.length;
      assert.equal(lage.villagers, D, wo); assert.equal(lage.players, S, wo);
      if (S <= D) {
        assert.deepEqual(lage.problems, [], wo);
        assert.equal(lage.kind, S === 1 ? 'solo' : S === D ? 'normal' : 'mehrfach', wo);
      } else {
        assert.equal(lage.kind, null, wo);
        assert.ok(lage.problems.length > 0 && lage.problems[0].includes(`${S} Spieler, aber nur ${D} Dörfler`), `${wo}: ${lage.problems}`);
      }
      n++;
    }
  }
  assert.equal(n, 40);
  // Die Vorgabe (keine Wahl): ein Spieler, zwei Dörfler → solo.
  assert.equal(lageOf(sc, resolveChoices(sc.options, {}).choices).kind, 'solo');
  // Die Daten von Welle 1 (ohne `lage`) → null, kein Problem: Welle 1 bleibt, wie sie ist.
  assert.equal(lageOf(SC1, {}), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3  Vorbedingung je Stück, Abbruch mit Pfad
// ─────────────────────────────────────────────────────────────────────────────

const abweichend = (sc, sq, v = VORG) => {
  const r = dz.patchSpieler(sc, sq, v);
  assert.equal(r.art, 'abweichend', `erwartet abweichend, ist ${r.art}`);
  assert.equal(r.scenario, undefined, 'bei einer Abweichung gibt es keinen Zielstand');
  assert.equal(r.sequence, undefined);
  assert.ok(Array.isArray(r.probleme) && r.probleme.length > 0);
  return r.probleme.join('\n');
};

test('FH 3: der Ausgang (Welle 1, FF, FG) → zu schreiben; schon im Ziel → „schon-da“, die Eingabe kommt als Kopie zurück und wird nicht verändert', () => {
  assert.equal(dz.patchSpieler(SC1, SQ1, VORG).art, 'zu-schreiben');
  const z = ziel(), vorher = text(z);
  const r = dz.patchSpieler(z.scenario, z.sequence, VORG);
  assert.equal(r.art, 'schon-da', (r.probleme ?? []).join('\n'));
  assert.equal(text(r.scenario), text(z.scenario)); assert.equal(text(r.sequence), text(z.sequence));
  assert.notEqual(r.scenario, z.scenario, 'eine Kopie');
  assert.equal(text(z), vorher, 'Eingabe unverändert');
});

test('FH 3: **FF und FG müssen geschrieben sein** (der Baustein prüft sie vor dem ersten Byte) – Hände mit capacity 3, Aktionen ohne die Spielerachse, beides, und Welle 1 selbst (EX noch nicht) ist kein Ausgang', () => {
  assert.match(abweichend(SC1, SQ1, { ...VORG, zone: EU }), /haende|FF/);
  assert.match(abweichend(SC1, SQ1, { ...VORG, action: W1ACT }), /aktionen-spieler|FG/);
  const beide = abweichend(SC1, SQ1, { ...VORG, zone: EU, action: W1ACT });
  assert.match(beide, /haende|FF/); assert.match(beide, /aktionen-spieler|FG/);
  assert.match(abweichend(SC1, SQ1, { ...VORG, action: AKT_ALT }), /action_data/);
  // EX noch nicht geschrieben: der Stand nach M30 (29 Schritte, drei Plätze)
  const m = abweichend(JSON.parse(dzFixture.scenario), JSON.parse(dzFixture.sequence));
  assert.match(m, /options|Schritte|optionen|EX/, m);
  assert.match(abweichend(SC1, SQ1, { zone: undefined, action: undefined, assets: undefined }), /zone_data|action_data/);
  assert.match(abweichend(SC1, SQ1, null), /zone_data|action_data|Voraussetzung/);
});

test('FH 3: Abbruch mit Pfad – jedes Stück einzeln verändert (Optionen, `lage`, Ereignis-Stapel, Auslage, Topf, Hände): die Meldung nennt die Spalte, den Pfad und das Stück', () => {
  const faelle = [
    ['scenario', (z) => { z.scenario.options.spieler.default = 's2'; }, /options\.spieler/],
    ['scenario', (z) => { z.scenario.options.spieler.choices.s3.label = '3'; }, /options\.spieler/],
    ['scenario', (z) => { delete z.scenario.options.spieler.choices.s5; }, /options\.spieler/],
    ['scenario', (z) => { z.scenario.villagers.lage.seats = ['doerfler1']; }, /villagers\.lage/],
    ['scenario', (z) => { z.scenario.villagers.lage.players = 'spielerzahl'; }, /villagers\.lage/],
    ['sequence', (z) => { z.sequence[1].onlyLage = 'solo'; }, /sequence_data\[1\]/],
    ['sequence', (z) => { z.sequence[2].onlyLage = ['normal']; }, /sequence_data\[2\]/],
    ['sequence', (z) => { z.sequence[2].category = ['Dorf-Ereignisse', GEHEIM]; }, /sequence_data\[2\]/],
    ['sequence', (z) => { z.sequence[25].onlyLage = ['solo']; }, /sequence_data\[25\]/],
    ['sequence', (z) => { z.sequence[31].onlyLage = 'mehrfach'; }, /sequence_data\[31\]/],
    ['sequence', (z) => { z.sequence[34].onlySeated = 4; }, /sequence_data\[34\]/],
    ['sequence', (z) => { z.sequence[34].count = 4; }, /sequence_data\[34\]/],
    ['sequence', (z) => { z.sequence[36].faceDown = false; }, /sequence_data\[36\]/],
    ['sequence', (z) => { z.sequence[37].onlySeated = 1; }, /sequence_data\[37\]/],
    ['sequence', (z) => { z.sequence[39].y = 1871; }, /sequence_data\[39\]/],
    ['sequence', (z) => { z.sequence[41].value = '15'; }, /sequence_data\[41\]/],
  ];
  for (const [spalte, fn, pfad] of faelle) {
    const z = ziel(); fn(z);
    const m = abweichend(z.scenario, z.sequence);
    assert.match(m, spalte === 'scenario' ? /scenario_data/ : /sequence_data/);
    assert.match(m, pfad, `${text(fn.toString()).slice(0, 60)}: ${m}`);
  }
});

test('FH 3: Abbruch – Welle 1 ist nicht, wie gebaut: die Zahl der Schritte stimmt nicht (30, 43), ein `seat_villager` fehlt, ein fremder Schritt steht mitten drin, die Reihenfolge Töpfe vor Hände, `options` mit anderer Schlüsselfolge', () => {
  const z = ziel();
  const mitSeq = (fn) => { const c = ziel(); fn(c.sequence); return c; };
  assert.match(abweichend(z.scenario, mitSeq(s => { s.pop(); }).sequence), /42|Schritte/);
  assert.match(abweichend(z.scenario, mitSeq(s => { s.push({ ...s[0] }); }).sequence), /42|Schritte/);
  assert.match(abweichend(SC1, SQ1.slice(0, 30)), /Schritte|sequence_data/);
  assert.match(abweichend(SC1, [...SQ1, { type: 'shuffle', stackLabel: 'Heldentaten' }]), /Schritte|sequence_data/);
  assert.match(abweichend(z.scenario, mitSeq(s => { s.splice(27, 1); }).sequence), /sequence_data/);
  assert.match(abweichend(z.scenario, mitSeq(s => { const t = s.splice(37, 5); s.splice(32, 0, ...t); }).sequence), /sequence_data/, 'Töpfe vor den Händen');
  const o = copy(z.scenario); const { spieler, ...rest } = o.options; o.options = { spieler, ...rest };
  assert.match(abweichend(o, z.sequence), /scenario_data\.options/);
  assert.equal(dz.patchSpieler(null, [], VORG).art, 'abweichend');
  assert.equal(dz.patchSpieler(SC1, 'keine Liste', VORG).art, 'abweichend');
});

test('FH 3: **teils** geschrieben ist ein Abbruch – Option ohne `lage`, `lage` ohne Option, die Gates ohne die zehn neuen Schritte, die neuen Schritte ohne die Gates, nur die Hände, nur der Ereignis-Stapel: nichts wird überschrieben', () => {
  const z = ziel();
  const nurScenario = { scenario: z.scenario, sequence: SQ1 };
  const nurSequenz = { scenario: SC1, sequence: z.sequence };
  assert.match(abweichend(nurScenario.scenario, nurScenario.sequence), /halber Stand|teils/);
  assert.match(abweichend(nurSequenz.scenario, nurSequenz.sequence), /halber Stand|teils/);
  const ohneLage = copy(z.scenario); delete ohneLage.villagers.lage;
  assert.match(abweichend(ohneLage, z.sequence), /halber Stand|teils/);
  const ohneOpt = copy(z.scenario); delete ohneOpt.options.spieler;
  assert.match(abweichend(ohneOpt, z.sequence), /halber Stand|teils/);
  // 31 Schritte, aber die drei Gates schon gesetzt
  const gates = copy(SQ1); gates[1].onlyLage = ['solo', 'mehrfach']; gates[24].onlyLage = 'solo'; gates[30].onlyLage = 'solo';
  assert.match(abweichend(SC1, gates), /halber Stand|teils/);
  // 42 Schritte, aber ohne Gates
  const ohneGates = copy(z.sequence).map(({ onlyLage: _g, ...r }) => r);
  assert.match(abweichend(z.scenario, ohneGates), /sequence_data/);
  // nur der zweite Ereignis-Stapel (32 Schritte)
  const nurStapel = copy(SQ1); nurStapel.splice(2, 0, copy(z.sequence[2]));
  assert.match(abweichend(SC1, nurStapel), /sequence_data|Schritte/);
  // nur die fünf Hände (36 Schritte), mit Gates sonst Welle 1
  const nurHaende = [...copy(SQ1), ...[1, 2, 3, 4, 5].map(hand)];
  assert.match(abweichend(SC1, nurHaende), /sequence_data|Schritte/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4  Die Ereignis-Liste
// ─────────────────────────────────────────────────────────────────────────────

test('FH 4: die zwei `place_stack`-Schritte mit dem Etikett `Dorf-Ereignisse` unterscheiden sich in **genau einem** Eintrag der Kategorieliste (`Dorf-Ereignisse (geheim)`) und im Gate; sonst gleich; der zweite steht **unmittelbar hinter** dem ersten', () => {
  const s = ziel().sequence;
  const e = s.map((x, i) => [x, i]).filter(([x]) => x.type === 'place_stack' && x.label === 'Dorf-Ereignisse');
  assert.deepEqual(e.map(([, i]) => i), [1, 2]);
  const [a, b] = [e[0][0], e[1][0]];
  assert.deepEqual(a.category, ['Dorf-Ereignisse', 'Dorf-Ereignisse (Neue Nachbarn)']);
  assert.deepEqual(b.category.filter(c => !a.category.includes(c)), [GEHEIM], 'genau ein Eintrag mehr');
  assert.deepEqual(a.category.filter(c => !b.category.includes(c)), [], 'sonst nichts weniger');
  assert.equal(b.category.length, a.category.length + 1);
  const { category: _a, onlyLage: ga, ...ra } = a; const { category: _b, onlyLage: gb, ...rb } = b;
  assert.equal(text(ra), text(rb), 'Etikett, Ort, Seite gleich');
  assert.deepEqual([ga, gb], [['solo', 'mehrfach'], 'normal']);
  // Und beides läuft **vor** dem Mischen:
  assert.ok(s.findIndex(x => x.type === 'shuffle' && x.stackLabel === 'Dorf-Ereignisse') > 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5  Die Vorgabe `spieler = s1`: derselbe Tisch wie Welle 1 — die Zusage an die Produktion
// ─────────────────────────────────────────────────────────────────────────────

test('FH 5: **die Vorgabe `spieler = s1` (und `choices: {}`) baut denselben Tisch wie Welle 1** – 2 bis 5 Dörfler, kurz/mit und lang/ohne: `deepEqual` des Zustands (ohne Ids) und **dieselben Protokollzeilen**', () => {
  const faelle = [];
  for (const n of [2, 3, 4, 5]) faelle.push([n, { partie: 'kurz', troedel: 'mit' }], [n, { partie: 'lang', troedel: 'ohne' }]);
  for (const [n, extra] of faelle) {
    const alt = tischW1({ ...WAHL(n), ...extra });
    for (const [name, c] of [['spieler s1', { ...WAHL(n), ...extra, spieler: 's1' }], ['choices ohne spieler', { ...WAHL(n), ...extra }]]) {
      const neu = tisch(c);
      const wo = `${n} Dörfler ${text(extra)}, ${name}`;
      assert.deepEqual(ohneIds(neu.state), ohneIds(alt.state), `${wo}: derselbe Zustand`);
      assert.deepEqual(zeilen(neu), zeilen(alt), `${wo}: dieselben Protokollzeilen (Typ, Ziel, Status, Grund)`);
      assert.deepEqual(neu.log.filter(e => e.status !== 'ok'), [], `${wo}: der Aufbau meldet nichts`);
    }
  }
});

test('FH 5: **die Vorgabe ganz ohne Wahl** (`choices: {}`) – zwei Dörfler, ein gemeinsamer Topf mit 30, die Auslage mit sechs, der Ereignis-Stapel mit 80: wie der Tisch von Welle 1', () => {
  const neu = tisch({}), alt = tischW1({});
  assert.deepEqual(ohneIds(neu.state), ohneIds(alt.state));
  assert.equal(zaehler(neu.state, 'Münzen (gemeinsam)').value, 30);
  assert.equal(neu.state.counters.length, 1);
  assert.equal(inZone(neu.state, 'Heldentaten-Auslage').length, 6);
  assert.equal(stapel(neu.state, 'Dorf-Ereignisse'), 80);
});

test('FH 5: **die benannte Ausnahme (`FF`)** – Aufbau → `dorfereignis` → `kampf-beginnen` → `dorfphase-beginnen` mit den Daten von Welle 1 (Zonen vor `FF`) gegen die nach FH (Zonen nach `FF`): derselbe Zustand **bis auf die Lage der Ereigniskarten in den Hand-Zonen** – nur dort, nur `x`, genau −15', () => {
  const Z = ziel();
  for (const n of [2, 5]) {
    let a = tischW1(WAHL(n)).state, b = tisch({ ...WAHL(n), spieler: 's1' }).state;
    for (const id of ['dorfereignis', 'kampf-beginnen', 'dorfphase-beginnen']) {
      const ra = lauf(EU, W1ACT.find(x => x.id === id).steps, a, SC1), rb = lauf(FF, FG.find(x => x.id === id).steps, b, Z.scenario);
      const wo = `${n} Dörfler, ${id}`;
      for (const f of ['tokens', 'counters', 'boards', 'stacks']) assert.deepEqual(ohneIds(rb.state[f]), ohneIds(ra.state[f]), `${wo}: ${f}`);
      const A = ohneIds(ra.state.cards), B = ohneIds(rb.state.cards);
      assert.equal(B.length, A.length, `${wo}: gleich viele Karten`);
      const anders = A.map((c, i) => [c, B[i]]).filter(([x, y]) => text(x) !== text(y));
      for (const [x, y] of anders) {
        assert.equal(text({ ...y, x: 0 }), text({ ...x, x: 0 }), `${wo}: nur x`);
        assert.equal(y.x - x.x, -15, `${wo}: 15 Punkte weiter links`);
        assert.match(kat(y), /^Dorf-Ereignisse/, `${wo}: es sind Ereigniskarten`);
      }
      if (id === 'dorfereignis') assert.equal(anders.length, n, `${wo}: n Karten liegen anders`);
      a = ra.state; b = rb.state;
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6  Lage solo — wie Welle 1
// ─────────────────────────────────────────────────────────────────────────────

test('FH 6: **Lage solo** (`spieler s1`, 2 bis 5 Dörfler) – die Auslage mit 6, **ein** gemeinsamer Topf (15 je Dörfler), keine Töpfe je Dörfler, die Hände leer, der Ereignis-Stapel **80** (75 + 5), die Heldentaten 75 − 6', () => {
  for (const n of [2, 3, 4, 5]) {
    const st = tisch({ spieler: 's1', ...WAHL(n) }).state;
    const wo = `${n} Dörfler`;
    assert.equal(inZone(st, 'Heldentaten-Auslage').length, 6, `${wo}: Auslage`);
    assert.deepEqual(st.counters.map(c => [c.name, c.value]), [['Münzen (gemeinsam)', 15 * n]], `${wo}: ein Topf`);
    for (let i = 1; i <= 5; i++) assert.equal(inHand(st, i).length, 0, `${wo}: Hand ${i} leer`);
    assert.equal(stapel(st, 'Dorf-Ereignisse'), 80, `${wo}: Ereignis-Stapel`);
    assert.equal(stapel(st, 'Heldentaten'), HELDEN_GESAMT - 6, `${wo}: Heldentaten-Stapel`);
    assert.equal(st.cards.filter(c => kat(c) === GEHEIM).length + st.stacks.flatMap(s => s.cards).filter(c => kat(c) === GEHEIM).length, 0, `${wo}: kein geheimes Ereignis am Tisch`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7/8  Lage mehrfach und normal
// ─────────────────────────────────────────────────────────────────────────────

/** Was die Lage mehrfach/normal am Tisch hinterlässt, für `D` Dörfler und `S` Spieler. */
function pruefeLage(S, D, extra, topfWert, ereignisse, wo) {
  const r = tisch(wahl(S, D, extra));
  const st = r.state;
  assert.deepEqual(schlecht(r), [], `${wo}: der Aufbau meldet nichts`);
  assert.equal(lageOf(ziel().scenario, resolveChoices(ziel().scenario.options, wahl(S, D, extra)).choices).kind, S === D ? 'normal' : 'mehrfach', wo);
  assert.equal(inZone(st, 'Heldentaten-Auslage').length, 0, `${wo}: die Auslage ist leer`);
  for (let i = 1; i <= D; i++) {
    const h = inHand(st, i);
    assert.equal(h.length, 3, `${wo}: Hand ${i}: drei Karten`);
    assert.ok(h.every(c => c.faceDown === true && kat(c) === 'Heldentaten'), `${wo}: Hand ${i}: verdeckte Heldentaten`);
  }
  for (let i = D + 1; i <= 5; i++) assert.equal(inHand(st, i).length, 0, `${wo}: Hand ${i} (kein Dörfler) bleibt leer`);
  assert.deepEqual(st.counters.map(c => [c.name, c.value]), Array.from({ length: D }, (_, i) => [`Münzen Dörfler ${i + 1}`, topfWert]), `${wo}: ${D} Töpfe, kein gemeinsamer`);
  assert.equal(zaehler(st, 'Münzen (gemeinsam)'), undefined, `${wo}: kein gemeinsamer Topf`);
  for (const c of st.counters) { const n = Number(c.name.slice(-1)); assert.equal(c.x, TOPF_X[n - 1], `${c.name}: x`); assert.equal(c.y, 1870, `${c.name}: y`); }
  assert.equal(stapel(st, 'Dorf-Ereignisse'), ereignisse, `${wo}: Ereignis-Stapel`);
  assert.equal(stapel(st, 'Heldentaten'), HELDEN_GESAMT - 3 * D, `${wo}: Heldentaten-Stapel`);
  return st;
}

test('FH 7: **Lage mehrfach** (`spieler 2`, 3 bis 5 Dörfler) – Auslage leer, je Hand drei verdeckte Heldentaten, die Töpfe `Münzen Dörfler n` zu **15** (kurz) / **10** (lang), **kein** gemeinsamer Topf, Stapel **80**', () => {
  for (const D of [3, 4, 5]) {
    pruefeLage(2, D, { partie: 'kurz' }, 15, 80, `mehrfach kurz, ${D} Dörfler`);
    pruefeLage(2, D, { partie: 'lang', troedel: 'ohne' }, 10, 80, `mehrfach lang, ${D} Dörfler`);
  }
  // S = 3 bei D = 4 und S = 4 bei D = 5: ebenfalls mehrfach
  pruefeLage(3, 4, {}, 15, 80, 'mehrfach 3 Spieler, 4 Dörfler');
  pruefeLage(4, 5, {}, 15, 80, 'mehrfach 4 Spieler, 5 Dörfler');
});

test('FH 8: **Lage normal** (`spieler 2` bei zwei Dörflern, 3/3, 4/4, 5/5) – wie mehrfach, der Ereignis-Stapel **105** (mit den 25 geheimen), fünf Töpfe bei fünf', () => {
  for (const D of [2, 3, 4, 5]) {
    const st = pruefeLage(D, D, { partie: 'kurz' }, 15, 105, `normal kurz, ${D}/${D}`);
    assert.equal(stapel(st, 'Dorf-Ereignisse'), 105);
    const geheim = st.stacks.find(s => s.label === 'Dorf-Ereignisse').cards.filter(c => kat(c) === GEHEIM);
    assert.equal(geheim.length, 25, `${D}/${D}: 25 geheime Ereignisse im Stapel`);
  }
  pruefeLage(5, 5, { partie: 'lang', troedel: 'ohne' }, 10, 105, 'normal lang, 5/5');
  assert.equal(tisch(wahl(5, 5)).state.counters.length, 5);
});

test('FH 7/8: **die Töpfe überschneiden nichts** – gerechnet aus den Zonen (wie `EU` Nr. 6): Kasten 185 × 102 (Versatz −70/−40) gegen alle Zonen samt Schild, die Ereignis-Stapel und die Töpfe untereinander; und sie liegen **am Platz**, unter dem Tableau', () => {
  const rect = (b) => ({ x: b.x, y: b.y, w: b.w, h: b.h });
  const schild = (b) => ({ x: b.x, y: b.y - ZONE_LABEL_HEIGHT, w: Math.max(b.w, ZONE_LABEL_WIDTH), h: ZONE_LABEL_HEIGHT });
  const ueber = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const st = tisch(wahl(5, 5)).state;
  const andere = aufgeloest(FF, st).flatMap(z => { const b = { x: z.x, y: z.y, w: z.width, h: z.height }; return [{ label: z.label, r: rect(b) }, { label: `Schild ${z.label}`, r: schild(b) }]; });
  const tableaus = st.tokens.filter(t => /^Tableau: /.test(t.label)).map(t => ({ label: t.label, r: { x: t.x - t.width / 2, y: t.y - t.height / 2, w: t.width, h: t.height } }));
  const stapelBoxen = ziel().sequence.filter(s => s.type === 'place_stack').map(s => ({ label: `Stapel ${s.label}`, r: { x: s.x - 50, y: s.y - 70, w: 100, h: 140 } }));
  const toepfe = [1, 2, 3, 4, 5].map(n => { const c = ez.counterBox({ x: TOPF_X[n - 1], y: 1870 }); return { label: `Topf ${n}`, r: { x: c.x, y: c.y, w: c.width, h: c.height } }; });
  for (const t of toepfe) {
    const treffer = [...andere, ...tableaus, ...stapelBoxen, ...toepfe.filter(o => o !== t)].filter(o => ueber(t.r, o.r)).map(o => o.label);
    assert.deepEqual(treffer, [], `${t.label} überschneidet ${treffer.join(', ')}`);
  }
  // am Platz: der Kasten liegt mittig unter dem Tableau (Mitte x − 22), unterhalb von dessen Unterkante
  const mitten = [300, 880, 1460, 2040, 2620];
  toepfe.forEach((t, i) => {
    assert.ok(Math.abs(t.r.x + t.r.w / 2 - mitten[i]) <= 1, `Topf ${i + 1}: Mitte ${t.r.x + t.r.w / 2} gegen Tableau-Mitte ${mitten[i]}`);
    assert.ok(t.r.y >= 1600 + 200, `Topf ${i + 1}: unter dem Tableau (Unterkante 1800), Oberkante ${t.r.y}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9  Die Nebenbedingung S ≤ D
// ─────────────────────────────────────────────────────────────────────────────

test('FH 9: **`S > D` baut nichts** (`FC`, hier mit den echten Daten) – `spieler 3` bei zwei Dörflern, `spieler 5` bei vier: eine Zeile `failed`, der Zustand bleibt der Ausgang; `spieler 1` mit zwei bis fünf Dörflern baut', () => {
  for (const [S, D] of [[3, 2], [4, 2], [4, 3], [5, 2], [5, 3], [5, 4]]) {
    const r = tisch(wahl(S, D));
    assert.equal(r.log.length, 1, `${S}/${D}: eine Zeile`);
    assert.equal(r.log[0].status, 'failed');
    assert.match(r.log[0].reason, /nothing was built/);
    assert.match(r.log[0].reason, new RegExp(`${S} Spieler, aber nur`));
    assert.deepEqual(r.state, state, `${S}/${D}: der Zustand bleibt, wie er war`);
  }
  for (const D of [2, 3, 4, 5]) assert.deepEqual(schlecht(tisch(wahl(1, D))), [], `spieler 1, ${D} Dörfler baut`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 10  Doppelwahl
// ─────────────────────────────────────────────────────────────────────────────

test('FH 10: **Doppelwahl** (Auftraggeber, 2026-11-11) – bei mehreren Spielern ein Problem mit dem vollen Namen, und der Aufbau baut **nichts**; solo bleibt wie M30.4: der zweite Judy bleibt draußen, eine `skipped`-Zeile', () => {
  const z = ziel();
  const gemeldet = (c) => lageOf(z.scenario, resolveChoices(z.scenario.options, c).choices);
  const DOPPELT = 'Judy Marks ist doppelt gewählt – bei mehreren Spielern braucht jeder Platz einen eigenen Dörfler.';

  // spieler 2: eine Meldung, keine Lage - mit zwei, vier oder allen gewählten Plätzen; `S > D` kommt dazu nie ein zweiter Satz
  for (const c of [
    { spieler: 's2', doerfler1: 'Judy', doerfler2: 'Judy' },
    { spieler: 's2', doerfler1: 'Judy', doerfler2: 'Judy', doerfler3: 'Granny', doerfler4: 'Blopsy' },
    { spieler: 's5', doerfler1: 'Judy', doerfler2: 'Judy', doerfler3: 'Granny', doerfler4: 'Blopsy' },
  ]) {
    const l = gemeldet(c);
    assert.deepEqual([l.kind, l.problems], [null, [DOPPELT]], JSON.stringify(c));
    // der Executor ist die letzte Wache: eine Zeile `failed`, kein Zähler, kein Stapel
    const r = tisch(c);
    assert.deepEqual(r.log.map(e => [e.index, e.status]), [[-1, 'failed']], JSON.stringify(c));
    assert.match(r.log[0].reason, /Judy Marks ist doppelt gewählt/);
    assert.equal(r.state.counters.length, 0);
  }

  // solo: dieselbe Wahl ist eine Lage, der Aufbau läuft, genau der zweite Judy bleibt draußen (M30.4, M31.3)
  const c = { spieler: 's1', doerfler1: 'Judy', doerfler2: 'Judy', doerfler3: 'Granny', doerfler4: 'Blopsy' };
  const l = gemeldet(c);
  assert.deepEqual([l.kind, l.villagers, l.players, l.problems], ['solo', 4, 1, []]);
  const r = tisch(c);
  assert.deepEqual(r.log.filter(e => e.status !== 'ok').map(e => [e.type, e.status]), [['seat_villager', 'skipped']]);
  assert.deepEqual(seatedVillagers(r.state, ASSETS, z.scenario.villagers).map(x => x.n), [1, 3, 4], 'drei sitzen');
  assert.deepEqual(r.state.counters.map(x => x.name), ['Münzen (gemeinsam)']);
});

// ─────────────────────────────────────────────────────────────────────────────
// 11  Roundtrip und der Raum
// ─────────────────────────────────────────────────────────────────────────────

test('FH 11: **Roundtrip** – `?opt=spieler:s2&opt=doerfler3:Granny&opt=doerfler4:Blopsy` ergibt dieselbe Wahl, `formatChoices` dieselbe Adresse zurück, und der Tisch aus der Adresse ist der Tisch aus der Wahl (Lage mehrfach)', () => {
  const adresse = '?setupId=x&opt=spieler:s2&opt=doerfler3:Granny&opt=doerfler4:Blopsy';
  const g = choicesFromSearch(adresse);
  assert.deepEqual(g.problems, []);
  assert.deepEqual(g.choices, { spieler: 's2', doerfler3: 'Granny', doerfler4: 'Blopsy' });
  assert.equal(formatChoices(g.choices), 'opt=spieler:s2&opt=doerfler3:Granny&opt=doerfler4:Blopsy');
  assert.deepEqual(choicesFromSearch(`?${formatChoices(g.choices)}`).choices, g.choices);
  const z = ziel();
  const r = resolveChoices(z.scenario.options, g.choices);
  assert.deepEqual(r.problems, []);
  assert.equal(r.choices.spieler, 's2');
  assert.equal(lageOf(z.scenario, r.choices).kind, 'mehrfach');
  const st = tisch(g.choices).state;
  assert.deepEqual(st.counters.map(c => [c.name, c.value]), [1, 2, 3, 4].map(i => [`Münzen Dörfler ${i}`, 15]));
  assert.deepEqual(ohneIds(st), ohneIds(tisch(wahl(2, 4)).state));
  // Eine Ziffer allein ist kein Schlüssel (`spieler:2`): der Dialog baut nichts, statt zu raten
  assert.ok(resolveChoices(z.scenario.options, { spieler: '2' }).problems.length > 0);
});

// ── Eine Wegwerf-Datenbank (nie die echte) ──────────────────────────────────────

const ASSET_ZEIT = '2026-02-25 10:00:00';
function frischeDatenbank({ scen, seq, act = text(FG), zon = text(FF), ast = ASSETS, saves = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-doerflerzahl-spieler-'));
  const file = path.join(tmp, 'test.db');
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
  // `created_at` setzt der Aufbau selbst (siehe `doerflerzahl-daten.test.js`, „Aufgeklärt“): die Klone `Marker 4/5` müssen das Feld ihrer Vorlage tragen.
  for (const a of ast) {
    db.prepare('insert into table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(a.id, GAME_ID, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category), a.created_at ?? ASSET_ZEIT);
  }
  for (const c of cards) {
    db.prepare('insert into cards (id, game_id, category_id, name, image_path, width, height) values (?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, GAME_ID, catId(c.category), c.name, c.image_path, c.width, c.height);
  }
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Aufbau', JSON.stringify(state), zon, seq, JSON.stringify(grids), act, scen);
  db.prepare("insert into setups (id, game_id, name, sequence_data, scenario_data, action_data) values (?, ?, 'Grundaufbau', '[{\"type\":\"shuffle\"}]', '{}', '[]')").run(randomUUID(), GAME_ID);
  // Spielstände gehören dem Rauchtest nicht (er liest sie und beanstandet einen, der keine Stapel trägt): die Läufe des Rauchtests legen keine an.
  for (const [n, d] of (saves ? [['Auto Save', '{"a":0}'], ['Partie 14 – Sieg gegen Virginia Fitz', '{"a":1}']] : [])) {
    db.prepare('insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, ?, ?, ?)').run(randomUUID(), GAME_ID, n, d, SETUP_ID);
  }
  db.close();
  return { tmp, file };
}
const eingang = () => ({ scen: text(SC1), seq: text(SQ1) });
const zielDb = () => { const z = ziel(); return { scen: text(z.scenario), seq: text(z.sequence) }; };

async function fahre(args, { Db = Database } = {}) {
  const ausgabe = [], fehler = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => ausgabe.push(a.join(' '));
  console.error = (...a) => fehler.push(a.join(' '));
  try {
    const code = await dz.main(args, { Database: Db });
    return { code, out: [...ausgabe, ...fehler].join('\n') };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}
const istCode = (r, erwartet, wo = '') => assert.equal(r.code, erwartet, `${wo}${r.out}`);
const spalten = (file) => {
  const db = new Database(file, { readonly: true });
  try { return db.prepare('select scenario_data, sequence_data from setups where id = ?').get(SETUP_ID); } finally { db.close(); }
};
/** Alles außer den beiden geschriebenen Spalten in der Zeile des Aufbaus, jede andere Zeile, jede andere Tabelle (Fingerabdruck), und jede Zeile von `save_states`. */
function andere(file) {
  const db = new Database(file, { readonly: true });
  try {
    const row = db.prepare('select * from setups where id = ?').get(SETUP_ID);
    const { scenario_data: _a, sequence_data: _b, ...rest } = row;
    const tabellen = {};
    for (const { name } of db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all()) {
      if (name === 'setups') continue;
      tabellen[name] = sha(text(db.prepare(`select * from "${name}" order by rowid`).all()));
    }
    return { setup: text(rest), tabellen, saves: text(db.prepare('select * from save_states order by rowid').all()) };
  } finally { db.close(); }
}
const sicherungsSha = (a, b) => dz.sicherungsHash(a, b).slice(0, 12);

test('FH 11: **der Raum** – `POST /api/rooms` mit `spieler:s2`, `doerfler3`, `doerfler4` legt an (201) und startet (200) mit **demselben** Tisch wie der Aufbau am Tisch (vier Töpfe, Hände, Stapel 80); `spieler:s3` bei zwei Dörflern wird abgewiesen (400, kein Raum), die Vorgabe gibt den Tisch von Welle 1', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-fh-raum-'));
  process.env.CGE_DB_PATH = path.join(tmp, 'test.db');
  process.env.CGE_UPLOADS_DIR = path.join(tmp, 'uploads');
  const { buildApp } = await import('../src/index.js');
  const { getDb, closeDatabase } = await import('../src/database.js');
  const { getRoom } = await import('../src/roomStore.js');
  const { authHeaders } = await import('./helpers.js');
  const app = await buildApp({ logger: false });
  try {
    await app.ready();
    const headers = authHeaders();
    const g = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'FH' } });
    assert.equal(g.statusCode, 201, g.body);
    const gameId = g.json().id;
    const db = getDb();
    const cat = new Map();
    const catId = (name) => {
      if (!name) return null;
      if (!cat.has(name)) { cat.set(name, randomUUID()); db.prepare('insert into categories (id, game_id, name) values (?, ?, ?)').run(cat.get(name), gameId, name); }
      return cat.get(name);
    };
    for (const a of ASSETS) {
      db.prepare('insert into table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(a.id, gameId, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category), a.created_at ?? ASSET_ZEIT);   // die Ids bleiben: die Zonen hängen an ihnen
    }
    for (const c of cards) {
      db.prepare('insert into cards (id, game_id, category_id, name, image_path, width, height) values (?, ?, ?, ?, ?, ?, ?)')
        .run(c.id, gameId, catId(c.category), c.name, c.image_path, c.width, c.height);
    }
    const z = ziel();
    const s = await app.inject({
      method: 'POST', url: `/api/games/${gameId}/setups`, headers,
      payload: { name: 'TFT Aufbau', state_data: JSON.stringify(state), zone_data: JSON.stringify(FF), sequence_data: JSON.stringify(z.sequence), grid_data: JSON.stringify(grids), action_data: JSON.stringify(FG), scenario_data: JSON.stringify(z.scenario) },
    });
    assert.equal(s.statusCode, 201, s.body);
    const setupId = s.json().id;
    const anlegen = (choices) => app.inject({ method: 'POST', url: '/api/rooms', headers, payload: { game_id: gameId, display_name: 'Host', color: 'red', setup_id: setupId, setup_choices: choices } });
    const raeume = () => db.prepare('SELECT COUNT(*) AS n FROM game_rooms').get().n;
    const starten = async (choices) => {
      const c = await anlegen(choices);
      assert.equal(c.statusCode, 201, c.body);
      const { room_code, player_id } = c.json();
      const r = await app.inject({ method: 'POST', url: `/api/rooms/${room_code}/start`, headers, payload: { player_id } });
      assert.equal(r.statusCode, 200, r.body);
      return getRoom(room_code).boardState;
    };

    // S > D: abgewiesen, es entsteht kein Raum
    const vorher = raeume();
    const zu = await anlegen({ spieler: 's3' });
    assert.equal(zu.statusCode, 400, zu.body);
    assert.match(zu.json().error, /3 Spieler, aber nur 2 Dörfler/);
    assert.equal(raeume(), vorher, 'kein Raum');

    // mehrfach: derselbe Tisch wie am Tisch
    const wahlM = { spieler: 's2', doerfler3: 'Granny', doerfler4: 'Blopsy' };
    const raum = await starten(wahlM);
    const tischM = tisch(wahlM).state;
    assert.deepEqual(raum.counters.map(c => [c.name, c.value, c.x, c.y]), tischM.counters.map(c => [c.name, c.value, c.x, c.y]));
    assert.equal(raum.stacks.find(x => x.label === 'Dorf-Ereignisse').cards.length, 80);
    assert.equal(raum.stacks.find(x => x.label === 'Heldentaten').cards.length, HELDEN_GESAMT - 12);
    assert.equal(raum.cards.filter(c => c.category === 'Heldentaten').length, 12, 'zwölf Heldentaten in den vier Händen');
    assert.equal(raum.cards.filter(c => c.category === 'Heldentaten').every(c => c.faceDown === true), true);
    // Welche Karte wohin kommt, würfelt der Mischer (im Raum `Math.random`, am Tisch ein Samen): verglichen wird, **wie viele** in jeder Zone liegen.
    for (const label of ['Hand Dörfler 1', 'Hand Dörfler 2', 'Hand Dörfler 3', 'Hand Dörfler 4', 'Hand Dörfler 5', 'Heldentaten-Auslage']) {
      assert.equal(inZone(raum, label).length, inZone(tischM, label).length, label);
    }
    assert.deepEqual([1, 2, 3, 4, 5].map(i => inZone(raum, `Hand Dörfler ${i}`).length), [3, 3, 3, 3, 0]);

    // normal: 105, Vorgabe: Welle 1
    const normal = await starten({ spieler: 's3', doerfler3: 'Granny' });
    assert.equal(normal.stacks.find(x => x.label === 'Dorf-Ereignisse').cards.length, 105);
    assert.equal(normal.counters.length, 3);
    const solo = await starten({});
    assert.deepEqual(solo.counters.map(c => [c.name, c.value]), [['Münzen (gemeinsam)', 30]]);
    assert.equal(solo.stacks.find(x => x.label === 'Dorf-Ereignisse').cards.length, 80);
    assert.equal(solo.cards.filter(c => c.category === 'Heldentaten').length, 6);
  } finally {
    await app.close();
    closeDatabase();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 12  Disjunkt — nur scenario_data und sequence_data
// ─────────────────────────────────────────────────────────────────────────────

test('FH 12: **dieser Schritt rührt nur `scenario_data` und `sequence_data` an** – der Baustein liefert nur diese zwei, `DEFS` kennt nur diese Spalten, und `main --write` ändert in der Datenbank **sonst nichts** (`zone_data`, `action_data`, `table_assets`, `grid_data`, `state_data`, `save_states`)', async () => {
  assert.deepEqual(Object.keys(dz.patchSpieler(SC1, SQ1, VORG)).sort(), ['art', 'scenario', 'sequence']);
  const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8');
  const def = /'aufbau-spieler': \{\s*spalten: \[([^\]]*)\]/.exec(quelle);
  assert.ok(def, 'der Eintrag in DEFS');
  assert.equal(def[1].replace(/\s/g, ''), "'scenario','sequence'");
  const { tmp, file } = frischeDatenbank(eingang());
  try {
    const vorher = andere(file);
    const zoneVorher = (() => { const db = new Database(file, { readonly: true }); try { return db.prepare('select zone_data, action_data, grid_data, state_data from setups where id = ?').get(SETUP_ID); } finally { db.close(); } })();
    const r = await fahre(['--write', file, '--schritt', 'aufbau-spieler', '--sicherung-sha', sicherungsSha(text(SC1), text(SQ1))]);
    istCode(r, 0, 'write: ');
    assert.deepEqual(andere(file), vorher, 'nichts sonst geändert');
    const zoneNachher = (() => { const db = new Database(file, { readonly: true }); try { return db.prepare('select zone_data, action_data, grid_data, state_data from setups where id = ?').get(SETUP_ID); } finally { db.close(); } })();
    assert.deepEqual(zoneNachher, zoneVorher);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FH 12: die anderen Schritte sehen den neuen Stand **unverändert** – `patchGelaende`/`patchWerte` → schon-da auf dem neuen `scenario_data`, `patchHaende` und `patchAktionenSpieler` → schon-da; `patchSchalter` (EX) ordnet den neuen Stand als ABWEICHEND ein (erwartet, wie `--check optionen` nach `FG`)', () => {
  const z = ziel();
  assert.equal(dz.patchGelaende(z.scenario).art, 'schon-da');
  assert.equal(dz.patchWerte(z.scenario).art, 'schon-da');
  assert.equal(dz.patchHaende(FF).art, 'schon-da');
  assert.equal(dz.patchAktionenSpieler(FG).art, 'schon-da');
  assert.equal(dz.patchSchalter(z.scenario, z.sequence, { zone: EU, assets: ASSETS, action: W1ACT }).art, 'abweichend');
});

test('FH 12: der Kopf des Skripts und SCHRITTE – `aufbau-spieler` ist gebaut, jetzt neun Schritte; der Kopf trägt FH', () => {
  assert.deepEqual(Object.keys(dz.SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen', 'haende', 'aktionen-spieler', 'aufbau-spieler']);
  for (const k of Object.keys(dz.SCHRITTE)) assert.notEqual(dz.SCHRITTE[k], null, k);
  const kopf = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8').split('\n').slice(0, 16).join('\n');
  assert.match(kopf, /aufbau-spieler/, 'der Kopf nennt den Schritt');
  assert.match(kopf, /FH/, 'mit der Aufgabe');
});

// ─────────────────────────────────────────────────────────────────────────────
// main — gegen eine Wegwerf-Datenbank
// ─────────────────────────────────────────────────────────────────────────────

test('FH main: --check – schreibgeschützt, „zu schreiben“, beide Beweise, Prüfer, Zielstand, Hash für die Sicherung über **beide** Spalten; geschrieben wird nichts', async () => {
  const { tmp, file } = frischeDatenbank(eingang());
  try {
    const vorher = spalten(file);
    const r = await fahre(['--check', file, '--schritt', 'aufbau-spieler']);
    istCode(r, 0);
    assert.match(r.out, /zu schreiben/);
    assert.match(r.out, /Rückwärtsbeweis scenario_data: ja/); assert.match(r.out, /Rückwärtsbeweis sequence_data: ja/);
    assert.ok(r.out.includes(dz.sicherungsHash(text(SC1), text(SQ1))), 'der Hash für die Sicherung steht in der Ausgabe');
    assert.match(r.out, /Ausgang laut Schritt: gleich/);
    assert.deepEqual(spalten(file), vorher);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FH main: --write mit Sicherung – beide Spalten auf dem Zielstand (Länge und Hash aus `SCHRITTE`), nichts sonst geändert; der zweite Lauf schreibt nichts („schon geschrieben“)', async () => {
  const { tmp, file } = frischeDatenbank(eingang());
  try {
    const vorher = andere(file);
    const r = await fahre(['--write', file, '--schritt', 'aufbau-spieler', '--sicherung-sha', sicherungsSha(text(SC1), text(SQ1))]);
    istCode(r, 0, 'write: ');
    const z = ziel(), s = spalten(file);
    assert.equal(s.scenario_data, text(z.scenario)); assert.equal(s.sequence_data, text(z.sequence));
    assert.match(r.out, /Zielstand aus den Konstanten[^\n]*erreicht/);
    assert.deepEqual(andere(file), vorher);
    const zweit = await fahre(['--write', file, '--schritt', 'aufbau-spieler']);
    istCode(zweit, 0, 'zweiter Lauf: ');
    assert.match(zweit.out, /schon geschrieben|nichts zu schreiben/);
    assert.deepEqual(spalten(file), { scenario_data: text(z.scenario), sequence_data: text(z.sequence) });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FH main: **eine** `IMMEDIATE`-Transaktion für beide Spalten; ohne oder mit falscher Sicherung wird nichts geschrieben; `--force` ist ein Benutzungsfehler', async () => {
  const { tmp, file } = frischeDatenbank(eingang());
  try {
    const aufrufe = [];
    class Spion extends Database {
      transaction(fn) { const t = super.transaction(fn); const out = (...a) => t(...a); out.immediate = (...a) => { aufrufe.push('immediate'); return t.immediate(...a); }; out.deferred = t.deferred; out.exclusive = t.exclusive; return out; }
    }
    const r = await fahre(['--write', file, '--schritt', 'aufbau-spieler', '--sicherung-sha', sicherungsSha(text(SC1), text(SQ1))], { Db: Spion });
    istCode(r, 0, 'write: ');
    assert.deepEqual(aufrufe, ['immediate'], 'genau eine Transaktion für beide Spalten');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const zwei = frischeDatenbank(eingang());
  try {
    const vorher = spalten(zwei.file);
    istCode(await fahre(['--write', zwei.file, '--schritt', 'aufbau-spieler']), 1);
    istCode(await fahre(['--write', zwei.file, '--schritt', 'aufbau-spieler', '--sicherung-sha', 'abcdefabcdef']), 1);
    // der Hash nur über **eine** Spalte genügt nicht
    istCode(await fahre(['--write', zwei.file, '--schritt', 'aufbau-spieler', '--sicherung-sha', dz.sicherungsHash(text(SC1)).slice(0, 12)]), 1);
    istCode(await fahre(['--write', zwei.file, '--schritt', 'aufbau-spieler', '--force']), 2);
    assert.deepEqual(spalten(zwei.file), vorher);
  } finally { fs.rmSync(zwei.tmp, { recursive: true, force: true }); }
});

test('FH main: Abbruch mit Pfad auf der Datenbank – FF fehlt, FG fehlt, ein Stück abweichend, ein Stand **teils**: Exit 1, beide Spalten bleiben, wie sie waren', async () => {
  const z = ziel();
  const halb = { scen: text(z.scenario), seq: text(SQ1) };
  const fremd = copy(SQ1); fremd[24].count = 7;
  for (const [name, db] of [
    ['FF fehlt', { ...eingang(), zon: text(EU) }],
    ['FG fehlt', { ...eingang(), act: text(W1ACT) }],
    ['Stück abweichend', { scen: text(SC1), seq: text(fremd) }],
    ['teils', halb],
  ]) {
    const { tmp, file } = frischeDatenbank(db);
    try {
      const vorher = spalten(file);
      const r = await fahre(['--write', file, '--schritt', 'aufbau-spieler', '--sicherung-sha', sicherungsSha(vorher.scenario_data, vorher.sequence_data)]);
      istCode(r, 1, `${name}: `);
      assert.match(r.out, /scenario_data|sequence_data|zone_data|action_data/, name);
      assert.deepEqual(spalten(file), vorher, `${name}: unverändert`);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
});

test('FH main: --zurueck – der exakte Zielstand kommt auf den Ausgang, **beide** Spalten, Zeichen für Zeichen; ein Stand, der nicht der Zielstand ist, wird nicht überschrieben', async () => {
  const { tmp, file } = frischeDatenbank(eingang());
  try {
    istCode(await fahre(['--write', file, '--schritt', 'aufbau-spieler', '--sicherung-sha', sicherungsSha(text(SC1), text(SQ1))]), 0);
    const sicherung = path.join(tmp, 'sicherung.json');
    fs.writeFileSync(sicherung, JSON.stringify({ scenario_data: text(SC1), sequence_data: text(SQ1), sha256: dz.sicherungsHash(text(SC1), text(SQ1)), updated_at: 'test' }));
    const r = await fahre(['--zurueck', sicherung, file, '--schritt', 'aufbau-spieler']);
    istCode(r, 0, 'zurück: ');
    assert.deepEqual(spalten(file), { scenario_data: text(SC1), sequence_data: text(SQ1) });
    const nochmal = await fahre(['--zurueck', sicherung, file, '--schritt', 'aufbau-spieler']);
    istCode(nochmal, 0);
    assert.match(nochmal.out, /nichts zu tun/);
    // jemand hat danach weitergearbeitet: weder Ziel noch Ausgang
    const z = ziel(); const fremdSeq = copy(z.sequence); fremdSeq[41].value = '99';
    const db = new Database(file); db.prepare('update setups set scenario_data = ?, sequence_data = ? where id = ?').run(text(z.scenario), text(fremdSeq), SETUP_ID); db.close();
    istCode(await fahre(['--zurueck', sicherung, file, '--schritt', 'aufbau-spieler']), 1);
    assert.equal(spalten(file).sequence_data, text(fremdSeq));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Kette Aufbau → Aktion, je Lage
// ─────────────────────────────────────────────────────────────────────────────

test('FH Kette: je Lage und Zahl – Aufbau → `kampf-beginnen` → `dorfphase-beginnen` ohne `skipped`/`failed`-Zeile; die Münzen: solo +6 je Dörfler im gemeinsamen Topf, mehrfach/normal +6 in **jedem** Topf; die Hände werden auf drei aufgefüllt', () => {
  const faelle = [];
  for (const D of [2, 3, 4, 5]) faelle.push([1, D, 'solo']);
  for (const [S, D] of [[2, 3], [2, 4], [3, 4], [2, 5], [3, 5], [4, 5]]) faelle.push([S, D, 'mehrfach']);
  for (const D of [2, 3, 4, 5]) faelle.push([D, D, 'normal']);
  for (const [S, D, lage] of faelle) {
    const wo = `${lage}, ${S} Spieler, ${D} Dörfler`;
    const r = tisch(wahl(S, D));
    assert.deepEqual(schlecht(r), [], `${wo}: Aufbau`);
    const k = aktion('kampf-beginnen', r.state);
    assert.deepEqual(k.log.filter(e => e.status === 'skipped' || e.status === 'failed'), [], `${wo}: kampf-beginnen`);
    const p = aktion('dorfphase-beginnen', k.state);
    assert.deepEqual(p.log.filter(e => e.status === 'skipped' || e.status === 'failed'), [], `${wo}: dorfphase-beginnen`);
    if (lage === 'solo') {
      assert.equal(zaehler(p.state, 'Münzen (gemeinsam)').value, 15 * D + 6 * D, `${wo}: gemeinsamer Topf`);
      assert.equal(p.state.counters.length, 1, wo);
      assert.equal(inZone(p.state, 'Heldentaten-Auslage').length, 6, `${wo}: Auslage voll`);
      for (let i = 1; i <= 5; i++) assert.equal(inHand(p.state, i).length, 0, `${wo}: Hand ${i} leer`);
    } else {
      assert.deepEqual(p.state.counters.map(c => [c.name, c.value]), Array.from({ length: D }, (_, i) => [`Münzen Dörfler ${i + 1}`, 21]), `${wo}: Töpfe`);
      assert.equal(inZone(p.state, 'Heldentaten-Auslage').length, 0, `${wo}: Auslage leer`);
      for (let i = 1; i <= D; i++) assert.equal(inHand(p.state, i).length, 3, `${wo}: Hand ${i} auf drei`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Der Rauchtest — beide Stände
// ─────────────────────────────────────────────────────────────────────────────
//
// `scripts/auslagen-rauchtest.mjs` nagelte für die Doppelwahl den Aufbau-Index des zweiten `seat_villager` fest (26). Der eingefügte `place_stack` hinter Schritt 1 macht daraus 27 — **beide Stände müssen bestehen**
// (`EY 2` fährt ihn auf dem Stand von Welle 1). Der Index kommt darum aus dem **Inhalt** der Folge (der zweite `seat_villager`), nicht aus einer Zahl und nicht aus einer Längendifferenz (die angehängten Schritte verschieben nichts).

const rauch = async (db) => {
  const { rauchtest, laden, dorflerFaelle } = await import('../../scripts/auslagen-rauchtest.mjs');
  const { tmp, file } = frischeDatenbank({ ...db, saves: false });
  try {
    const d = new Database(file, { readonly: true });
    try {
      const e = laden(d);
      const sitze = e.sequence.flatMap((st, i) => (st.type === 'seat_villager' ? [i] : []));
      return { r: rauchtest(d), zweiterSitz: sitze[1], doppel: dorflerFaelle(e).doppel };
    } finally { d.close(); }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};
let rauchCache;
const beideStaende = () => (rauchCache ??= Promise.all([
  rauch(zielDb()),
  rauch({ scen: text(SC1), seq: text(SQ1), act: text(W1ACT), zon: text(EU) }),
]));

test('FH Rauchtest: auf dem Zielstand von `aufbau-spieler` (Daten **und** Zonen/Aktionen von FF/FG) 0 Beanstandungen; die Doppelwahl erwartet den `seat_villager`-Schritt **am zweiten `seat_villager` der Folge** (27)', async () => {
  const [neu] = await beideStaende();
  assert.deepEqual(neu.r.problems, [], neu.r.problems.join('\n'));
  assert.equal(neu.zweiterSitz, 27, 'der zweite seat_villager steht nach FH an 27');
  assert.deepEqual(neu.doppel.keiner.aufbau, [[27, 'seat_villager', 'skipped']]);
  assert.deepEqual(neu.doppel.granny.aufbau, [[27, 'seat_villager', 'skipped']]);
});

test('FH Rauchtest: auf dem Stand von Welle 1 (Zonen vor FF, Aktionen vor FG, Aufbau ohne `spieler`) weiter 0 Beanstandungen, der zweite `seat_villager` steht an 26 – **beide Stände bestehen**', async () => {
  const [, alt] = await beideStaende();
  assert.deepEqual(alt.r.problems, [], alt.r.problems.join('\n'));
  assert.equal(alt.zweiterSitz, 26);
  assert.deepEqual(alt.doppel.keiner.aufbau, [[26, 'seat_villager', 'skipped']]);
  assert.deepEqual(alt.doppel.granny.aufbau, [[26, 'seat_villager', 'skipped']]);
});

test('FH Rauchtest: der Text der Ausgabe auf dem Zielstand ist der des Standes von Welle 1 — **bis auf zwei Zeilen**: die Kopfzeile (Zahl der Schritte und der Aktionsschritte) und die Zeile mit der Liste der Optionen (`spieler` kommt dazu); jede andere Zeile gleich', async () => {
  const [neu, alt] = await beideStaende();
  // `FI`: der Zielstand trägt seither **hinter** den Abschnitten 0 bis 4 den Abschnitt „5. Die Lagen“ (nur wo die Daten `villagers.lage` tragen) - er wird hier abgeschnitten
  // (nur **hinzugefügte** Zeilen, geprüft in `auslagen-lagen.test.js`); der Rest ist weiter Zeichen für Zeichen der von Welle 1.
  const ohneLagen = (out) => { const i = out.findIndex(z => /^\n5\. Die Lagen/.test(z)); return i < 0 ? out : [...out.slice(0, i), ...out.slice(out.findIndex(z => /^\nRauchtest: /.test(z)))]; };
  assert.equal(alt.r.out.some(z => /^\n5\. Die Lagen/.test(z)), false, 'Welle 1: kein Abschnitt 5');
  assert.equal(neu.r.out.some(z => /^\n5\. Die Lagen/.test(z)), true, 'Zielstand: Abschnitt 5');
  const a = ohneLagen(alt.r.out).join('\n').split('\n'), n = ohneLagen(neu.r.out).join('\n').split('\n');
  assert.equal(n.length, a.length, 'gleich viele Zeilen');
  const anders = a.map((z, i) => [z, n[i]]).filter(([x, y]) => x !== y);
  assert.deepEqual(anders.map(([x]) => x.slice(0, 10)), ['Aufbau: 31', '  seat_vil'], `nur zwei Zeilen: ${text(anders)}`);
  assert.match(anders[0][1], /Aufbau: 42 Schritte/);
  assert.equal(anders[1][0].replace('troedel, ', 'troedel, spieler, '), anders[1][1], 'die Optionenzeile: nur `spieler` ist dazugekommen');
});
