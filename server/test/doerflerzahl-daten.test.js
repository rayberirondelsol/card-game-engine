// ES Teil 1 / Spec M31.7, M31.12 — die Endkampf-Plättchen je Dörflerzahl als Daten: `scripts/doerflerzahl-daten.mjs`, Schritt `gelaende`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Zwei Teile. Der erste prüft die **reinen** Funktionen des Bausteins (`patchGelaende`, `beweise`) und die Messung
// (`MESSUNG`) gegen die Fixture `fixtures/doerflerzahl-kurzpartie.json` (die drei Spalten der Kurzpartie **nach M30**, als Text,
// so wie die Datenbank sie hält) und gegen die Maschinerie, die den Kampf aufbaut (`build_scenario`); Bibliothek, Raster, Zonen und
// Ausgangszustand kommen aus `auslagen-kurzpartie.json`. Der zweite lässt `main` gegen eine Wegwerf-Datenbank laufen
// (`--check`, `--write`, der zweite Lauf, `--zurueck`). Die Produktion berührt kein Test.
//
// **Die Messung steht hier ein zweites Mal** (`DOK`), und zwar **aus dem Dokument abgeschrieben** (`docs/endkampf-gelaende-doerflerzahl.md`,
// Abschnitt 2), nicht aus der Konstante des Bausteins — sonst prüfte der Vergleich nichts. Dazu liest ein Test dieselben Zellen noch einmal
// **aus der Datei des Dokuments**. Die Längen und Hashes des Ziels stehen **einmal** im Skript (`SCHRITTE`); hier werden sie importiert.
// Der Ausgang (die Fixture) ist hier als Zahl **festgehalten**: das ist der Zielstand von M30, nicht der des Bausteins.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import { seatedVillagers } from '../../shared/villagers.js';
import { validateScenarioData, terrainFor } from '../../shared/scenarioData.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { zoneContains } from '../../shared/zoneGeometry.js';
import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { bauen, ohneIds, seededRng } from '../../scripts/auslagen-daten.mjs';

const {
  SCHRITTE, GAME_ID, SETUP_ID, MESSUNG, zahlBei, patchGelaende, beweise, sicherungsHash, main,
  SPALTEN, patchWerte, beweiseWerte,
} = await import('../../scripts/doerflerzahl-daten.mjs');
const sw = await import('../../scripts/setupwahl-daten.mjs');
const { default: Database } = await import('better-sqlite3');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const dz = lies('doerflerzahl-kurzpartie.json');
const { assets, cards, zones, grids, state } = lies('auslagen-kurzpartie.json');

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

const scenario = JSON.parse(dz.scenario);
const sequence = JSON.parse(dz.sequence);
const AUSGANG = SCHRITTE.gelaende.ausgang, ZIEL = SCHRITTE.gelaende.ziel;
const ziel = patchGelaende(scenario);

const DREI = ['Deputy Waggums', 'Pepin Milkfrog', 'Samuel Strawman'];
const FEST = ['Virginia Fitz', 'The Bundits', 'Tilda Fields', 'Handsy', 'Umbrello'];

/**
 * Die Messung, abgeschrieben aus `docs/endkampf-gelaende-doerflerzahl.md` Abschnitt 2 (die Tabellen der drei „je Dörfler“, die Zeilen
 * „Plan“ der fünf festen): Bösewicht, Art, Zahl der Plättchen bei **drei** Dörflern, die Felder in der Reihenfolge `FF1` … `FF5`
 * (bei den festen: die Reihenfolge des Plans). Reihenfolge der Bösewichte wie in der Tabelle von Abschnitt 0 des Dokuments.
 */
const DOK = [
  ['Deputy Waggums',  'je-doerfler', 3, ['O13', 'N4', 'C5', 'D12', 'R8']],
  ['Virginia Fitz',   'fest',        5, ['B1', 'L3', 'S5', 'A8', 'R14']],
  ['The Bundits',     'fest',        1, ['E10']],
  ['Tilda Fields',    'fest',        1, ['F1:G2']],
  ['Handsy',          'fest',        5, ['P5', 'E7', 'M9', 'H10', 'M12']],
  ['Pepin Milkfrog',  'je-doerfler', 3, ['N14', 'A1', 'S9', 'M1', 'A9']],
  ['Samuel Strawman', 'je-doerfler', 3, ['R1:S2', 'C13:D14', 'A1:B2', 'R12:S13', 'M1:N2']],
  ['Umbrello',        'fest',        1, ['A5:B6']],
];
const felder = (name) => DOK.find(([n]) => n === name)[3];
const finalTerrain = (sc, name) => sc.bosses[name].final.terrain;
const zellen = (list) => list.flatMap(t => t.cells);

// ── Die Fixture ─────────────────────────────────────────────────────────────

test('ES: die Fixture ist der Ausgangsstand nach M30 – drei Spalten als Text, Länge und Hash gepinnt, so wie die Konstanten sie nennen', () => {
  const ERWARTET = { scenario: [20858, '82592d1ac883'], sequence: [2621, 'e859bd457002'], actions: [5803, '33033dace238'] };
  for (const [spalte, t] of [['scenario', dz.scenario], ['sequence', dz.sequence], ['actions', dz.actions]]) {
    assert.equal(typeof t, 'string', `${spalte} steht als Text da`);
    assert.deepEqual([t.length, sha(t)], ERWARTET[spalte], `${spalte}: Länge und Hash`);
    assert.equal(dz.sha[spalte], ERWARTET[spalte][1], `${spalte}: der Hash, den die Fixture nennt`);
    assert.equal(text(JSON.parse(t)), t, `${spalte} ist kompaktes JSON.stringify, wie die Datenbank es hält`);
  }
  // Dieselbe Zahl wie im Skript (`scenario`) und wie in M30 (`sequence`, `action`): eine Quelle, hier nur nachgesehen.
  assert.deepEqual(AUSGANG, { scenario: { laenge: 20858, sha: '82592d1ac883' } });
  assert.deepEqual(sw.SCHRITTE.zaehler.ziel.scenario, { laenge: 20858, sha: '82592d1ac883' });
  assert.deepEqual(sw.SCHRITTE.boss.ziel, { sequence: { laenge: 2621, sha: 'e859bd457002' }, action: { laenge: 5803, sha: '33033dace238' } });
  assert.equal(dz.setupId, SETUP_ID);
  assert.equal(GAME_ID, sw.GAME_ID);
  assert.equal(SETUP_ID, sw.SETUP_ID);
});

test('ES: die Fixture ist **gerechnet**, nicht abgetippt – `setupwahl-kurzpartie.json` durch `patchOptionen`, `patchZaehler`, `patchBoss` gibt sie Zeichen für Zeichen', () => {
  const alt = lies('setupwahl-kurzpartie.json');
  const o = sw.patchOptionen(JSON.parse(alt.scenario), JSON.parse(alt.sequence));
  const z = sw.patchZaehler(o.scenario, JSON.parse(alt.actions), zones);
  const b = sw.patchBoss(o.sequence, z.action);
  for (const r of [o, z, b]) assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  assert.equal(text(z.scenario), dz.scenario);
  assert.equal(text(b.sequence), dz.sequence);
  assert.equal(text(b.action), dz.actions);
});

// ── 1. Der Zielstand ────────────────────────────────────────────────────────

test('ES 1: Zielstand – Länge und Hash, so wie das Skript sie als Konstanten trägt', () => {
  assert.equal(ziel.art, 'zu-schreiben', (ziel.probleme ?? []).join('\n'));
  const sc = text(ziel.scenario);
  assert.deepEqual([sc.length, sha(sc)], [ZIEL.scenario.laenge, ZIEL.scenario.sha]);
  assert.ok(sc.length > dz.scenario.length, 'der Text ist länger geworden');
  assert.deepEqual(Object.keys(ziel), ['art', 'scenario'], 'der Zielstand trägt nur `scenario`');
});

test('ES 1: an den drei Bösewichten trägt Eintrag 3 `fromCount: 3`, dahinter zwei neue (4, 5) in der Reihenfolge `FF4`, `FF5`; alles andere byteweise gleich', () => {
  const a = scenario, b = ziel.scenario;
  assert.deepEqual(Object.keys(b), Object.keys(a));
  for (const k of Object.keys(a).filter(x => x !== 'bosses')) assert.equal(text(b[k]), text(a[k]), `scenario_data.${k}`);
  assert.deepEqual(Object.keys(b.bosses), Object.keys(a.bosses), 'dieselbe Reihenfolge der 20 Bösewichte');
  assert.equal(Object.keys(b.bosses).length, 20);
  for (const name of Object.keys(a.bosses).filter(n => !DREI.includes(n))) assert.equal(text(b.bosses[name]), text(a.bosses[name]), name);
  for (const name of DREI) {
    const x = a.bosses[name], y = b.bosses[name];
    assert.deepEqual(Object.keys(y), Object.keys(x), `${name}: dieselben Schlüssel in derselben Reihenfolge`);
    for (const k of Object.keys(x).filter(k => k !== 'final')) assert.equal(text(y[k]), text(x[k]), `${name}.${k}`);
    assert.deepEqual(Object.keys(y.final), Object.keys(x.final), `${name}.final`);
    for (const k of Object.keys(x.final).filter(k => k !== 'terrain')) assert.equal(text(y.final[k]), text(x.final[k]), `${name}.final.${k}`);
    const alt = x.final.terrain, neu = y.final.terrain;
    assert.equal(alt.length, 3, `${name}: drei Plättchen im Ausgang`);
    assert.equal(neu.length, 5, `${name}: fünf im Ziel`);
    assert.equal(text(neu[0]), text(alt[0]));
    assert.equal(text(neu[1]), text(alt[1]));
    assert.equal(text(neu[2]), text({ ...alt[2], fromCount: 3 }), `${name}: FF3 trägt fromCount 3, am Ende des Eintrags`);
    assert.deepEqual(neu.map(t => t.fromCount), [undefined, undefined, 3, 4, 5]);
    assert.deepEqual(zellen(neu), felder(name), `${name}: die fünf Felder der Messung, in der Reihenfolge FF1 … FF5`);
    // Die Schlüsselreihenfolge der neuen Einträge: wie die des Nachbarn, `fromCount` zuletzt (sie ist Teil des Hashes).
    for (const t of neu.slice(2)) assert.deepEqual(Object.keys(t), [...Object.keys(alt[0]), 'fromCount']);
  }
});

test('ES 1: Rückwärtsbeweis – die sechs Einträge und die drei Schlüssel entfernen: der gelesene Text, Zeichen für Zeichen', () => {
  const sc = copy(ziel.scenario);
  for (const name of DREI) {
    const t = sc.bosses[name].final.terrain;
    delete t[2].fromCount;
    t.splice(3);
  }
  assert.equal(text(sc), dz.scenario);
  // Und der Baustein sagt dasselbe, auf dem echten Paar.
  assert.deepEqual(beweise({ scenario }, ziel), []);
});

test('ES 1: der Beweis fängt, was nicht stimmt – ein Eintrag mehr, ein verändertes Feld, ein fremder Schlüssel, ein fester Bösewicht, ein fehlendes `fromCount`', () => {
  const vor = { scenario };
  const melde = (mut) => { const z = copy(ziel); mut(z.scenario); return beweise(vor, z); };
  assert.ok(melde(s => { s.bosses['Deputy Waggums'].final.terrain.push({ assetName: 'X', cells: ['A1'] }); }).length, 'ein sechster Eintrag');
  assert.ok(melde(s => { s.bosses['Pepin Milkfrog'].final.terrain[1].cells = ['A2']; }).length, 'FF2 verändert');
  assert.ok(melde(s => { s.bosses['Samuel Strawman'].final.terrain[0].rotation = 90; }).length, 'ein fremder Schlüssel an FF1');
  assert.ok(melde(s => { s.bosses['Samuel Strawman'].final.fields.EG[4] = 'M2:N3'; }).length, 'fields.EG berührt');
  assert.ok(melde(s => { s.bosses.Handsy.final.terrain[4].fromCount = 5; }).length, 'ein fester Bösewicht trägt fromCount');
  assert.ok(melde(s => { s.bosses['Virginia Fitz'].stats.BEW = 9; }).length, 'ein anderer Schlüssel');
  assert.ok(melde(s => { delete s.bosses['Deputy Waggums'].final.terrain[2].fromCount; }).length, 'FF3 ohne fromCount ist kein Zielstand');
  assert.ok(melde(s => { s.bosses['Deputy Waggums'].final.terrain.length = 4; }).length, 'nur vier Einträge');
  assert.ok(melde(s => { s.bosses = Object.fromEntries(Object.entries(s.bosses).reverse()); }).length, 'die Reihenfolge der Bösewichte');
});

// ── 2. Die Form der neuen Einträge ──────────────────────────────────────────

test('ES 2: Deputy Waggums – dasselbe Plättchen wie `FF1`–`FF3`, ohne `faceDown`, ohne Drehung', () => {
  const t = finalTerrain(ziel.scenario, 'Deputy Waggums');
  for (const e of t) assert.equal(e.assetName, 'Die Bundo-Königin / Beruhigungs-Leckerli');
  for (const e of t) assert.ok(!('faceDown' in e) && !('rotation' in e), 'wie der Nachbar: keines von beiden');
  assert.deepEqual(t.slice(3).map(e => e.cells), [['D12'], ['R8']]);
});

test('ES 2: Samuel Strawman – `Ritualzeichen / Weizenfeld`, `faceDown`, 2 × 2; ohne Drehung wie die Nachbarn', () => {
  const t = finalTerrain(ziel.scenario, 'Samuel Strawman');
  for (const e of t) { assert.equal(e.assetName, 'Ritualzeichen / Weizenfeld'); assert.equal(e.faceDown, true); assert.ok(!('rotation' in e)); }
  for (const e of t.slice(3)) {
    const [von, bis] = e.cells[0].split(':').map(c => [c.charCodeAt(0) - 64, Number(c.slice(1))]);
    assert.deepEqual([bis[0] - von[0], bis[1] - von[1]], [1, 1], `${e.cells[0]} ist 2 × 2`);
  }
});

test('ES 2: Pepin Milkfrog – die Bürger-Assets in der Reihenfolge der fünf Plättchen, die Handsy trägt (**erschlossen, nicht gelesen**), verdeckt, `Große Milchkanne`', () => {
  const t = finalTerrain(ziel.scenario, 'Pepin Milkfrog');
  const handsy = finalTerrain(ziel.scenario, 'Handsy');
  assert.deepEqual(t.map(e => e.assetName), handsy.map(e => e.assetName), 'FF1 … FF5 tragen die Assets von Handsys fünf Plättchen, in dessen Reihenfolge');
  assert.deepEqual(t.slice(3).map(e => e.assetName), ['Versteckter Bürger (Dörfler) / Große Milchkanne', 'Versteckter Bürger (blond) / Große Milchkanne']);
  for (const e of t) { assert.equal(e.faceDown, true); assert.ok(!('rotation' in e)); assert.ok(e.assetName.endsWith('/ Große Milchkanne')); }
  assert.equal(new Set(t.map(e => e.assetName)).size, 5, 'fünf verschiedene Assets');
  // Der Baustein vermerkt es im Kommentar – und das Bauprotokoll (`--check`) auch (siehe unten, `ES main`).
  const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8');
  assert.match(quelle, /Pepin[\s\S]{0,400}erschlossen[\s\S]{0,200}nicht gelesen|erschlossen[\s\S]{0,400}Pepin/i);
});

test('ES 2: jedes Asset der neuen Einträge gibt es in der Bibliothek, und der Prüfer ist zufrieden – Raster, Felder, `fromCount`', () => {
  for (const name of DREI) for (const e of finalTerrain(ziel.scenario, name)) {
    assert.ok(assets.some(a => a.name === e.assetName), `${name}: Asset „${e.assetName}“`);
  }
  assert.deepEqual(validateScenarioData(ziel.scenario, { assets, grids, cards }), []);
  assert.deepEqual(validateScenarioData(scenario, { assets, grids, cards }), [], 'und der Ausgang war es auch');
});

// ── 3. Die Messung: einmal im Baustein, einmal hier, einmal im Dokument ─────

test('ES 3: `MESSUNG` im Baustein gleich der Abschrift hier – Bösewicht, Art, Zahl bei drei, fünf Felder je Bösewicht; Reihenfolge wie in der Tabelle des Dokuments', () => {
  assert.deepEqual(Object.keys(MESSUNG), DOK.map(([n]) => n));
  for (const [name, art, bei3, f] of DOK) {
    const m = MESSUNG[name];
    assert.equal(m.art, art, `${name}: Art`);
    assert.deepEqual(m.felder, f, `${name}: Felder`);
    assert.equal(zahlBei(name, 3), bei3, `${name}: Zahl bei drei`);
    assert.match(m.quelle, /Abschnitt 2/, `${name}: der Verweis auf Abschnitt 2`);
  }
  // Die Zahlen bei drei, in der Reihenfolge der Tabelle: 3 / 5 / 1 / 1 / 5 / 3 / 3 / 1.
  assert.deepEqual(DOK.map(([n]) => zahlBei(n, 3)), [3, 5, 1, 1, 5, 3, 3, 1]);
  // Je Dörfler: die Zahl ist die Dörflerzahl; fest: bei jeder Zahl dieselbe.
  for (const [name, art, bei3] of DOK) for (const n of [2, 3, 4, 5]) assert.equal(zahlBei(name, n), art === 'fest' ? bei3 : n, `${name} bei ${n}`);
});

test('ES 3: und noch einmal **aus der Datei des Dokuments** – die Tabellen `FF1` … `FF5` der drei, jede Zelle (Abschnitt 2)', () => {
  const md = fs.readFileSync(new URL('../../docs/endkampf-gelaende-doerflerzahl.md', import.meta.url), 'utf8').replace(/\r/g, '');
  const abschnitt = md.slice(md.indexOf('## 2. Je Bösewicht'), md.indexOf('## 3. Die Regel'));
  assert.ok(abschnitt.length > 1000, 'Abschnitt 2 ist gefunden');
  for (const name of DREI) {
    const von = abschnitt.indexOf(`### ${name}`);
    assert.ok(von >= 0, `die Überschrift „${name}“`);
    const bis = abschnitt.indexOf('\n### ', von + 5);
    const teil = abschnitt.slice(von, bis < 0 ? undefined : bis);
    const zeilen = [...teil.matchAll(/^\| `FF(\d)` \| \*\*([A-S0-9:]+)\*\* \|/gm)];
    assert.deepEqual(zeilen.map(m => Number(m[1])), [1, 2, 3, 4, 5], `${name}: FF1 … FF5 stehen in der Tabelle`);
    assert.deepEqual(zeilen.map(m => m[2]), felder(name), `${name}: die Zellen des Dokuments gleich der Abschrift hier`);
    assert.deepEqual(zeilen.map(m => m[2]), MESSUNG[name].felder, `${name}: … und gleich dem Baustein`);
  }
});

test('ES 3: die Messung deckt sich mit den heutigen Daten, Feld für Feld – bei drei Dörflern, bei allen acht (Messung §4); `fields.EG` der drei trägt schon alle fünf', () => {
  for (const [name, , bei3, f] of DOK) {
    assert.deepEqual(zellen(finalTerrain(scenario, name)), f.slice(0, bei3), `${name}: die Daten legen bei drei Dörflern diese Felder`);
  }
  for (const name of DREI) assert.deepEqual(scenario.bosses[name].final.fields.EG, felder(name), `${name}: fields.EG`);
  // Nach dem Schritt: terrainFor gibt bei n Dörflern die ersten n Felder (je Dörfler) bzw. alle (fest).
  for (const [name, art, , f] of DOK) {
    for (const n of [2, 3, 4, 5]) {
      const soll = art === 'fest' ? f : f.slice(0, n);
      assert.deepEqual(zellen(terrainFor(ziel.scenario.bosses[name].final, n)), soll, `${name} bei ${n}`);
    }
  }
});

// ── 4. Die fünf festen ──────────────────────────────────────────────────────

test('ES 4: Virginia, Handsy, Bundits, Tilda, Umbrello – byteweise gleich, Hash je Eintrag vorher und nachher; ebenso alle anderen außer den dreien', () => {
  for (const name of FEST) {
    assert.equal(MESSUNG[name].art, 'fest', name);
    assert.equal(sha(text(ziel.scenario.bosses[name])), sha(text(scenario.bosses[name])), `${name}: Hash des Eintrags`);
    assert.equal(text(ziel.scenario.bosses[name]), text(scenario.bosses[name]), name);
    for (const t of finalTerrain(ziel.scenario, name)) assert.ok(!('fromCount' in t), `${name}: sie skalieren nicht`);
  }
  const alle = Object.keys(scenario.bosses);
  assert.equal(alle.filter(n => !DREI.includes(n)).length, 17);
  for (const n of alle.filter(n => !DREI.includes(n))) assert.equal(sha(text(ziel.scenario.bosses[n])), sha(text(scenario.bosses[n])), n);
  // `stats` aller zwanzig, auch der drei: gleich.
  for (const n of alle) assert.equal(sha(text(ziel.scenario.bosses[n].stats)), sha(text(scenario.bosses[n].stats)), `${n}.stats`);
});

// ── 5. Vorbedingung je Stück ────────────────────────────────────────────────

const abbruch = (r, ...teile) => {
  assert.equal(r.art, 'abweichend', `erwartet abweichend, war ${r.art}`);
  assert.ok(r.probleme.length > 0);
  assert.equal(r.scenario, undefined, 'ein Abbruch liefert keinen Zielstand');
  for (const t of teile) assert.ok(r.probleme.join('\n').includes(t), `die Meldung nennt „${t}“: ${r.probleme.join(' | ')}`);
  return r;
};
const mit = (fn, basis = scenario) => { const s = copy(basis); fn(s); return s; };
const pfad = (name, i) => `bosses["${name}"].final.terrain[${i}]`;

test('ES 5: die Fixture trägt genau die Stücke, die der Schritt erwartet – `FF1`–`FF3` sind `{ assetName, cells }` (Pepin und Samuel dazu `faceDown`), ohne `fromCount`', () => {
  for (const name of DREI) {
    const t = finalTerrain(scenario, name);
    assert.equal(t.length, 3, name);
    for (const e of t) {
      assert.deepEqual(Object.keys(e), name === 'Deputy Waggums' ? ['assetName', 'cells'] : ['assetName', 'cells', 'faceDown'], `${name}: ${text(e)}`);
      assert.ok(!('fromCount' in e));
    }
  }
  assert.equal(patchGelaende(scenario).art, 'zu-schreiben');
});

test('ES 5: jedes der neun Stücke muss genau das sein – ein Feld, ein Asset, ein Schlüssel mehr, ein `fromCount`: Abbruch mit Pfad und Index', () => {
  for (const name of DREI) {
    for (const i of [0, 1, 2]) {
      const p = pfad(name, i);
      abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[i].cells = ['A14']; })), p);
      abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[i].assetName += ' '; })), p);
      abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[i].rotation = 90; })), p);
      abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[i].fromCount = 2; })), p);
    }
  }
  // `faceDown` weg bei Pepin (er trägt es), `faceDown` dazu bei Deputy (er trägt es nicht).
  abbruch(patchGelaende(mit(s => { delete finalTerrain(s, 'Pepin Milkfrog')[1].faceDown; })), pfad('Pepin Milkfrog', 1));
  abbruch(patchGelaende(mit(s => { finalTerrain(s, 'Deputy Waggums')[0].faceDown = true; })), pfad('Deputy Waggums', 0));
});

test('ES 5: ein vierter Eintrag, kein Eintrag, kein `final`, kein Bösewicht, kein `bosses`: Abbruch mit Pfad', () => {
  abbruch(patchGelaende(mit(s => { finalTerrain(s, 'Pepin Milkfrog').push({ assetName: 'X', cells: ['A1'] }); })), pfad('Pepin Milkfrog', 3));
  abbruch(patchGelaende(mit(s => { finalTerrain(s, 'Pepin Milkfrog').pop(); })), pfad('Pepin Milkfrog', 2));
  abbruch(patchGelaende(mit(s => { delete s.bosses['Samuel Strawman'].final; })), 'Samuel Strawman');
  abbruch(patchGelaende(mit(s => { delete s.bosses['Deputy Waggums'].final.terrain; })), 'Deputy Waggums');
  abbruch(patchGelaende(mit(s => { delete s.bosses['Deputy Waggums']; })), 'Deputy Waggums');
  abbruch(patchGelaende(mit(s => { delete s.bosses; })), 'bosses');
  abbruch(patchGelaende(null));
  abbruch(patchGelaende({}));
});

test('ES 5: `fields.EG` der drei muss die fünf Felder der Messung tragen – sonst stimmen Daten und Messung nicht überein: Abbruch mit Pfad', () => {
  abbruch(patchGelaende(mit(s => { s.bosses['Samuel Strawman'].final.fields.EG[3] = 'R12:S14'; })), 'bosses["Samuel Strawman"].final.fields.EG');
  abbruch(patchGelaende(mit(s => { s.bosses['Deputy Waggums'].final.fields.EG.pop(); })), 'bosses["Deputy Waggums"].final.fields.EG');
  abbruch(patchGelaende(mit(s => { delete s.bosses['Pepin Milkfrog'].final.fields; })), 'bosses["Pepin Milkfrog"].final.fields.EG');
});

test('ES 5: die fünf festen müssen der Messung entsprechen – ein anderes Feld, ein Plättchen weniger, ein `fromCount`: Abbruch mit Pfad (sie werden nie angefasst)', () => {
  for (const name of FEST) {
    abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[0].cells = ['A14']; })), `bosses["${name}"].final.terrain`);
    abbruch(patchGelaende(mit(s => { finalTerrain(s, name).pop(); })), `bosses["${name}"].final.terrain`);
    abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[0].fromCount = 3; })), `bosses["${name}"].final.terrain`);
  }
});

test('ES 5: ein Bürger-Asset, das sonst nirgends in den Daten vorkommt, ist ein Abbruch – der Baustein kann nicht wissen, ob es das Asset gibt (er liest die Bibliothek nicht)', () => {
  // Handsy nennt `(blond)` und `(Dörfler)` – wer sie umbenennt, dem fehlt Pepins Beleg.
  const r = abbruch(patchGelaende(mit(s => { finalTerrain(s, 'Handsy')[4].assetName = 'Versteckter Bürger (rot) / Große Milchkanne'; })), 'Versteckter Bürger (blond) / Große Milchkanne');
  assert.match(r.probleme.join('\n'), /Pepin Milkfrog/);
});

test('ES 5: schon geschrieben – nichts zu tun, die Eingabe kommt gleich zurück (als Kopie) und wird nicht verändert', () => {
  const vorher = text(ziel.scenario);
  const r = patchGelaende(ziel.scenario);
  assert.equal(r.art, 'schon-da');
  assert.equal(text(r.scenario), vorher);
  assert.notEqual(r.scenario, ziel.scenario, 'eine Kopie');
  assert.equal(text(ziel.scenario), vorher, 'die Eingabe ist unverändert');
  const aus = text(scenario);
  patchGelaende(scenario);
  assert.equal(text(scenario), aus, 'auch der Ausgang wird nicht verändert');
});

test('ES 5: ein **anderer** Wert ist ein Abbruch – `fromCount` falsch an `FF3`, `FF4` oder `FF5`, ein anderes Feld oder Asset an `FF4`/`FF5`, ein Text statt einer Zahl', () => {
  for (const [i, richtig] of [[2, 3], [3, 4], [4, 5]]) {
    for (const falsch of [richtig - 1, richtig + 1, '3', 3.5, null]) {
      if (falsch === richtig) continue;
      for (const name of DREI) abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[i].fromCount = falsch; }, ziel.scenario)), pfad(name, i));
    }
  }
  for (const name of DREI) {
    for (const i of [3, 4]) {
      abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[i].cells = ['A14']; }, ziel.scenario)), pfad(name, i));
      abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[i].assetName = finalTerrain(s, name)[0].assetName === finalTerrain(s, name)[i].assetName ? 'Pile of Locals' : finalTerrain(s, name)[0].assetName; }, ziel.scenario)), pfad(name, i));
      abbruch(patchGelaende(mit(s => { delete finalTerrain(s, name)[i].fromCount; }, ziel.scenario)), pfad(name, i));
    }
  }
  abbruch(patchGelaende(mit(s => { finalTerrain(s, 'Pepin Milkfrog').push({ assetName: 'X', cells: ['A1'], fromCount: 5 }); }, ziel.scenario)), pfad('Pepin Milkfrog', 5));
});

test('ES 5: ein **teilweise** geschriebener Stand ist ein Abbruch – ein Bösewicht neu, die anderen alt; `FF3` mit `fromCount` ohne `FF4`/`FF5`; `FF4` ohne `FF5`; `FF4`/`FF5` ohne `fromCount` an `FF3`', () => {
  for (const name of DREI) {
    // Einer fertig, die zwei anderen nicht.
    const einer = mit(s => { s.bosses[name] = copy(ziel.scenario.bosses[name]); });
    const r = abbruch(patchGelaende(einer), 'halber Stand');
    assert.ok(DREI.filter(n => n !== name).every(n => r.probleme.join('\n').includes(n)) || r.probleme.join('\n').includes(name), r.probleme.join(' | '));
    // Zwei fertig, einer nicht.
    const zwei = mit(s => { for (const n of DREI.filter(x => x !== name)) s.bosses[n] = copy(ziel.scenario.bosses[n]); });
    abbruch(patchGelaende(zwei), 'halber Stand');
    // Innerhalb eines Bösewichts.
    abbruch(patchGelaende(mit(s => { finalTerrain(s, name).splice(3); }, ziel.scenario)), 'halber Stand');
    abbruch(patchGelaende(mit(s => { finalTerrain(s, name).splice(4); }, ziel.scenario)), 'halber Stand');
    abbruch(patchGelaende(mit(s => { delete finalTerrain(s, name)[2].fromCount; }, ziel.scenario)), 'halber Stand');
    abbruch(patchGelaende(mit(s => { finalTerrain(s, name)[2].fromCount = 3; finalTerrain(s, name).push(copy(finalTerrain(ziel.scenario, name)[3])); })), 'halber Stand');
  }
});

// ── 6. Die Zahl je Dörflerzahl: der Tisch ───────────────────────────────────

/** Die Datenbank kennt drei Plätze; die zwei weiteren (M31.8) schreibt ein späterer Schritt. Hier synthetisch, **in beiden** Ständen gleich. */
const mitFuenfPlaetzen = (sc) => mit(c => {
  c.villagers.seats.push(
    { anchor: 'Tableau: Blopsy Twins', zones: 'Dörfler 4', markers: 'Marker 4', vorrat: 'Ausrüstung Dörfler 4', tableau: { x: 2040, y: 1600 } },
    { anchor: 'Tableau: Yancy Plover', zones: 'Dörfler 5', markers: 'Marker 5', vorrat: 'Ausrüstung Dörfler 5', tableau: { x: 2620, y: 1600 } },
  );
}, sc);
const SC_ALT = mitFuenfPlaetzen(scenario), SC_NEU = mitFuenfPlaetzen(ziel.scenario);
const AUFBAU = bauen({ state, sequence, zones, grids, assets, cards, scenarioData: scenario }, {}, 1);
const assetOf = (name) => assets.find(a => a.name === name);

/** Ein Tisch, an dem genau `n` Tableaus liegen (Plätze 1 … n): zwei nehmen Granny weg, vier und fünf legen Blopsy und Yancy dazu. */
function tischFuer(n) {
  const s = copy(AUFBAU.state);
  if (n < 3) s.tokens = s.tokens.filter(t => t.label !== 'Tableau: Granny Melba');
  for (const name of ['Blopsy Twins', 'Yancy Plover'].slice(0, Math.max(0, n - 3))) {
    s.tokens.push({ id: `t-${name}`, label: `Tableau: ${name}`, assetId: assetOf(`Tableau: ${name}`).id, x: 10, y: 10, shape: 'image', size: 300 });
  }
  assert.equal(seatedVillagers(s, assets, SC_NEU.villagers).length, n, `am Tisch sitzen ${n}`);
  return s;
}
const TISCHE = Object.fromEntries([2, 3, 4, 5].map(n => [n, tischFuer(n)]));
const leiste = (s) => resolveZones(zones, anchorBoxes(s.boards, s.tokens)).find(z => z.label === 'Bösewicht-Leiste');
/** Die verdeckten Plättchen der Leiste tragen den Namen dieses Bösewichts – der nächste Kampf ist dann **dieser**. */
function mitBoss(s, name) {
  const k = copy(s);
  let n = 0;
  for (const t of k.tokens) if (t.backImageUrl && zoneContains(leiste(k), t.x, t.y)) { t.label = `Bösewicht: ${name}`; n++; }
  assert.ok(n > 0, 'es liegt noch ein verdecktes Plättchen auf der Leiste');
  return k;
}
/** Den Endkampf (oder nur den ersten Kampf) dieses Bösewichts an einem Tisch mit `n` Dörflern aufbauen. */
function kampf(sc, n, name, final) {
  return executeSequenceWithLog(mitBoss(TISCHE[n], name), [
    { type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Bösewicht-Platz' },
    { type: 'build_scenario', final },
  ], zones, { assets, cards, grids, scenarioData: sc, rng: seededRng(7) });
}
const gelegt = (r, vorher) => r.state.tokens.filter(t => t.gridId && !vorher.has(t.id));
/** Die Endkampf-Plättchen: was mit `final: true` mehr liegt als mit `final: false`, als Feld je Plättchen, in der Reihenfolge des Legens. */
function endkampf(sc, n, name) {
  const vorher = new Set(TISCHE[n].tokens.map(t => t.id));
  const mit = kampf(sc, n, name, true), ohne = kampf(sc, n, name, false);
  for (const r of [mit, ohne]) assert.deepEqual(r.log.filter(e => e.status === 'failed'), [], `${name} bei ${n}: ${r.log.map(e => e.reason).join(' | ')}`);
  const rest = gelegt(mit, vorher).map(t => t.cell);
  for (const c of gelegt(ohne, vorher).map(t => t.cell)) rest.splice(rest.indexOf(c), 1);
  return rest;
}

test('ES 6: mit **2, 3, 4, 5** Dörflern legen Deputy, Pepin und Samuel 2 / 3 / 4 / 5 Plättchen, Virginia 5, Handsy 5, Bundits 1, Tilda 1, Umbrello 1 – auf den Feldern der Messung', () => {
  for (const [name, art, bei3, f] of DOK) {
    for (const n of [2, 3, 4, 5]) {
      const soll = art === 'fest' ? bei3 : n;
      const got = endkampf(SC_NEU, n, name);
      assert.equal(got.length, soll, `${name} bei ${n} Dörflern: ${got.join(', ')}`);
      assert.deepEqual(got, f.slice(0, soll), `${name} bei ${n}: die Felder, in der Reihenfolge FF1 …`);
    }
  }
});

test('ES 6: **vor** dem Patch legen alle acht bei jeder Zahl dasselbe – ohne Daten geschieht nichts (Deputy, Pepin, Samuel immer drei)', () => {
  for (const [name, , bei3, f] of DOK) {
    for (const n of [2, 3, 4, 5]) assert.deepEqual(endkampf(SC_ALT, n, name), f.slice(0, bei3), `${name} bei ${n}`);
  }
});

test('ES 6: mit **drei** Dörflern ist der Tisch derselbe wie mit dem Ausgangsstand – alle 20 Bösewichte, Endkampf und nicht, Tokens, Karten, Zähler, Stapel, Boards, Protokoll', () => {
  const namen = Object.keys(scenario.bosses);
  assert.equal(namen.length, 20);
  let verglichen = 0;
  for (const name of namen) {
    for (const final of [false, true]) {
      const alt = kampf(SC_ALT, 3, name, final), neu = kampf(SC_NEU, 3, name, final);
      for (const feld of ['tokens', 'cards', 'counters', 'boards']) assert.deepEqual(ohneIds(neu.state[feld]), ohneIds(alt.state[feld]), `${name} (final ${final}): ${feld}`);
      assert.deepEqual(ohneIds(neu.state.stacks), ohneIds(alt.state.stacks), `${name}: stacks`);
      assert.deepEqual(neu.log.map(e => [e.index, e.type, e.status, e.reason]), alt.log.map(e => [e.index, e.type, e.status, e.reason]), `${name} (final ${final}): Protokoll`);
      verglichen++;
    }
  }
  assert.equal(verglichen, 40);
  // Nicht leer verglichen: bei einem Endkampf liegt etwas.
  assert.equal(endkampf(SC_NEU, 3, 'Deputy Waggums').length, 3);
});

test('ES 6: bei **zwei, vier und fünf** ändert sich nur, was sich ändern soll – die fünf festen, die zwölf ohne Endkampf-Plättchen und der erste Kampf aller anderen legen dasselbe wie vorher', () => {
  for (const n of [2, 4, 5]) {
    for (const name of Object.keys(scenario.bosses)) {
      const alt = kampf(SC_ALT, n, name, false), neu = kampf(SC_NEU, n, name, false);
      assert.deepEqual(ohneIds(neu.state.tokens), ohneIds(alt.state.tokens), `${name} bei ${n}: der erste Kampf`);
      if (!DREI.includes(name)) {
        const a = kampf(SC_ALT, n, name, true), b = kampf(SC_NEU, n, name, true);
        assert.deepEqual(ohneIds(b.state.tokens), ohneIds(a.state.tokens), `${name} bei ${n}: der Endkampf`);
        assert.deepEqual(ohneIds(b.state.cards), ohneIds(a.state.cards), `${name} bei ${n}: die Karten`);
      }
    }
  }
});

test('ES 6: die Karten folgen den gelegten Plättchen – bei zwei Dörflern keine Karte für ein Plättchen, das nicht liegt', () => {
  // Waggums' Plättchen (`Bundo-Königin / Beruhigungs-Leckerli`) hat eine Karte oder keine – gleich, wie viele Karten es **mehr** gibt als im ersten Kampf.
  const zahl = (n) => kampf(SC_NEU, n, 'Deputy Waggums', true).state.cards.length - kampf(SC_NEU, n, 'Deputy Waggums', false).state.cards.length;
  assert.ok(zahl(2) <= zahl(3) && zahl(3) <= zahl(4) && zahl(4) <= zahl(5), `${[2, 3, 4, 5].map(zahl)}`);
});

// ── 7. Disjunkt ─────────────────────────────────────────────────────────────

/** Ein Platzhalter für `werte` (seit ET gibt es den echten Schritt, `ET 7` prüft ihn): `baseCount` und ein `statsByCount` an jedem Bösewicht mit Zahlenwerten – berührt nur `stats`-Stücke. */
const mitWerten = (sc) => mit(s => {
  s.villagers.baseCount = 3;
  for (const b of Object.values(s.bosses)) if (typeof b.stats?.BEW === 'number') b.statsByCount = { 2: { ...b.stats }, 4: { ...b.stats }, 5: { ...b.stats } };
}, sc);

test('ES 7: berührt nur `scenario_data` – der Zielstand trägt nichts anderes, und vor und nach `werte` ist der Schritt anwendbar, mit **demselben** Text', () => {
  assert.deepEqual(Object.keys(ziel), ['art', 'scenario']);
  const vorWerte = patchGelaende(scenario);
  const nachWerte = patchGelaende(mitWerten(scenario));
  assert.equal(nachWerte.art, 'zu-schreiben', (nachWerte.probleme ?? []).join('\n'));
  assert.equal(text(nachWerte.scenario), text(mitWerten(vorWerte.scenario)), 'gelaende dann werte = werte dann gelaende');
  assert.deepEqual(beweise({ scenario: mitWerten(scenario) }, nachWerte), []);
  // Und der Zielstand ist nach `werte` noch „schon geschrieben“.
  assert.equal(patchGelaende(mitWerten(vorWerte.scenario)).art, 'schon-da');
});

// ── 8. Das Gerüst ───────────────────────────────────────────────────────────

test('ES 8: `SCHRITTE` – sechs Schritte, `gelaende` mit `{ ausgang, ziel }`, die vier anderen `null` bis gebaut (`werte` ist seit ET gebaut, siehe dort)', () => {
  assert.deepEqual(Object.keys(SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen']);
  assert.deepEqual(Object.keys(SCHRITTE.gelaende), ['ausgang', 'ziel']);
  for (const k of ['ausgang', 'ziel']) {
    assert.deepEqual(Object.keys(SCHRITTE.gelaende[k]), ['scenario'], k);
    assert.deepEqual(Object.keys(SCHRITTE.gelaende[k].scenario), ['laenge', 'sha'], k);
  }
  for (const k of ['assets', 'aktionen', 'optionen']) assert.equal(SCHRITTE[k], null, k);
  assert.equal(GAME_ID, '072123c0-cd97-4ffb-a330-369630fab93f');
  assert.equal(SETUP_ID, 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b');
});

test('ES 8: der Kopf des Skripts nennt weder Länge noch Hash des Ziels oder des Ausgangs – sie stehen als Konstanten, hier wird importiert', () => {
  const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8').replace(/\r/g, '');
  const kopf = quelle.split('\n').filter((l, i, alle) => alle.slice(0, i + 1).every(x => x.startsWith('//') || x.trim() === '')).join('\n');
  assert.ok(kopf.length > 400, 'der Kopf ist gefunden');
  for (const z of [AUSGANG, ZIEL]) {
    const { laenge, sha: h } = z.scenario;
    assert.ok(!kopf.includes(h), `der Kopf nennt ${h}`);
    for (const l of [String(laenge), String(laenge).replace(/(\d)(\d{3})$/, '$1 $2'), String(laenge).replace(/(\d)(\d{3})$/, '$1.$2')]) {
      assert.ok(!kopf.includes(l), `der Kopf nennt ${l}`);
    }
  }
  // Auch die Hashes der Spalten, die dieser Schritt nicht berührt, stehen nicht im Kopf.
  for (const h of ['e859bd457002', '33033dace238']) assert.ok(!kopf.includes(h), h);
});

test('ES 8: die Datei startet nur, wenn `process.argv[1]` auf ihren **eigenen** Namen endet – unter anderem Namen läuft sie still durch (Exit 0, leere Ausgabe)', () => {
  const url = new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url).href;
  const lauf = (argv1) => {
    try { return { code: 0, out: execFileSync(process.execPath, ['--input-type=module', '-e', `process.argv[1] = ${text(argv1)}; await import(${text(url)}); await new Promise(r => setTimeout(r, 300));`], { stdio: 'pipe', encoding: 'utf8' }) }; }
    catch (e) { return { code: e.status, out: `${e.stdout}${e.stderr}` }; }
  };
  const fremd = lauf('C:/irgendwo/alt-gelaende.mjs');
  assert.equal(fremd.code, 0);
  assert.equal(fremd.out, '', 'unter anderem Namen: leere Ausgabe');
  const eigen = lauf('/app/doerflerzahl-daten.mjs');
  assert.equal(eigen.code, 2, eigen.out);
  assert.match(eigen.out, /usage/);
});

// ── Die Läufe gegen eine Wegwerf-Datenbank ──────────────────────────────────

/** Das echte Schema (`setupDatabase` in einem Kindprozess), die Bibliothek aus dem Auszug, die Kurzpartie mit den drei Spalten **aus der Fixture**, ein zweiter Aufbau, drei Spielstände. */
function frischeDatenbank({ scen = dz.scenario, seq = dz.sequence, act = dz.actions } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-doerflerzahl-'));
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
  for (const a of assets) {
    db.prepare('insert into table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(a.id, GAME_ID, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category));
  }
  for (const c of cards) {
    db.prepare('insert into cards (id, game_id, category_id, name, image_path, width, height) values (?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, GAME_ID, catId(c.category), c.name, c.image_path, c.width, c.height);
  }
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Aufbau', JSON.stringify(state), JSON.stringify(zones), seq, JSON.stringify(grids), act, scen);
  db.prepare("insert into setups (id, game_id, name, sequence_data, scenario_data, action_data) values (?, ?, 'Grundaufbau', '[{\"type\":\"shuffle\"}]', '{}', '[]')").run(randomUUID(), GAME_ID);
  for (const [n, d] of [['Auto Save', '{"a":0}'], ['Partie 14 – Sieg gegen Virginia Fitz', '{"a":1}'], ['Partie 13 – Endkampf', '{"a":2}']]) {
    db.prepare('insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, ?, ?, ?)').run(randomUUID(), GAME_ID, n, d, SETUP_ID);
  }
  db.close();
  return { tmp, file };
}

/** `main` laufen lassen und aufschreiben, was es ausgibt. */
async function lauf(args, { haken, Db = Database } = {}) {
  const zeilen = [], fehler = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => zeilen.push(a.join(' '));
  console.error = (...a) => fehler.push(a.join(' '));
  try {
    const code = await main(args, { Database: Db, haken });
    return { code, out: [...zeilen, ...fehler].join('\n') };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

/** Alles, was in der Datenbank steht – neu gelesen, alle Tabellen, alle Spalten. */
const alles = (file) => {
  const db = new Database(file, { readonly: true });
  const out = {};
  for (const { name } of db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all()) {
    out[name] = db.prepare(`select * from "${name}" order by rowid`).all();
  }
  db.close();
  return out;
};
const zeile = (file) => {
  const db = new Database(file, { readonly: true });
  const r = db.prepare('select * from setups where id = ?').get(SETUP_ID);
  db.close();
  return r;
};
const ohneSpalte = (a) => ({ ...a, setups: a.setups.map(r => ({ ...r, scenario_data: undefined })) });
const weg = (tmp) => fs.rmSync(tmp, { recursive: true, force: true });
const setze = (file, spalte, t) => {
  const db = new Database(file);
  db.prepare(`update setups set ${spalte} = ? where id = ?`).run(t, SETUP_ID);
  db.close();
};
const sicherung = (tmp, scen = dz.scenario) => {
  const datei = path.join(tmp, 'sicherung.json');
  const h = sicherungsHash(scen);
  fs.writeFileSync(datei, JSON.stringify({ scenario_data: scen, sha256: h, updated_at: '2026-11-09 00:00:00' }));
  return { datei, h };
};
const schreiben = (file, h, extra = []) => ['--write', file, '--schritt', 'gelaende', '--sicherung-sha', h.slice(0, 16), ...extra];
const ZIELTEXT = text(ziel.scenario);

test('ES main: `--check` am Ausgangsstand – schreibgeschützt, „zu schreiben“, Plan, Beweis, Prüfer, Zielstand, Hash für die Sicherung, der Hinweis auf Pepin', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    fs.chmodSync(file, 0o444);
    const r = await lauf(['--check', file, '--schritt', 'gelaende']);
    fs.chmodSync(file, 0o666);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, new RegExp(`gelesen: scenario_data ${dz.scenario.length} Zeichen`));
    assert.match(r.out, /Einordnung: zu schreiben/);
    for (const name of DREI) assert.ok(r.out.includes(name), `der Plan nennt ${name}`);
    assert.match(r.out, /fromCount/);
    assert.match(r.out, /Rückwärtsbeweis scenario_data: ja/);
    assert.match(r.out, /validateScenarioData: 0 Probleme/);
    assert.ok(r.out.includes(`Zielstand: scenario_data ${ZIEL.scenario.laenge} Zeichen (sha ${ZIEL.scenario.sha})`), r.out);
    assert.ok(r.out.includes(sicherungsHash(dz.scenario)), 'der Hash, den --write als Sicherung verlangt, steht da');
    assert.match(r.out, /würde schreiben/);
    assert.match(r.out, /Pepin[^\n]*erschlossen/i, 'der Hinweis steht im Bauprotokoll');
    assert.doesNotMatch(r.out, /Beanstandungen:? [1-9]/);
    assert.deepEqual(alles(file), vorher, '--check hat nichts geschrieben');
  } finally { weg(tmp); }
});

test('ES main: `--check` öffnet schreibgeschützt, `--write` nicht; geschrieben wird mit **einem** UPDATE auf `scenario_data`, gelesen **nur** `scenario_data`', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const optionen = [], sql = [];
    class Spion extends Database {
      constructor(pfad, opt) { optionen.push(opt); super(pfad, opt); }
      prepare(s) { sql.push(s); return super.prepare(s); }
    }
    assert.equal((await lauf(['--check', file, '--schritt', 'gelaende'], { Db: Spion })).code, 0);
    assert.equal(optionen.at(-1).readonly, true);
    const lesend = new Database(file, { readonly: true });
    assert.throws(() => lesend.prepare('update setups set name = name').run(), /readonly/i);
    lesend.close();

    sql.length = 0;
    const { h } = sicherung(tmp);
    const w = await lauf(schreiben(file, h), { Db: Spion });
    assert.equal(w.code, 0, w.out);
    assert.equal(optionen.at(-1).readonly, false);
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const schreibend = sql.filter(s => /^\s*(update|insert|delete|replace|drop|alter|create)\b/i.test(s));
    assert.equal(schreibend.length, 1, schreibend.join('\n'));
    assert.match(norm(schreibend[0]), /^update setups set scenario_data = \? where id = \? and scenario_data = \?$/i);
    // Was sonst gelesen wird: Fingerabdruck und Spaltenhashes (Hashes, nichts davon wird gelesen, um damit zu rechnen) – und **eine** Abfrage der Spalte.
    const erlaubt = sql.filter(s => !/order by rowid|sqlite_master|^\s*pragma|^\s*update setups set scenario_data/i.test(s)).map(norm);
    const gelesen = [...new Set(erlaubt)];
    assert.deepEqual(gelesen.filter(s => !/^select \* from setups where id = \?$/i.test(s)), ['select game_id, scenario_data from setups where id = ?'], gelesen.join('\n'));
    for (const s of gelesen) assert.doesNotMatch(s, /sequence_data|action_data|zone_data|grid_data|state_data|table_assets|from cards|save_states/i, s);
  } finally { weg(tmp); }
});

test('ES main: `--write` mit Sicherung – `scenario_data` auf dem Zielstand, **nichts sonst** geändert (`sequence_data`, `action_data`, Zonen, Assets, Spielstände), Kontrollausgabe neu gelesen', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const { h } = sicherung(tmp);
    const r = await lauf(schreiben(file, h));
    assert.equal(r.code, 0, r.out);
    const z = zeile(file);
    assert.equal(z.scenario_data, ZIELTEXT);
    assert.deepEqual([z.scenario_data.length, sha(z.scenario_data)], [ZIEL.scenario.laenge, ZIEL.scenario.sha]);
    assert.deepEqual(ohneSpalte(alles(file)), ohneSpalte(vorher), 'jede andere Spalte, Zeile und Tabelle (auch updated_at, save_states) ist gleich');
    assert.equal(z.sequence_data, dz.sequence);
    assert.equal(z.action_data, dz.actions);
    assert.match(r.out, /geschrieben: scenario_data/);
    assert.ok(r.out.includes(`${dz.scenario.length} → ${ZIEL.scenario.laenge} Zeichen, sha ${AUSGANG.scenario.sha} → ${ZIEL.scenario.sha}`), r.out);
    assert.match(r.out, /Rückwärtsbeweis scenario_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /validateScenarioData auf der gelesenen Spalte: 0 Probleme/);
    assert.match(r.out, /Zielstand aus den Konstanten \(.*\): erreicht/);
    assert.match(r.out, /save_states Auto Save: sha \w+ → \w+ gleich/);
    assert.match(r.out, /Deputy Waggums[^\n]*5 Plättchen/);
    assert.match(r.out, /Virginia Fitz[^\n]*gleich/);
  } finally { weg(tmp); }
});

test('ES main: der zweite Lauf – „schon geschrieben“, Rückgabe 0, nichts geschrieben, auch ohne Sicherung', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h))).code, 0);
    const nach1 = alles(file);
    const check = await lauf(['--check', file, '--schritt', 'gelaende']);
    assert.equal(check.code, 0, check.out);
    assert.match(check.out, /schon geschrieben/);
    const r = await lauf(['--write', file, '--schritt', 'gelaende']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /schon geschrieben/);
    assert.match(r.out, /nichts zu schreiben/);
    assert.deepEqual(alles(file), nach1);
  } finally { weg(tmp); }
});

test('ES main: ohne Sicherung kein Schreiben – fehlender Hash, falsche Form, falscher Hash, der Hash einer anderen Spalte; nichts geändert', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const ohne = await lauf(['--write', file, '--schritt', 'gelaende']);
    assert.equal(ohne.code, 1);
    assert.match(ohne.out, /ohne Sicherung kein Schreiben/);
    const kurz = await lauf(['--write', file, '--schritt', 'gelaende', '--sicherung-sha', 'abc']);
    assert.equal(kurz.code, 1);
    assert.match(kurz.out, /12 Hex-Stellen/);
    const falsch = await lauf(['--write', file, '--schritt', 'gelaende', '--sicherung-sha', 'deadbeefdead']);
    assert.equal(falsch.code, 1);
    assert.match(falsch.out, /passt nicht zum gelesenen Text/);
    // Der Hash des bloßen Textes (statt des Sicherungshashes) und der einer anderen Spalte reichen nicht.
    for (const andere of [sha(dz.scenario), sha(dz.sequence), sha(dz.actions)]) {
      const r = await lauf(['--write', file, '--schritt', 'gelaende', '--sicherung-sha', andere]);
      assert.equal(r.code, 1, andere);
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ES main: ein anderer Stand ist ein Abbruch mit Pfad – ein Feld anders, ein halber Stand, ein fester Bösewicht anders: nichts geschrieben, kein Schalter dagegen', async () => {
  for (const [wie, mut, pfadTeil] of [
    ['ein Feld', (s) => { finalTerrain(s, 'Pepin Milkfrog')[1].cells = ['B2']; }, 'bosses["Pepin Milkfrog"].final.terrain[1]'],
    ['halber Stand', (s) => { s.bosses['Samuel Strawman'] = copy(ziel.scenario.bosses['Samuel Strawman']); }, 'halber Stand'],
    ['ein fester', (s) => { finalTerrain(s, 'Handsy')[0].cells = ['A1']; }, 'bosses["Handsy"].final.terrain'],
  ]) {
    const fremd = mit(mut);
    const { tmp, file } = frischeDatenbank({ scen: text(fremd) });
    try {
      const vorher = alles(file);
      const c = await lauf(['--check', file, '--schritt', 'gelaende']);
      assert.equal(c.code, 1, `${wie}: ${c.out}`);
      assert.match(c.out, /ABWEICHEND/);
      assert.ok(c.out.includes(pfadTeil), `${wie}: ${c.out}`);
      assert.match(c.out, /es wird nichts überschrieben/);
      assert.doesNotMatch(c.out, /würde schreiben/);
      const { h } = sicherung(tmp, text(fremd));
      const w = await lauf(schreiben(file, h));
      assert.equal(w.code, 1, `${wie}: ${w.out}`);
      assert.deepEqual(alles(file), vorher, wie);
    } finally { weg(tmp); }
  }
});

test('ES main: ein Stand, der nicht kompaktes JSON.stringify ist, wird nicht angefasst (der Text-Vergleich trüge nicht)', async () => {
  const lose = JSON.stringify(scenario, null, 1);
  const { tmp, file } = frischeDatenbank({ scen: lose });
  try {
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'gelaende']);
    assert.equal(c.code, 1);
    assert.match(c.out, /kompaktes JSON/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ES main: Vergleich-und-Tausch – ändert jemand `scenario_data` zwischen Lesen und Schreiben, wird nichts geschrieben, die fremde Änderung bleibt stehen', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { h } = sicherung(tmp);
    const fremd = dz.scenario + ' ';
    const r = await lauf(schreiben(file, h), { haken: (stelle, db) => { if (stelle === 'nach-lesen') db.prepare('update setups set scenario_data = ? where id = ?').run(fremd, SETUP_ID); } });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /seit dem Lesen geändert/);
    assert.equal(zeile(file).scenario_data, fremd);
  } finally { weg(tmp); }
});

test('ES main: ändert sich in der Transaktion eine andere Tabelle (Auto Save) oder eine andere Spalte des Aufbaus, rollt alles zurück', async () => {
  for (const sql of [
    "update save_states set state_data = '{\"a\":99}' where name = 'Auto Save'",
    "update setups set action_data = '[]' where id = '" + SETUP_ID + "'",
    "update setups set sequence_data = '[]' where id = '" + SETUP_ID + "'",
    "update setups set name = 'anders' where id = '" + SETUP_ID + "'",
  ]) {
    const { tmp, file } = frischeDatenbank();
    try {
      const vorher = alles(file);
      const { h } = sicherung(tmp);
      const r = await lauf(schreiben(file, h), { haken: (stelle, db) => { if (stelle === 'in-transaktion') db.prepare(sql).run(); } });
      assert.equal(r.code, 1, `${sql}: ${r.out}`);
      assert.match(r.out, /unerwartet geändert/);
      assert.deepEqual(alles(file), vorher, `Rollback: ${sql}`);
    } finally { weg(tmp); }
  }
});

test('ES main: `--zurueck` – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen; ein zweites Mal ist „schon der Ausgangsstand“', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const { datei, h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h))).code, 0);
    assert.notDeepEqual(alles(file), vorher);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'gelaende']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /zurückgeschrieben/);
    assert.match(r.out, /\(= die Sicherung, Zeichen für Zeichen\)/);
    assert.deepEqual(alles(file), vorher, 'jede Tabelle, jede Spalte wie am Anfang');
    const nochmal = await lauf(['--zurueck', datei, file, '--schritt', 'gelaende']);
    assert.equal(nochmal.code, 0, nochmal.out);
    assert.match(nochmal.out, /schon der Ausgangsstand/);
  } finally { weg(tmp); }
});

test('ES main: `--zurueck` ersetzt nur den exakten Zielstand – hat jemand danach weitergearbeitet, bleibt alles stehen', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { datei, h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h))).code, 0);
    setze(file, 'scenario_data', zeile(file).scenario_data + ' ');
    const vorher = alles(file);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'gelaende']);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /nicht der Zielstand/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ES main: `--zurueck` prüft die Sicherung – beschädigt, nicht kompakt, nicht der Ausgang dieses Schritts, falsche Form: nichts wird überschrieben', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h))).code, 0);
    const vorher = alles(file);
    const schreibe = (name, o) => { const d = path.join(tmp, name); fs.writeFileSync(d, JSON.stringify(o)); return d; };
    const gut = { scenario_data: dz.scenario, sha256: sicherungsHash(dz.scenario) };
    const kaputt = await lauf(['--zurueck', schreibe('a.json', { ...gut, sha256: 'f'.repeat(64) }), file, '--schritt', 'gelaende']);
    assert.equal(kaputt.code, 1); assert.match(kaputt.out, /beschädigt/);
    const lose = JSON.stringify(scenario, null, 1);
    const nk = await lauf(['--zurueck', schreibe('b.json', { scenario_data: lose, sha256: sicherungsHash(lose) }), file, '--schritt', 'gelaende']);
    assert.equal(nk.code, 1); assert.match(nk.out, /kompaktes JSON/);
    // Die Sicherung ist schon der Zielstand: dorthin führt kein Weg zurück.
    const neu = await lauf(['--zurueck', schreibe('c.json', { scenario_data: ZIELTEXT, sha256: sicherungsHash(ZIELTEXT) }), file, '--schritt', 'gelaende']);
    assert.equal(neu.code, 1); assert.match(neu.out, /nicht der Ausgangsstand/);
    const form = await lauf(['--zurueck', schreibe('d.json', { sequence_data: dz.sequence }), file, '--schritt', 'gelaende']);
    assert.equal(form.code, 1); assert.match(form.out, /nicht die Form/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ES main: Benutzungsfehler – kein Schritt, ein unbekannter, kein Modus, zwei Modi, zu viele oder zu wenige Pfade: Rückgabe 2', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    for (const args of [
      ['--check', file],
      ['--check', file, '--schritt'],
      ['--check', file, '--schritt', 'alles'],
      ['--schritt', 'gelaende', file],
      ['--check', '--write', file, '--schritt', 'gelaende'],
      ['--check', '--schritt', 'gelaende'],
      ['--check', file, 'noch.db', '--schritt', 'gelaende'],
      ['--zurueck', file, '--schritt', 'gelaende'],
    ]) {
      const r = await lauf(args);
      assert.equal(r.code, 2, `${args.join(' ')}: ${r.out}`);
      assert.match(r.out, /usage/);
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ES main: es gibt kein `--force` und kein Wort dafür – jedes unbekannte Argument ist ein Benutzungsfehler, geschrieben wird nichts', async () => {
  const fremd = mit(s => { finalTerrain(s, 'Deputy Waggums')[0].cells = ['A1']; });
  const { tmp, file } = frischeDatenbank({ scen: text(fremd) });
  try {
    const vorher = alles(file);
    const { h } = sicherung(tmp, text(fremd));
    for (const wort of ['--force', '--erzwingen', '--ueberschreiben', '--override', '--yes', '--ignore-precondition', '-f', 'force']) {
      for (const modus of [['--check', file], schreiben(file, h)]) {
        const r = await lauf([...modus, wort]);
        assert.equal(r.code, 2, `${modus[0]} ${wort}: ${r.out}`);
        assert.match(r.out, /usage|unbekannt/);
      }
    }
    const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8');
    const code = quelle.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    assert.ok(!/['"]--(force|erzwingen|ueberschreiben|override)['"]/.test(code));
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ES main: die Transaktion ist `IMMEDIATE` – die Schreibsperre liegt vor dem ersten Hash, nicht erst beim UPDATE', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const aufrufe = [];
    class Spion extends Database {
      transaction(fn) {
        const t = super.transaction(fn);
        const wrap = (...a) => { aufrufe.push('direkt'); return t(...a); };
        wrap.immediate = (...a) => { aufrufe.push('immediate'); return t.immediate(...a); };
        wrap.deferred = t.deferred; wrap.exclusive = t.exclusive;
        return wrap;
      }
    }
    const { h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h), { Db: Spion })).code, 0);
    assert.deepEqual(aufrufe, ['immediate']);
  } finally { weg(tmp); }
});

test('ES main: ein Prüfer, der etwas findet, hält den Lauf an – validateScenarioData (ein unbekannter Schlüssel an einem festen Bösewicht), `--check` wie `--write`', async () => {
  // Der Prüfer läuft hier ohne Bibliothek (der Schritt liest sie nicht): was er ohne sie finden kann, hält den Lauf an – ein Eintrag mit
  // unbekanntem Schlüssel (`facedown`) an einem **festen** Bösewicht, den der Baustein sonst nicht anfasst.
  const kaputt2 = copy(scenario);
  finalTerrain(kaputt2, 'Handsy')[0].facedown = true;
  const { tmp, file } = frischeDatenbank({ scen: text(kaputt2) });
  try {
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'gelaende']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /unknown key "facedown"|facedown/);
    assert.doesNotMatch(c.out, /würde schreiben/);
    const { h } = sicherung(tmp, text(kaputt2));
    assert.equal((await lauf(schreiben(file, h))).code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ES main: gehört der Aufbau zu einem anderen Spiel, wird nichts angefasst', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const db = new Database(file);
    db.prepare("insert into games (id, name) values ('anderes-spiel', 'X')").run();
    db.prepare('update setups set game_id = ? where id = ?').run('anderes-spiel', SETUP_ID);
    db.close();
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'gelaende']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /Aufbau gehört zu Spiel anderes-spiel/);
    const { h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h))).code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ES main: die vier anderen Schritte melden „noch nicht gebaut“ – ohne die Datenbank zu öffnen (kein Treiber, keine Datei), Rückgabe 1', async () => {
  let geoeffnet = 0;
  class Spion { constructor() { geoeffnet++; throw new Error('die Datenbank darf nicht geöffnet werden'); } }
  for (const schritt of ['assets', 'aktionen', 'optionen']) {
    for (const modus of [['--check', 'gibt-es-nicht.db'], ['--write', 'gibt-es-nicht.db', '--sicherung-sha', 'abcdefabcdef'], ['--zurueck', 'sicherung.json', 'gibt-es-nicht.db']]) {
      const r = await lauf([...modus, '--schritt', schritt], { Db: Spion });
      assert.equal(r.code, 1, `${schritt} ${modus[0]}: ${r.out}`);
      assert.match(r.out, new RegExp(`Schritt „${schritt}“ ist noch nicht gebaut`));
    }
  }
  assert.equal(geoeffnet, 0);
});

test('ES main: stimmt der gerechnete Zielstand nicht mit der Konstante überein, hält der Lauf an – `--check` wie `--write` (die Konstante wird für den Test kurz verstellt)', async () => {
  const { tmp, file } = frischeDatenbank();
  const echt = SCHRITTE.gelaende.ziel.scenario.sha;
  try {
    const vorher = alles(file);
    SCHRITTE.gelaende.ziel.scenario.sha = '000000000000';
    const c = await lauf(['--check', file, '--schritt', 'gelaende']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /die Konstante nennt/);
    const { h } = sicherung(tmp);
    const w = await lauf(schreiben(file, h));
    assert.equal(w.code, 1, w.out);
    assert.deepEqual(alles(file), vorher);
  } finally { SCHRITTE.gelaende.ziel.scenario.sha = echt; weg(tmp); }
});

test('ES main: ein Ausgang, der nicht der der Konstanten ist (ein fremder Schlüssel anders) – `--check` sagt „anders“, `--write` schreibt trotzdem den gerechneten Text und vergleicht nicht mit der Konstante', async () => {
  // Eine Kopie, in der ein **fremder** Schlüssel anders ist (nicht das Gelände): der Ausgang ist dann ein anderer, der Schritt ist trotzdem anwendbar.
  const anders = mit(s => { s.gridLabel = s.gridLabel + ' '; });
  const { tmp, file } = frischeDatenbank({ scen: text(anders) });
  try {
    const c = await lauf(['--check', file, '--schritt', 'gelaende']);
    assert.equal(c.code, 0, c.out);
    assert.match(c.out, /Ausgang laut Schritt: anders/);
    const { h } = sicherung(tmp, text(anders));
    const w = await lauf(schreiben(file, h));
    assert.equal(w.code, 0, w.out);
    const erwartet = patchGelaende(anders);
    assert.equal(zeile(file).scenario_data, text(erwartet.scenario));
  } finally { weg(tmp); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ET Teil 1 / Spec M31.6 — BEW und LEB der Spalten 2, 4 und 5 in die Daten: Schritt `werte`
//
// Eingang ist dieselbe Fixture (Stand nach M30, vor `ES`); `stats` ist darin unberührt. **Die Zahlen stehen einmal — in
// `docs/tft-regeln.md` §5.5**; der Baustein trägt sie als Konstante `SPALTEN`, hier wird das Dokument **selbst gelesen** und die
// Gleichheit bewiesen (kein zweites Abschreiben). Die Namen im echten Datensatz heißen `BEW` und `LEB` (nicht `movement`/`life`).
// ══════════════════════════════════════════════════════════════════════════════

const REGELN = fs.readFileSync(new URL('../../docs/tft-regeln.md', import.meta.url), 'utf8').replace(/\r/g, '');
const ZAHLEN_ZELLE = /^(\d+)\/(\d+)\/(\d+)\/(\d+)(?: \(.*\))?$/;
const SPALTE = { 2: 0, 3: 1, 4: 2, 5: 3 };   // Index in „2P / 3P / 4P / 5P“

/**
 * §5.5 lesen: beide Tabellen, je Zeile englischer Name, BEW- und LEB-Zelle. `^(\d+)/(\d+)/(\d+)/(\d+)` am Zellenanfang, dahinter höchstens ein
 * Zusatz in Klammern. Eine Zeile, in der **beide** Zellen kein Zahlenmuster haben, ist `keineZahl` (nur Barry Bluff darf es sein, das prüft der Test);
 * **eine** Zelle ja, die andere nein — oder ein Zusatz, der nicht in Klammern steht — ist ein Befund und wirft: nichts wird still übersprungen.
 */
function leseTabelle55(md) {
  const abschnitt = md.split(/^### 5\.5 /m)[1]?.split(/^(?:#{2,3} |---$)/m)[0];
  assert.ok(abschnitt, '§5.5 steht im Dokument');
  const roh = { basis: [], neu: [] };
  let aktuell = null;
  for (const zeile of abschnitt.split('\n')) {
    if (zeile.startsWith('**Basisspiel')) aktuell = 'basis';
    else if (zeile.startsWith('**Neue Nachbarn')) aktuell = 'neu';
    else if (zeile.startsWith('|') && aktuell) {
      const z = zeile.split('|').slice(1, -1).map(c => c.trim());
      if (z[0] === 'Bösewicht (EN)' || /^[-: ]+$/.test(z[0])) continue;
      roh[aktuell].push(z);
    }
  }
  const zeilen = [], keineZahl = [];
  for (const z of [...roh.basis, ...roh.neu]) {
    const [name, , bew, leb] = z;
    const a = ZAHLEN_ZELLE.exec(bew), b = ZAHLEN_ZELLE.exec(leb);
    if (!a && !b) keineZahl.push(name);
    else if (!a || !b) throw new Error(`§5.5, ${name}: eine Zelle passt nicht ins Muster – BEW „${bew}“, LEB „${leb}“`);
    else zeilen.push({ name, BEW: a.slice(1).map(Number), LEB: b.slice(1).map(Number) });
  }
  return { zeilen, keineZahl, anzahl: { basis: roh.basis.length, neu: roh.neu.length } };
}
const T55 = leseTabelle55(REGELN);
const WERTE = patchWerte(scenario);
const NAMEN19 = T55.zeilen.map(z => z.name);

// ── ET 1. Die Quelle ist §5.5 selbst ────────────────────────────────────────

test('ET 1: der Parser findet in §5.5 genau 19 Zeilen (12 + 8 Zeilen, Barry Bluff fällt heraus) – und jede Zahl passt ins Muster', () => {
  assert.deepEqual(T55.anzahl, { basis: 12, neu: 8 });
  assert.deepEqual(T55.keineZahl, ['Barry Bluff'], 'nur Barry trägt Formeln statt Zahlen');
  assert.equal(T55.zeilen.length, 19);
  assert.equal(new Set(NAMEN19).size, 19, 'keine doppelte Zeile');
  for (const z of T55.zeilen) for (const k of ['BEW', 'LEB']) assert.equal(z[k].length, 4, `${z.name} ${k}: 2P/3P/4P/5P`);
  // Eine Zeile mit Zusatz in Klammern wird gelesen, eine mit kaputter Zahl ist ein Befund (der Parser schweigt nicht).
  const patches = '| 1/2/2/3 (Kostüm-Fetzen ersetzen LEB) |';
  assert.ok(REGELN.includes(patches), 'die Zeile, an der der Test den Parser prüft, steht im Dokument');
  assert.deepEqual(leseTabelle55(REGELN.replace(patches, '| 1/2/2/3 |')).zeilen.find(z => z.name === 'Patches').LEB, [1, 2, 2, 3]);
  assert.throws(() => leseTabelle55(REGELN.replace(patches, '| 1/2/2 |')), /Patches: eine Zelle passt nicht/);
  assert.throws(() => leseTabelle55(REGELN.replace(patches, '| 1/2/2/3 und mehr |')), /Patches: eine Zelle passt nicht/);
});

test('ET 1: `SPALTEN` im Baustein = die Zahlen aus §5.5, Name für Name, Zahl für Zahl (BEW und LEB, 2P/3P/4P/5P) – dieselben 19, dieselbe Reihenfolge', () => {
  assert.deepEqual(Object.keys(SPALTEN), NAMEN19);
  assert.ok(!('Barry Bluff' in SPALTEN), 'Barry trägt Formeln und steht nicht in SPALTEN');
  for (const z of T55.zeilen) assert.deepEqual(SPALTEN[z.name], { BEW: z.BEW, LEB: z.LEB }, z.name);
});

test('ET 1: Will Barlow – LEB 2P ist 11 (der Druckfehler im Dokument betrifft die Spalte 3P, nicht die erste)', () => {
  const z = T55.zeilen.find(r => r.name === 'Will Barlow');
  assert.deepEqual(z.LEB, [11, 14, 17, 20]);
  assert.equal(SPALTEN['Will Barlow'].LEB[SPALTE[2]], 11);
  assert.equal(WERTE.scenario.bosses['Will Barlow'].statsByCount['2'].LEB, 11);
  assert.match(REGELN, /Druckfehler auf Jupp Karres Tableau — betrifft genau die Solospalte/);
});

// ── ET 2. Gegenprobe 3P ─────────────────────────────────────────────────────

test('ET 2: Gegenprobe – für alle 19 ist die 3P-Zahl aus §5.5 gleich `stats` der Fixture (BEW und LEB); die 20 Bösewichte sind die 19 und Barry', () => {
  assert.deepEqual([...NAMEN19, 'Barry Bluff'].sort(), Object.keys(scenario.bosses).sort());
  for (const z of T55.zeilen) {
    assert.deepEqual(scenario.bosses[z.name].stats, { BEW: z.BEW[SPALTE[3]], LEB: z.LEB[SPALTE[3]] }, `${z.name}: 3P aus §5.5 gegen stats der Fixture`);
  }
  assert.equal(typeof scenario.bosses['Barry Bluff'].stats.BEW, 'string');
  assert.equal(typeof scenario.bosses['Barry Bluff'].stats.LEB, 'string');
});

// ── ET 3. Zielstand ─────────────────────────────────────────────────────────

test('ET 3: Zielstand – `statsByCount` mit genau den Schlüsseln "2", "4", "5" an den 19, `{ BEW, LEB }` je Zahl wie in §5.5; Länge und Hash wie das Skript sie nennt', () => {
  assert.equal(WERTE.art, 'zu-schreiben', (WERTE.probleme ?? []).join('\n'));
  assert.deepEqual(Object.keys(WERTE), ['art', 'scenario'], 'der Zielstand trägt nur `scenario`');
  for (const z of T55.zeilen) {
    const t = WERTE.scenario.bosses[z.name].statsByCount;
    assert.deepEqual(Object.keys(t), ['2', '4', '5'], `${z.name}: Schlüssel`);
    assert.ok(!('3' in t), `${z.name}: kein "3" – 3P steht in stats`);
    for (const n of [2, 4, 5]) {
      assert.deepEqual(Object.keys(t[n]), ['BEW', 'LEB'], `${z.name} ${n}P: Namen wie in stats`);
      assert.deepEqual(t[n], { BEW: z.BEW[SPALTE[n]], LEB: z.LEB[SPALTE[n]] }, `${z.name} ${n}P`);
    }
  }
  // Länge und Hash: nach `gelaende` (Reihenfolge ES, ET) und die Konstanten des Skripts.
  const nach = text(patchWerte(patchGelaende(scenario).scenario).scenario);
  assert.deepEqual([nach.length, sha(nach)], [SCHRITTE.werte.ziel.scenario.laenge, SCHRITTE.werte.ziel.scenario.sha]);
  assert.deepEqual(SCHRITTE.werte.ausgang, SCHRITTE.gelaende.ziel, 'der Ausgang von `werte` ist der Zielstand von `gelaende` – dieselbe Zahl, keine zweite');
  assert.deepEqual(Object.keys(SCHRITTE.werte), ['ausgang', 'ziel']);
  assert.deepEqual(Object.keys(SCHRITTE.werte.ziel), ['scenario']);
});

test('ET 3: Barry Bluff unverändert, `stats` aller 20 byteweise gleich, nichts sonst verändert – alle anderen Schlüssel, alle anderen Bösewichte, `final`', () => {
  const a = scenario, b = WERTE.scenario;
  assert.deepEqual(Object.keys(b), Object.keys(a));
  for (const k of Object.keys(a).filter(x => x !== 'bosses')) assert.equal(text(b[k]), text(a[k]), `scenario_data.${k}`);
  assert.deepEqual(Object.keys(b.bosses), Object.keys(a.bosses));
  assert.equal(text(b.bosses['Barry Bluff']), text(a.bosses['Barry Bluff']), 'Barry bekommt nichts');
  assert.ok(!('statsByCount' in b.bosses['Barry Bluff']));
  for (const name of Object.keys(a.bosses)) {
    assert.equal(text(b.bosses[name].stats), text(a.bosses[name].stats), `${name}: stats`);
    const { statsByCount, ...rest } = b.bosses[name];
    assert.equal(text(rest), text(a.bosses[name]), `${name}: alles außer statsByCount`);
  }
  assert.equal(Object.values(b.bosses).filter(x => 'statsByCount' in x).length, 19);
});

/** `statsByCount` aus allen Bösewichten nehmen – das Gegenstück zum Schreiben. */
const ohneWerte = (sc) => { const k = copy(sc); for (const b of Object.values(k.bosses)) delete b.statsByCount; return k; };

test('ET 3: Rückwärtsbeweis – `statsByCount` entfernen ergibt den gelesenen Text, Zeichen für Zeichen; `beweiseWerte` sagt dasselbe und fängt jede Abweichung', () => {
  assert.equal(text(ohneWerte(WERTE.scenario)), dz.scenario);
  assert.deepEqual(beweiseWerte({ scenario }, WERTE), []);
  const faengt = (fn, muster) => {
    const k = copy(WERTE); fn(k.scenario);
    const m = beweiseWerte({ scenario }, k);
    assert.ok(m.length > 0, `gefangen: ${muster}`);
    assert.match(m.join('\n'), muster);
  };
  faengt(s => { s.bosses['Handsy'].statsByCount['3'] = { BEW: 7, LEB: 14 }; }, /Handsy/);
  faengt(s => { s.bosses['Barry Bluff'].statsByCount = { 2: { BEW: 'x', LEB: 'y' }, 4: { BEW: 'x', LEB: 'y' }, 5: { BEW: 'x', LEB: 'y' } }; }, /Barry Bluff/);
  faengt(s => { delete s.bosses['Handsy'].statsByCount['5']; }, /Handsy/);
  faengt(s => { delete s.bosses['Handsy'].statsByCount; }, /Handsy/);
  faengt(s => { s.bosses['Handsy'].stats.LEB = 15; }, /Rückwärtsbeweis scenario_data/);
  faengt(s => { s.bosses['Handsy'].fremd = 1; }, /Rückwärtsbeweis scenario_data/);
  faengt(s => { s.villagers.baseCount = 3; }, /Rückwärtsbeweis scenario_data/);
});

// ── ET 4. Zählung für den Bericht ───────────────────────────────────────────

test('ET 4: Zählung – wie viele der 19 haben in 2P / 4P / 5P einen anderen BEW bzw. LEB als in 3P (das Bauprotokoll nennt die Zahlen)', () => {
  const zahlen = {};
  for (const n of [2, 4, 5]) {
    const anders = (z, k) => z[k][SPALTE[n]] !== z[k][SPALTE[3]];
    zahlen[`${n}P`] = {
      BEW: T55.zeilen.filter(z => anders(z, 'BEW')).length,
      LEB: T55.zeilen.filter(z => anders(z, 'LEB')).length,
      beide: T55.zeilen.filter(z => anders(z, 'BEW') || anders(z, 'LEB')).length,
    };
  }
  // Dieselbe Zählung aus den **geschriebenen** Daten, nicht aus dem Dokument.
  for (const n of [2, 4, 5]) {
    const aus = (k) => NAMEN19.filter(x => WERTE.scenario.bosses[x].statsByCount[n][k] !== WERTE.scenario.bosses[x].stats[k]).length;
    assert.deepEqual([aus('BEW'), aus('LEB')], [zahlen[`${n}P`].BEW, zahlen[`${n}P`].LEB], `${n}P: Dokument und Daten zählen gleich`);
  }
  console.log(`ET 4 Zählung (von 19, anders als 3P): ${Object.entries(zahlen).map(([k, v]) => `${k}: BEW ${v.BEW}, LEB ${v.LEB} (mindestens eins: ${v.beide})`).join(' | ')}`);
  for (const v of Object.values(zahlen)) assert.ok(v.BEW <= 19 && v.LEB <= 19 && v.beide <= 19);
});

// ── ET 5. Vorbedingung je Stück ─────────────────────────────────────────────

test('ET 5: die Fixture trägt genau die Stücke, die der Schritt erwartet – `stats` mit zwei Zahlen und kein `statsByCount` an den 19, Barry mit zwei Texten', () => {
  for (const name of NAMEN19) {
    const b = scenario.bosses[name];
    assert.deepEqual(Object.keys(b.stats), ['BEW', 'LEB'], name);
    assert.equal(typeof b.stats.BEW, 'number');
    assert.equal(typeof b.stats.LEB, 'number');
    assert.ok(!('statsByCount' in b), name);
  }
  assert.ok(!('statsByCount' in scenario.bosses['Barry Bluff']));
});

test('ET 5: jedes der 19 Stücke muss genau das sein – `stats` fehlt, ist kein Objekt, hat einen Namen mehr oder weniger, einen Text statt einer Zahl, eine andere 3P-Zahl: Abbruch mit Pfad', () => {
  const p = (name) => `bosses["${name}"]`;
  for (const name of NAMEN19) {
    abbruch(patchWerte(mit(s => { delete s.bosses[name].stats; })), p(name), 'stats');
    abbruch(patchWerte(mit(s => { s.bosses[name].stats = [6, 14]; })), p(name));
    abbruch(patchWerte(mit(s => { s.bosses[name].stats.NEU = 1; })), p(name));
    abbruch(patchWerte(mit(s => { delete s.bosses[name].stats.LEB; })), p(name));
    abbruch(patchWerte(mit(s => { s.bosses[name].stats.BEW = String(s.bosses[name].stats.BEW); })), p(name));
    abbruch(patchWerte(mit(s => { s.bosses[name].stats.LEB += 1; })), p(name), '3P');
    abbruch(patchWerte(mit(s => { s.bosses[name].stats.BEW -= 1; })), p(name), '3P');
  }
});

test('ET 5: Barry Bluff muss Text tragen und darf kein `statsByCount` haben; ein Bösewicht, der fehlt oder in `SPALTEN` nicht vorkommt, ist ein Abbruch', () => {
  abbruch(patchWerte(mit(s => { s.bosses['Barry Bluff'].statsByCount = { 2: { BEW: 'a', LEB: 'b' } }; })), 'Barry Bluff', 'statsByCount');
  abbruch(patchWerte(mit(s => { s.bosses['Barry Bluff'].stats = { BEW: 8, LEB: 20 }; })), 'Barry Bluff');
  abbruch(patchWerte(mit(s => { delete s.bosses['Barry Bluff']; })), 'Barry Bluff');
  abbruch(patchWerte(mit(s => { delete s.bosses['Handsy']; })), 'Handsy');
  abbruch(patchWerte(mit(s => { s.bosses['Neuer Bösewicht'] = { stats: { BEW: 5, LEB: 5 } }; })), 'Neuer Bösewicht');
  abbruch(patchWerte(mit(s => { s.bosses = []; })), 'bosses');
  abbruch(patchWerte({}), 'bosses');
  abbruch(patchWerte(null), 'bosses');
});

test('ET 5: schon geschrieben und gleich – nichts zu tun, die Eingabe kommt gleich zurück (als Kopie) und wird nicht verändert', () => {
  const fertig = WERTE.scenario;
  const vorher = text(fertig);
  const r = patchWerte(fertig);
  assert.equal(r.art, 'schon-da', (r.probleme ?? []).join('\n'));
  assert.equal(text(r.scenario), vorher);
  assert.notEqual(r.scenario, fertig, 'eine Kopie');
  assert.equal(text(fertig), vorher, 'die Eingabe ist unverändert');
  const rein = text(scenario);
  patchWerte(scenario);
  assert.equal(text(scenario), rein, 'auch der Ausgang wird nicht verändert');
});

test('ET 5: ein **anderer** Wert ist ein Abbruch – eine Zahl falsch, ein Schlüssel "3", ein Schlüssel "1", ein Text, ein Name mehr/weniger, ein anderes `statsByCount`-Gerüst', () => {
  const fertig = (fn) => mit(fn, WERTE.scenario);
  for (const name of NAMEN19) {
    for (const n of ['2', '4', '5']) {
      for (const k of ['BEW', 'LEB']) abbruch(patchWerte(fertig(s => { s.bosses[name].statsByCount[n][k] += 1; })), `bosses["${name}"]`, `statsByCount["${n}"]`);
    }
  }
  abbruch(patchWerte(fertig(s => { s.bosses['Handsy'].statsByCount['3'] = { BEW: 7, LEB: 14 }; })), 'Handsy', '"3"');
  abbruch(patchWerte(fertig(s => { s.bosses['Handsy'].statsByCount['1'] = { BEW: 1, LEB: 1 }; })), 'Handsy', '"1"');
  abbruch(patchWerte(fertig(s => { s.bosses['Handsy'].statsByCount['4'].BEW = '8'; })), 'Handsy');
  abbruch(patchWerte(fertig(s => { s.bosses['Handsy'].statsByCount['4'].NEU = 8; })), 'Handsy');
  abbruch(patchWerte(fertig(s => { delete s.bosses['Handsy'].statsByCount['4'].LEB; })), 'Handsy');
  abbruch(patchWerte(fertig(s => { s.bosses['Handsy'].statsByCount = []; })), 'Handsy');
  abbruch(patchWerte(fertig(s => { s.bosses['Handsy'].statsByCount = null; })), 'Handsy');
  abbruch(patchWerte(fertig(s => { s.bosses['Handsy'].statsByCount = { 2: { LEB: 11, BEW: 7 }, 4: { BEW: 8, LEB: 18 }, 5: { BEW: 8, LEB: 21 } }; })), 'Handsy');
  // Barry mit demselben Gerüst wie die anderen: nein.
  abbruch(patchWerte(fertig(s => { s.bosses['Barry Bluff'].statsByCount = copy(s.bosses['Handsy'].statsByCount); })), 'Barry Bluff');
});

test('ET 5: ein **teilweise** geschriebener Stand ist ein Abbruch – ein Bösewicht fertig und die anderen nicht; nur "2"; "2" und "4" ohne "5"; nur "5"; ein leeres Objekt', () => {
  const fertig = (fn) => mit(fn, WERTE.scenario);
  const halbe = (behalte) => Object.fromEntries(behalte.map(k => [k, copy(WERTE.scenario.bosses['Handsy'].statsByCount[k])]));
  // Ein Bösewicht neu, die anderen alt – und umgekehrt: alle neu bis auf einen.
  const einer = abbruch(patchWerte(mit(s => { s.bosses['Handsy'].statsByCount = halbe(['2', '4', '5']); })), 'halber Stand', 'Handsy');
  assert.match(einer.probleme.join('\n'), /schon geschrieben/);
  abbruch(patchWerte(fertig(s => { delete s.bosses['Umbrello'].statsByCount; })), 'halber Stand', 'Umbrello');
  // Ein Bösewicht, dessen Tabelle nur einen Teil der Zahlen trägt – in jeder Kombination, im sonst alten wie im sonst neuen Stand.
  for (const behalte of [['2'], ['2', '4'], ['4', '5'], ['5'], ['2', '5'], ['4'], []]) {
    const imAlten = mit(s => { s.bosses['Handsy'].statsByCount = halbe(behalte); });
    const imNeuen = fertig(s => { s.bosses['Handsy'].statsByCount = halbe(behalte); });
    for (const wo of [imAlten, imNeuen]) {
      const m = abbruch(patchWerte(wo), 'Handsy');
      assert.match(m.probleme.join('\n'), /teilweise/, `${behalte}: ${m.probleme.join(' | ')}`);
    }
  }
});

// ── ET 6. Der Tisch ─────────────────────────────────────────────────────────

const mitBasis = (sc) => mit(s => { s.villagers.baseCount = 3; }, sc);
const SC_HEUTE = SC_ALT;                                   // wie die Daten heute: kein baseCount, kein statsByCount (nur fünf Plätze synthetisch)
const SC_W = mitFuenfPlaetzen(WERTE.scenario);             // statsByCount, **ohne** baseCount: der Code ist ausgeschaltet
const SC_WB = mitBasis(SC_W);                              // statsByCount **und** baseCount 3: so stünde es nach dem Schalter (EX)
const SC_B = mitBasis(SC_ALT);                             // baseCount, aber noch ohne statsByCount: jede Zahl außer drei hält
const ZAEHLER = [
  { id: 'c-bew', name: 'Bösewicht: Bewegung', value: 0, x: 0, y: 0, locked: false, max: 99 },
  { id: 'c-leb', name: 'Bösewicht: Leben', value: 0, x: 0, y: 0, locked: false, max: 99 },
];
/** Der erste Kampf (oder Endkampf) dieses Bösewichts an einem Tisch mit `n` Dörflern, dann BEW und LEB in zwei Zähler (`$BEW`, `$LEB`). */
function werteKampf(sc, n, name, final = false) {
  const s = mitBoss(TISCHE[n], name);
  s.counters = [...(s.counters ?? []), ...copy(ZAEHLER)];
  const r = executeSequenceWithLog(s, [
    { type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Bösewicht-Platz' },
    { type: 'build_scenario', final },
    { type: 'set_counter', name: 'Bösewicht: Bewegung', value: '$BEW' },
    { type: 'set_counter', name: 'Bösewicht: Leben', value: '$LEB' },
  ], zones, { assets, cards, grids, scenarioData: sc, rng: seededRng(7) });
  const wert = (z) => r.state.counters.find(c => c.name === z).value;
  return { ...r, bew: wert('Bösewicht: Bewegung'), leb: wert('Bösewicht: Leben') };
}
const NAMEN20 = Object.keys(scenario.bosses);
const gleicherTisch = (neu, heute, wo) => {
  for (const feld of ['tokens', 'cards', 'counters', 'boards']) assert.deepEqual(ohneIds(neu.state[feld]), ohneIds(heute.state[feld]), `${wo}: ${feld}`);
  assert.deepEqual(ohneIds(neu.state.stacks), ohneIds(heute.state.stacks), `${wo}: stacks`);
  assert.deepEqual(neu.log.map(e => [e.index, e.type, e.status, e.reason]), heute.log.map(e => [e.index, e.type, e.status, e.reason]), `${wo}: Protokoll`);
};

test('ET 6: mit `baseCount: 3` bindet `build_scenario` für **2, 3, 4, 5** Dörfler die Zahlen der jeweiligen Spalte aus §5.5 – alle 19, BEW und LEB; Barry bindet seine Formeln (kein Halt)', () => {
  let gezaehlt = 0;
  for (const name of NAMEN20) {
    for (const n of [2, 3, 4, 5]) {
      const r = werteKampf(SC_WB, n, name);
      assert.notEqual(r.log[1].status, 'failed', `${name} bei ${n}: ${r.log[1].reason}`);
      if (name === 'Barry Bluff') {
        assert.equal(r.log[2].status, 'skipped', `${name} bei ${n}`);
        assert.ok(r.log[2].reason.includes(scenario.bosses[name].stats.BEW), `${n}: die Formel für BEW bindet: ${r.log[2].reason}`);
        assert.ok(r.log[3].reason.includes(scenario.bosses[name].stats.LEB), `${n}: die Formel für LEB bindet: ${r.log[3].reason}`);
        continue;
      }
      const z = T55.zeilen.find(x => x.name === name);
      assert.deepEqual([r.bew, r.leb], [z.BEW[SPALTE[n]], z.LEB[SPALTE[n]]], `${name} bei ${n} Dörflern`);
      gezaehlt++;
    }
  }
  assert.equal(gezaehlt, 19 * 4);
});

test('ET 6: mit **drei** Dörflern sind es die Zahlen von heute – `stats`, und der Tisch ist derselbe wie mit den heutigen Daten (alle 20, Endkampf und nicht: Plättchen, Karten, Zähler, Protokoll)', () => {
  for (const name of NAMEN20) {
    for (const final of [false, true]) {
      const heute = werteKampf(SC_HEUTE, 3, name, final), neu = werteKampf(SC_WB, 3, name, final);
      gleicherTisch(neu, heute, `${name} bei drei (final ${final})`);
      if (name !== 'Barry Bluff') assert.deepEqual([neu.bew, neu.leb], [scenario.bosses[name].stats.BEW, scenario.bosses[name].stats.LEB], `${name}: die Zahlen von heute`);
    }
  }
});

test('ET 6: **ohne** `baseCount` kein Unterschied zu heute – bei 2, 3, 4 und 5 Dörflern legen und binden die Daten mit `statsByCount` genau wie die ohne (alle 20, Endkampf und nicht)', () => {
  for (const name of NAMEN20) {
    for (const n of [2, 3, 4, 5]) {
      for (const final of [false, true]) gleicherTisch(werteKampf(SC_W, n, name, final), werteKampf(SC_HEUTE, n, name, final), `${name} bei ${n} (final ${final})`);
      if (name !== 'Barry Bluff') {
        const r = werteKampf(SC_W, n, name);
        assert.deepEqual([r.bew, r.leb], [scenario.bosses[name].stats.BEW, scenario.bosses[name].stats.LEB], `${name} bei ${n}: ohne baseCount gilt stats`);
      }
    }
  }
});

test('ET 6: ohne diese Daten hielte jede andere Zahl als drei laut (baseCount ohne `statsByCount`) – mit ihnen nicht, auch im Endkampf; Barry hält nie', () => {
  for (const name of NAMEN19) {
    for (const n of [2, 4, 5]) {
      const ohne = werteKampf(SC_B, n, name);
      assert.equal(ohne.log[1].status, 'failed', `${name} bei ${n}`);
      assert.match(ohne.log[1].reason, new RegExp(`no values for ${n} villagers`));
      for (const final of [false, true]) assert.notEqual(werteKampf(SC_WB, n, name, final).log[1].status, 'failed', `${name} bei ${n} (final ${final})`);
    }
    assert.notEqual(werteKampf(SC_B, 3, name).log[1].status, 'failed', `${name} bei drei`);
  }
  for (const n of [2, 3, 4, 5]) assert.notEqual(werteKampf(SC_B, n, 'Barry Bluff').log[1].status, 'failed', `Barry bei ${n}`);
});

test('ET 6: der Prüfer ist zufrieden – `validateScenarioData` auf dem Zielstand (mit Bibliothek und Raster) und auf dem Zielstand mit `baseCount: 3`; ein Schlüssel "3" wäre ihm eine Meldung', () => {
  assert.deepEqual(validateScenarioData(WERTE.scenario, { assets, grids, cards }), []);
  assert.deepEqual(validateScenarioData(mitBasis(WERTE.scenario), { assets, grids, cards }), []);
  const mit3 = mitBasis(mit(s => { s.bosses['Handsy'].statsByCount['3'] = { BEW: 7, LEB: 14 }; }, WERTE.scenario));
  assert.match(validateScenarioData(mit3, { assets, grids, cards }).join('\n'), /baseCount/);
});

// ── ET 7. Disjunkt ──────────────────────────────────────────────────────────

/** Alle Pfade, an denen sich zwei JSON-Werte unterscheiden (Blätter und fehlende/neue Schlüssel). */
function unterschiede(a, b, pfad = '') {
  const o = (x) => x !== null && typeof x === 'object';
  if (!o(a) || !o(b)) return text(a) === text(b) ? [] : [pfad];
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => ((!(k in a) || !(k in b)) ? [`${pfad}/${k}`] : unterschiede(a[k], b[k], `${pfad}/${k}`)));
}

test('ET 7: `werte` berührt nur `scenario_data`, und darin nur `bosses[…].statsByCount` der 19 – kein `final`, kein `terrain`, kein `fields`, nicht `options`, `villagers`, `terrainCards`', () => {
  assert.deepEqual(Object.keys(WERTE), ['art', 'scenario']);
  const pfade = unterschiede(scenario, WERTE.scenario);
  assert.deepEqual([...pfade].sort(), NAMEN19.map(n => `/bosses/${n}/statsByCount`).sort());
  for (const k of ['options', 'villagers', 'terrainCards', 'gridLabel', 'cardZoneLabel']) assert.equal(text(WERTE.scenario[k]), text(scenario[k]), k);
  assert.ok(!('baseCount' in WERTE.scenario.villagers), 'baseCount schaltet ein (EX), nicht dieser Schritt');
  // Und `gelaende` berührt umgekehrt kein `stats`/`statsByCount`: die Pfade beider Schritte sind disjunkt.
  const gel = unterschiede(scenario, patchGelaende(scenario).scenario);
  assert.ok(gel.length > 0 && gel.every(p => /\/final\/terrain\//.test(p)), gel.join(', '));
  assert.deepEqual(gel.filter(p => pfade.includes(p) || /stats/i.test(p)), []);
});

test('ET 7: vor und nach `gelaende` ist `werte` anwendbar, vor und nach `werte` ist `gelaende` anwendbar – dieselbe Spalte, **derselbe** Text in beiden Reihenfolgen; jeder Schritt erkennt sein eigenes Ergebnis', () => {
  const g = patchGelaende(scenario), w = WERTE;
  const gw = patchWerte(g.scenario), wg = patchGelaende(w.scenario);
  assert.equal(gw.art, 'zu-schreiben', (gw.probleme ?? []).join('\n'));
  assert.equal(wg.art, 'zu-schreiben', (wg.probleme ?? []).join('\n'));
  assert.equal(text(gw.scenario), text(wg.scenario), 'gelaende dann werte = werte dann gelaende');
  assert.equal(patchGelaende(gw.scenario).art, 'schon-da');
  assert.equal(patchWerte(gw.scenario).art, 'schon-da');
  assert.equal(patchWerte(g.scenario).art, 'zu-schreiben', 'gelaende allein hat die Werte nicht geschrieben');
  assert.equal(patchGelaende(w.scenario).art, 'zu-schreiben', 'werte allein hat das Gelände nicht geschrieben');
  assert.deepEqual(beweise({ scenario }, g), []);
  assert.deepEqual(beweise({ scenario: w.scenario }, wg), [], 'der Rückwärtsbeweis des Geländes trägt auch auf dem Stand mit Werten');
  assert.deepEqual(beweiseWerte({ scenario: g.scenario }, gw), [], 'und der der Werte auf dem Stand mit Gelände');
});

// ── ET main: der Schritt `werte` gegen eine Wegwerf-Datenbank ───────────────

const schreibenW = (file, h, extra = []) => ['--write', file, '--schritt', 'werte', '--sicherung-sha', h.slice(0, 16), ...extra];
const NACH_GELAENDE = text(patchGelaende(scenario).scenario);
const ENDE = text(patchWerte(patchGelaende(scenario).scenario).scenario);

test('ET main: `--check` – schreibgeschützt, „zu schreiben“, Plan, Beweis, Prüfer; am Stand **nach `gelaende`** nennt es den Zielstand der Konstanten, am Stand davor sagt es „Ausgang anders“', async () => {
  for (const [scen, istAusgang] of [[NACH_GELAENDE, true], [dz.scenario, false]]) {
    const { tmp, file } = frischeDatenbank({ scen });
    try {
      const vorher = alles(file);
      fs.chmodSync(file, 0o444);
      const r = await lauf(['--check', file, '--schritt', 'werte']);
      fs.chmodSync(file, 0o666);
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /Einordnung: zu schreiben/);
      assert.match(r.out, /statsByCount/);
      assert.match(r.out, /Rückwärtsbeweis scenario_data: ja/);
      assert.match(r.out, /validateScenarioData: 0 Probleme/);
      assert.match(r.out, istAusgang ? /Ausgang laut Schritt: gleich/ : /Ausgang laut Schritt: anders/);
      if (istAusgang) assert.ok(r.out.includes(`Zielstand: scenario_data ${SCHRITTE.werte.ziel.scenario.laenge} Zeichen (sha ${SCHRITTE.werte.ziel.scenario.sha})`), r.out);
      assert.ok(r.out.includes(sicherungsHash(scen)), 'der Hash für --sicherung-sha steht da');
      assert.doesNotMatch(r.out, /Beanstandungen:? [1-9]/);
      assert.deepEqual(alles(file), vorher, '--check hat nichts geschrieben');
    } finally { weg(tmp); }
  }
});

test('ET main: `--write` – `scenario_data` auf dem Zielstand, **nichts sonst** geändert (andere Spalten, Zonen, Assets, Spielstände); der zweite Lauf sagt „schon geschrieben“ und schreibt nichts', async () => {
  const { tmp, file } = frischeDatenbank({ scen: NACH_GELAENDE });
  try {
    const vorher = alles(file);
    const { h } = sicherung(tmp, NACH_GELAENDE);
    const r = await lauf(schreibenW(file, h));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /Zielstand aus den Konstanten[^\n]*: erreicht/);
    assert.match(r.out, /stats aller 20: alle gleich/);
    assert.match(r.out, /Barry Bluff: sha ([0-9a-f]{12}) → \1 unverändert/);
    assert.match(r.out, /statsByCount an 19/);
    assert.doesNotMatch(r.out, /GEÄNDERT|ABWEICHEND|NICHT erreicht/);
    const nachher = alles(file);
    assert.equal(zeile(file).scenario_data, ENDE);
    assert.deepEqual(ohneSpalte(nachher), ohneSpalte(vorher), 'jede andere Tabelle, jede andere Spalte');
    const nochmal = await lauf(schreibenW(file, h));
    assert.equal(nochmal.code, 0, nochmal.out);
    assert.match(nochmal.out, /schon geschrieben/);
    assert.deepEqual(alles(file), nachher, 'der zweite Lauf schreibt nichts');
    const c = await lauf(['--check', file, '--schritt', 'werte']);
    assert.equal(c.code, 0);
    assert.match(c.out, /schon geschrieben/);
  } finally { weg(tmp); }
});

test('ET main: ein Stand ohne `gelaende` wird genauso geschrieben (andere Reihenfolge) – und `gelaende` danach ergibt denselben Text wie umgekehrt', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { h } = sicherung(tmp);
    const r = await lauf(schreibenW(file, h));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /Ausgang laut Schritt: anders/);
    const h2 = sicherung(tmp, zeile(file).scenario_data).h;
    const g = await lauf(['--write', file, '--schritt', 'gelaende', '--sicherung-sha', h2.slice(0, 16)]);
    assert.equal(g.code, 0, g.out);
    assert.equal(zeile(file).scenario_data, ENDE);
  } finally { weg(tmp); }
});

test('ET main: ohne Sicherung kein Schreiben; `--force` und jedes andere unbekannte Argument ist ein Benutzungsfehler; ein halber Stand und ein anderer Wert sind ein Abbruch mit Pfad – nichts wird geschrieben', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const { h } = sicherung(tmp);
    assert.equal((await lauf(['--write', file, '--schritt', 'werte'])).code, 1);
    assert.equal((await lauf(schreibenW(file, 'abcdef012345'))).code, 1, 'falscher Hash');
    for (const flag of ['--force', '--erzwingen', '--ueberschreiben', '--yes']) {
      const r = await lauf(schreibenW(file, h, [flag]));
      assert.equal(r.code, 2, `${flag}: ${r.out}`);
      assert.match(r.out, /unbekanntes Argument/);
    }
    assert.deepEqual(alles(file), vorher);
    // halber Stand
    const halb = mit(s => { s.bosses['Handsy'].statsByCount = { 2: { BEW: 7, LEB: 11 } }; });
    setze(file, 'scenario_data', text(halb));
    const v2 = alles(file);
    const r = await lauf(['--check', file, '--schritt', 'werte']);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Handsy/);
    assert.equal((await lauf(schreibenW(file, sicherung(tmp, text(halb)).h))).code, 1);
    assert.deepEqual(alles(file), v2, 'nichts geschrieben');
    // anderer Wert
    setze(file, 'scenario_data', text(mit(s => { s.bosses['Handsy'].stats.LEB = 99; })));
    assert.equal((await lauf(['--check', file, '--schritt', 'werte'])).code, 1);
  } finally { weg(tmp); }
});

test('ET main: `--zurueck` – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen; ein zweites Mal ist „schon der Ausgangsstand“; ein weitergearbeiteter Stand bleibt stehen', async () => {
  const { tmp, file } = frischeDatenbank({ scen: NACH_GELAENDE });
  try {
    const vorher = alles(file);
    const { datei, h } = sicherung(tmp, NACH_GELAENDE);
    assert.equal((await lauf(schreibenW(file, h))).code, 0);
    assert.notDeepEqual(alles(file), vorher);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'werte']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /\(= die Sicherung, Zeichen für Zeichen\)/);
    assert.deepEqual(alles(file), vorher, 'jede Tabelle, jede Spalte wie am Anfang');
    assert.match((await lauf(['--zurueck', datei, file, '--schritt', 'werte'])).out, /schon der Ausgangsstand/);
    // weitergearbeitet: nach dem Schreiben ändert jemand etwas
    assert.equal((await lauf(schreibenW(file, h))).code, 0);
    const jetzt = text({ ...JSON.parse(zeile(file).scenario_data), gridLabel: 'anders' });
    setze(file, 'scenario_data', jetzt);
    const nein = await lauf(['--zurueck', datei, file, '--schritt', 'werte']);
    assert.equal(nein.code, 1, nein.out);
    assert.equal(zeile(file).scenario_data, jetzt, 'nichts überschrieben');
  } finally { weg(tmp); }
});

test('ET main: Vergleich-und-Tausch und Transaktion – ändert jemand `scenario_data` oder eine andere Tabelle zwischen Lesen und Schreiben, wird nichts geschrieben', async () => {
  {
    const { tmp, file } = frischeDatenbank();
    try {
      const { h } = sicherung(tmp);
      const fremd = dz.scenario + ' ';
      const r = await lauf(schreibenW(file, h), { haken: (stelle, db) => { if (stelle === 'nach-lesen') db.prepare('update setups set scenario_data = ? where id = ?').run(fremd, SETUP_ID); } });
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /seit dem Lesen geändert/);
      assert.equal(zeile(file).scenario_data, fremd, 'die fremde Änderung bleibt stehen');
    } finally { weg(tmp); }
  }
  for (const sql of [
    "update save_states set state_data = '{\"a\":99}' where name = 'Auto Save'",
    "update setups set action_data = '[]' where id = '" + SETUP_ID + "'",
    "update setups set name = 'anders' where id = '" + SETUP_ID + "'",
  ]) {
    const { tmp, file } = frischeDatenbank();
    try {
      const vorher = alles(file);
      const { h } = sicherung(tmp);
      const r = await lauf(schreibenW(file, h), { haken: (stelle, db) => { if (stelle === 'in-transaktion') db.prepare(sql).run(); } });
      assert.equal(r.code, 1, `${sql}: ${r.out}`);
      assert.match(r.out, /unerwartet geändert/);
      assert.deepEqual(alles(file), vorher, `Rollback: ${sql}`);
    } finally { weg(tmp); }
  }
});

// ── ET 8. Das Gerüst ────────────────────────────────────────────────────────

test('ET 8: `SCHRITTE` – `werte` hat `{ ausgang, ziel }`, `zonen`/`assets`/`aktionen`/`optionen` bleiben `null`; der Kopf des Skripts nennt weder Länge noch Hash des Zielstands von `werte`', () => {
  assert.deepEqual(Object.keys(SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen']);
  for (const k of ['assets', 'aktionen', 'optionen']) assert.equal(SCHRITTE[k], null, k);
  const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8').replace(/\r/g, '');
  const kopf = quelle.split('\n').filter((l, i, alle) => alle.slice(0, i + 1).every(x => x.startsWith('//') || x.trim() === '')).join('\n');
  const { laenge, sha: h } = SCHRITTE.werte.ziel.scenario;
  assert.ok(!kopf.includes(h), `der Kopf nennt ${h}`);
  for (const l of [String(laenge), String(laenge).replace(/(\d)(\d{3})$/, '$1 $2'), String(laenge).replace(/(\d)(\d{3})$/, '$1.$2')]) assert.ok(!kopf.includes(l), `der Kopf nennt ${l}`);
  assert.match(kopf, /\*\*`werte`:\*\*/, 'der Kopf beschreibt den Schritt');
});
