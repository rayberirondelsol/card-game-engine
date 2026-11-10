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
import { zoneContains, objectsInZone, zoneSlots, zoneSlotNumberAt } from '../../shared/zoneGeometry.js';
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

test('ES 8: `SCHRITTE` – sechs Schritte, `gelaende` mit `{ ausgang, ziel }`, die noch nicht gebauten `null` (`werte` seit ET, `zonen` seit EU, `assets` seit EV, `aktionen` seit EW gebaut, siehe dort)', () => {
  assert.deepEqual(Object.keys(SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen', 'haende']);
  assert.deepEqual(Object.keys(SCHRITTE.gelaende), ['ausgang', 'ziel']);
  for (const k of ['ausgang', 'ziel']) {
    assert.deepEqual(Object.keys(SCHRITTE.gelaende[k]), ['scenario'], k);
    assert.deepEqual(Object.keys(SCHRITTE.gelaende[k].scenario), ['laenge', 'sha'], k);
  }
  for (const k of Object.keys(SCHRITTE)) assert.notEqual(SCHRITTE[k], null, `${k} ist gebaut (optionen seit EX)`);
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
  istCode(fremd, 0);
  assert.equal(fremd.out, '', 'unter anderem Namen: leere Ausgabe');
  const eigen = lauf('/app/doerflerzahl-daten.mjs');
  assert.equal(eigen.code, 2, eigen.out);
  assert.match(eigen.out, /usage/);
});

// ── Die Läufe gegen eine Wegwerf-Datenbank ──────────────────────────────────

/** Ein fester Zeitpunkt für `created_at` der Wegwerf-Zeilen — kein `datetime('now')`, damit kein Vergleich an der Sekunde des Einfügens hängt. */
const ASSET_ZEIT = '2026-02-25 10:00:00';

/** Das echte Schema (`setupDatabase` in einem Kindprozess), die Bibliothek aus dem Auszug, die Kurzpartie mit den drei Spalten **aus der Fixture**, ein zweiter Aufbau, drei Spielstände. */
function frischeDatenbank({ scen = dz.scenario, seq = dz.sequence, act = dz.actions, zon = zones, ast = assets } = {}) {
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
  // `created_at` setzt der Aufbau selbst. Die Spalte steht auf `DEFAULT (datetime('now'))` mit Sekundenauflösung, und
  // `patchAssets` vergleicht die acht Klone `Marker 4/5: <Wert>` mit ihrer Vorlage `Marker 3: <Wert>` über **jedes**
  // Feld (`diffFelder(…, [])`) — in der Produktion ist der Klon `{ ...Vorlage, id, name }` und erbt den Wert. Ließe die
  // Schleife die Uhr entscheiden, bekämen Vorlage und Klon unter Last verschiedene Sekunden und der Lauf bräche mit
  // „weicht von der Vorlage ab: created_at“ ab. Dass der Klon das Feld wirklich mitnimmt, prüft `doerflerzahl-assets.test.js`
  // mit **verschiedenen** Zeiten je Zeile — hier geht es um die Schritte danach, die den Satz nur vorfinden.
  for (const a of ast) {
    db.prepare('insert into table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(a.id, GAME_ID, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category), a.created_at ?? ASSET_ZEIT);
  }
  for (const c of cards) {
    db.prepare('insert into cards (id, game_id, category_id, name, image_path, width, height) values (?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, GAME_ID, catId(c.category), c.name, c.image_path, c.width, c.height);
  }
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Aufbau', JSON.stringify(state), JSON.stringify(zon), seq, JSON.stringify(grids), act, scen);
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

/**
 * `code` eines `lauf(...)` pruefen und bei Abweichung **die Ausgabe des Laufs** als Meldung mitgeben.
 * `main` faengt jeden Fehler ab (`Abbruch: <message>`, Exit 1) — ohne die Ausgabe sagt ein
 * Ausfall nur „1 !== 0“ und verschweigt, welcher der vielen `return 1`-Pfade es war.
 */
function istCode(r, erwartet, wo) {
  assert.equal(r.code, erwartet, [wo, r.out || '(keine Ausgabe)'].filter(Boolean).join('\n'));
  return r;
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
    istCode(await lauf(['--check', file, '--schritt', 'gelaende'], { Db: Spion }), 0);
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
    istCode(await lauf(schreiben(file, h)), 0);
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
    istCode(ohne, 1);
    assert.match(ohne.out, /ohne Sicherung kein Schreiben/);
    const kurz = await lauf(['--write', file, '--schritt', 'gelaende', '--sicherung-sha', 'abc']);
    istCode(kurz, 1);
    assert.match(kurz.out, /12 Hex-Stellen/);
    const falsch = await lauf(['--write', file, '--schritt', 'gelaende', '--sicherung-sha', 'deadbeefdead']);
    istCode(falsch, 1);
    assert.match(falsch.out, /passt nicht zum gelesenen Text/);
    // Der Hash des bloßen Textes (statt des Sicherungshashes) und der einer anderen Spalte reichen nicht.
    for (const andere of [sha(dz.scenario), sha(dz.sequence), sha(dz.actions)]) {
      const r = await lauf(['--write', file, '--schritt', 'gelaende', '--sicherung-sha', andere]);
      istCode(r, 1, andere);
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
    istCode(c, 1);
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
    istCode(await lauf(schreiben(file, h)), 0);
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
    istCode(await lauf(schreiben(file, h)), 0);
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
    istCode(await lauf(schreiben(file, h)), 0);
    const vorher = alles(file);
    const schreibe = (name, o) => { const d = path.join(tmp, name); fs.writeFileSync(d, JSON.stringify(o)); return d; };
    const gut = { scenario_data: dz.scenario, sha256: sicherungsHash(dz.scenario) };
    const kaputt = await lauf(['--zurueck', schreibe('a.json', { ...gut, sha256: 'f'.repeat(64) }), file, '--schritt', 'gelaende']);
    istCode(kaputt, 1); assert.match(kaputt.out, /beschädigt/);
    const lose = JSON.stringify(scenario, null, 1);
    const nk = await lauf(['--zurueck', schreibe('b.json', { scenario_data: lose, sha256: sicherungsHash(lose) }), file, '--schritt', 'gelaende']);
    istCode(nk, 1); assert.match(nk.out, /kompaktes JSON/);
    // Die Sicherung ist schon der Zielstand: dorthin führt kein Weg zurück.
    const neu = await lauf(['--zurueck', schreibe('c.json', { scenario_data: ZIELTEXT, sha256: sicherungsHash(ZIELTEXT) }), file, '--schritt', 'gelaende']);
    istCode(neu, 1); assert.match(neu.out, /nicht der Ausgangsstand/);
    const form = await lauf(['--zurueck', schreibe('d.json', { sequence_data: dz.sequence }), file, '--schritt', 'gelaende']);
    istCode(form, 1); assert.match(form.out, /nicht die Form/);
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
    istCode(await lauf(schreiben(file, h), { Db: Spion }), 0);
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
    istCode(await lauf(schreiben(file, h)), 1);
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
    istCode(await lauf(schreiben(file, h)), 1);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

// (Der Test „die noch nicht gebauten Schritte melden »noch nicht gebaut«“ steht seit EX bei den `EX main`-Tests: es gibt keinen ungebauten Schritt mehr, der Mechanismus wird dort mit einem kurz auf `null` gestellten gezeigt.)

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
    istCode(c, 0);
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
    istCode(await lauf(['--write', file, '--schritt', 'werte']), 1);
    istCode(await lauf(schreibenW(file, 'abcdef012345')), 1, 'falscher Hash');
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
    istCode(await lauf(schreibenW(file, sicherung(tmp, text(halb)).h)), 1);
    assert.deepEqual(alles(file), v2, 'nichts geschrieben');
    // anderer Wert
    setze(file, 'scenario_data', text(mit(s => { s.bosses['Handsy'].stats.LEB = 99; })));
    istCode(await lauf(['--check', file, '--schritt', 'werte']), 1);
  } finally { weg(tmp); }
});

test('ET main: `--zurueck` – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen; ein zweites Mal ist „schon der Ausgangsstand“; ein weitergearbeiteter Stand bleibt stehen', async () => {
  const { tmp, file } = frischeDatenbank({ scen: NACH_GELAENDE });
  try {
    const vorher = alles(file);
    const { datei, h } = sicherung(tmp, NACH_GELAENDE);
    istCode(await lauf(schreibenW(file, h)), 0);
    assert.notDeepEqual(alles(file), vorher);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'werte']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /\(= die Sicherung, Zeichen für Zeichen\)/);
    assert.deepEqual(alles(file), vorher, 'jede Tabelle, jede Spalte wie am Anfang');
    assert.match((await lauf(['--zurueck', datei, file, '--schritt', 'werte'])).out, /schon der Ausgangsstand/);
    // weitergearbeitet: nach dem Schreiben ändert jemand etwas
    istCode(await lauf(schreibenW(file, h)), 0);
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

test('ET 8: `SCHRITTE` – `werte` hat `{ ausgang, ziel }` (alle sechs Schritte sind seit EX gebaut); der Kopf des Skripts nennt weder Länge noch Hash des Zielstands von `werte`', () => {
  assert.deepEqual(Object.keys(SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen', 'haende']);
  for (const k of Object.keys(SCHRITTE)) assert.notEqual(SCHRITTE[k], null, k);
  const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8').replace(/\r/g, '');
  const kopf = quelle.split('\n').filter((l, i, alle) => alle.slice(0, i + 1).every(x => x.startsWith('//') || x.trim() === '')).join('\n');
  const { laenge, sha: h } = SCHRITTE.werte.ziel.scenario;
  assert.ok(!kopf.includes(h), `der Kopf nennt ${h}`);
  for (const l of [String(laenge), String(laenge).replace(/(\d)(\d{3})$/, '$1 $2'), String(laenge).replace(/(\d)(\d{3})$/, '$1.$2')]) assert.ok(!kopf.includes(l), `der Kopf nennt ${l}`);
  assert.match(kopf, /\*\*`werte`:\*\*/, 'der Kopf beschreibt den Schritt');
});


// ═════════════════════════════════════════════════════════════════════════════
// EW Teil 1 / Spec M31.4, M31.8 Punkt 8, M31.9 — die Aktionen lernen die Dörflerzahl: Schritt `aktionen`
// ═════════════════════════════════════════════════════════════════════════════
//
// Eingang ist der Ausgang aus `ES` (die Fixture: `action_data` 5 803 Zeichen, vier Aktionen). Die Tische kommen aus dem Aufbau (`bauen`), **mit** den Zonen aus `EU` und den Assets
// aus `EV` (beide Bausteine, hier angewendet) und mit den Dörferdaten, wie `EX` sie schreiben wird (`SC_WB`: `baseCount`, `statsByCount`, fünf Plätze).
//
// **Der Zielstand steht hier ein zweites Mal, ausgeschrieben** (`HAND`, `FIGUR`, `RAEUME`, `ewMarker`, `WACHE_NEU`, `MUENZEN_NEU`) — aus dem Pflichtenheft, nicht aus dem Baustein gelesen.
// Wer die Stücke aus dem Baustein holte, prüfte ihn gegen sich selbst. Die Länge und der Hash des Ziels stehen **einmal** im Skript (`SCHRITTE`).

const EW = await import('../../scripts/doerflerzahl-daten.mjs');
const { validateStep, assetNames: ewAssetNames, assetPools: ewAssetPools } = await import('../../client/src/utils/sequenceSteps.js');
const { validateOptions } = await import('../../shared/setupOptions.js');
const frost = (x) => { Object.values(x).forEach(v => { if (v && typeof v === 'object') frost(v); }); return Object.freeze(x); };

const AKT = JSON.parse(dz.actions);
const AKT_IDS = ['kampf-beginnen', 'dorfereignis', 'laden-nachfuellen', 'dorfphase-beginnen'];
const stepsOf = (acts, id) => acts.find(a => a.id === id).steps;
const EW_ALT = Object.fromEntries(AKT_IDS.map(id => [id, stepsOf(AKT, id).map(text)]));

const WERT4 = [['Leben', 'LEB'], ['Bewegung', 'BEW'], ['Mumm', 'MUM'], ['Präzision', 'PRZ']];
const gate = (n, g) => (g ? `,"onlySeated":${n}` : '');
const HAND = (n, g = true) => `{"type":"deal_to_zone","stackLabel":"Dorf-Ereignisse","count":1,"targetZoneLabel":"Hand Dörfler ${n}","faceDown":false${gate(n, g)}}`;
const FIGUR = (n, g = true) => `{"type":"place_asset","assetName":"$F${n}","gridLabel":"Spielfeld A–S / 1–14","cell":"$D${n}","faceDown":false${gate(n, g)}}`;
const RAEUME = (n, g = true) => `{"type":"clear_table","assetName":"$F${n}"${gate(n, g)}}`;
const ewMarker = (n, g = true) => WERT4.map(([w, t]) => `{"type":"place_asset","assetName":"Marker ${n}: ${w}","targetZoneLabel":"Dörfler ${n}: ${w}","slot":"$V${n}${t}"${gate(n, g)}}`);
const WACHE_TEXT = 'Auf keiner Lebensleiste liegt noch ein Marker — alle Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende.';
const WACHE_NEU = `{"type":"require_marker","zoneLabel":["Dörfler 1: Leben","Dörfler 2: Leben","Dörfler 3: Leben","Dörfler 4: Leben","Dörfler 5: Leben"],"above":0,"confirm":true,"message":${text(WACHE_TEXT)}}`;
const MUENZEN_NEU = '{"type":"set_counter","name":"Münzen (gemeinsam)","value":"+6*$doerflerzahl"}';
const STUECKE = ['hand', 'figur', 'wache', 'raeume', 'muenzen', 'marker'];

/** Eine Aktion als Texte ihrer Schritte; `neu` nennt die Stücke, die schon im Ziel stehen (Vorgabe: alle), die anderen stehen noch wie im Ausgang. */
function ewStand(id, neu = STUECKE) {
  const A = EW_ALT[id], n = (s) => neu.includes(s);
  switch (id) {
    case 'dorfereignis': return [A[0], ...(n('hand') ? [HAND(5), HAND(4), HAND(3)] : [A[1]]), A[2], A[3]];
    case 'kampf-beginnen': return [...A.slice(0, 11), ...(n('figur') ? [FIGUR(3), FIGUR(4), FIGUR(5)] : [A[11]]), ...A.slice(12)];
    case 'laden-nachfuellen': return [...A];
    default: return [A[0], n('wache') ? WACHE_NEU : A[1], ...A.slice(2, 13), ...(n('raeume') ? [RAEUME(3), RAEUME(4), RAEUME(5)] : [A[13]]), A[14], A[15],
      n('muenzen') ? MUENZEN_NEU : A[16], ...A.slice(17, 29), ...(n('marker') ? [...ewMarker(3), ...ewMarker(4), ...ewMarker(5)] : A.slice(29))];
  }
}
const ewAktionen = (neu = STUECKE) => AKT.map(a => ({ ...a, steps: ewStand(a.id, neu).map(s => JSON.parse(s)) }));
const ZIEL_AKT = ewAktionen();
const EW_Z = SCHRITTE.aktionen?.ziel?.action;   // ohne Konstante: undefined, die Tests darunter sind rot

const abweichendA = (acts) => {
  const p = EW.patchAktionen(acts);
  assert.equal(p.art, 'abweichend', `erwartet abweichend, ist ${p.art}`);
  assert.equal(p.action, undefined, 'bei einer Abweichung gibt es keinen Zielstand');
  return p.probleme.join('\n');
};

// ── EW 0. Die Messung: die Fixture ist, was der Befund erwartet ─────────────

test('EW 0: **gezählt**, nicht geglaubt – die vier Aktionen der Fixture haben 17 / 4 / 1 / 33 Schritte, und jedes betroffene Stück steht dort, wo der Befund es sucht', () => {
  assert.deepEqual(AKT.map(a => [a.id, a.steps.length]), [['kampf-beginnen', 17], ['dorfereignis', 4], ['laden-nachfuellen', 1], ['dorfphase-beginnen', 33]]);
  assert.deepEqual(Object.keys(AKT[0]), ['id', 'label', 'steps']);
  const k = stepsOf(AKT, 'kampf-beginnen'), d = stepsOf(AKT, 'dorfereignis'), p = stepsOf(AKT, 'dorfphase-beginnen');
  assert.equal(text(k[11]), FIGUR(3, false), 'kampf-beginnen 11: `$F3` auf `$D3`');
  assert.equal(text(k[10]), FIGUR(2, false));
  assert.equal(k[12].assetName, 'Tableau: $revealedBase', '… und dahinter geht es mit dem Tableau weiter');
  assert.equal(text(d[1]), HAND(3, false), 'dorfereignis 1: `Hand Dörfler 3`');
  assert.equal(text(d[3]), HAND(1, false));
  assert.equal(text(p[13]), RAEUME(3, false), 'dorfphase-beginnen 13: `clear_table $F3`');
  assert.equal(text(p[16]), '{"type":"set_counter","name":"Münzen (gemeinsam)","value":"+18"}', 'Schritt 16: die Münzen');
  assert.deepEqual(p.slice(29, 33).map(text), ewMarker(3, false), 'Schritt 29–32: die vier `Marker 3`');
  assert.equal(p[1].type, 'require_marker', 'Schritt 1: die Wache');
  assert.deepEqual(p[1].zoneLabel, ['Dörfler 1: Leben', 'Dörfler 2: Leben', 'Dörfler 3: Leben'], 'drei Lebensleisten');
  assert.equal(p[1].message, 'Auf keiner Lebensleiste liegt noch ein Marker — alle drei Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende.', 'der Text aus M30.9');
  assert.equal(p[2].type, 'clear_table', 'Schritt 2 (die dritte Kategorie ist Welle 2, FG)');
  // Die Zusammensetzung des Tests ist selbst richtig: ohne ein Stück neu ergibt sie genau die Fixture.
  assert.equal(text(ewAktionen([])), dz.actions, 'der Ausgang, aus den Stücken zusammengesetzt, ist die Fixture');
  assert.deepEqual(AKT.map(a => ewStand(a.id).length), [19, 6, 1, 43]);
});

// ── EW 1. Der Zielstand ─────────────────────────────────────────────────────

test('EW 1: Zielstand – genau die Stücke des Befunds, **jede andere Zeile** byteweise gleich; 19 / 6 / 1 / 43 Schritte', () => {
  const p = EW.patchAktionen(AKT);
  assert.equal(p.art, 'zu-schreiben', (p.probleme ?? []).join('\n'));
  assert.deepEqual(Object.keys(p), ['art', 'action'], 'der Zielstand trägt nur `action`');
  assert.equal(text(p.action), text(ZIEL_AKT));
  assert.deepEqual(p.action.map(a => [a.id, a.steps.length]), [['kampf-beginnen', 19], ['dorfereignis', 6], ['laden-nachfuellen', 1], ['dorfphase-beginnen', 43]]);
  assert.deepEqual(p.action.map(a => [a.id, a.label]), AKT.map(a => [a.id, a.label]), 'dieselben Aktionen in derselben Reihenfolge');
  // Jede andere Zeile: laden-nachfuellen ganz, und je Aktion die Schritte außerhalb der Stücke.
  assert.equal(text(p.action[2]), text(AKT[2]));
  const neuK = stepsOf(p.action, 'kampf-beginnen').map(text), altK = EW_ALT['kampf-beginnen'];
  assert.deepEqual([...neuK.slice(0, 11), ...neuK.slice(14)], [...altK.slice(0, 11), ...altK.slice(12)]);
  const neuP = stepsOf(p.action, 'dorfphase-beginnen').map(text), altP = EW_ALT['dorfphase-beginnen'];
  assert.deepEqual([neuP[0], ...neuP.slice(2, 13), neuP[16], neuP[17], ...neuP.slice(19, 31)], [altP[0], ...altP.slice(2, 13), altP[14], altP[15], ...altP.slice(17, 29)]);
  assert.equal(neuP[2], altP[2], 'Schritt 2 (`clear_table`, die dritte Kategorie ist Welle 2) unverändert');
  const neuD = stepsOf(p.action, 'dorfereignis').map(text), altD = EW_ALT.dorfereignis;
  assert.deepEqual([neuD[0], neuD[4], neuD[5]], [altD[0], altD[2], altD[3]]);
});

test('EW 1: Länge und Hash des Ziels und des Ausgangs – so, wie das Skript sie als Konstanten trägt; der Ausgang ist der Stand nach M30 (5 803 / 33033dace238)', () => {
  assert.deepEqual(SCHRITTE.aktionen?.ausgang, { action: { laenge: 5803, sha: '33033dace238' } });
  assert.deepEqual([dz.actions.length, sha(dz.actions)], [5803, '33033dace238']);
  const z = text(EW.patchAktionen(AKT).action);
  assert.deepEqual([z.length, sha(z)], [EW_Z.laenge, EW_Z.sha]);
  assert.ok(z.length > dz.actions.length, 'der Text ist länger geworden');
  assert.deepEqual(Object.keys(SCHRITTE.aktionen), ['ausgang', 'ziel']);
});

test('EW 1: die Gates – je Aktion und Platz gezählt; keine an Platz 1 und 2 (nicht entfernbar, M31.3), nie eine Liste', () => {
  const z = EW.patchAktionen(AKT).action;
  const zaehle = (id) => { const c = {}; for (const s of stepsOf(z, id)) if (s.onlySeated !== undefined) c[s.onlySeated] = (c[s.onlySeated] ?? 0) + 1; return c; };
  assert.deepEqual(zaehle('dorfereignis'), { 3: 1, 4: 1, 5: 1 });
  assert.deepEqual(zaehle('kampf-beginnen'), { 3: 1, 4: 1, 5: 1 });
  assert.deepEqual(zaehle('laden-nachfuellen'), {});
  assert.deepEqual(zaehle('dorfphase-beginnen'), { 3: 5, 4: 5, 5: 5 }, '`clear_table $F<n>` und vier Marker je Platz');
  for (const a of z) for (const s of a.steps) if (s.onlySeated !== undefined) assert.ok([3, 4, 5].includes(s.onlySeated), `${a.id}: ${text(s)}`);
  // Kein anderes Gate ist dazugekommen: `onlyChoice` darf in einer Aktion nie stehen, `onlyFinal` stand schon vorher.
  for (const a of z) for (const s of a.steps) assert.ok(!('onlyChoice' in s), `${a.id}: ${text(s)}`);
  assert.equal(z.flatMap(a => a.steps).filter(s => 'onlyFinal' in s).length, AKT.flatMap(a => a.steps).filter(s => 'onlyFinal' in s).length);
});

test('EW 1: `$doerflerzahl` steht **klein** (die Ersetzung unterscheidet Groß und Klein), die 6 steht **einmal**, und kein Schritt nennt mehr „drei“', () => {
  const z = EW.patchAktionen(AKT).action;
  const alle = z.flatMap(a => a.steps.map((s, i) => [a.id, i, text(s)]));
  assert.deepEqual(alle.filter(([, , t]) => t.includes('$doerflerzahl')).map(([a, i]) => [a, i]), [['dorfphase-beginnen', 18]], 'genau ein Schritt, an Stelle 18');
  assert.ok(!alle.some(([, , t]) => /\$Doerflerzahl|\$DOERFLERZAHL/.test(t)));
  assert.equal(alle.filter(([, , t]) => t.includes('"+6')).length, 1);
  assert.equal(stepsOf(z, 'dorfphase-beginnen')[18].value, '+6*$doerflerzahl');
  assert.ok(!alle.some(([, , t]) => /\bdrei\b/i.test(t)), 'kein Schritt nennt „drei“ (die Wache war der eine)');
});

test('EW 1: Rückwärtsbeweis **und** Vorwärtsprobe – Gates, Wert, Text, Zonenliste zurück und die neuen Schritte heraus ergibt den gelesenen Text; aus dem Gelesenen entsteht genau der Zielstand', () => {
  const p = EW.patchAktionen(AKT);
  assert.deepEqual(EW.beweiseAktionen({ action: AKT }, { action: p.action }), []);
  assert.deepEqual(EW.beweiseAktionen({ action: AKT }, { action: ZIEL_AKT }), [], 'auch gegen den ausgeschriebenen Zielstand dieses Tests');
});

test('EW 1: die Beweise fangen, was nicht stimmt – ein Gate fehlt, am falschen Schritt, ein falscher Platz; ein falscher Wert (die Vorwärtsprobe, nicht der Rückwärtsbeweis), ein falscher Text, vier Leisten, ein Schritt mehr', () => {
  const mut = (fn) => { const c = copy(ZIEL_AKT); fn(c); return c; };
  const st = (c, id) => stepsOf(c, id);
  const FALL = {
    'Gate an Hand 3 fehlt': (c) => { delete st(c, 'dorfereignis')[3].onlySeated; },
    'Gate an Hand 5 fehlt': (c) => { delete st(c, 'dorfereignis')[1].onlySeated; },
    'Gate von `$F3` fehlt': (c) => { delete st(c, 'kampf-beginnen')[11].onlySeated; },
    'Gate am falschen Schritt (clear_zone, Schritt 3)': (c) => { st(c, 'dorfphase-beginnen')[3].onlySeated = 3; },
    'Gate am Schritt 2 (die dritte Kategorie ist Welle 2)': (c) => { st(c, 'dorfphase-beginnen')[2].onlySeated = 3; },
    'ein falscher Platz im Gate': (c) => { st(c, 'kampf-beginnen')[12].onlySeated = 5; },
    'ein Gate als Liste': (c) => { st(c, 'kampf-beginnen')[13].onlySeated = [5]; },
    'Marker 3 ohne Gate': (c) => { delete st(c, 'dorfphase-beginnen')[34].onlySeated; },
    'nur vier statt acht Marker-Schritte': (c) => { st(c, 'dorfphase-beginnen').splice(35, 4); },
    'ein Marker-Schritt mehr': (c) => { st(c, 'dorfphase-beginnen').push(JSON.parse(ewMarker(5)[0])); },
    'Hand 4 und 5 hinter Hand 3': (c) => { const s = st(c, 'dorfereignis'); [s[1], s[3]] = [s[3], s[1]]; },
    'Münzen: `$Doerflerzahl` groß': (c) => { st(c, 'dorfphase-beginnen')[18].value = '+6*$Doerflerzahl'; },
    'Münzen: `*6+$doerflerzahl`': (c) => { st(c, 'dorfphase-beginnen')[18].value = '*6+$doerflerzahl'; },
    'Münzen: ohne Vorzeichen': (c) => { st(c, 'dorfphase-beginnen')[18].value = '6*$doerflerzahl'; },
    'Münzen: noch `+18`': (c) => { st(c, 'dorfphase-beginnen')[18].value = '+18'; },
    'die Wache nennt nur vier Leisten': (c) => { st(c, 'dorfphase-beginnen')[1].zoneLabel.pop(); },
    'die Wache nennt „drei“': (c) => { st(c, 'dorfphase-beginnen')[1].message = WACHE_TEXT.replace('alle Dörfler', 'alle drei Dörfler'); },
    'die Wache hat einen anderen Satz': (c) => { st(c, 'dorfphase-beginnen')[1].message += ' '; },
    'Schritt 2 (clear_table) verändert': (c) => { st(c, 'dorfphase-beginnen')[2].category = ['Dorf-Ereignisse']; },
    'eine andere Zeile mitverändert': (c) => { st(c, 'dorfphase-beginnen')[17].faceDown = true; },
    'laden-nachfuellen verändert': (c) => { st(c, 'laden-nachfuellen')[0].count = 11; },
  };
  for (const [wie, fn] of Object.entries(FALL)) {
    const m = EW.beweiseAktionen({ action: AKT }, { action: mut(fn) });
    assert.ok(m.length > 0, `nicht gefangen: ${wie}`);
  }
  // Der Fall, den der Rückwärtsbeweis allein übersähe (er wirft Wert und Text weg): die Vorwärtsprobe nennt ihn.
  const falscherWert = EW.beweiseAktionen({ action: AKT }, { action: mut(c => { stepsOf(c, 'dorfphase-beginnen')[18].value = '+6*$Doerflerzahl'; }) });
  assert.ok(falscherWert.some(m => /Vorwärtsprobe/.test(m)), falscherWert.join('\n'));
  assert.deepEqual(EW.beweiseAktionen({ action: AKT }, { action: 'kein Feld' }).length, 1);
});

// ── EW 2. Die Vorbedingung je Stück ─────────────────────────────────────────

const ewMit = (fn, acts = AKT) => { const c = copy(acts); fn(c); return c; };

test('EW 2: die Fixture trägt genau die Stücke, die der Schritt erwartet – er schreibt, und der Ausgang ist `zu-schreiben`', () => {
  assert.equal(EW.patchAktionen(frost(copy(AKT))).art, 'zu-schreiben', 'auch auf einer eingefrorenen Eingabe (sie wird nicht angefasst)');
});

test('EW 2: jedes betroffene Stück muss genau das sein – ein Feld anders, ein Wert anders, ein Schlüssel mehr: Abbruch mit Aktion und Index', () => {
  const FALL = [
    ['Hand 3: anderes Ziel', (c) => { stepsOf(c, 'dorfereignis')[1].targetZoneLabel = 'Hand Dörfler 2'; }, /dorfereignis[^\n]*1/],
    ['Hand 3: count 2', (c) => { stepsOf(c, 'dorfereignis')[1].count = 2; }, /dorfereignis[^\n]*1/],
    ['$F3: eine andere Zelle', (c) => { stepsOf(c, 'kampf-beginnen')[11].cell = '$D2'; }, /kampf-beginnen[^\n]*11/],
    ['$F3: faceDown', (c) => { stepsOf(c, 'kampf-beginnen')[11].faceDown = true; }, /kampf-beginnen[^\n]*11/],
    ['clear_table $F3: ein Feld mehr', (c) => { stepsOf(c, 'dorfphase-beginnen')[13].faceDown = true; }, /dorfphase-beginnen[^\n]*13/],
    ['Münzen: +17', (c) => { stepsOf(c, 'dorfphase-beginnen')[16].value = '+17'; }, /dorfphase-beginnen[^\n]*16/],
    ['Münzen: ein anderer Zähler', (c) => { stepsOf(c, 'dorfphase-beginnen')[16].name = 'Münzen'; }, /dorfphase-beginnen[^\n]*16/],
    ['Münzen: eine Zahl statt Text', (c) => { stepsOf(c, 'dorfphase-beginnen')[16].value = 18; }, /dorfphase-beginnen[^\n]*16/],
    ['Wache: ein anderer Text', (c) => { stepsOf(c, 'dorfphase-beginnen')[1].message = 'Alle besiegt.'; }, /dorfphase-beginnen[^\n]*1\b/],
    ['Wache: vier Leisten', (c) => { stepsOf(c, 'dorfphase-beginnen')[1].zoneLabel.push('Dörfler 4: Leben'); }, /dorfphase-beginnen[^\n]*1\b/],
    ['Wache: ohne confirm', (c) => { delete stepsOf(c, 'dorfphase-beginnen')[1].confirm; }, /dorfphase-beginnen[^\n]*1\b/],
    ['Wache: ein anderer Typ', (c) => { stepsOf(c, 'dorfphase-beginnen')[1].type = 'require_counter'; }, /dorfphase-beginnen[^\n]*1\b/],
    ['Marker 3 Leben: eine andere Zone', (c) => { stepsOf(c, 'dorfphase-beginnen')[29].targetZoneLabel = 'Dörfler 3: Mumm'; }, /dorfphase-beginnen[^\n]*29/],
    ['Marker 3 Bewegung: ein anderer Platzhalter', (c) => { stepsOf(c, 'dorfphase-beginnen')[30].slot = '$V3LEB'; }, /dorfphase-beginnen[^\n]*30/],
    ['Marker 3 Mumm: ein Feld mehr', (c) => { stepsOf(c, 'dorfphase-beginnen')[31].faceDown = false; }, /dorfphase-beginnen[^\n]*31/],
    ['Marker 3 Präzision: ein anderer Name', (c) => { stepsOf(c, 'dorfphase-beginnen')[32].assetName = 'Marker 3: Treffer'; }, /dorfphase-beginnen[^\n]*32/],
  ];
  for (const [wie, fn, pfad] of FALL) {
    const m = abweichendA(ewMit(fn));
    assert.match(m, pfad, `${wie}: die Meldung nennt Aktion und Index – ${m}`);
  }
});

test('EW 2: die Zahl der Schritte ist Vorbedingung – ein Schritt mehr oder weniger in einer der drei Aktionen: Abbruch (die Positionen trügen sonst)', () => {
  for (const id of ['kampf-beginnen', 'dorfereignis', 'dorfphase-beginnen']) {
    const mehr = abweichendA(ewMit(c => { stepsOf(c, id).push({ type: 'shuffle', stackLabel: 'X' }); }));
    assert.match(mehr, new RegExp(id), `${id} mit einem Schritt mehr`);
    const weniger = abweichendA(ewMit(c => { stepsOf(c, id).pop(); }));
    assert.match(weniger, new RegExp(id), `${id} mit einem Schritt weniger`);
  }
});

test('EW 2: Form – keine Liste, eine Aktion fehlt, `steps` kein Feld, ein Schritt kein Objekt: Abbruch mit Pfad, kein Wurf', () => {
  for (const [wie, eingabe] of [
    ['kein Feld', 'text'], ['ein Objekt', {}], ['null', null], ['eine leere Liste', []],
    ['eine Aktion fehlt', AKT.filter(a => a.id !== 'dorfereignis')],
    ['steps ist kein Feld', ewMit(c => { c[1].steps = 'x'; })],
    ['ein Schritt ist null', ewMit(c => { c[0].steps[11] = null; })],
    ['eine Aktion doppelt', [...AKT, copy(AKT[1])]],
  ]) {
    const p = EW.patchAktionen(eingabe);
    assert.equal(p.art, 'abweichend', wie);
    assert.ok(p.probleme.length, wie);
  }
});

test('EW 2: **jede andere Zeile** bleibt, wie sie ist – ein fremder Schritt, ein fremdes Feld, eine fremde Aktion kommen unverändert im Ziel an (der Schritt schreibt nur seine Stücke)', () => {
  const fremd = ewMit(c => {
    stepsOf(c, 'dorfphase-beginnen')[7].zoneLabel = 'Fremde Zone';
    stepsOf(c, 'kampf-beginnen')[3].faceDown = true;
    c[2].steps[0].count = 99;
    c[1].label = 'Anders';
  });
  const p = EW.patchAktionen(fremd);
  assert.equal(p.art, 'zu-schreiben', (p.probleme ?? []).join('\n'));
  assert.equal(stepsOf(p.action, 'dorfphase-beginnen')[7 + 0].zoneLabel, 'Fremde Zone');
  assert.equal(stepsOf(p.action, 'kampf-beginnen')[3].faceDown, true);
  assert.equal(p.action[2].steps[0].count, 99);
  assert.equal(p.action[1].label, 'Anders');
  assert.equal(text(p.action[2]), text(fremd[2]));
});

test('EW 2: schon geschrieben – „schon-da“, die Eingabe kommt gleich zurück (als Kopie) und wird nicht verändert', () => {
  const eingabe = frost(copy(ZIEL_AKT));
  const p = EW.patchAktionen(eingabe);
  assert.equal(p.art, 'schon-da', (p.probleme ?? []).join('\n'));
  assert.equal(text(p.action), text(ZIEL_AKT));
  assert.notEqual(p.action, eingabe, 'eine Kopie');
});

test('EW 2: ein **anderer** Wert am Ziel ist ein Abbruch – jedes Stück, das schon geschrieben aussieht, aber nicht genau das Ziel ist', () => {
  const FALL = [
    ['Münzen groß geschrieben', (c) => { stepsOf(c, 'dorfphase-beginnen')[18].value = '+6*$Doerflerzahl'; }],
    ['Münzen mit anderer Reihenfolge', (c) => { stepsOf(c, 'dorfphase-beginnen')[18].value = '+$doerflerzahl*6'; }],
    ['Wache mit „drei“', (c) => { stepsOf(c, 'dorfphase-beginnen')[1].message = 'Auf keiner Lebensleiste liegt noch ein Marker — alle drei Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende.'; }],
    ['Wache mit vier Leisten', (c) => { stepsOf(c, 'dorfphase-beginnen')[1].zoneLabel.pop(); }],
    ['ein Gate mit falschem Platz', (c) => { stepsOf(c, 'kampf-beginnen')[12].onlySeated = 5; }],
    ['ein Gate als Text', (c) => { stepsOf(c, 'kampf-beginnen')[13].onlySeated = '5'; }],
    ['Hand 4 und 5 vertauscht', (c) => { const s = stepsOf(c, 'dorfereignis'); [s[1], s[2]] = [s[2], s[1]]; }],
    ['ein Marker-Schritt fehlt', (c) => { stepsOf(c, 'dorfphase-beginnen').splice(36, 1); }],
  ];
  for (const [wie, fn] of FALL) {
    const p = EW.patchAktionen(ewMit(fn, ZIEL_AKT));
    assert.equal(p.art, 'abweichend', `${wie}: ${p.art}`);
    assert.ok(p.probleme.length, wie);
  }
});

test('EW 2: ein **teilweise** geschriebener Stand ist ein Abbruch – jedes Stück einzeln neu, die anderen alt; eine Aktion neu, die anderen alt; ein Gate ohne die neuen Schritte; die neuen Schritte ohne das Gate', () => {
  for (const stueck of STUECKE) {
    const m = abweichendA(ewAktionen([stueck]));
    assert.match(m, /halber Stand|teils/i, `nur „${stueck}“ ist neu: ${m}`);
    const umgekehrt = abweichendA(ewAktionen(STUECKE.filter(s => s !== stueck)));
    assert.match(umgekehrt, /halber Stand|teils/i, `nur „${stueck}“ fehlt: ${umgekehrt}`);
  }
  for (const neu of [['hand'], ['figur'], ['wache', 'raeume', 'muenzen', 'marker']]) assert.match(abweichendA(ewAktionen(neu)), /halber Stand|teils/i, `Aktion(en) ${neu}`);
  // Ein Stück **halb**: das Gate allein (kein Schritt für Platz 4 und 5) oder die Schritte ohne das Gate an Platz 3.
  const nurGate = ewMit(c => { stepsOf(c, 'dorfereignis')[1].onlySeated = 3; });
  assert.match(abweichendA(nurGate), /dorfereignis/);
  const ohneGate = ewAktionen(); delete ohneGate[1].steps[3].onlySeated;
  assert.match(abweichendA(ohneGate), /dorfereignis/);
  const nurSchritte = ewMit(c => { stepsOf(c, 'kampf-beginnen').splice(12, 0, JSON.parse(FIGUR(4)), JSON.parse(FIGUR(5))); });
  assert.match(abweichendA(nurSchritte), /kampf-beginnen/);
});

// ── EW 3. Der Tisch ─────────────────────────────────────────────────────────
//
// Der Aufbau (`bauen`) legt die Dörfler aus den Daten (`seat_villager`), mit den Zonen aus EU und den Assets aus EV. Für vier und fünf Dörfler stehen die Schritte für Platz 4
// und 5 **hier** in der Folge (sie kommen erst mit EX in die Daten): hinter Platz 3, vor den Münzen. Eine Runde ist `kampf-beginnen`, `dorfphase-beginnen`, `dorfereignis` — die Reihenfolge,
// in der ein Spieler sie fährt (ein Dorf-Ereignis gibt es nur, wenn kein Kampf mehr läuft).

const NEU = (() => { let a; return () => (a ??= EW.patchAktionen(AKT).action); })();
const EW_ZONEN = EW.patchZonen(zones).zone;
const EW_ASSETS = EW.patchAssets(assets).assets;
const SC_PROD = EW.patchWerte(ziel.scenario).scenario;           // so liegt `scenario_data` in der Produktion, wenn ES und ET geschrieben sind: **drei** Plätze, kein baseCount
const SEAT45 = [[4, 'Blopsy Twins'], [5, 'Yancy Plover']];

const ewTische = new Map();
function ewAufbau(n, sc = SC_WB) {
  const key = `${n}${sc === SC_WB ? 'B' : 'P'}`;
  if (!ewTische.has(key)) {
    const seq = copy(sequence).filter(s => !(n < 3 && s.type === 'seat_villager' && s.seat === 3));
    const dazu = SEAT45.filter(([i]) => i <= n).map(([i, v]) => ({ type: 'seat_villager', seat: i, villager: v }));
    seq.splice(seq.findIndex(s => s.type === 'place_counter'), 0, ...dazu);
    const r = bauen({ state, sequence: seq, zones: EW_ZONEN, grids, assets: EW_ASSETS, cards, scenarioData: sc }, {}, 1);
    assert.deepEqual(r.log.filter(e => e.status === 'failed' || e.status === 'skipped'), [], `der Aufbau für ${n} Dörfler: ${r.log.filter(e => e.status !== 'ok').map(e => e.reason).join(' | ')}`);
    ewTische.set(key, r);
  }
  return ewTische.get(key);
}
const ewLauf = (acts, id, st, o = {}) => executeSequenceWithLog(st, stepsOf(acts, id), o.zonen ?? EW_ZONEN, { assets: o.assets ?? EW_ASSETS, cards, grids, scenarioData: o.sc ?? SC_WB, rng: seededRng(7) });
function ewRunde(acts, st, o = {}) {
  const kampf = ewLauf(acts, 'kampf-beginnen', st, o);
  const phase = ewLauf(acts, 'dorfphase-beginnen', kampf.state, o);
  const ereignis = ewLauf(acts, 'dorfereignis', phase.state, o);
  return { kampf, phase, ereignis };
}
/**
 * Die Zeilen des Protokolls ohne den Index. **Zwei Zeilen unterscheiden sich in den Daten selbst und werden hier gleichgesetzt** (beide stehen darunter in eigenen Tests):
 * die der Wache nennt als `target` ihre Lebensleisten (fünf statt drei, nur die ersten drei zählen hier), und ein Halt trägt „(N further steps skipped)“ — die neuen Aktionen sind länger.
 */
const ewZeilen = (r) => r.log.map(e => [e.type, Array.isArray(e.target) ? e.target.filter(z => !/^Dörfler [45]: /.test(z)) : e.target, e.status, (e.reason ?? '').replace(/ \(\d+ further steps? skipped\)/, '')]);
const ewMuenzen = (st) => st.counters.find(c => c.name === 'Münzen (gemeinsam)').value;
const ewNamen = (st, sc = SC_WB) => seatedVillagers(st, EW_ASSETS, sc.villagers).map(s => s.name);
const ewFiguren = (st, sc = SC_WB) => st.tokens.filter(t => t.gridId && ewNamen(st, sc).includes(t.label));
const ewMarkerPlaetze = (st) => st.tokens.map(t => /^Marker (\d): /.exec(t.label ?? '')).filter(Boolean).map(m => Number(m[1]));
const ewGleichGelaufen = (neu, alt, wo, acts = [NEU(), AKT]) => {
  for (const stufe of ['kampf', 'phase', 'ereignis']) {
    for (const feld of ['tokens', 'cards', 'counters', 'boards']) assert.deepEqual(ohneIds(neu[stufe].state[feld]), ohneIds(alt[stufe].state[feld]), `${wo} ${stufe}: ${feld}`);
    assert.deepEqual(ohneIds(neu[stufe].state.stacks), ohneIds(alt[stufe].state.stacks), `${wo} ${stufe}: stacks`);
    assert.deepEqual(ewZeilen(neu[stufe]), ewZeilen(alt[stufe]), `${wo} ${stufe}: Protokollzeilen (ohne den Index, den die neuen Schritte verschieben)`);
  }
};
/** Jede Zeile des Protokolls zeigt auf einen Schritt desselben Typs — auch dann, wenn neue Schritte die Indizes verschoben haben. */
const ewIndexStimmt = (r, acts, id) => r.log.every(e => e.index < 0 || stepsOf(acts, id)[e.index]?.type === e.type);

test('EW 3: **folgenlos mit drei Dörflern** – die drei Aktionen mit den neuen und den alten Daten ergeben **denselben** Zustand (tokens, counters, cards, stacks, boards ohne die Ids) und **dieselben** Protokollzeilen; Münzen +18 (zwei Runden)', () => {
  const s0 = ewAufbau(3).state;
  assert.equal(ewMuenzen(s0), 45);
  const alt = ewRunde(AKT, s0), neu = ewRunde(NEU(), s0);
  ewGleichGelaufen(neu, alt, 'Runde 1');
  assert.equal(ewMuenzen(alt.phase.state) - ewMuenzen(alt.kampf.state), 18);
  assert.equal(ewMuenzen(neu.phase.state) - ewMuenzen(neu.kampf.state), 18, 'Münzen +18, wie vorher');
  assert.equal(ewMuenzen(neu.ereignis.state), 63);
  for (const [stufe, id] of [['kampf', 'kampf-beginnen'], ['phase', 'dorfphase-beginnen'], ['ereignis', 'dorfereignis']]) {
    assert.ok(ewIndexStimmt(neu[stufe], NEU(), id), `${id}: jeder Index zeigt auf einen Schritt desselben Typs`);
    assert.deepEqual(neu[stufe].log.filter(e => e.status === 'failed' || e.status === 'skipped'), [], `${id}: keine Beanstandung`);
  }
  // Nicht leer verglichen: es ist etwas geschehen (drei Figuren, drei Karten, drei Marker-Sätze).
  assert.equal(ewFiguren(neu.kampf.state).length, 3);
  assert.equal(neu.ereignis.state.cards.length - neu.phase.state.cards.length, 3);
  assert.equal(ewMarkerPlaetze(neu.phase.state).length, 12);
  // Die zweite Runde (Kampf 2, Virginia Fitz): auch sie ist dieselbe.
  const alt2 = ewRunde(AKT, alt.ereignis.state), neu2 = ewRunde(NEU(), neu.ereignis.state);
  ewGleichGelaufen(neu2, alt2, 'Runde 2');
  assert.equal(ewMuenzen(neu2.ereignis.state), 81);
});

test('EW 3: die zwei Zeilen, die sich **mit Absicht** unterscheiden – die der Wache nennt fünf Lebensleisten statt drei als Ziel; ein Halt zählt zwei Schritte mehr (19 statt 17 Schritte)', () => {
  const s0 = ewAufbau(3).state;
  const alt = ewRunde(AKT, s0), neu = ewRunde(NEU(), s0);
  const wache = (r) => r.phase.log.find(e => e.type === 'require_marker');
  assert.deepEqual(wache(alt).target, [1, 2, 3].map(n => `Dörfler ${n}: Leben`));
  assert.deepEqual(wache(neu).target, [1, 2, 3, 4, 5].map(n => `Dörfler ${n}: Leben`));
  assert.deepEqual([wache(alt).status, wache(neu).status], ['ok', 'ok'], 'die Wache lässt durch');
  // Ein Halt (der Kampf läuft noch): „(N further steps skipped)“ zählt die Schritte dahinter.
  const halt = (acts) => ewLauf(acts, 'kampf-beginnen', alt.kampf.state).log[0].reason.match(/\((\d+) further steps skipped\)/)[1];
  assert.deepEqual([Number(halt(AKT)), Number(halt(NEU()))], [16, 18]);
});

test('EW 3: **dieselbe Aussage auf dem Tisch von `villager-table.js`** (`build()`: drei Dörfler, keine Stapel) – Dorfphase, ereignis und Kampf mit den neuen und den alten Daten: derselbe Zustand, dieselben Zeilen', async () => {
  const vt = await import('./villager-table.js');
  const sc = copy(SC_WB);
  const zonen = [...vt.ZONES, ...EW_ZONEN.filter(z => !vt.ZONES.some(v => v.label === z.label))];
  const o = { zones: zonen, scenarioData: sc, assets: [...vt.fx.assets, ...EW_ASSETS.filter(a => /^Marker [45]/.test(a.name))] };
  const imKampf = vt.imKampf(vt.build());
  for (const [wo, st] of [['im Kampf', imKampf], ['ohne Kampf', vt.build()]]) {
    for (const id of ['kampf-beginnen', 'dorfphase-beginnen', 'dorfereignis']) {
      const alt = vt.run(copy(st), stepsOf(AKT, id), o), neu = vt.run(copy(st), stepsOf(NEU(), id), o);
      for (const feld of ['tokens', 'cards', 'counters', 'boards', 'stacks']) assert.deepEqual(ohneIds(neu.state[feld]), ohneIds(alt.state[feld]), `${wo} ${id}: ${feld}`);
      assert.deepEqual(ewZeilen(neu), ewZeilen(alt), `${wo} ${id}: Protokollzeilen`);
    }
  }
});

test('EW 3: **Befund** – solange `villagers.seats` nur **drei** Plätze hat (bis EX sie schreibt), lässt jeder Schritt mit `onlySeated: 4|5` eine Zeile `failed` zurück: 2 + 2 + 10 je Runde; der Zustand ist trotzdem derselbe', () => {
  const s0 = ewAufbau(3, SC_PROD).state;
  assert.equal(SC_PROD.villagers.seats.length, 3);
  const alt = ewRunde(AKT, s0, { sc: SC_PROD }), neu = ewRunde(NEU(), s0, { sc: SC_PROD });
  const gescheitert = (r) => r.log.filter(e => e.status === 'failed');
  assert.deepEqual(gescheitert(alt.kampf).concat(gescheitert(alt.phase), gescheitert(alt.ereignis)), [], 'mit den alten Aktionen: keine');
  assert.deepEqual([gescheitert(neu.ereignis).length, gescheitert(neu.kampf).length, gescheitert(neu.phase).length], [2, 2, 10]);
  for (const e of [...gescheitert(neu.kampf), ...gescheitert(neu.phase), ...gescheitert(neu.ereignis)]) assert.match(e.reason, /^onlySeated: [45] is not a seat \(1 to 3\)/);
  // Der Zustand ändert das nicht: nichts davon war für drei Dörfler gedacht.
  for (const stufe of ['kampf', 'phase', 'ereignis']) {
    for (const feld of ['tokens', 'cards', 'counters', 'boards']) assert.deepEqual(ohneIds(neu[stufe].state[feld]), ohneIds(alt[stufe].state[feld]), `${stufe}: ${feld}`);
  }
});

// ── EW 4. Zwei, vier und fünf Dörfler ───────────────────────────────────────

const MUENZ_JE = { 2: 12, 3: 18, 4: 24, 5: 30 };

test('EW 4: mit **zwei, drei, vier und fünf** Dörflern – `dorfereignis` teilt n Karten, `kampf-beginnen` legt n Figuren ohne eine Zeile `$F<k> is not bound`, `dorfphase-beginnen` ohne `skipped`: Münzen +12 / +18 / +24 / +30, Marker nur an besetzten Plätzen', () => {
  for (const n of [2, 3, 4, 5]) {
    const s0 = ewAufbau(n).state;
    assert.equal(ewNamen(s0).length, n, `am Tisch sitzen ${n}`);
    const r = ewRunde(NEU(), s0);
    for (const [stufe, id] of [['kampf', 'kampf-beginnen'], ['phase', 'dorfphase-beginnen'], ['ereignis', 'dorfereignis']]) {
      const schlecht = r[stufe].log.filter(e => e.status === 'failed' || e.status === 'skipped');
      assert.deepEqual(schlecht, [], `${id} bei ${n}: ${schlecht.map(e => `${e.type} ${e.target}: ${e.reason}`).join(' | ')}`);
      assert.ok(!r[stufe].log.some(e => /is not bound/.test(e.reason ?? '')), `${id} bei ${n}: keine Zeile „is not bound“`);
      assert.ok(ewIndexStimmt(r[stufe], NEU(), id), `${id} bei ${n}: die Indizes`);
    }
    assert.equal(ewFiguren(r.kampf.state).length - ewFiguren(s0).length, n, `kampf-beginnen legt ${n} Figuren`);
    assert.equal(ewMuenzen(r.phase.state) - ewMuenzen(r.kampf.state), MUENZ_JE[n], `Münzen bei ${n}`);
    const plaetze = ewMarkerPlaetze(r.phase.state);
    assert.deepEqual([...new Set(plaetze)].sort(), [1, 2, 3, 4, 5].slice(0, n), `Marker nur an Plätzen 1 … ${n}`);
    assert.equal(plaetze.length, 4 * n, `vier Marker je Platz bei ${n}`);
    assert.equal(r.ereignis.state.cards.length - r.phase.state.cards.length, n, `dorfereignis teilt ${n} Karten`);
  }
});

test('EW 4: **alle 20 Bösewichte** – bei zwei und bei fünf Dörflern legt `kampf-beginnen` n Figuren und keine Zeile „is not bound“, bei drei dieselben wie mit den alten Daten (die Startfelder `D` tragen bei jedem Bösewicht fünf Zellen)', () => {
  let gelaufen = 0;
  for (const name of Object.keys(scenario.bosses)) {
    for (const n of [2, 3, 5]) {
      const s0 = mitBoss(ewAufbau(n).state, name);
      const r = ewLauf(NEU(), 'kampf-beginnen', s0);
      assert.ok(!r.log.some(e => /is not bound/.test(e.reason ?? '')), `${name} bei ${n}: ${r.log.filter(e => e.status !== 'ok').map(e => e.reason).join(' | ')}`);
      assert.deepEqual(r.log.filter(e => e.status === 'failed'), [], `${name} bei ${n}`);
      assert.equal(ewFiguren(r.state).length - ewFiguren(s0).length, n, `${name} bei ${n} Dörflern: Figuren`);
      if (n === 3) {
        const alt = ewLauf(AKT, 'kampf-beginnen', s0);
        for (const feld of ['tokens', 'cards', 'counters', 'boards']) assert.deepEqual(ohneIds(r.state[feld]), ohneIds(alt.state[feld]), `${name}: ${feld}`);
        assert.deepEqual(ewZeilen(r), ewZeilen(alt), `${name}: Zeilen`);
      }
      gelaufen++;
    }
  }
  assert.equal(gelaufen, 60);
});

test('EW 4: die Hände – jedes Dorf-Ereignis liegt in der Hand eines **besetzten** Platzes, in der Hand eines leeren keines', () => {
  for (const n of [2, 3, 4, 5]) {
    const r = ewRunde(NEU(), ewAufbau(n).state);
    const gelöst = resolveZones(EW_ZONEN, anchorBoxes(r.ereignis.state.boards, r.ereignis.state.tokens));
    const vorher = new Set(r.phase.state.cards.map(c => c.id));
    const neu = r.ereignis.state.cards.filter(c => !vorher.has(c.id));
    assert.equal(neu.length, n);
    for (const k of [1, 2, 3, 4, 5]) {
      const hand = gelöst.find(z => z.label === `Hand Dörfler ${k}`);
      assert.equal(objectsInZone(hand, neu).length, k <= n ? 1 : 0, `Hand ${k} bei ${n} Dörflern`);
    }
  }
});

test('EW 4: die Austeilung geht **absteigend** – die oberste Karte an den höchsten besetzten Platz, die nächste an den nächsten: dieselben Karten in denselben Händen wie bei n Schritten `Hand n … 1`, im Test ausgeschrieben', () => {
  for (const n of [2, 3, 4, 5]) {
    const phase = ewRunde(NEU(), ewAufbau(n).state).phase.state;
    const referenz = [{ type: 'require_zone', zoneLabel: 'Bösewicht-Tableau', expect: 'empty', message: 'x' },
      ...[5, 4, 3, 2, 1].filter(k => k <= n).map(k => JSON.parse(HAND(k, false)))];
    const soll = executeSequenceWithLog(phase, referenz, EW_ZONEN, { assets: EW_ASSETS, cards, grids, scenarioData: SC_WB, rng: seededRng(7) });
    const ist = ewLauf(NEU(), 'dorfereignis', phase);
    assert.deepEqual(soll.log.filter(e => e.status !== 'ok'), [], `die Referenz bei ${n}`);
    assert.deepEqual(ohneIds(ist.state.cards), ohneIds(soll.state.cards), `bei ${n} Dörflern: dieselben Karten an denselben Plätzen, in derselben Reihenfolge`);
    assert.equal(ist.state.cards.length - phase.cards.length, n);
  }
});

test('EW 4: **mit den alten Daten** ist es heute falsch – bei zwei „is not bound“ und +18, bei fünf nur drei Figuren, drei Karten und +18 (der rote Befund, festgehalten)', () => {
  const r2 = ewRunde(AKT, ewAufbau(2).state);
  assert.ok(r2.kampf.log.some(e => e.status === 'skipped' && /\$F3 is not bound/.test(e.reason)), 'bei zwei: `$F3 is not bound`');
  assert.ok(r2.phase.log.some(e => e.status === 'skipped' && /is not bound/.test(e.reason)), 'bei zwei: die Marker 3 und `$F3` in der Dorfphase');
  assert.equal(ewMuenzen(r2.phase.state) - ewMuenzen(r2.kampf.state), 18, 'bei zwei: +18 statt +12');
  const r5 = ewRunde(AKT, ewAufbau(5).state);
  assert.equal(ewFiguren(r5.kampf.state).length, 3, 'bei fünf: drei Figuren statt fünf');
  assert.equal(r5.ereignis.state.cards.length - r5.phase.state.cards.length, 3, 'bei fünf: drei Karten statt fünf');
  assert.equal(ewMuenzen(r5.phase.state) - ewMuenzen(r5.kampf.state), 18, 'bei fünf: +18 statt +30');
});

test('EW 4: ein Dörfler an jedem Platz – derselbe Kreis mit anderen Dörflern an Platz 4 und 5 (Georgie meldet seinen Hinweis im Aufbau, nicht in den Aktionen)', () => {
  const seq = copy(sequence);
  seq.splice(seq.findIndex(s => s.type === 'place_counter'), 0, { type: 'seat_villager', seat: 4, villager: 'Georgie Irongut' }, { type: 'seat_villager', seat: 5, villager: 'Judy Marks' });
  const b = bauen({ state, sequence: seq, zones: EW_ZONEN, grids, assets: EW_ASSETS, cards, scenarioData: SC_WB }, {}, 1);
  assert.deepEqual(b.log.filter(e => e.status === 'failed' || e.status === 'skipped'), []);
  const r = ewRunde(NEU(), b.state);
  for (const stufe of ['kampf', 'phase', 'ereignis']) assert.deepEqual(r[stufe].log.filter(e => e.status === 'failed' || e.status === 'skipped'), [], stufe);
  assert.equal(ewMuenzen(r.phase.state) - ewMuenzen(r.kampf.state), 30);
  assert.equal(ewFiguren(r.kampf.state).length, 5);
});

// ── EW 5. Die Wache ─────────────────────────────────────────────────────────

/** Der Tisch mitten im Kampf, der Lebensmarker der Plätze `ns` von den Leisten genommen. */
const ewKampf = (n) => ewLauf(NEU(), 'kampf-beginnen', ewAufbau(n).state).state;
const ewOhneLeben = (st, ns) => { const c = copy(st); c.tokens = c.tokens.filter(t => !ns.some(k => t.label === `Marker ${k}: Leben`)); return c; };
const ewFrage = (r) => r.log.find(e => e.confirm);

test('EW 5: bei **zwei** Dörflern hält die Wache, wenn **beide** Lebensmarker von den Leisten sind – mit `confirm` und einem Text **ohne „drei“**; der Tisch bleibt unberührt', () => {
  const st = ewOhneLeben(ewKampf(2), [1, 2]);
  assert.equal(st.tokens.filter(t => /^Marker \d: Leben$/.test(t.label ?? '')).length, 0, 'der Test hat die Marker wirklich genommen');
  const r = ewLauf(NEU(), 'dorfphase-beginnen', st);
  const e = ewFrage(r);
  assert.ok(e, `die Wache hält: ${JSON.stringify(r.log.slice(0, 3))}`);
  assert.equal(e.confirm, true);
  assert.equal(e.status, 'skipped');
  assert.equal(e.index, 1);
  assert.equal(e.message, WACHE_TEXT);
  assert.ok(!/drei/i.test(e.message) && !/drei/i.test(e.reason), `kein „drei“: ${e.reason}`);
  assert.match(e.reason, /alle Dörfler sind besiegt/);
  assert.deepEqual(r.state, st, 'nichts wurde abgeräumt');
  for (const k of [1, 2, 3, 4, 5]) assert.ok(e.reason.includes(`Dörfler ${k}: Leben`), `die Wache liest die Leiste ${k}: ${e.reason}`);
});

test('EW 5: bei **fünf** hält sie erst, wenn **alle fünf** fehlen – liegt einer (jeder der fünf, einzeln), läuft sie durch', () => {
  for (const n of [2, 3, 4, 5]) {
    const plaetze = [1, 2, 3, 4, 5].slice(0, n);
    const voll = ewLauf(NEU(), 'dorfphase-beginnen', ewKampf(n));
    const alle = ewLauf(NEU(), 'dorfphase-beginnen', ewOhneLeben(ewKampf(n), plaetze));
    assert.ok(ewFrage(alle), `bei ${n}: alle ${n} fehlen → sie hält`);
    for (const bleibt of plaetze) {
      const r = ewLauf(NEU(), 'dorfphase-beginnen', ewOhneLeben(ewKampf(n), plaetze.filter(k => k !== bleibt)));
      assert.ok(!ewFrage(r), `bei ${n}: nur der Marker von Platz ${bleibt} liegt → sie läuft durch`);
      assert.deepEqual(r.log.filter(e => e.status === 'failed' || e.status === 'skipped'), [], `bei ${n}, Platz ${bleibt}: ${r.log.filter(e => e.status !== 'ok').map(e => e.reason).join(' | ')}`);
      assert.equal(r.log.length, voll.log.length, 'die Aktion lief bis zum Ende');
    }
  }
});

test('EW 5: **Leisten leerer Plätze zählen nicht** – ein Plättchen **auf einem Platz** der Standardbox (0 … 100 × 0 … 140, das Maß einer Zone ohne Anker) wird nicht als Marker einer Leiste 3, 4 oder 5 gelesen; ohne `showWithoutAnchor` würde es gelesen', () => {
  const st = ewOhneLeben(ewKampf(2), [1, 2]);
  const vorlage = st.tokens.find(t => t.label === 'Marker 1: Bewegung');
  assert.ok(vorlage, 'ein Marker als Vorlage');
  // Die Plätze der Leiste von Dörfler 4 in der Standardbox: dorthin geparkt, läse ihn eine Wache ohne das Feld als Marker (Platz 3 → Wert 3).
  const leer = EW_ZONEN.find(z => z.label === 'Dörfler 4: Leben');
  const platz = zoneSlots({ ...leer, anchor: undefined })[2];
  assert.ok(Number.isFinite(platz.x) && platz.x < 100 && platz.y < 140, `der Platz liegt in der Ecke: ${text(platz)}`);
  st.tokens.push({ ...copy(vorlage), id: 'park', label: 'Marker 4: Leben', x: platz.x, y: platz.y });
  const r = ewLauf(NEU(), 'dorfphase-beginnen', st);
  const e = ewFrage(r);
  assert.ok(e, `die Wache hält trotzdem: ${JSON.stringify(r.log.slice(0, 3))}`);
  assert.match(e.reason, /Dörfler 3: Leben: no marker, Dörfler 4: Leben: no marker, Dörfler 5: Leben: no marker/, 'die drei leeren Plätze lesen sich als „kein Marker“');
  // Gegenprobe: **ohne** `showWithoutAnchor` liest die Wache dasselbe Plättchen als Marker und lässt durch — der Test ist also empfindlich für das Feld.
  const ohneFeld = EW_ZONEN.map(z => { const { showWithoutAnchor: _s, ...rest } = z; return rest; });
  const r2 = ewLauf(NEU(), 'dorfphase-beginnen', st, { zonen: ohneFeld });
  assert.ok(!ewFrage(r2), 'ohne das Feld hält die Wache nicht: sie zählt die Ecke');
  assert.deepEqual(r2.log.filter(x => x.status !== 'ok'), [], 'ohne das Feld läuft die ganze Dorfphase durch');
  // Und auch ohne das Feld: ein Plättchen **neben** den Plätzen ist nur unlesbar (die Wache hält, aber ohne Rückfrage) — es zählt nicht als Marker.
  const daneben = ewOhneLeben(ewKampf(2), [1, 2]);
  daneben.tokens.push({ ...copy(vorlage), id: 'park2', label: 'Marker 4: Leben', x: 1, y: 1 });
  const r3 = ewLauf(NEU(), 'dorfphase-beginnen', daneben, { zonen: ohneFeld });
  assert.ok(!ewFrage(r3) && r3.log.some(x => /cannot be read/.test(x.reason ?? '')), 'unlesbar: ein Halt ohne Frage');
});

// ── EW 6. Ein alter Spielstand ──────────────────────────────────────────────

test('EW 6: ein alter Spielstand (drei Dörfler, Zähler von vor M30) – die Dorfphase läuft, die Zähler bleiben, Münzen +18', () => {
  const alterstand = copy(ewAufbau(3).state);
  const alt = [['Henlo', 'Leben', 3, 6], ['Henlo', 'Bewegung', 4], ['Fridgette', 'Leben', 2, 5], ['Fridgette', 'Mumm', 5], ['Granny', 'Leben', 4, 7], ['Granny', 'Präzision', 0]];
  alterstand.counters.push(...alt.map(([wer, was, v, max], i) => ({ id: `alt-${i}`, name: `${wer}: ${was}`, value: v, x: 100 + 40 * i, y: 100, locked: false, ...(max ? { max } : {}) })));
  const kampf = ewLauf(NEU(), 'kampf-beginnen', alterstand);
  const phase = ewLauf(NEU(), 'dorfphase-beginnen', kampf.state);
  assert.deepEqual(phase.log.filter(e => e.status !== 'ok'), [], phase.log.filter(e => e.status !== 'ok').map(e => e.reason).join(' | '));
  assert.equal(ewMuenzen(phase.state) - ewMuenzen(kampf.state), 18);
  for (const c of alterstand.counters.filter(c => /^(Henlo|Fridgette|Granny): /.test(c.name))) {
    assert.equal(text(phase.state.counters.find(x => x.id === c.id)), text(c), `Zähler ${c.name} bleibt`);
  }
  const alte = ewLauf(AKT, 'dorfphase-beginnen', kampf.state);
  assert.deepEqual(ohneIds(phase.state.counters), ohneIds(alte.state.counters), 'wie mit den alten Daten');
});

// ── EW 7. Die Prüfer ────────────────────────────────────────────────────────

test('EW 7: `validateOptions` auf dem neuen `action_data` → `[]`; `validateStep` auf **jedem** Schritt → keine Beanstandung (Editor, in einer Aktion)', () => {
  const opts = JSON.parse(dz.scenario).options;
  assert.deepEqual(validateOptions(opts, sequence, NEU()), []);
  const ctx = {
    stackLabels: ['Dorf-Ereignisse', 'Heldentaten', 'Nachschub (Tante Emma)', 'Verhaltensdeck'], zoneLabels: EW_ZONEN.map(z => z.label), pools: ewAssetPools(EW_ASSETS),
    assetNames: ewAssetNames(EW_ASSETS), grids, cardCategories: [...new Set(cards.map(c => c.category).filter(Boolean))], cards, options: opts, inAction: true,
  };
  let gezaehlt = 0;
  for (const a of NEU()) a.steps.forEach((s, i) => { assert.deepEqual(validateStep(s, ctx), [], `${a.id} Schritt ${i}: ${text(s)}`); gezaehlt++; });
  assert.equal(gezaehlt, 19 + 6 + 1 + 43);
  // Der Prüfer des Skripts sagt dasselbe.
  assert.deepEqual(EW.pruefeAktionen(NEU()), []);
  // … und er findet, was falsch ist: ein Gate mit Liste ist erlaubt, eines mit 0 nicht, `onlyChoice` nie.
  assert.ok(EW.pruefeAktionen(ewMit(c => { stepsOf(c, 'kampf-beginnen')[12].onlySeated = 0; }, NEU())).length > 0);
  assert.ok(EW.pruefeAktionen(ewMit(c => { stepsOf(c, 'kampf-beginnen')[12].onlyChoice = { doerfler4: '!keiner' }; }, NEU())).length > 0);
  assert.ok(EW.pruefeAktionen(ewMit(c => { stepsOf(c, 'dorfphase-beginnen')[18].value = '+6*$optMuenzen'; }, NEU())).length > 0);
});

// ── EW 8. Disjunkt ──────────────────────────────────────────────────────────

test('EW 8: berührt nur `action_data` – der Zielstand trägt nichts anderes, und die Reihenfolge zu `gelaende`, `werte`, `zonen`, `assets` ist gleichgültig (dieselben Spalten, derselbe Text)', () => {
  assert.deepEqual(Object.keys(EW.patchAktionen(AKT)), ['art', 'action']);
  // `patchAktionen` liest nur die Aktionen: gegen jede Stufe der anderen Spalten derselbe Zielstand.
  assert.equal(text(EW.patchAktionen(AKT).action), text(EW.patchAktionen(copy(AKT)).action));
  // Und die anderen Bausteine lesen `action_data` nicht: ihr Zielstand ist mit den neuen und den alten Aktionen derselbe.
  const sz = text(patchGelaende(scenario).scenario), sw2 = text(EW.patchWerte(scenario).scenario), zo = text(EW.patchZonen(zones).zone), as = text(EW.patchAssets(assets).assets);
  assert.equal(text(patchGelaende(JSON.parse(dz.scenario)).scenario), sz);
  assert.equal(text(EW.patchWerte(JSON.parse(dz.scenario)).scenario), sw2);
  assert.equal(text(EW.patchZonen(copy(zones)).zone), zo);
  assert.equal(text(EW.patchAssets(copy(assets)).assets), as);
});

test('EW 8: `SCHRITTE` – `aktionen` ist gebaut (`{ ausgang, ziel }`); der Kopf des Skripts nennt weder Länge noch Hash des Ziels und des Ausgangs', () => {
  assert.deepEqual(Object.keys(SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen', 'haende']);
  assert.deepEqual(Object.keys(SCHRITTE.aktionen), ['ausgang', 'ziel']);
  for (const k of ['ausgang', 'ziel']) assert.deepEqual(Object.keys(SCHRITTE.aktionen[k].action), ['laenge', 'sha'], k);
  const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8').replace(/\r/g, '');
  const kopf = quelle.split('\n').filter((l, i, alle) => alle.slice(0, i + 1).every(x => x.startsWith('//') || x.trim() === '')).join('\n');
  for (const z of [SCHRITTE.aktionen.ausgang.action, SCHRITTE.aktionen.ziel.action]) {
    assert.ok(!kopf.includes(z.sha), `der Kopf nennt ${z.sha}`);
    for (const l of [String(z.laenge), String(z.laenge).replace(/(\d)(\d{3})$/, '$1 $2'), String(z.laenge).replace(/(\d)(\d{3})$/, '$1.$2')]) assert.ok(!kopf.includes(l), `der Kopf nennt ${l}`);
  }
  assert.match(kopf, /\*\*`aktionen`/, 'der Kopf beschreibt den Schritt');
});

// ── EW main. Die Läufe gegen eine Wegwerf-Datenbank ─────────────────────────

const EW_ZIELTEXT = () => text(EW.patchAktionen(AKT).action);
const ewOhneSpalte = (a) => ({ ...a, setups: a.setups.map(r => ({ ...r, action_data: undefined })) });
const ewSicherung = (tmp, act = dz.actions) => {
  const datei = path.join(tmp, 'sicherung-aktionen.json');
  const h = sicherungsHash(act);
  fs.writeFileSync(datei, JSON.stringify({ action_data: act, sha256: h, updated_at: '2026-11-09 00:00:00' }));
  return { datei, h };
};
const ewSchreiben = (file, h, extra = []) => ['--write', file, '--schritt', 'aktionen', '--sicherung-sha', h.slice(0, 16), ...extra];

test('EW main: `--check` am Ausgangsstand – schreibgeschützt, „zu schreiben“, Plan, Beweis, Prüfer, Zielstand, Hash für die Sicherung', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    fs.chmodSync(file, 0o444);
    const r = await lauf(['--check', file, '--schritt', 'aktionen']);
    fs.chmodSync(file, 0o666);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, new RegExp(`gelesen: action_data ${dz.actions.length} Zeichen`));
    assert.match(r.out, /Einordnung: zu schreiben/);
    for (const id of ['kampf-beginnen', 'dorfereignis', 'dorfphase-beginnen']) assert.ok(r.out.includes(id), `der Plan nennt ${id}`);
    assert.match(r.out, /17 → 19/); assert.match(r.out, /4 → 6/); assert.match(r.out, /33 → 43/);
    assert.match(r.out, /Rückwärtsbeweis action_data: ja/);
    assert.match(r.out, /Probleme/);
    assert.ok(r.out.includes(`Zielstand: action_data ${EW_Z.laenge} Zeichen (sha ${EW_Z.sha})`), r.out);
    assert.ok(r.out.includes(sicherungsHash(dz.actions)), 'der Hash, den --write als Sicherung verlangt, steht da');
    assert.match(r.out, /würde schreiben/);
    assert.doesNotMatch(r.out, /Beanstandungen:? [1-9]/);
    assert.deepEqual(alles(file), vorher, '--check hat nichts geschrieben');
  } finally { weg(tmp); }
});

test('EW main: `--check` öffnet schreibgeschützt, `--write` nicht; geschrieben wird mit **einem** UPDATE auf `action_data`, gelesen **nur** `action_data`', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const optionen = [], sql = [];
    class Spion extends Database {
      constructor(pfad, opt) { optionen.push(opt); super(pfad, opt); }
      prepare(s) { sql.push(s); return super.prepare(s); }
    }
    istCode(await lauf(['--check', file, '--schritt', 'aktionen'], { Db: Spion }), 0);
    assert.equal(optionen.at(-1).readonly, true);
    const lesend = new Database(file, { readonly: true });
    assert.throws(() => lesend.prepare('update setups set name = name').run(), /readonly/i);
    lesend.close();

    sql.length = 0;
    const { h } = ewSicherung(tmp);
    const w = await lauf(ewSchreiben(file, h), { Db: Spion });
    assert.equal(w.code, 0, w.out);
    assert.equal(optionen.at(-1).readonly, false);
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const schreibend = sql.filter(s => /^\s*(update|insert|delete|replace|drop|alter|create)\b/i.test(s));
    assert.equal(schreibend.length, 1, schreibend.join('\n'));
    assert.match(norm(schreibend[0]), /^update setups set action_data = \? where id = \? and action_data = \?$/i);
    // Was sonst gelesen wird: Fingerabdruck und Spaltenhashes (Hashes) – und **eine** Abfrage der Spalte.
    const erlaubt = sql.filter(s => !/order by rowid|sqlite_master|^\s*pragma|^\s*update setups set action_data/i.test(s)).map(norm);
    const gelesen = [...new Set(erlaubt)];
    assert.deepEqual(gelesen.filter(s => !/^select \* from setups where id = \?$/i.test(s)), ['select game_id, action_data from setups where id = ?'], gelesen.join('\n'));
    for (const s of gelesen) assert.doesNotMatch(s, /scenario_data|sequence_data|zone_data|grid_data|state_data|table_assets|from cards|save_states/i, s);
  } finally { weg(tmp); }
});

test('EW main: `--write` mit Sicherung – `action_data` auf dem Zielstand, **nichts sonst** geändert (`scenario_data`, `sequence_data`, `zone_data`, `grid_data`, `state_data`, Assets, Spielstände), Kontrolle neu gelesen', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const { h } = ewSicherung(tmp);
    const r = await lauf(ewSchreiben(file, h));
    assert.equal(r.code, 0, r.out);
    const z = zeile(file);
    assert.equal(z.action_data, EW_ZIELTEXT());
    assert.deepEqual([z.action_data.length, sha(z.action_data)], [EW_Z.laenge, EW_Z.sha]);
    assert.deepEqual(ewOhneSpalte(alles(file)), ewOhneSpalte(vorher), 'jede andere Spalte, Zeile und Tabelle (auch updated_at, save_states) ist gleich');
    for (const k of ['scenario_data', 'sequence_data', 'zone_data', 'grid_data', 'state_data']) assert.equal(z[k], zeile(file)[k]);
    assert.equal(z.scenario_data, dz.scenario);
    assert.equal(z.sequence_data, dz.sequence);
    assert.ok(r.out.includes(`${dz.actions.length} → ${EW_Z.laenge} Zeichen, sha ${sha(dz.actions)} → ${EW_Z.sha}`), r.out);
    assert.match(r.out, /Rückwärtsbeweis action_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /Zielstand aus den Konstanten \(.*\): erreicht/);
    assert.match(r.out, /save_states Auto Save: sha \w+ → \w+ gleich/);
    assert.match(r.out, /dorfphase-beginnen[^\n]*43/, 'die Kontrolle nennt die 43 Schritte der Dorfphase');
    assert.match(r.out, /kampf-beginnen[^\n]*19/);
    assert.match(r.out, /dorfereignis[^\n]*6\b/);
  } finally { weg(tmp); }
});

test('EW main: der zweite Lauf – „schon geschrieben“, Rückgabe 0, nichts geschrieben, auch ohne Sicherung', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { h } = ewSicherung(tmp);
    istCode(await lauf(ewSchreiben(file, h)), 0);
    const nach1 = alles(file);
    const check = await lauf(['--check', file, '--schritt', 'aktionen']);
    assert.equal(check.code, 0, check.out);
    assert.match(check.out, /schon geschrieben/);
    const r = await lauf(['--write', file, '--schritt', 'aktionen']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /nichts zu schreiben/);
    assert.deepEqual(alles(file), nach1);
  } finally { weg(tmp); }
});

test('EW main: ohne Sicherung kein Schreiben – fehlender Hash, falsche Form, falscher Hash, der Hash einer anderen Spalte; nichts geändert', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const ohne = await lauf(['--write', file, '--schritt', 'aktionen']);
    istCode(ohne, 1); assert.match(ohne.out, /ohne Sicherung kein Schreiben/);
    const kurz = await lauf(['--write', file, '--schritt', 'aktionen', '--sicherung-sha', 'abc']);
    istCode(kurz, 1); assert.match(kurz.out, /12 Hex-Stellen/);
    const falsch = await lauf(['--write', file, '--schritt', 'aktionen', '--sicherung-sha', 'deadbeefdead']);
    istCode(falsch, 1); assert.match(falsch.out, /passt nicht zum gelesenen Text/);
    for (const andere of [sha(dz.actions), sha(dz.scenario), sha(dz.sequence), sicherungsHash(dz.scenario)]) {
      const r = await lauf(['--write', file, '--schritt', 'aktionen', '--sicherung-sha', andere]);
      istCode(r, 1, andere);
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EW main: ein anderer Stand ist ein Abbruch mit Pfad – Münzen anders, ein Gate, ein Schritt mehr: `--check` wie `--write`, nichts geschrieben, **kein** Schalter dagegen', async () => {
  for (const [wie, mut, pfadTeil] of [
    ['die Münzen', (c) => { stepsOf(c, 'dorfphase-beginnen')[16].value = '+17'; }, 'dorfphase-beginnen'],
    ['die Wache', (c) => { stepsOf(c, 'dorfphase-beginnen')[1].message = 'Alle besiegt.'; }, 'dorfphase-beginnen'],
    ['ein Schritt mehr', (c) => { stepsOf(c, 'dorfereignis').push({ type: 'shuffle', stackLabel: 'X' }); }, 'dorfereignis'],
  ]) {
    const { tmp, file } = frischeDatenbank({ act: text(ewMit(mut)) });
    try {
      const vorher = alles(file);
      const c = await lauf(['--check', file, '--schritt', 'aktionen']);
      assert.equal(c.code, 1, `${wie}: ${c.out}`);
      assert.match(c.out, /ABWEICHEND/);
      assert.ok(c.out.includes(pfadTeil), `${wie}: die Meldung nennt den Pfad`);
      assert.match(c.out, /es wird nichts überschrieben/);
      const w = await lauf(ewSchreiben(file, sicherungsHash(text(ewMit(mut)))));
      assert.equal(w.code, 1, `${wie}: ${w.out}`);
      assert.deepEqual(alles(file), vorher, `${wie}: nichts geschrieben`);
    } finally { weg(tmp); }
  }
});

test('EW main: ein **halber** Stand ist ein Abbruch – jedes Stück einzeln neu, die anderen alt: nichts geschrieben', async () => {
  for (const stueck of STUECKE) {
    const halb = text(ewAktionen([stueck]));
    const { tmp, file } = frischeDatenbank({ act: halb });
    try {
      const vorher = alles(file);
      const c = await lauf(['--check', file, '--schritt', 'aktionen']);
      assert.equal(c.code, 1, `${stueck}: ${c.out}`);
      assert.match(c.out, /halber Stand|teils/i);
      const w = await lauf(ewSchreiben(file, sicherungsHash(halb)));
      assert.equal(w.code, 1, `${stueck}: ${w.out}`);
      assert.deepEqual(alles(file), vorher, `${stueck}: nichts geschrieben`);
    } finally { weg(tmp); }
  }
});

test('EW main: ein Stand, der nicht kompaktes JSON.stringify ist, wird nicht angefasst (der Text-Vergleich trüge nicht)', async () => {
  const lose = JSON.stringify(AKT, null, 1);
  const { tmp, file } = frischeDatenbank({ act: lose });
  try {
    const vorher = alles(file);
    const r = await lauf(['--check', file, '--schritt', 'aktionen']);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /kompaktes JSON/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EW main: Vergleich-und-Tausch – ändert jemand `action_data` zwischen Lesen und Schreiben, wird nichts geschrieben, die fremde Änderung bleibt stehen', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { h } = ewSicherung(tmp);
    const fremd = text(ewMit(c => { c[2].steps[0].count = 11; }));
    const r = await lauf(ewSchreiben(file, h), { haken: (stelle, db) => { if (stelle === 'nach-lesen') db.prepare('update setups set action_data = ? where id = ?').run(fremd, SETUP_ID); } });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /hat sich seit dem Lesen geändert/);
    assert.equal(zeile(file).action_data, fremd);
  } finally { weg(tmp); }
});

test('EW main: ändert sich in der Transaktion eine andere Tabelle (Auto Save) oder eine andere Spalte des Aufbaus, rollt alles zurück', async () => {
  for (const sql of [
    "update save_states set state_data = '{\"a\":99}' where name = 'Auto Save'",
    "update setups set scenario_data = '{}' where id = '" + SETUP_ID + "'",
    "update setups set sequence_data = '[]' where id = '" + SETUP_ID + "'",
    "update setups set zone_data = '[]' where id = '" + SETUP_ID + "'",
    "update setups set name = 'anders' where id = '" + SETUP_ID + "'",
  ]) {
    const { tmp, file } = frischeDatenbank();
    try {
      const vorher = alles(file);
      const { h } = ewSicherung(tmp);
      const r = await lauf(ewSchreiben(file, h), { haken: (stelle, db) => { if (stelle === 'in-transaktion') db.prepare(sql).run(); } });
      assert.equal(r.code, 1, `${sql}: ${r.out}`);
      assert.match(r.out, /unerwartet geändert/);
      assert.deepEqual(alles(file), vorher, `Rollback: ${sql}`);
    } finally { weg(tmp); }
  }
});

test('EW main: `--zurueck` – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen; ein zweites Mal ist „schon der Ausgangsstand“', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const { datei, h } = ewSicherung(tmp);
    istCode(await lauf(ewSchreiben(file, h)), 0);
    assert.notDeepEqual(alles(file), vorher);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'aktionen']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /\(= die Sicherung, Zeichen für Zeichen\)/);
    assert.deepEqual(alles(file), vorher, 'jede Tabelle, jede Spalte wie am Anfang');
    const nochmal = await lauf(['--zurueck', datei, file, '--schritt', 'aktionen']);
    assert.equal(nochmal.code, 0, nochmal.out);
    assert.match(nochmal.out, /schon der Ausgangsstand/);
  } finally { weg(tmp); }
});

test('EW main: `--zurueck` ersetzt nur den exakten Zielstand – hat jemand danach weitergearbeitet, bleibt alles stehen', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { datei, h } = ewSicherung(tmp);
    istCode(await lauf(ewSchreiben(file, h)), 0);
    setze(file, 'action_data', zeile(file).action_data + ' ');
    const vorher = alles(file);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'aktionen']);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /nicht der Zielstand/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EW main: `--zurueck` prüft die Sicherung – beschädigt, nicht kompakt, schon der Zielstand, falsche Form: nichts wird überschrieben', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { h } = ewSicherung(tmp);
    istCode(await lauf(ewSchreiben(file, h)), 0);
    const vorher = alles(file);
    const schreibe = (name, o) => { const d = path.join(tmp, name); fs.writeFileSync(d, JSON.stringify(o)); return d; };
    const gut = { action_data: dz.actions, sha256: sicherungsHash(dz.actions) };
    const kaputt = await lauf(['--zurueck', schreibe('a.json', { ...gut, sha256: 'f'.repeat(64) }), file, '--schritt', 'aktionen']);
    istCode(kaputt, 1); assert.match(kaputt.out, /beschädigt/);
    const lose = JSON.stringify(AKT, null, 1);
    const nk = await lauf(['--zurueck', schreibe('b.json', { action_data: lose, sha256: sicherungsHash(lose) }), file, '--schritt', 'aktionen']);
    istCode(nk, 1); assert.match(nk.out, /kompaktes JSON/);
    const zt = EW_ZIELTEXT();
    const neu = await lauf(['--zurueck', schreibe('c.json', { action_data: zt, sha256: sicherungsHash(zt) }), file, '--schritt', 'aktionen']);
    istCode(neu, 1); assert.match(neu.out, /nicht der Ausgangsstand/);
    const form = await lauf(['--zurueck', schreibe('d.json', { scenario_data: dz.scenario }), file, '--schritt', 'aktionen']);
    istCode(form, 1); assert.match(form.out, /nicht die Form/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EW main: es gibt kein `--force` und kein Wort dafür – jedes unbekannte Argument ist ein Benutzungsfehler, auch beim Rückweg; geschrieben wird nichts', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const { datei, h } = ewSicherung(tmp);
    for (const wort of ['--force', '--erzwingen', '--ueberschreiben', '--override', '--yes', '--ignore-precondition', '-f', 'force']) {
      for (const modus of [['--check', file, '--schritt', 'aktionen'], ewSchreiben(file, h), ['--zurueck', datei, file, '--schritt', 'aktionen']]) {
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

test('EW main: ein Prüfer, der etwas findet, hält den Lauf an – ein Stand, den der Prüfer beanstandet, wird nicht geschrieben (Rückwärtsbeweis und Vorwärtsprobe stehen vor dem ersten Byte)', async () => {
  // Der Ausgang mit einem `onlyChoice` in einer Aktion: der Baustein ordnet ihn als Abweichung ein oder der Prüfer beanstandet den Zielstand — in beiden Fällen: nichts geschrieben.
  const fremd = text(ewMit(c => { stepsOf(c, 'dorfphase-beginnen')[5].onlyChoice = { partie: 'kurz' }; }));
  const { tmp, file } = frischeDatenbank({ act: fremd });
  try {
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'aktionen']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /onlyChoice/);
    const w = await lauf(ewSchreiben(file, sicherungsHash(fremd)));
    assert.equal(w.code, 1, w.out);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EW main: gehört der Aufbau zu einem anderen Spiel, wird nichts angefasst', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const db = new Database(file);
    db.pragma('foreign_keys = OFF');
    db.prepare("insert into games (id, name) values ('anderes-spiel', 'X') on conflict do nothing").run();
    db.prepare('update setups set game_id = ? where id = ?').run('anderes-spiel', SETUP_ID);
    db.close();
    const vorher = alles(file);
    const r = await lauf(['--check', file, '--schritt', 'aktionen']);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /gehört zu Spiel anderes-spiel/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EW main: die Reihenfolge zu `gelaende` (ES) ist gleichgültig – erst `aktionen`, dann `gelaende`, und umgekehrt: dieselben zwei Spalten, derselbe Text', async () => {
  const fertig = [];
  for (const reihenfolge of [['aktionen', 'gelaende'], ['gelaende', 'aktionen']]) {
    const { tmp, file } = frischeDatenbank();
    try {
      for (const schritt of reihenfolge) {
        const spalte = schritt === 'aktionen' ? 'action' : 'scenario';
        const roh = zeile(file)[`${spalte}_data`];
        const r = await lauf(['--write', file, '--schritt', schritt, '--sicherung-sha', sicherungsHash(roh).slice(0, 16)]);
        assert.equal(r.code, 0, `${reihenfolge}: ${schritt}: ${r.out}`);
      }
      const z = zeile(file);
      fertig.push([z.action_data, z.scenario_data]);
      assert.equal(z.action_data, EW_ZIELTEXT());
      assert.equal(z.scenario_data, ZIELTEXT);
    } finally { weg(tmp); }
  }
  assert.deepEqual(fertig[0], fertig[1]);
});


// ═════════════════════════════════════════════════════════════════════════════
// EX Teil 1 / Spec M31.5, M31.8 Punkt 8, M31.12 — die Option: der Schalter: Schritt `optionen`
// ═════════════════════════════════════════════════════════════════════════════
//
// **Dieser Schritt macht zwei bis fünf Dörfler möglich.** Eingang ist der Ausgang aus `ES` und `ET` (`SC_PROD`: `scenario_data` mit `fromCount` und `statsByCount`, **drei** Plätze, kein
// `baseCount`) und die Folge der Fixture (29 Schritte); dazu **die fünf davor geschriebenen Schritte** als Vorgänger: die Zonen aus `EU`, die Assets aus `EV`, die Aktionen aus `EW`
// (`EX_VORG`) — der Baustein verlangt sie **vor dem ersten Byte**. Die Tische kommen aus dem Aufbau (`bauen`) mit dem Zielstand dieses Schrittes.
//
// **Der Zielstand steht hier ein zweites Mal, ausgeschrieben** (`exOption`, `EX_SEQ`, `exScNeu`) — aus dem Pflichtenheft, nicht aus dem Baustein gelesen. Wer die Stücke aus dem Baustein holte,
// prüfte ihn gegen sich selbst. Die Länge und der Hash des Ziels stehen **einmal** im Skript (`SCHRITTE`). Alle Tische darunter bauen mit dem **Ausgang des Bausteins** (`exZ`), nicht mit
// dem ausgeschriebenen Text: sie prüfen, was der Baustein schreibt.

const EX_NEUN = [['Henlo', 'Henlo Bulwark'], ['Fridgette', 'Fridgette Jones'], ['Granny', 'Granny Melba'], ['Blopsy', 'Blopsy Twins'], ['Georgie', 'Georgie Irongut'],
  ['Judy', 'Judy Marks'], ['Norman', 'Norman Fishboy'], ['Quintus', 'Quintus Binch'], ['Yancy', 'Yancy Plover']];
const exWahlen = (n) => Object.fromEntries(EX_NEUN.map(([k, v]) => [k, { label: v, vars: { [`Doerfler${n}`]: v } }]));
/** Eine optionale Option der Leiter, im Wortlaut der Spec (M31.5): `label`, `default`, `optional`, `choices` — `keiner` **zuletzt**. */
const exOption = (n, on, keiner) => ({
  label: `Dörfler ${n}`,
  default: 'keiner',
  optional: { off: 'keiner', on, addLabel: 'Weiteren Dörfler hinzufügen' },
  choices: { ...exWahlen(n), keiner: { label: keiner, vars: { [`Doerfler${n}`]: '' } } },
});
const exOptionsNeu = () => {
  const o = copy(SC_PROD.options);
  o.partie.choices.kurz.vars = { MuenzenJeDoerfler: '15' };
  o.partie.choices.lang.vars = { MuenzenJeDoerfler: '10' };
  o.doerfler3 = exOption(3, 'Granny', 'kein dritter Dörfler');
  o.doerfler4 = exOption(4, 'Blopsy', 'kein vierter Dörfler');
  o.doerfler5 = exOption(5, 'Yancy', 'kein fünfter Dörfler');
  return o;
};
const exSeat = (n, anchor, x) => ({ anchor, zones: `Dörfler ${n}`, markers: `Marker ${n}`, vorrat: `Ausrüstung Dörfler ${n}`, tableau: { x, y: 1600 } });
const exScNeu = () => {
  const s = copy(SC_PROD);
  s.options = exOptionsNeu();
  s.villagers.seats.push(exSeat(4, 'Tableau: Blopsy Twins', 2040), exSeat(5, 'Tableau: Yancy Plover', 2620));
  s.villagers.baseCount = 3;
  return s;
};
const EX_SEQ = {
  s3alt: '{"type":"seat_villager","seat":3,"villager":"$optDoerfler3"}',
  s3: '{"type":"seat_villager","seat":3,"villager":"$optDoerfler3","onlyChoice":{"doerfler3":"!keiner"}}',
  s4: '{"type":"seat_villager","seat":4,"villager":"$optDoerfler4","onlyChoice":{"doerfler4":"!keiner"}}',
  s5: '{"type":"seat_villager","seat":5,"villager":"$optDoerfler5","onlyChoice":{"doerfler5":"!keiner"}}',
  muenzenAlt: '{"type":"place_counter","name":"Münzen (gemeinsam)","value":"$optMuenzen","x":2080,"y":1430}',
  muenzen: '{"type":"place_counter","name":"Münzen (gemeinsam)","value":"$optMuenzenJeDoerfler*$doerflerzahl","x":2000,"y":1040}',
};
const exSeqNeu = () => [...copy(sequence.slice(0, 27)), ...[EX_SEQ.s3, EX_SEQ.s4, EX_SEQ.s5, EX_SEQ.muenzen].map(s => JSON.parse(s))];
const EX_VORG = { zone: EW_ZONEN, assets: EW_ASSETS, action: ZIEL_AKT };
const EX_Z = SCHRITTE.optionen?.ziel;                // ohne Konstante: undefined, die Tests darunter sind rot
const exCache = {};
/** Der Zielstand des Bausteins, einmal gerechnet (Länge und Hash prüft `EX 1`). */
const exZ = () => {
  if (process.env.EX_ZIEL_AUS_TEXT) return { art: 'zu-schreiben', scenario: exScNeu(), sequence: exSeqNeu() };   // nur zum Prüfen der Tests vor dem Baustein
  return (exCache.z ??= EW.patchSchalter(SC_PROD, sequence, EX_VORG));
};
const exAbw = (sc, seq = sequence, v = EX_VORG) => {
  const p = EW.patchSchalter(sc, seq, v);
  assert.equal(p.art, 'abweichend', `erwartet abweichend, ist ${p.art}`);
  assert.equal(p.scenario, undefined, 'bei einer Abweichung gibt es keinen Zielstand');
  assert.equal(p.sequence, undefined);
  return p.probleme.join('\n');
};
const exMit = (fn) => { const s = copy(SC_PROD); fn(s); return s; };
const exMitSeq = (fn) => { const s = copy(sequence); fn(s); return s; };

// ── EX 0. Die Messung: die Fixture ist, was der Befund erwartet ─────────────

test('EX 0: **gezählt**, nicht geglaubt – 29 Schritte, Platz 3 an Schritt 27, die Münzen an Schritt 28; drei Plätze, kein `baseCount`; fünf Optionen davor in der Reihenfolge `partie`, `troedel`, `doerfler1` … `doerfler3`', () => {
  assert.equal(sequence.length, 29);
  assert.deepEqual(sequence.map((s, i) => [i, s.type]).filter(([, t]) => t === 'seat_villager').map(([i]) => i), [25, 26, 27]);
  assert.equal(text(sequence[27]), EX_SEQ.s3alt, 'Schritt 27: Platz 3');
  assert.equal(text(sequence[28]), EX_SEQ.muenzenAlt, 'Schritt 28: die Münzen, der letzte Schritt');
  assert.equal(sequence.filter(s => s.type === 'place_counter').length, 1);
  assert.deepEqual(Object.keys(SC_PROD.options), ['partie', 'troedel', 'doerfler1', 'doerfler2', 'doerfler3']);
  assert.deepEqual(Object.keys(SC_PROD.options.doerfler3), ['label', 'default', 'choices']);
  assert.equal(SC_PROD.options.doerfler3.optional, undefined);
  assert.deepEqual(SC_PROD.options.partie.choices.kurz.vars, { Muenzen: '45' });
  assert.deepEqual(SC_PROD.options.partie.choices.lang.vars, { Muenzen: '30' });
  assert.equal(SC_PROD.villagers.seats.length, 3);
  assert.equal(SC_PROD.villagers.baseCount, undefined);
  assert.deepEqual(Object.keys(SC_PROD.villagers), ['fightZone', 'barZone', 'seats', 'roster']);
  assert.deepEqual(Object.values(SC_PROD.villagers.roster).map(v => v.short), EX_NEUN.map(([k]) => k), 'die neun Kurznamen, in der Reihenfolge des Rosters');
  assert.deepEqual(Object.keys(SC_PROD.villagers.roster), EX_NEUN.map(([, v]) => v));
  assert.deepEqual(Object.keys(SC_PROD.options.doerfler3.choices), EX_NEUN.map(([k]) => k));
  // Der Ausgang dieses Schritts: `scenario` ist das Ziel von `werte` (dieselbe Zahl), `sequence` der Stand nach M30.
  assert.deepEqual([text(SC_PROD).length, sha(text(SC_PROD))], [SCHRITTE.werte.ziel.scenario.laenge, SCHRITTE.werte.ziel.scenario.sha]);
  assert.deepEqual(SCHRITTE.optionen?.ausgang, { scenario: SCHRITTE.werte.ziel.scenario, sequence: { laenge: 2621, sha: 'e859bd457002' } });
  assert.deepEqual(SCHRITTE.optionen?.ausgang.sequence, sw.SCHRITTE.boss.ziel.sequence);
  assert.deepEqual([dz.sequence.length, sha(dz.sequence)], [2621, 'e859bd457002']);
  // Die Vorgänger: jeder der fünf steht im Ziel (so, wie `EX_VORG` sie hält).
  assert.equal(EW.patchGelaende(SC_PROD).art, 'schon-da');
  assert.equal(EW.patchWerte(SC_PROD).art, 'schon-da');
  assert.equal(EW.patchZonen(EX_VORG.zone).art, 'schon-da');
  assert.equal(EW.patchAssets(EX_VORG.assets).art, 'schon-da');
  assert.equal(EW.patchAktionen(EX_VORG.action).art, 'schon-da');
});

// ── EX 1. Der Zielstand ─────────────────────────────────────────────────────

test('EX 1: Zielstand – genau der ausgeschriebene Text aus dem Pflichtenheft, **beide** Spalten; 29 → 31 Schritte; Länge und Hash, so wie das Skript sie als Konstanten trägt', () => {
  const z = exZ();
  assert.equal(z.art, 'zu-schreiben', (z.probleme ?? []).join('\n'));
  assert.deepEqual(Object.keys(z), ['art', 'scenario', 'sequence'], 'der Zielstand trägt genau `scenario` und `sequence`');
  assert.equal(text(z.scenario), text(exScNeu()));
  assert.equal(text(z.sequence), text(exSeqNeu()));
  assert.equal(z.sequence.length, 31);
  const [sc, sq] = [text(z.scenario), text(z.sequence)];
  assert.deepEqual([sc.length, sha(sc)], [EX_Z.scenario.laenge, EX_Z.scenario.sha]);
  assert.deepEqual([sq.length, sha(sq)], [EX_Z.sequence.laenge, EX_Z.sequence.sha]);
  assert.ok(sc.length > text(SC_PROD).length && sq.length > dz.sequence.length, 'beide Texte sind länger geworden');
  assert.deepEqual(Object.keys(SCHRITTE.optionen), ['ausgang', 'ziel']);
  for (const k of ['ausgang', 'ziel']) assert.deepEqual(Object.keys(SCHRITTE.optionen[k]), ['scenario', 'sequence'], k);
});

test('EX 1: die Stücke des Befunds – `options.doerfler3/4/5` mit `optional` und `keiner` zuletzt, `partie` bindet `MuenzenJeDoerfler` 15 / 10, `baseCount` 3, fünf Sitze, vier Schritte hinten', () => {
  const o = exZ().scenario.options;
  for (const [n, on, keiner] of [[3, 'Granny', 'kein dritter Dörfler'], [4, 'Blopsy', 'kein vierter Dörfler'], [5, 'Yancy', 'kein fünfter Dörfler']]) {
    const d = o[`doerfler${n}`];
    assert.deepEqual(d.optional, { off: 'keiner', on, addLabel: 'Weiteren Dörfler hinzufügen' }, `doerfler${n}.optional`);
    assert.equal(d.default, 'keiner');
    assert.equal(Object.keys(d.choices).length, 10, 'neun Wahlen plus `keiner`');
    assert.equal(Object.keys(d.choices).at(-1), 'keiner', '`keiner` steht **zuletzt**');
    assert.deepEqual(d.choices.keiner, { label: keiner, vars: { [`Doerfler${n}`]: '' } });
  }
  assert.deepEqual(o.partie.choices.kurz.vars, { MuenzenJeDoerfler: '15' });
  assert.deepEqual(o.partie.choices.lang.vars, { MuenzenJeDoerfler: '10' });
  assert.equal(exZ().scenario.villagers.baseCount, 3);
  assert.equal(exZ().scenario.villagers.seats.length, 5);
  assert.deepEqual(exZ().scenario.villagers.seats.slice(3), [exSeat(4, 'Tableau: Blopsy Twins', 2040), exSeat(5, 'Tableau: Yancy Plover', 2620)]);
  const q = exZ().sequence;
  assert.deepEqual(q.slice(27).map(text), [EX_SEQ.s3, EX_SEQ.s4, EX_SEQ.s5, EX_SEQ.muenzen]);
  assert.equal(q.at(-1).x, 2000);
  assert.equal(q.at(-1).y, 1040);
  assert.equal(q.at(-1).value, '$optMuenzenJeDoerfler*$doerflerzahl', '`$doerflerzahl` klein, das Produkt in dieser Reihenfolge');
});

test('EX 1: **alles andere byteweise gleich** – jeder Schlüssel von `scenario_data` außer `options` und `villagers`, `partie` bis auf `vars`, `troedel`, `doerfler1`, `doerfler2`, Roster, `fightZone`, `barZone`, die drei alten Sitze; die ersten 27 Schritte', () => {
  const a = SC_PROD, b = exZ().scenario;
  assert.deepEqual(Object.keys(b), Object.keys(a), 'die Schlüssel von scenario_data, in derselben Reihenfolge');
  for (const k of Object.keys(a).filter(x => x !== 'options' && x !== 'villagers')) assert.equal(text(b[k]), text(a[k]), `scenario_data.${k}`);
  for (const k of ['troedel', 'doerfler1', 'doerfler2']) assert.equal(text(b.options[k]), text(a.options[k]), `options.${k}`);
  for (const k of ['label', 'default']) assert.equal(text(b.options.partie[k]), text(a.options.partie[k]), `options.partie.${k}`);
  for (const k of ['kurz', 'lang']) assert.equal(text(b.options.partie.choices[k].label), text(a.options.partie.choices[k].label), `options.partie.choices.${k}.label`);
  assert.deepEqual(Object.keys(b.options.partie.choices.kurz), Object.keys(a.options.partie.choices.kurz));
  for (const k of ['fightZone', 'barZone', 'roster']) assert.equal(text(b.villagers[k]), text(a.villagers[k]), `villagers.${k}`);
  assert.equal(text(b.villagers.seats.slice(0, 3)), text(a.villagers.seats));
  assert.equal(text(exZ().sequence.slice(0, 27)), text(sequence.slice(0, 27)));
  assert.equal(text({ ...exZ().sequence[27], onlyChoice: undefined }), text(sequence[27]), 'Platz 3 trägt nur das Gate dazu');
  // Gegen den Ausgang verglichen unterscheiden sich genau die Pfade der Stücke – nichts sonst.
  const ERLAUBT = /^\/(options\/(partie\/choices\/(kurz|lang)\/vars\/(Muenzen|MuenzenJeDoerfler)|doerfler3\/(default|optional|choices\/keiner)|doerfler[45])|villagers\/(seats\/[34]|baseCount))$/;
  const pfade = unterschiede(a, b);
  assert.deepEqual(pfade.filter(p => !ERLAUBT.test(p)), [], 'außerhalb der Stücke unterscheidet sich nichts');
  assert.ok(pfade.length >= 10, `die Stücke sind da: ${pfade.join(' ')}`);
});

test('EX 1: die Reihenfolge ist **gepinnt** – `options`: `partie`, `troedel`, `doerfler1` … `doerfler5`; `doerfler<n>`: `label`, `default`, `optional`, `choices`; `optional`: `off`, `on`, `addLabel`; `choices`: die neun, dann `keiner`; Gate am Ende des Schritts', () => {
  const { scenario: s, sequence: q } = exZ();
  assert.deepEqual(Object.keys(s.options), ['partie', 'troedel', 'doerfler1', 'doerfler2', 'doerfler3', 'doerfler4', 'doerfler5']);
  for (const n of [3, 4, 5]) {
    const d = s.options[`doerfler${n}`];
    assert.deepEqual(Object.keys(d), ['label', 'default', 'optional', 'choices']);
    assert.deepEqual(Object.keys(d.optional), ['off', 'on', 'addLabel']);
    assert.deepEqual(Object.keys(d.choices), [...EX_NEUN.map(([k]) => k), 'keiner']);
    assert.deepEqual(Object.keys(d.choices.Henlo), ['label', 'vars']);
  }
  assert.deepEqual(Object.keys(s.villagers), ['fightZone', 'barZone', 'seats', 'roster', 'baseCount'], '`baseCount` kommt hinten dazu (wie `mitBasis` in ET 6)');
  assert.deepEqual(Object.keys(s.villagers.seats[3]), ['anchor', 'zones', 'markers', 'vorrat', 'tableau']);
  assert.deepEqual(Object.keys(q[27]), ['type', 'seat', 'villager', 'onlyChoice']);
  assert.deepEqual(Object.keys(q[30]), ['type', 'name', 'value', 'x', 'y']);
});

test('EX 1: Rückwärtsbeweis **und** Vorwärtsprobe – die Stücke zurück: der gelesene Text, beide Spalten, Zeichen für Zeichen; aus dem Zurückgerechneten entsteht genau der Zielstand', () => {
  const z = exZ();
  assert.deepEqual(EW.beweiseSchalter({ scenario: SC_PROD, sequence }, { scenario: z.scenario, sequence: z.sequence }, EX_VORG), []);
  assert.deepEqual(EW.beweiseSchalter({ scenario: SC_PROD, sequence }, { scenario: exScNeu(), sequence: exSeqNeu() }, EX_VORG), [], 'auch gegen den ausgeschriebenen Zielstand dieses Tests');
});

test('EX 1: die Beweise fangen, was nicht stimmt – eine andere Reihenfolge, ein falscher Wert (die Vorwärtsprobe, nicht der Rückwärtsbeweis), ein Stück zu viel, ein fremder Schlüssel, ein veränderter alter Schritt', () => {
  const mut = (fn) => { const c = { scenario: exScNeu(), sequence: exSeqNeu() }; fn(c); return c; };
  const FALL = {
    'options: `troedel` vor `partie`': (c) => { const { partie, troedel, ...rest } = c.scenario.options; c.scenario.options = { troedel, partie, ...rest }; },
    'options: `doerfler5` vor `doerfler4`': (c) => { const { doerfler4, doerfler5, ...rest } = c.scenario.options; c.scenario.options = { ...rest, doerfler5, doerfler4 }; },
    '`keiner` nicht zuletzt': (c) => { const ch = c.scenario.options.doerfler4.choices; const { keiner, ...rest } = ch; c.scenario.options.doerfler4.choices = { keiner, ...rest }; },
    '`default` nicht keiner': (c) => { c.scenario.options.doerfler5.default = 'Yancy'; },
    '`optional.on` am falschen Dörfler': (c) => { c.scenario.options.doerfler4.optional.on = 'Yancy'; },
    '`addLabel` anders': (c) => { c.scenario.options.doerfler3.optional.addLabel = 'Dörfler dazu'; },
    '`MuenzenJeDoerfler` kurz 10 statt 15': (c) => { c.scenario.options.partie.choices.kurz.vars.MuenzenJeDoerfler = '10'; },
    '`baseCount` 4': (c) => { c.scenario.villagers.baseCount = 4; },
    '`baseCount` fehlt': (c) => { delete c.scenario.villagers.baseCount; },
    'nur ein neuer Sitz': (c) => { c.scenario.villagers.seats.pop(); },
    'ein Sitz mit anderem Anker': (c) => { c.scenario.villagers.seats[4].anchor = 'Tableau: Norman Fishboy'; },
    'ein Sitz mit `counters`': (c) => { c.scenario.villagers.seats[3].counters = {}; },
    'ein vierter alter Sitz verändert': (c) => { c.scenario.villagers.seats[0].tableau.x = 301; },
    'ein fremder Schlüssel in scenario_data': (c) => { c.scenario.fremd = 1; },
    'Gate mit `keiner` statt `!keiner`': (c) => { c.sequence[28].onlyChoice = { doerfler4: 'keiner' }; },
    'Gate am Platz 3 fehlt': (c) => { delete c.sequence[27].onlyChoice; },
    'Platz 4 und 5 hinter den Münzen': (c) => { const q = c.sequence; [q[28], q[29], q[30]] = [q[30], q[28], q[29]]; },
    'Münzen: Summe statt Produkt': (c) => { c.sequence[30].value = '$optMuenzenJeDoerfler+$doerflerzahl'; },
    'Münzen nicht verschoben (x)': (c) => { c.sequence[30].x = 2080; },
    'Münzen nicht verschoben (y)': (c) => { c.sequence[30].y = 1430; },
    'ein Schritt mehr': (c) => { c.sequence.push({ type: 'shuffle', stackLabel: 'Heldentaten' }); },
    'ein alter Schritt verändert': (c) => { c.sequence[3].x = 1781; },
  };
  for (const [name, fn] of Object.entries(FALL)) {
    const c = mut(fn);
    const m = EW.beweiseSchalter({ scenario: SC_PROD, sequence }, c, EX_VORG);
    assert.ok(m.length > 0, `der Beweis fängt nicht: ${name}`);
  }
  assert.ok(EW.beweiseSchalter({ scenario: SC_PROD, sequence }, { scenario: exScNeu() }, EX_VORG).length > 0, 'ohne `sequence` im Zielstand');
  assert.ok(EW.beweiseSchalter({ scenario: SC_PROD, sequence }, {}, EX_VORG).length > 0, 'ohne Zielstand');
});

// ── EX 2. Die Prüfer ────────────────────────────────────────────────────────

test('EX 2: `validateOptions` → `[]`, `validateScenarioData` → keine Probleme, `validateVillagers` mit allen Assets und Zonen → keine; `optionalOf` an 3, 4, 5 nicht `null`; jedes `vars.Doerfler<n>` außer `keiner` ist ein Schlüssel des Rosters', async () => {
  const { optionalOf, ladderOf } = await import('../../shared/setupOptions.js');
  const { validateVillagers } = await import('../../shared/villagers.js');
  const { scenario: s, sequence: q } = exZ();
  assert.deepEqual(validateOptions(s.options, q, EX_VORG.action), []);
  assert.deepEqual(validateScenarioData(s, { assets: EW_ASSETS, grids, cards }), []);
  assert.deepEqual(validateScenarioData(s), []);
  assert.deepEqual(validateVillagers(s.villagers, { assets: EW_ASSETS, cards, zones: EW_ZONEN }), [], 'mit **allen** Assets und Zonen: fünf Plätze');
  assert.deepEqual(validateVillagers(SC_PROD.villagers, { assets: EW_ASSETS, cards, zones: EW_ZONEN }), [], 'und die drei alten Plätze wie vorher');
  for (const n of [3, 4, 5]) {
    const o = optionalOf(s.options[`doerfler${n}`]);
    assert.notEqual(o, null, `doerfler${n} ist optional`);
    assert.equal(o.isOff, true, 'die Vorgabe ist aus');
    assert.deepEqual([o.off, o.on, o.addLabel], ['keiner', EX_NEUN[[2, 3, 8][n - 3]][0], 'Weiteren Dörfler hinzufügen']);
  }
  for (const n of [1, 2]) assert.equal(optionalOf(s.options[`doerfler${n}`]), null, 'Dörfler 1 und 2 sind die Untergrenze');
  const roster = s.villagers.roster;
  for (const n of [3, 4, 5]) {
    const d = s.options[`doerfler${n}`];
    for (const [k, c] of Object.entries(d.choices)) {
      const v = c.vars[`Doerfler${n}`];
      if (k === 'keiner') { assert.equal(v, ''); continue; }
      assert.ok(Object.prototype.hasOwnProperty.call(roster, v), `${k}: „${v}“ ist ein Schlüssel von villagers.roster`);
      assert.equal(roster[v].short, k, `${k}: der Schlüssel der Wahl ist der Kurzname`);
    }
    // `on` ist der Dörfler, dessen Tableau der Anker des Platzes ist (M31.5).
    const on = Object.entries(roster).find(([, v]) => v.short === d.optional.on)[0];
    assert.equal(s.villagers.seats[n - 1].anchor, `Tableau: ${on}`, `Platz ${n}: \`on\` ist der Dörfler am Anker`);
  }
  // Die Leiter (der Dialog fragt sie): Vorgabe = Plus bei Dörfler 3, nichts bei 4 und 5.
  assert.deepEqual(ladderOf(s.options, {}), { kinds: { partie: 'field', troedel: 'field', doerfler1: 'field', doerfler2: 'field', doerfler3: 'plus', doerfler4: 'hidden', doerfler5: 'hidden' }, minus: null });
  assert.deepEqual(ladderOf(s.options, { doerfler3: 'Granny' }), { kinds: { partie: 'field', troedel: 'field', doerfler1: 'field', doerfler2: 'field', doerfler3: 'field', doerfler4: 'plus', doerfler5: 'hidden' }, minus: 'doerfler3' });
  assert.deepEqual(ladderOf(s.options, { doerfler3: 'Granny', doerfler4: 'Blopsy', doerfler5: 'Yancy' }).minus, 'doerfler5');
  assert.ok(!Object.values(ladderOf(s.options, { doerfler3: 'Granny', doerfler4: 'Blopsy', doerfler5: 'Yancy' }).kinds).includes('plus'), 'bei fünf kein Plus mehr');
});

test('EX 2: der Prüfer des Bausteins (`pruefeSchalter`) ist zufrieden – und meldet jede Abweichung: ein `on` am falschen Platz, eine Wahl, die nicht im Roster steht, ein falscher Anker, ein unbekannter Platzhalter', () => {
  const z = exZ();
  assert.deepEqual(EW.pruefeSchalter(z.scenario, z.sequence, EX_VORG), []);
  const meld = (fn) => { const c = { scenario: copy(z.scenario), sequence: copy(z.sequence) }; fn(c); return EW.pruefeSchalter(c.scenario, c.sequence, EX_VORG).join('\n'); };
  assert.match(meld(c => { c.scenario.options.doerfler4.optional.on = 'Yancy'; }), /doerfler4.*on/);
  assert.match(meld(c => { c.scenario.options.doerfler4.choices.Judy.vars.Doerfler4 = 'Judy Marx'; }), /Judy Marx/);
  assert.match(meld(c => { c.scenario.villagers.seats[4].anchor = 'Tableau: Henlo Bulwark'; }), /seat 5|Platz 5|doerfler5/);
  assert.match(meld(c => { c.sequence[30].value = '$optMuenzen*$doerflerzahl'; }), /optMuenzen/);
  assert.match(meld(c => { c.sequence[29].onlyChoice = { doerfler6: '!keiner' }; }), /doerfler6/);
  assert.match(meld(c => { delete c.scenario.options.doerfler5.choices.keiner; }), /keiner|does not set|optional/);
  assert.match(meld(c => { c.scenario.villagers.seats[4].zones = 'Dörfler 9'; }), /Dörfler 9/, 'validateVillagers: die Zone gibt es nicht');
});

// ── EX 3. Die Vorbedingung je Stück ─────────────────────────────────────────

test('EX 3: die Fixture trägt genau die Stücke, die der Schritt erwartet – er schreibt, und der Ausgang ist `zu-schreiben`', () => {
  const p = EW.patchSchalter(SC_PROD, sequence, EX_VORG);
  assert.equal(p.art, 'zu-schreiben', (p.probleme ?? []).join('\n'));
});

test('EX 3: jedes Stück muss genau das sein – ein Wert, ein Schlüssel, ein Schritt anders: Abbruch **mit Pfad**, kein Zielstand', () => {
  const FALL = [
    // partie
    [exMit(s => { s.options.partie.choices.kurz.vars.Muenzen = '44'; }), /options\.partie.*kurz/],
    [exMit(s => { s.options.partie.choices.lang.vars = { Muenzen: '30', Zusatz: '1' }; }), /options\.partie.*lang/],
    [exMit(s => { delete s.options.partie.choices.kurz.vars.Muenzen; s.options.partie.choices.kurz.vars.MuenzenJe = '45'; }), /options\.partie.*kurz/],
    [exMit(s => { delete s.options.partie; }), /options\.partie/],
    // doerfler3
    [exMit(s => { s.options.doerfler3.default = 'Henlo'; }), /options\.doerfler3/],
    [exMit(s => { s.options.doerfler3.choices.Judy.label = 'Judy'; }), /options\.doerfler3/],
    [exMit(s => { delete s.options.doerfler3.choices.Yancy; }), /options\.doerfler3/],
    [exMit(s => { s.options.doerfler3.choices.keiner = { label: 'kein dritter Dörfler', vars: { Doerfler3: '' } }; }), /options\.doerfler3/],
    [exMit(s => { delete s.options.doerfler3; }), /options\.doerfler3/],
    // die Schlüssel von options
    [exMit(s => { s.options.doerfler6 = copy(s.options.doerfler3); }), /options.*doerfler6|Schlüssel/],
    [exMit(s => { const { partie, troedel, ...rest } = s.options; s.options = { troedel, partie, ...rest }; }), /options.*Reihenfolge|Schlüssel/],
    [exMit(s => { s.options = []; }), /options/],
    // villagers
    [exMit(s => { s.villagers.seats.pop(); }), /villagers\.seats/],
    [exMit(s => { s.villagers.seats.push(exSeat(4, 'Tableau: Blopsy Twins', 2040), exSeat(5, 'Tableau: Yancy Plover', 2620), exSeat(5, 'x', 1)); }), /villagers\.seats/],
    [exMit(s => { s.villagers.seats[2].tableau.x = 1461; }), /villagers\.seats\[2\]|seats.*3/],
    [exMit(s => { s.villagers.seats[0].counters = {}; }), /villagers\.seats\[0\]|seats.*1/],
    [exMit(s => { s.villagers.baseCount = 4; }), /baseCount/],
    [exMit(s => { s.villagers.roster['Blopsy Twins'].short = 'Blop'; }), /Blopsy|short|Kurzname/],
    [exMit(s => { delete s.villagers; }), /villagers/],
    [exMit(s => { delete s.bosses['Deputy Waggums'].final.terrain[2].fromCount; }), /Deputy Waggums|fromCount|gelaende/],
  ];
  for (const [sc, re] of FALL) assert.match(exAbw(sc), re, text(sc).slice(0, 0));
  const SEQ = [
    [exMitSeq(q => { q[27].seat = 4; }), /sequence_data\[27\]/],
    [exMitSeq(q => { q[27].villager = 'Granny Melba'; }), /sequence_data\[27\]/],
    [exMitSeq(q => { q[28].value = '45'; }), /sequence_data\[28\]/],
    [exMitSeq(q => { q[28].x = 2081; }), /sequence_data\[28\]/],
    [exMitSeq(q => { q[28].y = 1040; }), /sequence_data\[28\]/],
    [exMitSeq(q => { q.pop(); }), /sequence_data/],
    [exMitSeq(q => { q.push({ type: 'shuffle', stackLabel: 'Heldentaten' }); }), /sequence_data/],
    [exMitSeq(q => { q.splice(28, 0, { type: 'seat_villager', seat: 4, villager: '$optDoerfler4' }); }), /sequence_data/],
  ];
  for (const [q, re] of SEQ) assert.match(exAbw(SC_PROD, q), re);
});

test('EX 3: Form – kein Objekt, keine Liste, ein Schritt kein Objekt: Abbruch mit Pfad, kein Wurf', () => {
  for (const sc of [null, undefined, [], 'text', { options: null }, {}]) assert.equal(EW.patchSchalter(sc, sequence, EX_VORG).art, 'abweichend', text(sc));
  for (const q of [null, undefined, {}, 'x', [null], []]) assert.equal(EW.patchSchalter(SC_PROD, q, EX_VORG).art, 'abweichend', text(q));
  assert.match(exAbw(SC_PROD, [...sequence.slice(0, 27), 7, 8]), /sequence_data\[27\]/);
});

test('EX 3: **die fünf davor geschriebenen Schritte** sind Vorbedingung – fehlt einer (oder ist er nur halb da), Abbruch **vor** dem ersten Byte, mit dem Namen des Schritts', () => {
  // ES: fromCount an den Endkampf-Plättchen
  const ohneGelaende = exMit(s => { for (const n of ['Deputy Waggums', 'Pepin Milkfrog', 'Samuel Strawman']) s.bosses[n].final.terrain.splice(3); delete s.bosses['Deputy Waggums'].final.terrain[2].fromCount; });
  assert.match(exAbw(ohneGelaende), /gelaende|ES|fromCount/);
  const gelaendeHalb = exMit(s => { s.bosses['Deputy Waggums'].final.terrain.splice(3); });
  assert.match(exAbw(gelaendeHalb), /gelaende|ES|fromCount|Deputy Waggums/);
  // ET: statsByCount an den 19
  const ohneWerte = exMit(s => { for (const b of Object.values(s.bosses)) delete b.statsByCount; });
  assert.match(exAbw(ohneWerte), /werte|ET|statsByCount/);
  const werteHalb = exMit(s => { delete s.bosses['Handsy'].statsByCount; });
  assert.match(exAbw(werteHalb), /werte|ET|statsByCount|Handsy/);
  const werte18 = exMit(s => { delete s.bosses['Handsy'].statsByCount['5']; });
  assert.match(exAbw(werte18), /werte|ET|statsByCount|Handsy/);
  // EU: die 28 Zonen
  assert.match(exAbw(SC_PROD, sequence, { ...EX_VORG, zone: zones }), /zonen|EU|28 Zonen/);
  assert.match(exAbw(SC_PROD, sequence, { ...EX_VORG, zone: EW_ZONEN.slice(0, -1) }), /zonen|EU|Zonen/);
  assert.match(exAbw(SC_PROD, sequence, { ...EX_VORG, zone: EW_ZONEN.filter(z => !/^Dörfler 5: /.test(z.label)) }), /zonen|EU|Zonen/);
  // EV: die acht Assets
  assert.match(exAbw(SC_PROD, sequence, { ...EX_VORG, assets }), /assets|EV|Marker/);
  assert.match(exAbw(SC_PROD, sequence, { ...EX_VORG, assets: EW_ASSETS.slice(0, -1) }), /assets|EV|Marker/);
  assert.match(exAbw(SC_PROD, sequence, { ...EX_VORG, assets: EW_ASSETS.filter(a => a.name !== 'Marker 5: Mumm') }), /assets|EV|Marker 5: Mumm/);
  // EW: onlySeated in den Aktionen
  assert.match(exAbw(SC_PROD, sequence, { ...EX_VORG, action: AKT }), /aktionen|EW|onlySeated/);
  const aktHalb = copy(ZIEL_AKT); delete aktHalb[0].steps[11].onlySeated;
  assert.match(exAbw(SC_PROD, sequence, { ...EX_VORG, action: aktHalb }), /aktionen|EW|onlySeated|kampf-beginnen/);
  // nichts übergeben oder unlesbar
  for (const v of [undefined, null, {}, { zone: EW_ZONEN, assets: EW_ASSETS }, { zone: EW_ZONEN, action: ZIEL_AKT }, { assets: EW_ASSETS, action: ZIEL_AKT }, { zone: 'x', assets: EW_ASSETS, action: ZIEL_AKT }]) {
    assert.equal(EW.patchSchalter(SC_PROD, sequence, v).art, 'abweichend', text(v)?.slice(0, 60));
  }
  // Auch **schon im Ziel** gilt es: wer den Schalter geschrieben hat und dessen Vorgänger fehlen, bekommt keine Entwarnung.
  assert.equal(EW.patchSchalter(exScNeu(), exSeqNeu(), { ...EX_VORG, action: AKT }).art, 'abweichend');
  assert.equal(EW.patchSchalter(exScNeu(), exSeqNeu(), { ...EX_VORG, zone: zones }).art, 'abweichend');
});

test('EX 3: die Vorgänger werden **nicht verändert** – der Baustein liest sie nur (eingefrorene Eingaben: kein Wurf, dieselbe Antwort)', () => {
  const v = { zone: frost(copy(EW_ZONEN)), assets: frost(copy(EW_ASSETS)), action: frost(copy(ZIEL_AKT)) };
  const sc = frost(copy(SC_PROD)), q = frost(copy(sequence));
  const p = EW.patchSchalter(sc, q, v);
  assert.equal(p.art, 'zu-schreiben', (p.probleme ?? []).join('\n'));
  assert.equal(text(p.scenario), text(exZ().scenario));
});

test('EX 3: schon geschrieben – „schon-da“, die Eingabe kommt gleich zurück (als Kopie) und wird nicht verändert', () => {
  const sc = frost(exScNeu()), q = frost(exSeqNeu());
  const p = EW.patchSchalter(sc, q, EX_VORG);
  assert.equal(p.art, 'schon-da', (p.probleme ?? []).join('\n'));
  assert.equal(text(p.scenario), text(sc));
  assert.equal(text(p.sequence), text(q));
  assert.notEqual(p.scenario, sc, 'eine Kopie');
  assert.deepEqual(Object.keys(p), ['art', 'scenario', 'sequence']);
});

test('EX 3: ein **anderer** Wert am Ziel ist ein Abbruch – jedes Stück, das schon geschrieben aussieht, aber nicht genau das Ziel ist', () => {
  const FALL = [
    [(s) => { s.options.partie.choices.kurz.vars.MuenzenJeDoerfler = '10'; }, /options\.partie/],
    [(s) => { s.options.partie.choices.lang.vars.MuenzenJeDoerfler = '15'; }, /options\.partie/],
    [(s) => { s.options.doerfler3.default = 'Granny'; }, /options\.doerfler3/],
    [(s) => { s.options.doerfler4.optional.on = 'Yancy'; }, /options\.doerfler4/],
    [(s) => { s.options.doerfler5.optional.addLabel = 'Mehr'; }, /options\.doerfler5/],
    [(s) => { s.options.doerfler5.choices.keiner.label = 'niemand'; }, /options\.doerfler5/],
    [(s) => { const c = s.options.doerfler4.choices; const { keiner, ...rest } = c; s.options.doerfler4.choices = { keiner, ...rest }; }, /options\.doerfler4/],
    [(s) => { s.villagers.baseCount = 2; }, /baseCount/],
    [(s) => { s.villagers.seats[4].tableau.x = 2621; }, /villagers\.seats/],
    [(s) => { s.villagers.seats[3].vorrat = 'Ausrüstung Dörfler 5'; }, /villagers\.seats/],
  ];
  for (const [fn, re] of FALL) assert.match(exAbw(mitFn(exScNeu(), fn), exSeqNeu()), re);
  const SEQ = [
    [(q) => { q[27].onlyChoice = { doerfler3: 'Granny' }; }, /sequence_data\[27\]/],
    [(q) => { q[28].onlyChoice = { doerfler4: 'keiner' }; }, /sequence_data\[28\]/],
    [(q) => { q[29].seat = 4; }, /sequence_data\[29\]/],
    [(q) => { q[30].value = '$optMuenzenJeDoerfler+$doerflerzahl'; }, /sequence_data\[30\]/],
    [(q) => { q[30].x = 2080; }, /sequence_data\[30\]/],
    [(q) => { [q[28], q[30]] = [q[30], q[28]]; }, /sequence_data/],
  ];
  for (const [fn, re] of SEQ) { const q = exSeqNeu(); fn(q); assert.match(exAbw(exScNeu(), q), re); }
});
const mitFn = (x, fn) => { fn(x); return x; };

test('EX 3: ein **teilweise** geschriebener Stand ist ein Abbruch – jedes Stück einzeln neu bei sonst altem Stand, und jedes einzeln alt bei sonst neuem; **beide** Spalten', () => {
  const N = { sc: exScNeu(), q: exSeqNeu() };
  const STUECKE = {
    'partie': { sc: (s, quelle) => { s.options.partie = copy(quelle.options.partie); } },
    'doerfler3': { sc: (s, quelle) => { s.options.doerfler3 = copy(quelle.options.doerfler3); } },
    'doerfler4': { sc: (s, quelle) => { if (quelle.options.doerfler4) s.options.doerfler4 = copy(quelle.options.doerfler4); else delete s.options.doerfler4; } },
    'doerfler5': { sc: (s, quelle) => { if (quelle.options.doerfler5) s.options.doerfler5 = copy(quelle.options.doerfler5); else delete s.options.doerfler5; } },
    'seats': { sc: (s, quelle) => { s.villagers.seats = copy(quelle.villagers.seats); } },
    'baseCount': { sc: (s, quelle) => { if (quelle.villagers.baseCount === undefined) delete s.villagers.baseCount; else s.villagers.baseCount = quelle.villagers.baseCount; } },
  };
  // Szenario: ein Stück vom einen Stand, der Rest vom anderen.
  for (const [name, st] of Object.entries(STUECKE)) {
    const mitNeu = copy(SC_PROD); st.sc(mitNeu, N.sc);
    assert.match(exAbw(mitNeu), /halber Stand|teils|teilweise/, `nur ${name} neu`);
    const mitAlt = copy(N.sc); st.sc(mitAlt, SC_PROD);
    assert.match(exAbw(mitAlt, exSeqNeu()), /halber Stand|teils|teilweise/, `nur ${name} alt`);
  }
  // Folge: die drei Stücke (Platz 3 mit Gate, Platz 4 und 5, Münzen).
  const alt = { s3: sequence[27], m: sequence[28] }, neu = { s3: N.q[27], s45: N.q.slice(28, 30), m: N.q[30] };
  const fold = (s3, s45, m) => [...sequence.slice(0, 27), s3, ...s45, m].map(copy);
  const SEQ = {
    'Platz 3': [fold(neu.s3, [], alt.m), fold(alt.s3, neu.s45, neu.m)],
    'Platz 4 und 5': [fold(alt.s3, neu.s45, alt.m), fold(neu.s3, [], neu.m)],
    'Münzen': [fold(alt.s3, [], neu.m), fold(neu.s3, neu.s45, alt.m)],
  };
  for (const [name, [nurNeu, nurAlt]] of Object.entries(SEQ)) {
    assert.match(exAbw(SC_PROD, nurNeu), /halber Stand|teils|teilweise/, `Folge: nur ${name} neu`);
    assert.match(exAbw(exScNeu(), nurAlt), /halber Stand|teils|teilweise/, `Folge: nur ${name} alt`);
  }
  // Die Spalten gegeneinander: Szenario neu, Folge alt – und umgekehrt.
  assert.match(exAbw(exScNeu(), sequence), /halber Stand|teils|teilweise/, 'scenario_data im Ziel, sequence_data im Ausgang');
  assert.match(exAbw(SC_PROD, exSeqNeu()), /halber Stand|teils|teilweise/, 'scenario_data im Ausgang, sequence_data im Ziel');
});

test('EX 3: der Ausgang gilt auch für ein Szenario, das **keine** Stücke trägt außer `options` – es kommt gleich als `abweichend` mit Pfad zurück, nicht als Wurf', () => {
  for (const sc of [{ options: SC_PROD.options }, { villagers: SC_PROD.villagers }, { options: SC_PROD.options, villagers: SC_PROD.villagers }]) {
    assert.equal(EW.patchSchalter(sc, sequence, EX_VORG).art, 'abweichend');
  }
});

// ── EX 4. Der Tisch von vor M31 ─────────────────────────────────────────────
//
// Der Kern: mit `doerfler3: Granny` baut der neue Aufbau **denselben** Tisch wie der von vor M31 – mit **einer** genannten Ausnahme, dem Münzzähler (2000, 1040).
// Verglichen wird gegen den **Ausgang** (die Daten der Fixture, die Zonen und Assets des Auszugs, **ohne** EU und EV): was die beiden zusätzlichen Zonen, Marker und Sitze verändern
// könnten, würde hier auffallen.

const SO = await import('../../shared/setupOptions.js');
const exSc = () => exZ().scenario;
const exBau = (choices = {}, o = {}) => bauen({ state, sequence: o.sequence ?? exZ().sequence, zones: o.zones ?? EW_ZONEN, grids, assets: o.assets ?? EW_ASSETS, cards, scenarioData: o.sc ?? exSc() }, choices, 1);
const exAktion = (id, st, o = {}) => executeSequenceWithLog(st, stepsOf(o.acts ?? NEU(), id), EW_ZONEN, { assets: EW_ASSETS, cards, grids, scenarioData: o.sc ?? exSc(), rng: seededRng(7) });
const exNamen = (st, sc = exSc()) => seatedVillagers(st, EW_ASSETS, sc.villagers).map(s => s.name);
const exMuenzen = (st) => st.counters.find(c => c.name === 'Münzen (gemeinsam)');
const exZeilen = (r) => r.log.map(e => [e.type, e.target, e.status, e.reason]);
const exSchlecht = (r) => r.log.filter(e => e.status === 'failed' || e.status === 'skipped');
const exWahl = (n) => ({ ...(n >= 3 ? { doerfler3: 'Granny' } : {}), ...(n >= 4 ? { doerfler4: 'Blopsy' } : {}), ...(n >= 5 ? { doerfler5: 'Yancy' } : {}) });
const exZonen = (st) => resolveZones(EW_ZONEN, anchorBoxes(st.boards, st.tokens));
const exFiguren = (st) => st.tokens.filter(t => t.gridId && exNamen(st).includes(t.label));
const exMarker = (st) => st.tokens.filter(t => /^Marker \d: /.test(t.label ?? ''));
/** Die Zahl auf der Leiste `Bösewicht: Leben` / `Bösewicht: Bewegung` – so liest die Wache und so liest der Tisch den Marker. */
function exWert(st, was) {
  const t = st.tokens.find(x => x.label === `Marker: Bösewicht ${was}`);
  assert.ok(t, `der Marker ${was} liegt`);
  return zoneSlotNumberAt(exZonen(st).find(z => z.label === (was === 'LEB' ? 'Bösewicht: Leben' : 'Bösewicht: Bewegung')), t.x, t.y);
}
/** Liegen alle Marker eines Platzes auf den Startwerten ihres Dörflers? */
function exStartwerte(st, platz) {
  const s = seatedVillagers(st, EW_ASSETS, exSc().villagers).find(x => x.n === platz);
  assert.ok(s?.data, `an Platz ${platz} sitzt ein bekannter Dörfler`);
  for (const stat of ['Leben', 'Bewegung', 'Mumm', 'Präzision']) {
    const m = st.tokens.filter(t => t.label === `Marker ${platz}: ${stat}`);
    assert.equal(m.length, 1, `Marker ${platz}: ${stat}`);
    assert.equal(zoneSlotNumberAt(exZonen(st).find(z => z.label === `Dörfler ${platz}: ${stat}`), m[0].x, m[0].y), s.data.start[stat], `${s.name}: ${stat} liegt auf dem Startwert`);
  }
}
/** Den ersten Kampf dieses Bösewichts (der Leistenplatz bekommt seinen Namen) aufbauen, `final` erzwungen oder nicht. */
function exKampfLauf(st, name, final) {
  return executeSequenceWithLog(mitBoss(st, name), [
    { type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Bösewicht-Platz' },
    { type: 'build_scenario', final },
  ], EW_ZONEN, { assets: EW_ASSETS, cards, grids, scenarioData: exSc(), rng: seededRng(7) });
}
/** Die Endkampf-Plättchen: was mit `final: true` mehr liegt als mit `final: false`, als Feld je Plättchen. */
function exEndFelder(st, name) {
  const vorher = new Set(st.tokens.map(t => t.id));
  const mit = exKampfLauf(st, name, true), ohne = exKampfLauf(st, name, false);
  for (const r of [mit, ohne]) assert.deepEqual(r.log.filter(e => e.status === 'failed'), [], `${name}: ${r.log.map(e => e.reason).join(' | ')}`);
  const rest = gelegt(mit, vorher).map(t => t.cell);
  for (const c of gelegt(ohne, vorher).map(t => t.cell)) rest.splice(rest.indexOf(c), 1);
  return rest;
}
const VIER = [['kurz', 'mit'], ['kurz', 'ohne'], ['lang', 'mit'], ['lang', 'ohne']];

test('EX 4: **der Tisch von vor M31** – mit `doerfler3: Granny` und `partie`/`troedel` in **allen vier** Kombinationen derselbe Zustand wie der Ausgangsstand (tokens, counters, cards, stacks, boards) – **mit der einen Ausnahme**: der Münzzähler steht auf (2000, 1040)', () => {
  for (const [partie, troedel] of VIER) {
    const wo = `${partie}/${troedel}`;
    const alt = bauen({ state, sequence, zones, grids, assets, cards, scenarioData: scenario }, { partie, troedel }, 1);
    const neu = exBau({ partie, troedel, doerfler3: 'Granny' });
    assert.deepEqual(neu.log.filter(e => e.status !== 'ok' && e.status !== 'note'), [], `${wo}: keine Zeile außer ok und erwarteten notes`);
    assert.deepEqual(exZeilen(neu), exZeilen(alt), `${wo}: dieselben Protokollzeilen (ohne den Index: die Münzen stehen jetzt an Schritt 30)`);
    assert.deepEqual(neu.log.map(e => e.index), [...alt.log.map(e => e.index).slice(0, -1), 30], `${wo}: derselbe Lauf, die Münzen hinten`);
    for (const feld of ['tokens', 'cards', 'boards']) assert.deepEqual(ohneIds(neu.state[feld]), ohneIds(alt.state[feld]), `${wo}: ${feld}`);
    assert.deepEqual(ohneIds(neu.state.stacks), ohneIds(alt.state.stacks), `${wo}: stacks`);
    // Die Ausnahme, **genannt**: alle Zähler außer den Münzen sind gleich, die Münzen sind es bis auf den Ort.
    const ohneM = (st) => ohneIds(st.counters.filter(c => c.name !== 'Münzen (gemeinsam)'));
    assert.deepEqual(ohneM(neu.state), ohneM(alt.state), `${wo}: die Zähler außer den Münzen`);
    const [mAlt, mNeu] = [exMuenzen(alt.state), exMuenzen(neu.state)];
    assert.deepEqual([mAlt.x, mAlt.y], [2080, 1430], 'vorher');
    assert.deepEqual([mNeu.x, mNeu.y], [2000, 1040], 'jetzt');
    assert.deepEqual(ohneIds({ ...mNeu, x: 2080, y: 1430 }), ohneIds(mAlt), `${wo}: der Münzzähler ist bis auf (x, y) derselbe`);
    assert.equal(mNeu.value, partie === 'kurz' ? 45 : 30, `${wo}: Münzen 45 / 30`);
    // Nicht leer verglichen: es ist etwas gebaut.
    assert.equal(exNamen(neu.state).length, 3);
    assert.equal(exMarker(neu.state).length, 12);
    assert.ok(neu.state.cards.length > 0 && neu.state.stacks.length > 0 && neu.state.tokens.length > 20);
  }
});

test('EX 4: derselbe Tisch gilt auch in den Aktionen – Kampf, Dorfphase, Ereignis mit den neuen Daten auf dem Tisch von vor M31: dasselbe wie mit den Daten von vor M31 (Münzen +18)', () => {
  for (const [partie, troedel] of VIER) {
    const alt = bauen({ state, sequence, zones, grids, assets, cards, scenarioData: scenario }, { partie, troedel }, 1);
    const neu = exBau({ partie, troedel, doerfler3: 'Granny' });
    let a = alt.state, n = neu.state;
    for (const id of ['kampf-beginnen', 'dorfphase-beginnen', 'dorfereignis']) {
      const ra = executeSequenceWithLog(a, stepsOf(AKT, id), zones, { assets, cards, grids, scenarioData: scenario, rng: seededRng(7) });
      const rn = exAktion(id, n);
      assert.deepEqual(ohneIds(rn.state.tokens), ohneIds(ra.state.tokens), `${partie}/${troedel} ${id}: tokens`);
      assert.deepEqual(ohneIds(rn.state.cards), ohneIds(ra.state.cards), `${partie}/${troedel} ${id}: cards`);
      assert.deepEqual(rn.log.map(e => [e.type, e.status, e.reason]).filter(([, st]) => st !== 'ok').length, ra.log.filter(e => e.status !== 'ok').length, `${id}: gleich viele Beanstandungen wie vorher`);
      assert.deepEqual(rn.log.filter(e => e.status === 'failed' || e.status === 'skipped'), [], `${id}: keine Beanstandung`);
      a = ra.state; n = rn.state;
    }
    assert.equal(exMuenzen(n).value - exMuenzen(neu.state).value, 18);
    assert.equal(exMuenzen(n).value, exMuenzen(a).value);
  }
});

// ── EX 5. Die Vorgabe ───────────────────────────────────────────────────────

test('EX 5: **die Vorgabe** (`choices: {}`) – zwei Dörfler (Henlo, Fridgette), Münzen 30 / 20, kein Tableau von Granny, **keine** Beanstandung; `dorfereignis` teilt zwei Karten', () => {
  for (const [wahl, muenzen] of [[{}, 30], [{ partie: 'kurz' }, 30], [{ partie: 'lang' }, 20]]) {
    const r = exBau(wahl);
    assert.deepEqual(r.log.filter(e => e.status !== 'ok'), [], text(wahl));
    assert.deepEqual(exNamen(r.state), ['Henlo Bulwark', 'Fridgette Jones'], text(wahl));
    assert.equal(exMuenzen(r.state).value, muenzen, `Münzen ${text(wahl)}`);
    assert.ok(!r.state.tokens.some(t => /Granny|Blopsy|Yancy/.test(t.label ?? '')), 'weder Tableau noch Spielstein noch Figur der drei leeren Plätze');
    assert.equal(exMarker(r.state).length, 8);
    assert.deepEqual(r.state.counters.map(c => c.name), ['Münzen (gemeinsam)'], 'der Münzzähler ist der einzige Zähler');
  }
  const st = exBau({}).state;
  const e = exAktion('dorfereignis', st);
  assert.deepEqual(exSchlecht(e), []);
  assert.equal(e.state.cards.length - st.cards.length, 2, 'dorfereignis teilt zwei Karten');
  assert.ok(e.log.filter(x => x.type === 'deal_to_zone').length === 2, 'zwei Austeilungen, die der leeren Plätze fallen ohne Zeile aus');
});

test('EX 5: der Aufbau mit der Vorgabe legt **nur** die Plätze 1 und 2 – ein Platz ohne Wahl lässt keine Zeile zurück (auch nicht `skipped`), ein Lauf mit `choices` ohne Dörfler gleich einem Lauf ohne `choices`', () => {
  const a = exBau({}), b = exBau({ doerfler3: 'keiner', doerfler4: 'keiner', doerfler5: 'keiner' }), c = exBau({ doerfler1: 'Henlo', doerfler2: 'Fridgette' });
  assert.deepEqual(exZeilen(a), exZeilen(b));
  assert.deepEqual(ohneIds(a.state.tokens), ohneIds(b.state.tokens));
  assert.deepEqual(ohneIds(a.state.tokens), ohneIds(c.state.tokens));
  assert.equal(a.log.length, 31 - 3 - 1, '31 Schritte; Platz 3, 4 und 5 laufen nicht und schreiben keine Zeile, ebenso der eine Schritt nur für die lange Partie: 27');
});

// ── EX 6. Je Zahl 2, 3, 4, 5 ────────────────────────────────────────────────

test('EX 6: je Zahl **2, 3, 4, 5** – so viele Tableaus **auf ihrem Anker** (Platz 3 Granny, 4 Blopsy, 5 Yancy: kein `anchorId`), je vier Marker auf den Startwerten (n · 4), die Steine auf den ersten n Plätzen der Leiste, Münzen 30 / 45 / 60 / 75 (kurz) und 20 / 30 / 40 / 50 (lang), **keine** Beanstandung', () => {
  const KURZ = { 2: 30, 3: 45, 4: 60, 5: 75 }, LANG = { 2: 20, 3: 30, 4: 40, 5: 50 };
  for (const n of [2, 3, 4, 5]) {
    for (const [partie, soll] of [['kurz', KURZ], ['lang', LANG]]) {
      const r = exBau({ ...exWahl(n), partie });
      assert.deepEqual(r.log.filter(e => e.status !== 'ok'), [], `${n} Dörfler, ${partie}: ${r.log.filter(e => e.status !== 'ok').map(e => e.reason).join(' | ')}`);
      const sitzende = seatedVillagers(r.state, EW_ASSETS, exSc().villagers);
      assert.deepEqual(sitzende.map(s => s.n), [1, 2, 3, 4, 5].slice(0, n), `Plätze 1 … ${n}`);
      assert.deepEqual(sitzende.map(s => s.name), ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba', 'Blopsy Twins', 'Yancy Plover'].slice(0, n));
      for (const s of sitzende) assert.equal(s.token.anchorId, undefined, `Platz ${s.n}: das Tableau liegt auf seinem Anker, kein anchorId`);
      assert.equal(exMarker(r.state).length, n * 4, `${n} · 4 Marker`);
      for (const s of sitzende) exStartwerte(r.state, s.n);
      assert.equal(exMuenzen(r.state).value, soll[n], `Münzen bei ${n} (${partie})`);
      assert.deepEqual([exMuenzen(r.state).x, exMuenzen(r.state).y], [2000, 1040]);
      // Die Steine: auf den ersten n Plätzen der Leiste, in der Reihenfolge der Plätze.
      const leisteZone = exZonen(r.state).find(z => z.label === "Buyin'/Beatin'-Leiste");
      const plaetze = zoneSlots(leisteZone);
      const steine = sitzende.map(s => r.state.tokens.find(t => t.assetId === EW_ASSETS.find(a => a.name === s.data.short)?.id));
      steine.forEach((t, i) => { assert.ok(t, `Spielstein ${sitzende[i].data.short}`); assert.deepEqual([t.x, t.y], [plaetze[i].x, plaetze[i].y], `Stein ${i + 1} auf Platz ${i + 1} der Leiste`); });
      assert.equal(r.state.tokens.filter(t => zoneContains(leisteZone, t.x, t.y)).length, n, `genau ${n} Steine auf der Leiste`);
    }
  }
});

test('EX 6: `describeChoices` nennt die Wahl lesbar – „kein dritter Dörfler“, „kein vierter Dörfler“, „kein fünfter Dörfler“; mit Wahl den vollen Namen', () => {
  const o = exSc().options;
  const wie = (wahl) => SO.describeChoices(o, SO.resolveChoices(o, wahl).choices);
  assert.match(wie({}), /kein dritter Dörfler, kein vierter Dörfler, kein fünfter Dörfler/);
  assert.match(wie(exWahl(3)), /Granny Melba, kein vierter Dörfler, kein fünfter Dörfler/);
  assert.match(wie(exWahl(5)), /Granny Melba, Blopsy Twins, Yancy Plover/);
  assert.doesNotMatch(wie(exWahl(5)), /kein /);
  assert.match(wie({}), /^Kurz \(3-Runden-Modus\), mit Toller Trödel, Henlo Bulwark, Fridgette Jones, kein dritter/);
});

// ── EX 7. Der ganze Kreis je Zahl ───────────────────────────────────────────

test('EX 7: **der ganze Kreis je Zahl** – Aufbau → `kampf-beginnen` (Deputy: LEB 12 / 14 / 17 / 20, BEW 6 / 6 / 7 / 7, n Figuren; Endkampf mit **n** Plättchen) → `dorfphase-beginnen` (+12 / +18 / +24 / +30, **18 + 5 · n** Zeilen, bei fünf **43**, ohne `skipped`) → Kampf 2 (Virginia: LEB 12 / 15 / 18 / 21, im Endkampf **5** Plättchen bei jeder Zahl)', () => {
  const DEPUTY = { 2: [6, 12], 3: [6, 14], 4: [7, 17], 5: [7, 20] }, VIRGINIA_LEB = { 2: 12, 3: 15, 4: 18, 5: 21 }, ZUWACHS = { 2: 12, 3: 18, 4: 24, 5: 30 };
  for (const n of [2, 3, 4, 5]) {
    const s0 = exBau(exWahl(n)).state;
    // Kampf 1: Deputy Waggums
    const k1 = exAktion('kampf-beginnen', s0);
    assert.deepEqual(exSchlecht(k1), [], `Kampf 1 bei ${n}: ${k1.log.filter(e => e.status !== 'ok').map(e => e.reason).join(' | ')}`);
    assert.ok(k1.state.tokens.some(t => t.label === 'Bösewicht: Deputy Waggums'), 'Deputy Waggums ist der erste Kampf');
    assert.deepEqual([exWert(k1.state, 'BEW'), exWert(k1.state, 'LEB')], DEPUTY[n], `Deputy bei ${n}: BEW / LEB`);
    assert.equal(exFiguren(k1.state).length - exFiguren(s0).length, n, `${n} Figuren`);
    assert.equal(exEndFelder(s0, 'Deputy Waggums').length, n, `Endkampf Deputy: ${n} Plättchen`);
    // Dorfphase
    const d1 = exAktion('dorfphase-beginnen', k1.state);
    assert.deepEqual(exSchlecht(d1), [], `Dorfphase bei ${n}`);
    assert.equal(d1.log.length, 18 + 5 * n, `${n} Dörfler: Zeilen der Dorfphase`);
    if (n === 5) assert.equal(d1.log.length, 43, 'bei fünf Dörflern laufen alle 43 Schritte');
    assert.equal(exMuenzen(d1.state).value - exMuenzen(k1.state).value, ZUWACHS[n], `Münzen +${ZUWACHS[n]}`);
    for (let p = 1; p <= n; p++) exStartwerte(d1.state, p);
    assert.equal(exMarker(d1.state).length, 4 * n);
    // Ereignis, dann Kampf 2: Virginia Fitz
    const e1 = exAktion('dorfereignis', d1.state);
    assert.deepEqual(exSchlecht(e1), []);
    assert.equal(e1.state.cards.length - d1.state.cards.length, n, `${n} Ereignis-Karten`);
    const k2 = exAktion('kampf-beginnen', e1.state);
    assert.deepEqual(exSchlecht(k2), [], `Kampf 2 bei ${n}`);
    assert.ok(k2.state.tokens.some(t => t.label === 'Bösewicht: Virginia Fitz'), 'Virginia Fitz ist der zweite Kampf');
    assert.equal(exWert(k2.state, 'LEB'), VIRGINIA_LEB[n], `Virginia bei ${n}: LEB`);
    assert.equal(exFiguren(k2.state).length - exFiguren(e1.state).length, n);
    assert.equal(exEndFelder(e1.state, 'Virginia Fitz').length, 5, `Endkampf Virginia: 5 Plättchen bei ${n}`);
  }
});

test('EX 7: der Endkampf der drei „je Dörfler“ legt 2 / 3 / 4 / 5 Plättchen, die fünf festen bei jeder Zahl 5 / 5 / 1 / 1 / 1 – am Tisch, den der Schalter baut', () => {
  const FEST = { 'Virginia Fitz': 5, Handsy: 5, 'The Bundits': 1, 'Tilda Fields': 1, Umbrello: 1 };
  for (const n of [2, 3, 4, 5]) {
    const s0 = exBau(exWahl(n)).state;
    for (const name of ['Deputy Waggums', 'Pepin Milkfrog', 'Samuel Strawman']) assert.equal(exEndFelder(s0, name).length, n, `${name} bei ${n}`);
    for (const [name, k] of Object.entries(FEST)) assert.equal(exEndFelder(s0, name).length, k, `${name} bei ${n}`);
  }
});

// ── EX 8. Jeder der neun Dörfler an Platz 4 und 5 ───────────────────────────

test('EX 8: **fünf Dörfler auf allen Plätzen** – jeder der **neun** Dörfler an Platz 4 und an Platz 5 (je ein Lauf) baut **ohne Problem**, trägt das Tableau auf dem Anker des Platzes (ein fremdes mit `anchorId`), die Marker auf den Startwerten – im Aufbau **und** nach Kampf und Dorfphase; Georgie meldet das `note`', () => {
  const kurz = EX_NEUN.map(([k]) => k);
  const anker = (platz) => EW_ASSETS.find(a => a.name === (platz === 4 ? 'Tableau: Blopsy Twins' : 'Tableau: Yancy Plover')).id;
  let laeufe = 0;
  for (const platz of [4, 5]) {
    for (const [k, voll] of EX_NEUN) {
      const andere = kurz.filter(x => x !== k);
      const wahl = { doerfler1: andere[0], doerfler2: andere[1], doerfler3: andere[2], doerfler4: platz === 4 ? k : andere[3], doerfler5: platz === 5 ? k : andere[3] };
      const wo = `${k} an Platz ${platz}`;
      const r = exBau(wahl);
      const nicht = r.log.filter(e => e.status !== 'ok');
      assert.ok(nicht.every(e => e.status === 'note' && /Georgie/.test(e.reason)), `${wo}: ${nicht.map(e => `${e.status} ${e.reason}`).join(' | ')}`);
      assert.equal(nicht.length, Object.values(wahl).includes('Georgie') ? 1 : 0, `${wo}: das note von Georgie, und nur das`);
      const sitzende = seatedVillagers(r.state, EW_ASSETS, exSc().villagers);
      assert.equal(sitzende.length, 5, wo);
      assert.equal(sitzende.find(s => s.n === platz).name, voll, `${wo}: er sitzt`);
      const tab = sitzende.find(s => s.n === platz).token;
      const eigen = (platz === 4 ? 'Blopsy' : 'Yancy') === k;
      assert.equal(tab.anchorId, eigen ? undefined : anker(platz), `${wo}: ${eigen ? 'auf dem eigenen Anker' : 'ein fremdes Tableau trägt die Id des Platzes'}`);
      for (let p = 1; p <= 5; p++) exStartwerte(r.state, p);
      assert.equal(exMuenzen(r.state).value, 75);
      // Kampf und Dorfphase mit diesem Tisch: nichts übersprungen, die Marker liegen wieder auf den Startwerten.
      const k1 = exAktion('kampf-beginnen', r.state);
      assert.deepEqual(exSchlecht(k1), [], `${wo}: Kampf`);
      const d1 = exAktion('dorfphase-beginnen', k1.state);
      assert.deepEqual(exSchlecht(d1), [], `${wo}: Dorfphase`);
      assert.equal(d1.log.length, 43);
      for (let p = 1; p <= 5; p++) exStartwerte(d1.state, p);
      laeufe++;
    }
  }
  assert.equal(laeufe, 18);
});

// ── EX 9. Die Doppelwahl ────────────────────────────────────────────────────

test('EX 9: **die Doppelwahl** – `Judy` / `Judy` / `keiner`: ein Dörfler sitzt, **eine** `skipped`-Zeile; `kampf-beginnen` **hält** (`no values for 1 villager`), das Kampffeld ist **unverändert**', () => {
  const r = exBau({ doerfler1: 'Judy', doerfler2: 'Judy', doerfler3: 'keiner' });
  const nicht = r.log.filter(e => e.status !== 'ok');
  assert.equal(nicht.length, 1, nicht.map(e => e.reason).join(' | '));
  assert.equal(nicht[0].status, 'skipped');
  assert.equal(nicht[0].type, 'seat_villager');
  assert.equal(nicht[0].index, 26);
  assert.match(nicht[0].reason, /"Judy Marks" already sits at seat 1/);
  assert.deepEqual(exNamen(r.state), ['Judy Marks']);
  assert.equal(exMuenzen(r.state).value, 15, 'ein Dörfler: 15 Münzen');
  const k = exAktion('kampf-beginnen', r.state);
  const halt = k.log.find(e => e.status === 'failed');
  assert.ok(halt, 'der Kampf hält');
  assert.equal(halt.type, 'build_scenario');
  assert.match(halt.reason, /no values for 1 villager/);
  // **Befund (festgehalten, nicht gebaut):** `build_scenario` scheitert, die Aktion **hält nicht an** – was davor lief (der Bösewicht ist aufgedeckt, sein Tableau liegt) bleibt, was dahinter von der Bindung
  // abhängt, fällt mit `is not bound` aus (die Werte, die Figur von Platz 1, das Feld `$B`); unverändert ist das **Kampffeld**, nicht der ganze Tisch.
  assert.deepEqual(k.log.filter(e => e.status === 'skipped').map(e => e.index), [6, 7, 8, 9, 10]);
  assert.ok(k.state.tokens.some(t => t.label === 'Bösewicht: Deputy Waggums') || k.state.tokens.some(t => t.label === 'Tableau: Deputy Waggums'), 'das Tableau des aufgedeckten Bösewichts liegt');
  const feld = (st) => ohneIds(st.tokens.filter(t => t.gridId));
  assert.deepEqual(feld(k.state), feld(r.state), 'kein Plättchen, keine Figur: das Kampffeld ist unverändert');
  assert.equal(feld(k.state).length, 0);
  assert.ok(!k.state.tokens.some(t => /^Marker: Bösewicht/.test(t.label ?? '')), 'und keine Werte');
});

test('EX 9: `Judy` / `Judy` / `Granny` – zwei Dörfler sitzen, Münzen 30, die Werte der 2P-Spalte; eine `skipped`-Zeile für den leeren Platz 2', () => {
  const r = exBau({ doerfler1: 'Judy', doerfler2: 'Judy', doerfler3: 'Granny' });
  const nicht = r.log.filter(e => e.status !== 'ok');
  assert.deepEqual(nicht.map(e => [e.status, e.index]), [['skipped', 26]]);
  assert.deepEqual(exNamen(r.state), ['Judy Marks', 'Granny Melba'], 'zwei sitzen, Platz 2 ist leer');
  assert.deepEqual(seatedVillagers(r.state, EW_ASSETS, exSc().villagers).map(s => s.n), [1, 3]);
  assert.equal(exMuenzen(r.state).value, 30);
  const k = exAktion('kampf-beginnen', r.state);
  // Platz 2 trägt **kein** Gate (M31.3: nicht entfernbar, eine Doppelwahl ist eine Fehlwahl): der leere Platz zeigt sich in den Aktionen als `skipped … is not bound` – und nur dort, nur für Platz 2.
  assert.deepEqual(k.log.filter(e => e.status !== 'ok').map(e => [e.index, e.type, e.target, e.status, e.reason]), [[10, 'place_asset', '$F2', 'skipped', '"$F2": $F2 is not bound']]);
  assert.deepEqual([exWert(k.state, 'BEW'), exWert(k.state, 'LEB')], [6, 12], 'Deputy Waggums in der 2P-Spalte');
  assert.equal(exFiguren(k.state).length, 2);
  const d = exAktion('dorfphase-beginnen', k.state);
  assert.deepEqual(d.log.filter(e => e.status !== 'ok').map(e => [e.type, e.target, e.status]), [['clear_table', '$F2', 'skipped'], ...['Leben', 'Bewegung', 'Mumm', 'Präzision'].map(w => ['place_asset', `Marker 2: ${w}`, 'skipped'])], 'Platz 2: fünf Zeilen in der Dorfphase, alle „is not bound“');
  assert.ok(d.log.filter(e => e.status !== 'ok').every(e => /is not bound/.test(e.reason)));
  assert.deepEqual(exAktion('dorfereignis', d.state).log.filter(e => e.status !== 'ok'), [], 'das Ereignis teilt in die Hände 1, 2 und 3: ohne Zeile');
  assert.equal(exMuenzen(d.state).value - exMuenzen(k.state).value, 12);
});

test('EX 9: andere Doppelwahlen – derselbe Dörfler an Platz 4 und 5 (Blopsy / Blopsy), an Platz 1 und 3: je eine Zeile, die Zahl ist die am Tisch', () => {
  const a = exBau({ ...exWahl(3), doerfler4: 'Blopsy', doerfler5: 'Blopsy' });
  assert.deepEqual(a.log.filter(e => e.status !== 'ok').map(e => [e.status, e.index]), [['skipped', 29]]);
  assert.equal(exNamen(a.state).length, 4);
  assert.equal(exMuenzen(a.state).value, 60, '4 · 15: gezählt wird, wer sitzt');
  const b = exBau({ doerfler1: 'Granny', doerfler3: 'Granny' });
  assert.deepEqual(b.log.filter(e => e.status !== 'ok').map(e => [e.status, e.index]), [['skipped', 27]]);
  assert.equal(exNamen(b.state).length, 2);
  assert.equal(exMuenzen(b.state).value, 30);
  // Eine Lücke (Platz 3 leer, Platz 5 besetzt) ist erlaubt und wird gebaut, wie sie ist.
  const l = exBau({ doerfler5: 'Yancy' });
  assert.deepEqual(l.log.filter(e => e.status !== 'ok'), []);
  assert.deepEqual(seatedVillagers(l.state, EW_ASSETS, exSc().villagers).map(s => s.n), [1, 2, 5]);
  assert.equal(exMuenzen(l.state).value, 45);
});

// ── EX 10. Die Reihenfolge der Aufbauschritte ───────────────────────────────

test('EX 10: **die Reihenfolge der Aufbauschritte** – `seat_villager` 25 bis 29, **dann** die Münzen (Schritt 30); sonst bände `$doerflerzahl` zu früh', () => {
  const q = exZ().sequence;
  assert.equal(q.length, 31);
  assert.deepEqual(q.map((s, i) => [i, s.type, s.seat]).filter(([, t]) => t === 'seat_villager'), [[25, 'seat_villager', 1], [26, 'seat_villager', 2], [27, 'seat_villager', 3], [28, 'seat_villager', 4], [29, 'seat_villager', 5]]);
  assert.equal(q[30].type, 'place_counter');
  assert.ok(q.findIndex(s => s.type === 'place_counter') > Math.max(...q.map((s, i) => (s.type === 'seat_villager' ? i : -1))), 'die Münzen **hinter** dem letzten Dörfler');
  assert.ok(q.slice(0, 25).every(s => s.type !== 'seat_villager'), 'davor kein Dörfler');
  assert.ok(q.slice(0, 30).every(s => s.type !== 'place_counter'), 'und davor keine Münzen');
  assert.ok(q.slice(0, 25).every(s => !/doerflerzahl/.test(text(s))), 'kein Schritt vor den Dörflern liest die Zahl');
  assert.deepEqual(q.map((s, i) => /doerflerzahl/.test(text(s)) ? i : null).filter(i => i !== null), [30], 'genau ein Schritt liest die Zahl');
});

test('EX 10: der Grund – stünden die Münzen vor Platz 4 und 5, bände `$doerflerzahl` zu früh (3 statt 5: 45 statt 75); ganz vorn „is not bound“; hinter dem Dörfler-Block stimmt es', () => {
  const q = exZ().sequence;
  const muenzen = q[30];
  const vorVier = [...q.slice(0, 28), muenzen, ...q.slice(28, 30)];
  const r = exBau({ ...exWahl(5), partie: 'kurz' }, { sequence: vorVier });
  assert.equal(exNamen(r.state).length, 5);
  assert.equal(exMuenzen(r.state).value, 45, 'zu früh gebunden: 3 · 15');
  const vorn = [muenzen, ...q.slice(0, 30)];
  const r2 = exBau({ ...exWahl(5), partie: 'kurz' }, { sequence: vorn });
  assert.equal(exMuenzen(r2.state), undefined, 'ohne Dörfler kein Zähler');
  assert.match(r2.log[0].reason, /\$doerflerzahl is not bound/);
  assert.equal(exMuenzen(exBau({ ...exWahl(5), partie: 'kurz' }).state).value, 75, 'hinter dem Block: 5 · 15');
});

// ── EX 11. Der Rundlauf ─────────────────────────────────────────────────────

const { choicesFromSearch, formatChoices } = await import('../../client/src/utils/setupChoices.js');

test('EX 11: Roundtrip – `?opt=doerfler4:Blopsy` und `?opt=doerfler3:keiner` aus der Adresse, durch `resolveChoices`, in den Aufbau; zurück in die Adresse', () => {
  const o = exSc().options;
  const a = choicesFromSearch('?opt=doerfler3:Granny&opt=doerfler4:Blopsy');
  assert.deepEqual(a, { choices: { doerfler3: 'Granny', doerfler4: 'Blopsy' }, problems: [] });
  const r = SO.resolveChoices(o, a.choices);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.choices, { partie: 'kurz', troedel: 'mit', doerfler1: 'Henlo', doerfler2: 'Fridgette', doerfler3: 'Granny', doerfler4: 'Blopsy', doerfler5: 'keiner' });
  assert.equal(r.vars.optDoerfler4, 'Blopsy Twins');
  assert.equal(r.vars.optDoerfler5, '', '`keiner` bindet den leeren Text');
  assert.equal(r.vars.optMuenzenJeDoerfler, '15');
  assert.equal(r.vars.optMuenzen, undefined, 'die alte Variable gibt es nicht mehr');
  assert.deepEqual(exNamen(exBau(a.choices).state), ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba', 'Blopsy Twins']);
  const k = choicesFromSearch('?opt=doerfler3:keiner');
  assert.deepEqual(k.choices, { doerfler3: 'keiner' });
  assert.deepEqual(SO.resolveChoices(o, k.choices).problems, []);
  assert.equal(exNamen(exBau(k.choices).state).length, 2);
  assert.equal(formatChoices({ doerfler4: 'Blopsy', doerfler3: 'keiner' }), 'opt=doerfler4:Blopsy&opt=doerfler3:keiner');
  assert.deepEqual(choicesFromSearch(`?${formatChoices(r.choices)}`).choices, r.choices, 'die aufgelöste Wahl überlebt die Adresse');
});

test('EX 11: `resolveChoices` mit **allen neun** Namen an Platz 3, 4 und 5 – jede Wahl ist gültig und bindet ihren vollen Namen; `keiner` den leeren Text; ein Tippfehler ist ein Problem und fällt nie auf die Vorgabe zurück', () => {
  const o = exSc().options;
  for (const n of [3, 4, 5]) {
    for (const [k, voll] of EX_NEUN) {
      const r = SO.resolveChoices(o, { [`doerfler${n}`]: k });
      assert.deepEqual(r.problems, [], `${k} an ${n}`);
      assert.equal(r.choices[`doerfler${n}`], k);
      assert.equal(r.vars[`optDoerfler${n}`], voll);
    }
    assert.equal(SO.resolveChoices(o, { [`doerfler${n}`]: 'keiner' }).vars[`optDoerfler${n}`], '');
    assert.match(SO.resolveChoices(o, { [`doerfler${n}`]: 'Keiner' }).problems.join(), /no choice "Keiner"/);
    assert.match(SO.resolveChoices(o, { [`doerfler${n}`]: 'Granny Melba' }).problems.join(), /no choice "Granny Melba"/);
  }
  assert.match(SO.resolveChoices(o, { doerfler6: 'Henlo' }).problems.join(), /no option "doerfler6"/);
  // Das Gate: `!keiner` ist die einzige Verneinung, und sie passt zu jeder Wahl außer `keiner`.
  for (const n of [3, 4, 5]) {
    const g = (w) => SO.checkGate({ [`doerfler${n}`]: '!keiner' }, o, SO.resolveChoices(o, { [`doerfler${n}`]: w }).choices);
    assert.deepEqual(g('keiner'), { ok: true, applies: false });
    for (const [k] of EX_NEUN) assert.deepEqual(g(k), { ok: true, applies: true }, `${k}`);
  }
});

// ── EX 12. Disjunkt ─────────────────────────────────────────────────────────

test('EX 12: berührt nur `scenario_data` und `sequence_data` – der Zielstand trägt nichts anderes; die Pfade gegenüber `gelaende` und `werte` sind **disjunkt**, jede Reihenfolge ergibt **denselben Text**', () => {
  assert.deepEqual(Object.keys(exZ()), ['art', 'scenario', 'sequence']);
  const pfade = unterschiede(SC_PROD, exZ().scenario);
  assert.ok(pfade.length > 0 && pfade.every(p => /^\/(options|villagers)\//.test(p)), pfade.join(', '));
  assert.deepEqual(pfade.filter(p => /\/bosses\//.test(p) || /stats|terrain|fromCount/i.test(p)), [], 'kein Bösewicht, kein stats, kein terrain');
  // Die Schritte davor schreiben nur Bösewichte: auf den Ausgang vor ES angewendet, **vor** oder **nach** dem Schalter gerechnet, kommt derselbe Text.
  const a = text(exScNeuVon(patchWerte(patchGelaende(scenario).scenario).scenario));          // erst ES und ET, dann der Schalter
  const b = text(patchWerte(patchGelaende(exScNeuVon(scenario)).scenario).scenario);           // erst der Schalter, dann ES und ET
  const c = text(patchGelaende(patchWerte(exScNeuVon(scenario)).scenario).scenario);          // … und ET vor ES
  assert.equal(a, b, 'Schalter nach `gelaende`/`werte` = Schalter davor');
  assert.equal(b, c, 'und `werte`/`gelaende` in der anderen Reihenfolge');
  assert.equal(a, text(exZ().scenario), 'und das ist der Zielstand');
  // Die anderen Spalten kennt der Schritt nur lesend: die Vorgänger sind danach unverändert da.
  const vorher = text(EX_VORG);
  EW.patchSchalter(SC_PROD, sequence, EX_VORG);
  assert.equal(text(EX_VORG), vorher);
  assert.equal(EW.patchZonen(EX_VORG.zone).art, 'schon-da');
  assert.equal(EW.patchAktionen(EX_VORG.action).art, 'schon-da');
});
/** Dieselben Stücke wie `exScNeu`, auf ein beliebiges Szenario angewendet (die Bösewichte kommen aus der Eingabe). */
function exScNeuVon(sc) {
  const s = copy(sc);
  const neu = exOptionsNeu();
  s.options = neu;
  s.villagers.seats = copy(exScNeu().villagers.seats);
  s.villagers.baseCount = 3;
  return s;
}

// ── EX 8 (Gerüst). SCHRITTE ─────────────────────────────────────────────────

test('EX Gerüst: `SCHRITTE` – alle sechs Schritte gebaut, `optionen` mit `{ ausgang, ziel }` für **beide** Spalten; der Kopf des Skripts nennt weder Länge noch Hash des Ausgangs oder Ziels', () => {
  assert.deepEqual(Object.keys(SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen', 'haende']);
  for (const k of Object.keys(SCHRITTE)) assert.notEqual(SCHRITTE[k], null, `${k} ist gebaut`);
  assert.deepEqual(Object.keys(SCHRITTE.optionen), ['ausgang', 'ziel']);
  for (const k of ['ausgang', 'ziel']) {
    assert.deepEqual(Object.keys(SCHRITTE.optionen[k]), ['scenario', 'sequence'], k);
    for (const sp of ['scenario', 'sequence']) assert.deepEqual(Object.keys(SCHRITTE.optionen[k][sp]), ['laenge', 'sha'], `${k}.${sp}`);
  }
  // Der Ausgang von `optionen` ist **dieselbe** Zahl wie das Ziel von `werte` (scenario) und von M30 (sequence): eine Quelle.
  assert.deepEqual(SCHRITTE.optionen.ausgang.scenario, SCHRITTE.werte.ziel.scenario);
  assert.deepEqual(SCHRITTE.optionen.ausgang.sequence, sw.SCHRITTE.boss.ziel.sequence);
  const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8').replace(/\r/g, '');
  const kopf = quelle.split('\n').filter((l, i, alle) => alle.slice(0, i + 1).every(x => x.startsWith('//') || x.trim() === '')).join('\n');
  for (const z of [SCHRITTE.optionen.ziel.scenario, SCHRITTE.optionen.ziel.sequence]) {
    assert.ok(!kopf.includes(z.sha), `der Kopf nennt ${z.sha}`);
    for (const l of [String(z.laenge), String(z.laenge).replace(/(\d)(\d{3})$/, '$1 $2'), String(z.laenge).replace(/(\d)(\d{3})$/, '$1.$2')]) assert.ok(!kopf.includes(l), `der Kopf nennt ${l}`);
  }
  assert.match(kopf, /\*\*`optionen`/, 'der Kopf beschreibt den Schritt');
  assert.doesNotMatch(kopf, /noch nicht gebaut|steht in `SCHRITTE` als `null`/, 'der Kopf nennt keinen ungebauten Schritt mehr');
});

// ── EX main. Die Läufe gegen eine Wegwerf-Datenbank ─────────────────────────

const exAusgangScen = text(SC_PROD);
const exDb = (over = {}) => frischeDatenbank({ scen: exAusgangScen, seq: dz.sequence, act: text(ZIEL_AKT), zon: EW_ZONEN, ast: EW_ASSETS, ...over });
const EX_ZIELSC = () => text(exZ().scenario), EX_ZIELSEQ = () => text(exZ().sequence);
const exOhneSpalten = (a) => ({ ...a, setups: a.setups.map(r => ({ ...r, scenario_data: undefined, sequence_data: undefined })) });
const exSicherung = (tmp, scen = exAusgangScen, seq = dz.sequence) => {
  const datei = path.join(tmp, 'sicherung-optionen.json');
  const h = sicherungsHash(scen, seq);
  fs.writeFileSync(datei, JSON.stringify({ scenario_data: scen, sequence_data: seq, sha256: h, updated_at: '2026-11-09 00:00:00' }));
  return { datei, h };
};
const exSchreiben = (file, h, extra = []) => ['--write', file, '--schritt', 'optionen', '--sicherung-sha', h.slice(0, 16), ...extra];
const exCheck = (file) => ['--check', file, '--schritt', 'optionen'];

test('EX/EV Wegwerf-Datenbank: `created_at` der `table_assets`-Zeilen kommt aus dem Aufbau, **nicht von der Uhr** – jeder der acht Klone trägt das `created_at` seiner Vorlage, sonst entscheidet die Sekunde des Einfügens, ob `patchAssets` sie noch als Klone erkennt', () => {
  const { tmp, file } = exDb();
  try {
    const rows = alles(file).table_assets;
    assert.ok(rows.length > 100, `${rows.length} Zeilen`);
    // `patchAssets` vergleicht Klon und Vorlage über **jedes** Feld (`diffFelder(…, [])`), `created_at` eingeschlossen.
    // Steht die Spalte auf `DEFAULT (datetime('now'))`, entscheidet die Sekunde des Einfügens — unter Last fällt die
    // Schleife über zwei Sekunden und der Lauf bricht mit „weicht von der Vorlage ab: created_at“ ab.
    const heute = new Date().toISOString().slice(0, 10);
    for (const r of rows) assert.ok(!String(r.created_at).startsWith(heute), `„${r.name}“ trägt die Uhr des Laufs (${r.created_at})`);
    const mit = (name) => rows.find(r => r.name === name);
    for (const name of Object.keys(EW.ASSET_IDS)) {
      const wert = name.split(': ')[1];
      assert.equal(mit(name)?.created_at, mit(`Marker 3: ${wert}`)?.created_at, `${name} gegen seine Vorlage`);
    }
    assert.equal(EW.patchAssets(rows).art, 'schon-da', (EW.patchAssets(rows).probleme ?? []).join('; '));
  } finally { weg(tmp); }
});

test('EX main: `--check` am Ausgangsstand – schreibgeschützt, „zu schreiben“, Plan, **beide** Beweise, Prüfer, Zielstand beider Spalten, Hash für die Sicherung', async () => {
  const { tmp, file } = exDb();
  try {
    const vorher = alles(file);
    fs.chmodSync(file, 0o444);
    const r = await lauf(exCheck(file));
    fs.chmodSync(file, 0o666);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, new RegExp(`gelesen: scenario_data ${exAusgangScen.length} Zeichen.*sequence_data ${dz.sequence.length} Zeichen`));
    assert.match(r.out, /Einordnung: zu schreiben/);
    assert.match(r.out, /29 → 31/);
    for (const wort of ['doerfler3', 'doerfler4', 'doerfler5', 'baseCount', 'MuenzenJeDoerfler', '2000', '1040']) assert.ok(r.out.includes(wort), `der Plan nennt ${wort}`);
    assert.match(r.out, /Rückwärtsbeweis scenario_data: ja/);
    assert.match(r.out, /Rückwärtsbeweis sequence_data: ja/);
    assert.match(r.out, /Probleme/);
    assert.ok(r.out.includes(`Zielstand: scenario_data ${EX_Z.scenario.laenge} Zeichen (sha ${EX_Z.scenario.sha}), sequence_data ${EX_Z.sequence.laenge} Zeichen (sha ${EX_Z.sequence.sha})`), r.out);
    assert.ok(r.out.includes(sicherungsHash(exAusgangScen, dz.sequence)), 'der Hash, den --write als Sicherung verlangt, steht da');
    assert.match(r.out, /würde schreiben: scenario_data .* → .* Zeichen, sequence_data .* → .* Zeichen/);
    assert.match(r.out, /die fünf davor geschriebenen Schritte/i, 'die Vorbedingung wird genannt');
    assert.doesNotMatch(r.out, /Beanstandungen:? [1-9]/);
    assert.deepEqual(alles(file), vorher, '--check hat nichts geschrieben');
  } finally { weg(tmp); }
});

test('EX main: `--check` öffnet schreibgeschützt, `--write` nicht; geschrieben wird mit **einem** UPDATE auf **genau zwei** Spalten, gelesen werden `scenario_data`, `sequence_data` und – nur lesend, als Vorbedingung – `zone_data`, `action_data`, `table_assets`', async () => {
  const { tmp, file } = exDb();
  try {
    const optionen = [], sql = [];
    class Spion extends Database {
      constructor(pfad, opt) { optionen.push(opt); super(pfad, opt); }
      prepare(s) { sql.push(s); return super.prepare(s); }
    }
    istCode(await lauf(exCheck(file), { Db: Spion }), 0);
    assert.equal(optionen.at(-1).readonly, true);
    sql.length = 0;
    const { h } = exSicherung(tmp);
    const w = await lauf(exSchreiben(file, h), { Db: Spion });
    assert.equal(w.code, 0, w.out);
    assert.equal(optionen.at(-1).readonly, false);
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const schreibend = sql.filter(s => /^\s*(update|insert|delete|replace|drop|alter|create)\b/i.test(s));
    assert.equal(schreibend.length, 1, schreibend.join('\n'));
    assert.match(norm(schreibend[0]), /^update setups set scenario_data = \?, sequence_data = \? where id = \? and scenario_data = \? and sequence_data = \?$/i);
    const erlaubt = sql.filter(s => !/order by rowid|sqlite_master|^\s*pragma|^\s*update setups set scenario_data/i.test(s)).map(norm);
    const gelesen = [...new Set(erlaubt)];
    assert.deepEqual(gelesen.filter(s => !/^select \* from setups where id = \?$/i.test(s)).sort(),
      ['select game_id, scenario_data, sequence_data from setups where id = ?', 'select zone_data, action_data from setups where id = ?'].sort(), gelesen.join('\n'));
    for (const s of gelesen) assert.doesNotMatch(s, /grid_data|state_data|from cards|save_states/i, s);
    assert.ok(sql.some(s => /select \* from table_assets where game_id = \? order by rowid/i.test(norm(s))), 'die Assets werden gelesen (Vorbedingung)');
  } finally { weg(tmp); }
});

test('EX main: `--write` mit Sicherung – beide Spalten auf dem Zielstand, **nichts sonst** geändert (`zone_data`, `action_data`, `grid_data`, `state_data`, Assets, Spielstände), Kontrolle neu gelesen, **eine** Transaktion', async () => {
  const { tmp, file } = exDb();
  try {
    const vorher = alles(file);
    const { h } = exSicherung(tmp);
    const r = await lauf(exSchreiben(file, h));
    assert.equal(r.code, 0, r.out);
    const z = zeile(file);
    assert.equal(z.scenario_data, EX_ZIELSC());
    assert.equal(z.sequence_data, EX_ZIELSEQ());
    assert.deepEqual([z.scenario_data.length, sha(z.scenario_data)], [EX_Z.scenario.laenge, EX_Z.scenario.sha]);
    assert.deepEqual([z.sequence_data.length, sha(z.sequence_data)], [EX_Z.sequence.laenge, EX_Z.sequence.sha]);
    assert.deepEqual(exOhneSpalten(alles(file)), exOhneSpalten(vorher), 'jede andere Spalte, Zeile und Tabelle (auch updated_at, save_states, zone_data, action_data, table_assets) ist gleich');
    for (const k of ['zone_data', 'action_data', 'grid_data', 'state_data']) assert.equal(z[k], zeile(file)[k]);
    assert.equal(z.action_data, text(ZIEL_AKT));
    assert.ok(r.out.includes(`scenario_data ${exAusgangScen.length} → ${EX_Z.scenario.laenge} Zeichen, sha ${sha(exAusgangScen)} → ${EX_Z.scenario.sha}`), r.out);
    assert.ok(r.out.includes(`sequence_data ${dz.sequence.length} → ${EX_Z.sequence.laenge} Zeichen, sha ${sha(dz.sequence)} → ${EX_Z.sequence.sha}`), r.out);
    assert.match(r.out, /Rückwärtsbeweis scenario_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /Rückwärtsbeweis sequence_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /Zielstand aus den Konstanten \(.*\): erreicht/);
    assert.match(r.out, /save_states Auto Save: sha \w+ → \w+ gleich/);
    assert.match(r.out, /validateOptions[^\n]*: 0 Probleme/);
    assert.match(r.out, /validateVillagers[^\n]*: 0 Probleme/);
    assert.match(r.out, /options\.doerfler3/, 'die Kontrolle nennt die drei Optionen');
    assert.match(r.out, /31 Schritte/, 'und die 31 Schritte der Folge');
  } finally { weg(tmp); }
});

test('EX main: der zweite Lauf – „schon geschrieben“, Rückgabe 0, nichts geschrieben, auch ohne Sicherung', async () => {
  const { tmp, file } = exDb();
  try {
    const { h } = exSicherung(tmp);
    istCode(await lauf(exSchreiben(file, h)), 0);
    const nach1 = alles(file);
    for (const args of [exSchreiben(file, h), ['--write', file, '--schritt', 'optionen'], exCheck(file)]) {
      const r = await lauf(args);
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /schon geschrieben/);
      assert.deepEqual(alles(file), nach1);
    }
  } finally { weg(tmp); }
});

test('EX main: ohne Sicherung kein Schreiben – fehlender Hash, falsche Form, falscher Hash, der Hash **einer** Spalte; nichts geändert', async () => {
  const { tmp, file } = exDb();
  try {
    const vorher = alles(file);
    const { h } = exSicherung(tmp);
    const FALL = [
      [['--write', file, '--schritt', 'optionen'], /ohne Sicherung kein Schreiben/],
      [['--write', file, '--schritt', 'optionen', '--sicherung-sha', 'abc'], /mindestens 12 Hex-Stellen/],
      [['--write', file, '--schritt', 'optionen', '--sicherung-sha', 'zzzzzzzzzzzzzzzz'], /mindestens 12 Hex-Stellen/],
      [exSchreiben(file, 'f'.repeat(16)), /passt nicht zum gelesenen Text/],
      [exSchreiben(file, sicherungsHash(exAusgangScen)), /passt nicht zum gelesenen Text/],
      [exSchreiben(file, sicherungsHash(dz.sequence)), /passt nicht zum gelesenen Text/],
      [exSchreiben(file, sicherungsHash(dz.sequence, exAusgangScen)), /passt nicht zum gelesenen Text/],
    ];
    for (const [args, re] of FALL) { const r = await lauf(args); assert.equal(r.code, 1, r.out); assert.match(r.out, re); }
    assert.deepEqual(alles(file), vorher);
    istCode(await lauf(exSchreiben(file, h)), 0, 'mit dem richtigen Hash geht es');
  } finally { weg(tmp); }
});

test('EX main: ein anderer Stand ist ein Abbruch mit Pfad – ein Wert, ein Schlüssel, ein Schritt anders: `--check` wie `--write`, nichts geschrieben, **kein** Schalter dagegen', async () => {
  const FALL = [
    [(sc) => { sc.options.partie.choices.kurz.vars.Muenzen = '44'; }, null, /options\.partie/],
    [(sc) => { sc.options.doerfler3.default = 'Henlo'; }, null, /options\.doerfler3/],
    [(sc) => { sc.villagers.seats.pop(); }, null, /villagers\.seats/],
    [null, (q) => { q[28].x = 1; }, /sequence_data\[28\]/],
    [null, (q) => { q[27].seat = 5; }, /sequence_data\[27\]/],
  ];
  for (const [fs_, fq, re] of FALL) {
    const sc = copy(SC_PROD), q = copy(sequence);
    fs_?.(sc); fq?.(q);
    const { tmp, file } = exDb({ scen: text(sc), seq: text(q) });
    try {
      const vorher = alles(file);
      for (const args of [exCheck(file), ['--write', file, '--schritt', 'optionen', '--sicherung-sha', sicherungsHash(text(sc), text(q)).slice(0, 16)]]) {
        const r = await lauf(args);
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /Einordnung: ABWEICHEND/);
        assert.match(r.out, re);
        assert.match(r.out, /es wird nichts überschrieben/);
      }
      assert.deepEqual(alles(file), vorher);
    } finally { weg(tmp); }
  }
});

test('EX main: **die fünf davor geschriebenen Schritte** – fehlt einer, bricht der Lauf ab, **bevor** ein Byte geschrieben ist (kein UPDATE, nichts geändert), und nennt den Schritt', async () => {
  const FALL = [
    ['gelaende', { scen: text(exMit(s => { for (const n of ['Deputy Waggums', 'Pepin Milkfrog', 'Samuel Strawman']) { s.bosses[n].final.terrain.splice(3); } delete s.bosses['Deputy Waggums'].final.terrain[2].fromCount; })) }, /gelaende|ES|fromCount/],
    ['werte', { scen: text(exMit(s => { for (const b of Object.values(s.bosses)) delete b.statsByCount; })) }, /werte|ET|statsByCount/],
    ['zonen', { zon: zones }, /zonen|EU|Zonen/],
    ['assets', { ast: assets }, /assets|EV|Marker/],
    ['aktionen', { act: dz.actions }, /aktionen|EW|onlySeated/],
  ];
  for (const [name, over, re] of FALL) {
    const { tmp, file } = exDb(over);
    try {
      const vorher = alles(file);
      const sql = [];
      class Spion extends Database { prepare(s) { sql.push(s); return super.prepare(s); } }
      const scen = over.scen ?? exAusgangScen;
      for (const args of [exCheck(file), ['--write', file, '--schritt', 'optionen', '--sicherung-sha', sicherungsHash(scen, dz.sequence).slice(0, 16)]]) {
        const r = await lauf(args, { Db: Spion });
        assert.equal(r.code, 1, `${name}: ${r.out}`);
        assert.match(r.out, re, name);
        assert.ok(r.out.includes(`Voraussetzung ${name} (`), `${name}: der Abbruch nennt den fehlenden Schritt — ${r.out}`);
      }
      assert.deepEqual(sql.filter(s => /^\s*(update|insert|delete)\b/i.test(s)), [], `${name}: kein UPDATE`);
      assert.deepEqual(alles(file), vorher, name);
    } finally { weg(tmp); }
  }
});

test('EX main: ein **halber** Stand ist ein Abbruch – nur `scenario_data` im Ziel, nur `sequence_data` im Ziel: nichts geschrieben', async () => {
  for (const [scen, seq] of [[EX_ZIELSC(), dz.sequence], [exAusgangScen, EX_ZIELSEQ()]]) {
    const { tmp, file } = exDb({ scen, seq });
    try {
      const vorher = alles(file);
      for (const args of [exCheck(file), ['--write', file, '--schritt', 'optionen', '--sicherung-sha', sicherungsHash(scen, seq).slice(0, 16)]]) {
        const r = await lauf(args);
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /halber Stand/);
      }
      assert.deepEqual(alles(file), vorher);
    } finally { weg(tmp); }
  }
});

test('EX main: ein Stand, der nicht kompaktes JSON.stringify ist, wird nicht angefasst – in **jeder** der beiden Spalten (der Text-Vergleich trüge nicht)', async () => {
  for (const [scen, seq] of [[JSON.stringify(SC_PROD, null, 1), dz.sequence], [exAusgangScen, JSON.stringify(sequence, null, 1)]]) {
    const { tmp, file } = exDb({ scen, seq });
    try {
      const vorher = alles(file);
      const r = await lauf(exCheck(file));
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /nicht kompaktes JSON\.stringify/);
      assert.deepEqual(alles(file), vorher);
    } finally { weg(tmp); }
  }
});

test('EX main: Vergleich-und-Tausch – ändert jemand `scenario_data` **oder** `sequence_data` zwischen Lesen und Schreiben, wird nichts geschrieben, die fremde Änderung bleibt stehen', async () => {
  for (const spalte of ['scenario_data', 'sequence_data']) {
    const { tmp, file } = exDb();
    try {
      const { h } = exSicherung(tmp);
      const fremd = spalte === 'scenario_data' ? exAusgangScen.replace('"gridLabel"', '"gridLabel"') + ' ' : dz.sequence + ' ';
      const r = await lauf(exSchreiben(file, h), { haken: (stelle, db) => { if (stelle === 'nach-lesen') db.prepare(`update setups set ${spalte} = ? where id = ?`).run(fremd, SETUP_ID); } });
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /hat sich seit dem Lesen geändert|nichts geschrieben/);
      assert.equal(zeile(file)[spalte], fremd, 'die fremde Änderung bleibt stehen');
      const andere = spalte === 'scenario_data' ? 'sequence_data' : 'scenario_data';
      assert.equal(zeile(file)[andere], andere === 'scenario_data' ? exAusgangScen : dz.sequence, 'und die andere Spalte ist nicht halb geschrieben');
    } finally { weg(tmp); }
  }
});

test('EX main: ändert sich in der Transaktion eine andere Tabelle (Auto Save) oder eine andere Spalte des Aufbaus (`zone_data`, `action_data`), rollt **alles** zurück – auch die zweite der beiden Spalten', async () => {
  for (const [wo, fn] of [
    ['save_states', (db) => db.prepare("update save_states set state_data = '{\"a\":9}' where name = 'Auto Save'").run()],
    ['zone_data', (db) => db.prepare('update setups set zone_data = ? where id = ?').run('[]', SETUP_ID)],
    ['action_data', (db) => db.prepare('update setups set action_data = ? where id = ?').run('[]', SETUP_ID)],
    ['table_assets', (db) => db.prepare("update table_assets set width = width + 1 where name = 'Marker 1: Leben'").run()],
  ]) {
    const { tmp, file } = exDb();
    try {
      const { h } = exSicherung(tmp);
      const vorher = alles(file);
      const r = await lauf(exSchreiben(file, h), { haken: (stelle, db) => { if (stelle === 'in-transaktion') fn(db); } });
      assert.equal(r.code, 1, `${wo}: ${r.out}`);
      assert.match(r.out, /unerwartet geändert/, wo);
      assert.deepEqual(alles(file), vorher, `${wo}: nichts bleibt geändert, beide Spalten wie vorher`);
    } finally { weg(tmp); }
  }
});

test('EX main: `--zurueck` – der exakte Zielstand kommt auf den Ausgang, **beide** Spalten, Zeichen für Zeichen; ein zweites Mal ist „schon der Ausgangsstand“', async () => {
  const { tmp, file } = exDb();
  try {
    const vorher = alles(file);
    const { h, datei } = exSicherung(tmp);
    istCode(await lauf(exSchreiben(file, h)), 0);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'optionen']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /zurückgeschrieben/);
    assert.match(r.out, /= die Sicherung, Zeichen für Zeichen/);
    assert.deepEqual(alles(file), vorher, 'alles wie vor dem Schalter');
    const r2 = await lauf(['--zurueck', datei, file, '--schritt', 'optionen']);
    assert.equal(r2.code, 0, r2.out);
    assert.match(r2.out, /schon der Ausgangsstand/);
  } finally { weg(tmp); }
});

test('EX main: `--zurueck` ersetzt nur den exakten Zielstand – hat jemand danach weitergearbeitet (eine der beiden Spalten), bleibt alles stehen', async () => {
  for (const spalte of ['scenario_data', 'sequence_data']) {
    const { tmp, file } = exDb();
    try {
      const { h, datei } = exSicherung(tmp);
      istCode(await lauf(exSchreiben(file, h)), 0);
      setze(file, spalte, zeile(file)[spalte] + ' ');
      const vorher = alles(file);
      const r = await lauf(['--zurueck', datei, file, '--schritt', 'optionen']);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /nicht der Zielstand und nicht der Ausgangsstand/);
      assert.deepEqual(alles(file), vorher);
    } finally { weg(tmp); }
  }
});

test('EX main: `--zurueck` prüft die Sicherung – beschädigt, nicht kompakt, nicht der Ausgang dieses Schritts, schon der Zielstand, falsche Form: nichts wird überschrieben', async () => {
  const { tmp, file } = exDb();
  try {
    const { h } = exSicherung(tmp);
    istCode(await lauf(exSchreiben(file, h)), 0);
    const vorher = alles(file);
    const schreibe = (name, obj) => { const d = path.join(tmp, name); fs.writeFileSync(d, JSON.stringify(obj)); return d; };
    const gut = { scenario_data: exAusgangScen, sequence_data: dz.sequence, sha256: sicherungsHash(exAusgangScen, dz.sequence), updated_at: 'x' };
    const FALL = [
      [schreibe('b1.json', { ...gut, sha256: 'a'.repeat(64) }), /beschädigt/],
      [schreibe('b2.json', { scenario_data: JSON.stringify(SC_PROD, null, 1), sequence_data: dz.sequence, sha256: sicherungsHash(JSON.stringify(SC_PROD, null, 1), dz.sequence) }), /nicht kompaktes/],
      [schreibe('b3.json', { scenario_data: EX_ZIELSC(), sequence_data: EX_ZIELSEQ(), sha256: sicherungsHash(EX_ZIELSC(), EX_ZIELSEQ()) }), /schon der Zielstand|Ausgangsstand dieses Schrittes/],
      [schreibe('b4.json', { scenario_data: exAusgangScen, sha256: 'x' }), /nicht die Form/],
      [schreibe('b5.json', { scenario_data: text(exMit(s => { s.options.doerfler3.default = 'Henlo'; })), sequence_data: dz.sequence, sha256: sicherungsHash(text(exMit(s => { s.options.doerfler3.default = 'Henlo'; })), dz.sequence) }), /nicht der Ausgangsstand/],
    ];
    for (const [datei, re] of FALL) {
      const r = await lauf(['--zurueck', datei, file, '--schritt', 'optionen']);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, re);
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EX main: es gibt kein `--force` und kein Wort dafür – jedes unbekannte Argument ist ein Benutzungsfehler, auch beim Rückweg; geschrieben wird nichts', async () => {
  const { tmp, file } = exDb();
  try {
    const vorher = alles(file);
    const { h, datei } = exSicherung(tmp);
    for (const wort of ['--force', '--erzwingen', '--ignore-vorgaenger', '--ohne-pruefung', '--yes', '-f']) {
      for (const args of [[...exSchreiben(file, h), wort], [...exCheck(file), wort], ['--zurueck', datei, file, '--schritt', 'optionen', wort]]) {
        const r = await lauf(args);
        assert.equal(r.code, 2, `${wort}: ${r.out}`);
        assert.match(r.out, /unbekanntes Argument|usage/i);
      }
    }
    assert.deepEqual(alles(file), vorher);
    const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8');
    assert.ok(!/['"]--force['"]/.test(quelle.replace(/\/\/.*$/gm, '')), 'das Wort steht nirgends als Argument');
  } finally { weg(tmp); }
});

test('EX main: die Transaktion ist `IMMEDIATE` – die Schreibsperre liegt vor dem ersten Hash, nicht erst beim UPDATE; beide Spalten in **einer**', async () => {
  const { tmp, file } = exDb();
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
    const { h } = exSicherung(tmp);
    istCode(await lauf(exSchreiben(file, h), { Db: Spion }), 0);
    assert.deepEqual(aufrufe, ['immediate'], 'genau **eine** Transaktion für beide Spalten');
  } finally { weg(tmp); }
});

test('EX main: ein Prüfer, der etwas findet, hält den Lauf an – ein Stand, den `validateOptions` beanstandet (ein `onlyChoice` in einer Aktion), wird nicht geschrieben', async () => {
  const akt = copy(ZIEL_AKT);
  stepsOf(akt, 'dorfphase-beginnen')[3].onlyChoice = { partie: 'kurz' };
  const { tmp, file } = exDb({ act: text(akt) });
  try {
    const vorher = alles(file);
    for (const args of [exCheck(file), ['--write', file, '--schritt', 'optionen', '--sicherung-sha', sicherungsHash(exAusgangScen, dz.sequence).slice(0, 16)]]) {
      const r = await lauf(args);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /onlyChoice is not allowed in an action/);
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EX main: gehört der Aufbau zu einem anderen Spiel, wird nichts angefasst', async () => {
  const { tmp, file } = exDb();
  try {
    const db = new Database(file);
    db.pragma('foreign_keys = OFF');
    db.prepare("insert into games (id, name) values ('anderes', 'X')").run();
    db.prepare('update setups set game_id = ? where id = ?').run('anderes', SETUP_ID);
    db.close();
    const vorher = alles(file);
    const r = await lauf(exCheck(file));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /gehört zu Spiel anderes/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EX main: stimmt der gerechnete Zielstand nicht mit der Konstante überein, hält der Lauf an – für **jede** der beiden Spalten, `--check` wie `--write` (die Konstante wird für den Test kurz verstellt)', async () => {
  for (const spalte of ['scenario', 'sequence']) {
    const { tmp, file } = exDb();
    const alt = SCHRITTE.optionen.ziel[spalte];
    SCHRITTE.optionen.ziel[spalte] = { laenge: alt.laenge, sha: '000000000000' };
    try {
      const vorher = alles(file);
      const { h } = exSicherung(tmp);
      for (const args of [exCheck(file), exSchreiben(file, h)]) {
        const r = await lauf(args);
        assert.equal(r.code, 1, `${spalte}: ${r.out}`);
        assert.match(r.out, new RegExp(`${spalte}_data: der gerechnete Zielstand hat`));
      }
      assert.deepEqual(alles(file), vorher);
    } finally { SCHRITTE.optionen.ziel[spalte] = alt; weg(tmp); }
  }
});

test('EX main: die noch nicht gebauten Schritte melden „noch nicht gebaut“ – ohne die Datenbank zu öffnen (kein Treiber, keine Datei), Rückgabe 1 (seit EX gibt es keinen mehr; der Mechanismus wird mit einem kurz auf `null` gestellten Schritt gezeigt)', async () => {
  let geoeffnet = 0;
  class Spion { constructor() { geoeffnet++; throw new Error('die Datenbank darf nicht geöffnet werden'); } }
  const gebaut = SCHRITTE.optionen;
  SCHRITTE.optionen = null;
  try {
    for (const modus of [['--check', 'gibt-es-nicht.db'], ['--write', 'gibt-es-nicht.db', '--sicherung-sha', 'abcdefabcdef'], ['--zurueck', 'sicherung.json', 'gibt-es-nicht.db']]) {
      const r = await lauf([...modus, '--schritt', 'optionen'], { Db: Spion });
      assert.equal(r.code, 1, `${modus[0]}: ${r.out}`);
      assert.match(r.out, /Schritt „optionen“ ist noch nicht gebaut/);
    }
  } finally { SCHRITTE.optionen = gebaut; }
  assert.equal(geoeffnet, 0);
  assert.equal(Object.values(SCHRITTE).filter(x => x === null).length, 0, 'alle sechs sind gebaut');
});

test('EX main: die Reihenfolge zu den fünf Schritten davor ist **nicht** gleichgültig – der Schalter verlangt sie; aber **nach** dem Schalter sind sie weiter „schon geschrieben“ (jeder erkennt sein Ergebnis im Zielstand von `optionen`)', async () => {
  const z = exZ();
  assert.equal(EW.patchGelaende(z.scenario).art, 'schon-da');
  assert.equal(EW.patchWerte(z.scenario).art, 'schon-da');
  assert.equal(EW.patchZonen(EX_VORG.zone).art, 'schon-da');
  assert.equal(EW.patchAssets(EX_VORG.assets).art, 'schon-da');
  assert.equal(EW.patchAktionen(EX_VORG.action).art, 'schon-da');
  // … und `gelaende`/`werte` laufen auch **gegen** den Zielstand dieses Schritts als „schon-da“ durch `main`.
  const { tmp, file } = exDb();
  try {
    const { h } = exSicherung(tmp);
    istCode(await lauf(exSchreiben(file, h)), 0);
    for (const schritt of ['gelaende', 'werte']) {
      const r = await lauf(['--check', file, '--schritt', schritt]);
      assert.equal(r.code, 0, `${schritt}: ${r.out}`);
      assert.match(r.out, /schon geschrieben/);
    }
  } finally { weg(tmp); }
});
