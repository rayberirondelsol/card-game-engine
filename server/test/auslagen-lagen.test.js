// FI Teil 1 / Spec M31.15, M31.21 — der Rauchtest kennt die Lagen: `scripts/auslagen-rauchtest.mjs`, Abschnitt „5. Die Lagen“.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Was der neue Abschnitt tut (er steht am **Ende**, hinter 0 bis 4, damit die bestehenden Fälle unverändert laufen und der `diff` gegen die alte Ausgabe nur
// **hinzugefügte** Zeilen kennt) — und nur, wenn `lageOf(scenarioData, {})` nicht `null` ist, die Daten also `villagers.lage` tragen; auf dem Stand von Welle 1 schweigt er:
//   A. `lageOf` gegen die geschriebenen Daten, für **jede** Kombination `spieler` × `doerfler3–5`, mit den Wahlen **aus den Daten** (nicht aus festen Schlüsseln);
//   B. je Lage × Zahl 2 … 5 (`S ≤ D`): Aufbau → `dorfereignis` → `kampf-beginnen` → `dorfphase-beginnen`, 0 Beanstandungen, kein `skipped`;
//   C. **„Gleiche Auskunft, zwei Zeitpunkte“** (M31.15): die Lage, die `lageOf` sagt, die Form des Geldes am Tisch und die Schritte, die die `onlyCounter`-Gates der Aktionen
//      laufen lassen, stimmen für jede Kombination überein.
//
// **Wo diese Datei von der Aufgabe abweicht:** (1) sie ist **neu** (die Aufgabe nannte `auslagen-daten.test.js` am Ende; die `EY`-Tests dort bleiben unverändert);
// (2) Nr. 4 („ein Raum“) ist **schon abgedeckt** und hier **nicht** dupliziert — `FH 11: der Raum` in `doerflerzahl-aufbau-spieler.test.js` fährt `POST /api/rooms` und
// `…/start` mit `spieler:s2`, `doerfler3`, `doerfler4` (vier Dörfler) mit echten Fixture-Daten durch dieselben Gates; `FC` (`room-lage.test.js`) den 409 beim Start.
//
// Der Zielstand steht hier **noch einmal** aus den Bausteinen gerechnet (wie in `doerflerzahl-aufbau-spieler.test.js`); die Erwartungen sind eine **eigene Abschrift** der Spec
// (Zahlen und Namen als Literal), die der Rauchtest aus den Daten ableitet — stimmen beide, ist es kein Zufall.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import * as dz from '../../scripts/doerflerzahl-daten.mjs';
import { bauen } from '../../scripts/auslagen-daten.mjs';
import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { seededRng } from '../../scripts/auslagen-daten.mjs';

const { default: Database } = await import('better-sqlite3');
const R = await import('../../scripts/auslagen-rauchtest.mjs');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const { assets, cards, zones, grids, state } = lies('auslagen-kurzpartie.json');
const dzFixture = lies('doerflerzahl-kurzpartie.json');
const { SETUP_ID, GAME_ID } = dz;
const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);

// ── Die zwei Stände: Welle 1 (ohne `lage`) und der Zielstand nach FH ──────────

const EU = dz.patchZonen(zones).zone;
const FF = dz.patchHaende(EU).zone;
const ASSETS = dz.patchAssets(assets).assets;
const W1ACT = dz.patchAktionen(JSON.parse(dzFixture.actions)).action;
const FG = dz.patchAktionenSpieler(W1ACT).action;
const SC_PROD = dz.patchWerte(dz.patchGelaende(JSON.parse(dzFixture.scenario)).scenario).scenario;
const W1 = dz.patchSchalter(SC_PROD, JSON.parse(dzFixture.sequence), { zone: EU, assets: ASSETS, action: W1ACT });
const Z = dz.patchSpieler(W1.scenario, W1.sequence, { zone: FF, assets: ASSETS, action: FG });
assert.equal(Z.art, 'zu-schreiben', (Z.probleme ?? []).join('\n'));

/** Die Stände als Teile eines Aufbaus; `mit` verändert eine **Kopie**. */
const STAND = {
  welle1: { scenario: W1.scenario, sequence: W1.sequence, action: W1ACT, zone: EU, cards },
  ziel: { scenario: Z.scenario, sequence: Z.sequence, action: FG, zone: FF, cards },
};
/** Genau das, was `laden(db)` liefert (der Rauchtest braucht `row.state_data` als Text). */
const envVon = (s) => ({ row: { state_data: text(state) }, assets: ASSETS, cards: s.cards, zones: s.zone, grids, actions: s.action, sequence: s.sequence, scenarioData: s.scenario });
const mit = (fn, basis = 'ziel') => { const s = copy(STAND[basis]); fn(s); return envVon(s); };
const aktionVon = (s, id) => s.action.find(a => a.id === id);

// ── Eine Wegwerf-Datenbank (nie die echte) ───────────────────────────────────

function frischeDb({ scenario, sequence, action, zone }, saves = []) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-fi-'));
  const file = path.join(tmp, 'fi.db');
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
  for (const a of ASSETS) {
    db.prepare('insert into table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(a.id, GAME_ID, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category), a.created_at ?? '2026-02-25 10:00:00');
  }
  for (const c of cards) {
    db.prepare('insert into cards (id, game_id, category_id, name, image_path, width, height) values (?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, GAME_ID, catId(c.category), c.name, c.image_path, c.width, c.height);
  }
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Aufbau', text(state), text(zone), text(sequence), text(grids), text(action), text(scenario));
  for (const [name, st] of saves) {
    db.prepare('insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, ?, ?, ?)').run(randomUUID(), GAME_ID, name, text(st), SETUP_ID);
  }
  db.close();
  return { tmp, file };
}
const rauch = (s, saves = []) => {
  const { tmp, file } = frischeDb(s, saves);
  try {
    const d = new Database(file, { readonly: true });
    try { return R.rauchtest(d); } finally { d.close(); }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};
const tischVon = (s, choices, seed = 3) => bauen({ state, sequence: s.sequence, zones: s.zone, grids, assets: ASSETS, cards: s.cards, scenarioData: s.scenario }, choices, seed).state;
const WAHL = (n) => ({ ...(n >= 3 ? { doerfler3: 'Granny' } : {}), ...(n >= 4 ? { doerfler4: 'Blopsy' } : {}), ...(n >= 5 ? { doerfler5: 'Yancy' } : {}) });

// Der Abschnitt 5, einmal gerechnet (jeder Test liest dasselbe Ergebnis).
let faelleCache;
const fuenf = () => (faelleCache ??= R.lagenFaelle(envVon(STAND.ziel)));

/** Die erwarteten (S, D), in der Reihenfolge des Abschnitts (erst die Spielerzahl, dann die Dörfler): `S ≤ D` (S = 1 solo, S = D normal, dazwischen mehrfach) — 4 + 10 = 14. */
const KOMBIS = [];
for (let S = 1; S <= 5; S++) for (let D = Math.max(2, S); D <= 5; D++) KOMBIS.push([S, D, S === 1 ? 'solo' : S === D ? 'normal' : 'mehrfach']);

// ─────────────────────────────────────────────────────────────────────────────
// 1  Gates, die nicht laufen, sind keine Beanstandung
// ─────────────────────────────────────────────────────────────────────────────

test('FI 1: ein Schritt, den `onlyLage` / `onlyCounter` nicht laufen lässt, **hat gar keine Protokollzeile** — der Rauchtest zählt nur Zeilen, also ist daran nichts zu ändern; ein **unverständliches** Gate dagegen ist eine `failed`-Zeile und wird gezählt', () => {
  const s = STAND.ziel;
  // Aufbau in der Lage solo: die fünf Hände und die fünf Töpfe (Schritte 32 … 41) und der zweite Ereignis-Stapel (2) laufen nicht — und fehlen im Protokoll.
  const solo = bauen({ state, sequence: s.sequence, zones: s.zone, grids, assets: ASSETS, cards, scenarioData: s.scenario }, { spieler: 's1', ...WAHL(3) }, 3);
  assert.deepEqual(solo.log.filter(e => e.status !== 'ok'), []);
  const lief = new Set(solo.log.map(e => e.index));
  for (const i of [2, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41]) assert.equal(lief.has(i), false, `Aufbau Schritt ${i} (nicht Lage solo) hat keine Zeile`);
  for (const i of [1, 25, 31]) assert.equal(lief.has(i), true, `Aufbau Schritt ${i} (Lage solo) hat eine Zeile`);
  // `dorfphase-beginnen` am Tisch der Lage mehrfach: der gemeinsame Topf (18) und die Auslage (26) laufen nicht — keine Zeile, kein `skipped`.
  const kampf = executeSequenceWithLog(tischVon(s, { spieler: 's2', ...WAHL(3) }), aktionVon(s, 'kampf-beginnen').steps, s.zone, { assets: ASSETS, cards, grids, scenarioData: s.scenario, rng: seededRng(7) });
  const mehrfach = kampf.state;   // die Dorfphase hält sonst an der Wache „Kampf läuft nicht“
  const a = executeSequenceWithLog(copy(mehrfach), aktionVon(s, 'dorfphase-beginnen').steps, s.zone, { assets: ASSETS, cards, grids, scenarioData: s.scenario, rng: seededRng(7) });
  assert.equal(a.log.some(e => e.index === 18 || e.index === 26), false);
  assert.equal(a.log.some(e => e.index === 19), true, 'der Topf Dörfler 1 läuft');
  // Der Rauchtest zählt `schlecht(log)` = Zeilen ohne `ok`: ein Gate, das nicht läuft, hinterlässt keine, ist also nie eine.
  assert.deepEqual(R.lagenFaelle(envVon(s)).problems, [], 'die Lagen: 0 Beanstandungen, obwohl in jedem Lauf Schritte nicht laufen');
  // Ein Gate, das niemand versteht, ist dagegen laut — das zählt.
  const kaputt = copy(s.action); kaputt.find(x => x.id === 'dorfphase-beginnen').steps[18].onlyCounter = 5;
  const b = executeSequenceWithLog(copy(mehrfach), kaputt.find(x => x.id === 'dorfphase-beginnen').steps, s.zone, { assets: ASSETS, cards, grids, scenarioData: s.scenario, rng: seededRng(7) });
  assert.deepEqual(b.log.filter(e => e.status === 'failed').map(e => e.index), [18]);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2  Wo der Abschnitt steht, und wann er schweigt
// ─────────────────────────────────────────────────────────────────────────────

test('FI 2: auf dem Stand von Welle 1 (ohne `villagers.lage`) wird der Abschnitt **stumm übersprungen** — keine Zeile, keine Beanstandung; auf dem Zielstand steht er hinter 4 und vor der Summe', () => {
  const stumm = R.lagenFaelle(envVon(STAND.welle1));
  assert.deepEqual([stumm.out, stumm.problems], [[], []]);
  const alt = rauch(STAND.welle1);
  assert.equal(alt.out.some(z => /^\n5\./.test(z)), false, 'Welle 1: kein Abschnitt 5');
  assert.deepEqual(alt.problems, []);
  const neu = rauch(STAND.ziel);
  const t = neu.out.join('\n');
  const i4 = t.indexOf('\n4. Dörflerzahl'), i5 = t.indexOf('\n5. Die Lagen'), iS = t.indexOf('\nRauchtest: ');
  assert.ok(i4 > 0 && i5 > i4 && iS > i5, `Reihenfolge 4 < 5 < Summe: ${i4} ${i5} ${iS}`);
  assert.deepEqual(neu.problems, [], neu.problems.join('\n'));
  assert.match(t, /^Rauchtest: 0 Beanstandungen$/m);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3  `lageOf` gegen die geschriebenen Daten — jede Kombination, die Wahlen aus den Daten
// ─────────────────────────────────────────────────────────────────────────────

test('FI 3: der Abschnitt ruft `lageOf` für **jede** Kombination `spieler` × `doerfler3–5` (5 × 8 = 40) und findet `solo` / `mehrfach` / `normal` ohne Problem, bei `S > D` genau **ein** Problem', () => {
  const l = fuenf().lage;
  assert.equal(l.kombinationen, 40);
  // Gerechnet: S = 1 → 8 solo; sonst für jede Menge von Plätzen D = 2 + |Menge|, S ≤ D → mehrfach/normal, sonst zu viele Spieler.
  const nach = { solo: 0, mehrfach: 0, normal: 0, zuViele: 0 };
  for (let S = 1; S <= 5; S++) for (let m = 0; m < 8; m++) {
    const D = 2 + [1, 2, 4].filter(b => m & b).length;
    nach[S > D ? 'zuViele' : S === 1 ? 'solo' : S === D ? 'normal' : 'mehrfach']++;
  }
  assert.deepEqual(l.nach, nach);
  assert.equal(Object.values(nach).reduce((a, b) => a + b, 0), 40);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4  Die Fälle: je Lage × Zahl, Aufbau → Ereignis → Kampf → Dorfphase
// ─────────────────────────────────────────────────────────────────────────────

test('FI 4: 14 Fälle — solo 2 … 5, mehrfach 10, normal 2 … 5; 0 Beanstandungen, kein `skipped`', () => {
  const r = fuenf();
  assert.deepEqual(r.problems, [], r.problems.join('\n'));
  assert.deepEqual(r.faelle.map(f => [f.spieler, f.doerfler, f.kind]), KOMBIS);
  assert.equal(r.faelle.length, 14);
  assert.deepEqual(r.out.filter(z => /^  !!/.test(z)), []);
});

test('FI 4: **solo** (S = 1, D = 2 … 5): die Zahlen von Welle 1 — ein gemeinsamer Topf 15 · D, Auslage 6, keine Hand, Ereignis-Stapel 80; Dorfphase +6 · D, Auslage wieder 6; das Ereignis liegt **offen**', () => {
  for (const f of fuenf().faelle.filter(x => x.kind === 'solo')) {
    const D = f.doerfler, wo = `solo, ${D} Dörfler`;
    assert.deepEqual(f.aufbau.zaehler, [['Münzen (gemeinsam)', 15 * D]], wo);
    assert.equal(f.aufbau.auslage, 6, wo);
    assert.deepEqual(f.aufbau.haende, [0, 0, 0, 0, 0], wo);
    assert.equal(f.aufbau.ereignisStapel, 80, wo);
    assert.equal(f.aufbau.heldenStapel, 75 - 6, wo);
    assert.equal(f.aufbau.geheimImStapel, 0, wo);
    assert.equal(f.ereignis.zeilen, 1 + D, wo);
    assert.deepEqual(f.ereignis.haende, [1, 1, 1, 1, 1].map((x, i) => (i < D ? x : 0)), `${wo}: je Hand ein Ereignis`);
    assert.equal(f.ereignis.verdeckt, false, `${wo}: offen`);
    assert.deepEqual(f.dorf.zaehler, [['Münzen (gemeinsam)', 15 * D + 6 * D]], wo);
    assert.equal(f.dorf.auslage, 6, `${wo}: die Auslage wird auf sechs aufgefüllt`);
    assert.deepEqual(f.dorf.haende, [0, 0, 0, 0, 0], wo);
  }
});

test('FI 4: **mehrfach und normal** (S ≥ 2): je Dörfler ein Topf zu 15, **kein** gemeinsamer, Auslage leer, je Hand drei Heldentaten, Ereignis-Stapel 80 / 105; das Ereignis liegt **verdeckt**; Dorfphase +6 je Topf, die Hände wieder auf drei, die Auslage leer', () => {
  for (const f of fuenf().faelle.filter(x => x.kind !== 'solo')) {
    const D = f.doerfler, wo = `${f.kind}, ${f.spieler}/${D}`;
    const alle = [1, 2, 3, 4, 5].map(i => (i <= D ? 3 : 0));
    assert.deepEqual(f.aufbau.zaehler, Array.from({ length: D }, (_, i) => [`Münzen Dörfler ${i + 1}`, 15]), wo);
    assert.equal(f.aufbau.auslage, 0, wo);
    assert.deepEqual(f.aufbau.haende, alle, wo);
    assert.equal(f.aufbau.ereignisStapel, f.kind === 'normal' ? 105 : 80, wo);
    assert.equal(f.aufbau.heldenStapel, 75 - 3 * D, wo);
    assert.equal(f.aufbau.geheimImStapel, f.kind === 'normal' ? 25 : 0, wo);
    assert.equal(f.ereignis.zeilen, 1 + D, wo);
    assert.deepEqual(f.ereignis.haende, [1, 2, 3, 4, 5].map(i => (i <= D ? 1 : 0)), wo);
    assert.equal(f.ereignis.verdeckt, true, `${wo}: verdeckt`);
    assert.deepEqual(f.dorf.zaehler, Array.from({ length: D }, (_, i) => [`Münzen Dörfler ${i + 1}`, 21]), wo);
    assert.equal(f.dorf.auslage, 0, `${wo}: die Auslage bleibt leer`);
    assert.deepEqual(f.dorf.haende, alle, `${wo}: jede Hand wieder auf drei (ein Heldentat war weg, ein Ereignis lag dabei)`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5  „Gleiche Auskunft, zwei Zeitpunkte“ (M31.15)
// ─────────────────────────────────────────────────────────────────────────────

test('FI 5: **Gleiche Auskunft, zwei Zeitpunkte** — für jede Kombination stimmen überein: die Lage, die `lageOf` sagt; die Form des Geldes, die der Aufbau schreibt; und die Schritte, die die `onlyCounter`-Gates der Aktionen laufen lassen', () => {
  const dorf = aktionVon(STAND.ziel, 'dorfphase-beginnen').steps, ereignis = aktionVon(STAND.ziel, 'dorfereignis').steps;
  // Die Schritte der Aktionen **nach Inhalt** geordnet (eigene Abschrift der Namen, nicht aus dem Gate gelesen):
  const soloDorf = dorf.flatMap((s, i) => ((s.type === 'set_counter' && s.name === 'Münzen (gemeinsam)') || (s.type === 'deal_to_zone' && s.targetZoneLabel === 'Heldentaten-Auslage') ? [i] : []));
  const mehrDorf = (D) => dorf.flatMap((s, i) => {
    const n = Number(/(\d)$/.exec(s.type === 'set_counter' ? s.name : s.targetZoneLabel ?? '')?.[1]);
    return (s.type === 'set_counter' && /^Münzen Dörfler \d$/.test(s.name)) || (s.type === 'deal_to_zone' && /^Hand Dörfler \d$/.test(s.targetZoneLabel)) ? (n <= D ? [i] : []) : [];
  });
  assert.equal(soloDorf.length, 2); assert.equal(mehrDorf(5).length, 10);
  const offen = ereignis.flatMap((s, i) => (s.type === 'deal_to_zone' && s.faceDown === false ? [i] : []));
  const zu = (D) => ereignis.flatMap((s, i) => (s.type === 'deal_to_zone' && s.faceDown === true && (s.onlySeated ?? 1) <= D ? [i] : []));
  const offenBis = (D) => offen.filter(i => (ereignis[i].onlySeated ?? 1) <= D);
  for (const f of fuenf().faelle) {
    const wo = `${f.kind} ${f.spieler}/${f.doerfler}`, D = f.doerfler;
    assert.equal(f.lageSagt, f.kind, `${wo}: lageOf`);
    // Die Form des Geldes am Tisch:
    const topf = f.aufbau.zaehler.map(([n]) => n);
    assert.equal(topf.includes('Münzen (gemeinsam)'), f.kind === 'solo', `${wo}: der gemeinsame Topf liegt genau in solo`);
    assert.equal(topf.some(n => /^Münzen Dörfler/.test(n)), f.kind !== 'solo', `${wo}: Töpfe je Dörfler genau außerhalb von solo`);
    // Was die Aktionen daraus tun:
    assert.deepEqual(f.dorf.gelaufen, f.kind === 'solo' ? soloDorf : mehrDorf(D), `${wo}: Dorfphase, welche Schritte laufen`);
    assert.deepEqual(f.ereignis.gelaufen, f.kind === 'solo' ? offenBis(D) : zu(D), `${wo}: dorfereignis, welche Schritte laufen`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6  Die Ausgabe: eine Zeile je Lage × Zahl
// ─────────────────────────────────────────────────────────────────────────────

test('FI 6: der Abschnitt schreibt **eine** Zeile je Lage × Zahl (14) und eine Zeile für `lageOf` — die, die Teil 2 gegen die Produktion hält', () => {
  const r = fuenf();
  assert.match(r.out[0], /^\n5\. Die Lagen/);
  const zeilen = r.out.filter(z => /^  (solo|mehrfach|normal) \d Spieler?, \d Dörfler: /.test(z));
  assert.equal(zeilen.length, 14, r.out.join('\n'));
  assert.deepEqual(zeilen.map(z => z.slice(2).split(':')[0]), KOMBIS.map(([S, D, k]) => `${k} ${S} Spieler, ${D} Dörfler`));
  assert.equal(r.out.filter(z => /^  lageOf: 40 Kombinationen/.test(z)).length, 1);
  console.log(r.out.join('\n'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 7  Die Zeile der Spielstände: fünf Plätze statt drei
// ─────────────────────────────────────────────────────────────────────────────

test('FI 7: die Zeile der Spielstände — V1/V2/V3 **wie bisher** (mit `?`), `/V4/V5` nur, wenn gebunden; ein Fünfer-Stand zeigt fünf Namen', () => {
  const n = R.doerflerNamen;
  // bestehende Fälle: zeichengleich zur alten Zeile `${V1 ?? '?'}/${V2 ?? '?'}/${V3 ?? '?'}`
  const alt = (s) => `${s.V1 ?? '?'}/${s.V2 ?? '?'}/${s.V3 ?? '?'}`;
  for (const s of [{}, { V1: 'A' }, { V1: 'A', V2: 'B' }, { V1: 'A', V2: 'B', V3: 'C' }, { V2: 'B' }, { V3: 'C' }]) assert.equal(n(s), alt(s), text(s));
  assert.equal(n({ V1: 'A', V2: 'B', V3: 'C', V4: 'D' }), 'A/B/C/D');
  assert.equal(n({ V1: 'A', V2: 'B', V3: 'C', V4: 'D', V5: 'E' }), 'A/B/C/D/E');
  assert.equal(n({ V1: 'A', V2: 'B', V3: 'C', V5: 'E' }), 'A/B/C/?/E', 'eine Lücke bleibt sichtbar');
  // Ende zu Ende: ein Dreier- und ein Fünfer-Spielstand auf dem Zielstand
  const s = STAND.ziel;
  const r = rauch(s, [['Save drei', tischVon(s, WAHL(3))], ['Save fuenf', tischVon(s, WAHL(5))]]);
  assert.deepEqual(r.problems, [], r.problems.join('\n'));
  const drei = r.out.find(z => /^  Save drei/.test(z)), fuenfZ = r.out.find(z => /^  Save fuenf/.test(z));
  assert.match(drei, /; Dörfler Henlo\/Fridgette\/Granny; /);
  assert.match(fuenfZ, /; Dörfler Henlo\/Fridgette\/Granny\/Blopsy\/Yancy; /);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8  Gegenproben — jede Probe wird rot, wenn man ein Gate / eine Wahl / einen Zähler verfälscht
// ─────────────────────────────────────────────────────────────────────────────

const beanstandet = (env) => R.lagenFaelle(env).problems;
const meldung = (probleme) => probleme.join('\n');

test('FI 8 (a): **`onlyCounter` einer Aktion entfernt oder vertauscht** → „Gleiche Auskunft“ beanstandet', () => {
  const dorf = (s) => aktionVon(s, 'dorfphase-beginnen').steps;
  const faelle = {
    'gemeinsamer Topf ohne Gate': (s) => { delete dorf(s)[18].onlyCounter; },
    'Auslage mit vertauschtem Gate': (s) => { dorf(s)[26].onlyCounter = '!Münzen (gemeinsam)'; },
    'Hand 1 ohne Gate': (s) => { delete dorf(s)[27].onlyCounter; },
    // (Topf 1 auf den Namen von Topf 2 wäre ein **gleichwertiger Mutant**: Platz 1 und 2 sitzen immer, beide Töpfe liegen immer gemeinsam — nichts ändert sich, nichts zu fangen.)
    'Topf 3 auf den Namen von Topf 2': (s) => { dorf(s)[21].onlyCounter = 'Münzen Dörfler 2'; },
    'dorfereignis: das offene Gate von Hand 1 entfernt': (s) => { delete aktionVon(s, 'dorfereignis').steps[5].onlyCounter; },
    'dorfereignis: das verdeckte Gate von Hand 1 vertauscht': (s) => { aktionVon(s, 'dorfereignis').steps[10].onlyCounter = 'Münzen (gemeinsam)'; },
  };
  for (const [name, fn] of Object.entries(faelle)) {
    const p = beanstandet(mit(fn));
    assert.ok(p.length > 0, `${name}: nicht beanstandet`);
    console.log(`FI Gegenprobe (a) ${name}: ${p.length} Beanstandungen`);
  }
});

test('FI 8 (b): **`onlyLage` an einem Aufbau-Schritt vertauscht** (die Hand-Austeilung auf `solo`, die Auslage auf `mehrfach`/`normal`, die Töpfe auf `solo`) → dieselbe Probe beanstandet', () => {
  const faelle = {
    'alle fünf Hand-Austeilungen auf solo': (s) => { for (let i = 32; i <= 36; i++) s.sequence[i].onlyLage = 'solo'; },
    'eine Hand-Austeilung auf solo': (s) => { s.sequence[32].onlyLage = 'solo'; },
    'die Auslage nur in mehrfach/normal': (s) => { s.sequence[25].onlyLage = ['mehrfach', 'normal']; },
    'die fünf Töpfe auf solo': (s) => { for (let i = 37; i <= 41; i++) s.sequence[i].onlyLage = 'solo'; },
    'der gemeinsame Topf auch in mehrfach': (s) => { s.sequence[31].onlyLage = ['solo', 'mehrfach']; },
  };
  for (const [name, fn] of Object.entries(faelle)) {
    const p = beanstandet(mit(fn));
    assert.ok(p.length > 0, `${name}: nicht beanstandet`);
    console.log(`FI Gegenprobe (b) ${name}: ${p.length} Beanstandungen`);
  }
});

test('FI 8 (c): **die Wahlen umbenannt** (`s1` … `s5` → `eins` … `fuenf`) in einer Wegwerf-Kopie → `lageOf` kennt die Zahl nicht mehr, der Rauchtest beanstandet — im Abschnitt **und** in der Summe', () => {
  const umbenennen = (s) => {
    const o = s.scenario.options.spieler;
    const namen = ['eins', 'zwei', 'drei', 'vier', 'fuenf'];
    o.choices = Object.fromEntries(Object.entries(o.choices).map(([k, v], i) => [namen[i], v]));
    o.default = 'eins';
  };
  const p = beanstandet(mit(umbenennen));
  assert.ok(p.length > 0);
  assert.match(meldung(p), /lageOf/);
  assert.match(meldung(p), /must end in the number of players/);
  console.log(`FI Gegenprobe (c) Wahlen umbenannt: ${p.length} Beanstandungen`);
  // Ganz durch den Rauchtest, gegen eine Wegwerf-Datenbank
  const s = copy(STAND.ziel); umbenennen(s);
  const r = rauch(s);
  assert.ok(r.problems.some(x => /lageOf/.test(x)), r.problems.slice(0, 3).join('\n'));
  assert.match(r.out.join('\n'), /^Rauchtest: [1-9]\d* Beanstandungen$/m);
  // Die Nummern in der falschen Reihenfolge (`s2` ≙ 1 …) bleiben nicht unbemerkt: die Zahl am Ende ist die Zahl der Spieler — hier stimmt sie nicht mit der Stelle der Wahl überein.
  const verdreht = beanstandet(mit((x) => {
    const o = x.scenario.options.spieler;
    o.choices = Object.fromEntries(Object.entries(o.choices).map(([k, v], i) => [`s${((i + 1) % 5) + 1}`, v]));
    o.default = 's2';
  }));
  assert.ok(verdreht.length > 0, 'verdrehte Zahlen');
});

test('FI 8 (d): **der Stapel-Zähler (80 / 105) um eins verfälscht** → beanstandet — eine Karte weniger in der Bibliothek, eine Kategorie weniger im Stapel', () => {
  const faelle = {
    'eine geheime Karte weniger in der Bibliothek (104)': (s) => { const i = s.cards.findIndex(c => c.category === 'Dorf-Ereignisse (geheim)'); s.cards.splice(i, 1); },
    'eine Ereigniskarte mehr in der Bibliothek (81 / 106)': (s) => { s.cards.push({ ...s.cards.find(c => c.category === 'Dorf-Ereignisse'), id: randomUUID() }); },
    'die geheime Kategorie fehlt in der Liste des Normalmodus (80 statt 105)': (s) => { s.sequence[2].category = s.sequence[2].category.filter(c => c !== 'Dorf-Ereignisse (geheim)'); },
    'die Neuen Nachbarn fehlen in der Liste von solo/mehrfach (75 statt 80)': (s) => { s.sequence[1].category = s.sequence[1].category.filter(c => c !== 'Dorf-Ereignisse (Neue Nachbarn)'); },
    'die geheime Kategorie steckt schon in solo/mehrfach (105 statt 80)': (s) => { s.sequence[1].category = [...s.sequence[1].category, 'Dorf-Ereignisse (geheim)']; },
  };
  for (const [name, fn] of Object.entries(faelle)) {
    const p = beanstandet(mit(fn));
    assert.ok(p.length > 0, `${name}: nicht beanstandet`);
    assert.match(meldung(p), /Ereignis-Stapel|Stapel/, name);
    console.log(`FI Gegenprobe (d) ${name}: ${p.length} Beanstandungen`);
  }
});

test('FI 8: die Proben sind **nicht zu scharf** — der unveränderte Zielstand beanstandet nichts, auch wenn man ihn nur kopiert', () => {
  assert.deepEqual(beanstandet(mit(() => {})), []);
});
