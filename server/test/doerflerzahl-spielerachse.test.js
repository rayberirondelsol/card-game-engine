// FG Teil 1 / Spec M31.16, M31.17 — die Aktionen der Spielerachse: `scripts/doerflerzahl-daten.mjs`, Schritt `aktionen-spieler`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Zu schreiben (später, Teil 2) ist in `action_data` an **zwei** Aktionen, `dorfphase-beginnen` (43 → 53 Schritte) und `dorfereignis` (6 → 11), auf dem Stand von Welle 1:
// die Gates `onlyCounter` an den Münz-, Auslage- und offenen Ereignis-Schritten, **fünf neue Münztöpfe**, **fünf neue Heldentaten-Austeilungen** in die Hände, **fünf neue verdeckte
// Ereignis-Austeilungen** und die dritte Kategorie im `clear_table` der Dorfphase. `kampf-beginnen` und `laden-nachfuellen` bleiben, Welle 1 wird nicht umgeschrieben.
//
// **Wo diese Datei von der Aufgabe abweicht (vom Auftraggeber entschieden):** (1) sie ist **neu**, die Aufgabe nannte `doerflerzahl-daten.test.js` — an der arbeitet eine andere Sitzung;
// (2) **Punkt 6 der Aufgabe („Gleiche Auskunft, zwei Zeitpunkte“) fehlt hier** — er verlangt die Kette Aufbau → Aktion, und den Aufbau der Spielerachse schreibt erst `FH`; er wandert dorthin;
// (3) **Punkt 4 steht, aber mit von Hand gebauten Tischen**: ein Tisch der Lage mehrfach/normal ist am Tisch daran erkennbar, dass `Münzen Dörfler n` liegen und `Münzen (gemeinsam)` fehlt —
// genau das lesen die Gates (`onlyCounter`). `FH` ist dafür nicht nötig.
//
// Eingang ist der Stand, auf dem `FG` aufsetzt: `action_data` aus `fixtures/doerflerzahl-kurzpartie.json` **mit `patchAktionen` aus `EW` angewendet** (Welle 1, 7 564 Zeichen); Zonen mit `EU`
// und `FF` (die Hände fassen vier). Der Zielstand steht hier **ein zweites Mal ausgeschrieben** (`topf`, `heldenHand`, `ereignisOffen`, `ereignisVerdeckt`): aus der Aufgabe, nicht aus dem Baustein gelesen.
// Wer die Stücke aus dem Baustein holte, prüfte ihn gegen sich selbst. Die Länge und der Hash des Ziels stehen **einmal** im Skript (`SCHRITTE`).
// Diese Datei ändert keine andere Testdatei und liest `doerflerzahl-daten.test.js` nicht.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import * as dz from '../../scripts/doerflerzahl-daten.mjs';
import { bauen, seededRng } from '../../scripts/auslagen-daten.mjs';
import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { zoneContains } from '../../shared/zoneGeometry.js';
import { validateOptions } from '../../shared/setupOptions.js';

const { default: Database } = await import('better-sqlite3');
const { validateStep, assetNames, assetPools } = await import('../../client/src/utils/sequenceSteps.js');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const auszug = lies('auslagen-kurzpartie.json');
const dzFixture = lies('doerflerzahl-kurzpartie.json');
const { assets, cards, zones, grids, state } = auszug;
const { SETUP_ID, GAME_ID } = dz;

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const frost = (x) => { Object.values(x).forEach(v => { if (v && typeof v === 'object') frost(v); }); return Object.freeze(x); };

// ── Der Eingang: Welle 1 ─────────────────────────────────────────────────────

const EU = dz.patchZonen(zones).zone;                              // 82 Zonen, die Hände mit capacity 3
const FF = dz.patchHaende(EU).zone;                                // die Hände fassen vier
const ASSETS = dz.patchAssets(assets).assets;                      // EV
const AKT_ALT = JSON.parse(dzFixture.actions);                     // der Stand nach M30
const W1 = frost(dz.patchAktionen(AKT_ALT).action);                // EW: der Ausgang dieses Schrittes
const SC_PROD = dz.patchWerte(dz.patchGelaende(JSON.parse(dzFixture.scenario)).scenario).scenario;   // ES, ET
const WELLE1 = dz.patchSchalter(SC_PROD, JSON.parse(dzFixture.sequence), { zone: EU, assets: ASSETS, action: W1 });   // EX

/** Der Zielstand, aus dem Eingang gerechnet — ein Aufruf je Test, damit ein fehlender Baustein nur den Test rot macht. */
const ziel = () => copy(dz.patchAktionenSpieler(W1).action);
const schritte = (acts, id) => acts.find(a => a.id === id).steps;
const AKTIONEN = ['kampf-beginnen', 'dorfereignis', 'laden-nachfuellen', 'dorfphase-beginnen'];

// ── Das Orakel: die Stücke, ausgeschrieben (Schlüsselfolge wie in der Aufgabe, das Gate **am Ende**) ──

const GEM = 'Münzen (gemeinsam)';
const BETRAG = 6;                                                   // die Zahl der Regel („Nimm dir 6 Münzen“, M31.16) — hier ausgeschrieben, nicht aus dem Baustein
const platz = (n) => (n >= 3 ? { onlySeated: n } : {});
const topf = (n) => ({ type: 'set_counter', name: `Münzen Dörfler ${n}`, value: `+${BETRAG}`, onlyCounter: `Münzen Dörfler ${n}` });
const heldenHand = (n) => ({ type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 3, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: true, fill: true, ...platz(n), onlyCounter: `!${GEM}` });
const ereignisVerdeckt = (n) => ({ type: 'deal_to_zone', stackLabel: 'Dorf-Ereignisse', count: 1, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: true, ...platz(n), onlyCounter: `!${GEM}` });
const mitGem = (s) => ({ ...s, onlyCounter: GEM });
const KATEGORIEN_NEU = ['Dorf-Ereignisse', 'Dorf-Ereignisse (Neue Nachbarn)', 'Dorf-Ereignisse (geheim)'];

/** Der Zielstand der beiden Aktionen aus den Schritten von Welle 1 — alles, was nicht genannt ist, ist **dieselbe Zeile** wie dort. */
const orakelDorfphase = (w) => [
  ...w.slice(0, 2), { ...w[2], category: KATEGORIEN_NEU }, ...w.slice(3, 18),
  mitGem(w[18]), ...[1, 2, 3, 4, 5].map(topf),
  ...w.slice(19, 21), mitGem(w[21]), ...[1, 2, 3, 4, 5].map(heldenHand),
  ...w.slice(22),
];
const orakelEreignis = (w) => [w[0], ...w.slice(1, 6).map(mitGem), ...[5, 4, 3, 2, 1].map(ereignisVerdeckt)];
const orakel = (acts) => acts.map(a => (a.id === 'dorfphase-beginnen' ? { ...a, steps: orakelDorfphase(a.steps) } : a.id === 'dorfereignis' ? { ...a, steps: orakelEreignis(a.steps) } : a));

// ── Der Tisch ─────────────────────────────────────────────────────────────────

/** Wie `ohneIds` aus `auslagen-daten.mjs`, aber auch ohne `inStack`/`card_ids`: zwei getrennte Aufbauten würfeln dort verschiedene Ids. */
function ohneIds(v) {
  if (Array.isArray(v)) return v.map(ohneIds);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !['id', 'tableId', 'stackId', 'table_ids', 'card_ids', 'inStack'].includes(k)).map(([k, x]) => [k, ohneIds(x)]));
  return v;
}
const WAHL = (n) => ({ ...(n >= 3 ? { doerfler3: 'Granny' } : {}), ...(n >= 4 ? { doerfler4: 'Blopsy' } : {}), ...(n >= 5 ? { doerfler5: 'Yancy' } : {}) });
/** Der Tisch von Welle 1 (Lage solo): gemeinsamer Topf, Auslage, `n` Dörfler (Kurzpartie: 15 Münzen je Dörfler). */
const tisch = (zonen, n) => {
  assert.equal(WELLE1.art, 'zu-schreiben', (WELLE1.probleme ?? []).join('\n'));
  const r = bauen({ state, sequence: WELLE1.sequence, zones: zonen, grids, assets: ASSETS, cards, scenarioData: WELLE1.scenario }, WAHL(n), 1);
  assert.deepEqual(r.log.filter(e => e.status === 'failed' || e.status === 'skipped'), [], `der Aufbau für ${n} Dörfler`);
  return r;
};
const lauf = (zonen, steps, st) => executeSequenceWithLog(copy(st), steps, zonen, { assets: ASSETS, cards, grids, scenarioData: WELLE1.scenario, rng: seededRng(7) });
const aufgeloest = (zonen, st) => resolveZones(zonen, anchorBoxes(st.boards, st.tokens));
const zoneNamed = (zonen, st, label) => aufgeloest(zonen, st).find(z => z.label === label);
const inZone = (zonen, st, label) => st.cards.filter(c => zoneContains(zoneNamed(zonen, st, label), c.x, c.y));
const inHand = (zonen, st, n) => inZone(zonen, st, `Hand Dörfler ${n}`);
const kat = (c) => c.category;
const zaehler = (st, name) => st.counters.find(c => c.name === name);
const schlecht = (r) => r.log.filter(e => e.status !== 'ok');
const zeilen = (r) => r.log.map(e => [e.type, e.target, e.status, e.reason]);   // ohne `index`: die neuen Schritte verschieben ihn
/**
 * **Die eine Zeile, die sich ändert — benannt, nicht ausgespart:** das `clear_table` der Dorfphase meldet seine Kategorien als `target` (`Dorf-Ereignisse + Dorf-Ereignisse (Neue Nachbarn)`);
 * mit der dritten Kategorie steht dort `… + Dorf-Ereignisse (geheim)`. Status und Grund sind gleich. `vergleicheZeilen` prüft, dass es **genau diese** Zeile ist (eine je Dorfphase) und sonst keine.
 */
const DRITTE = ' + Dorf-Ereignisse (geheim)';
function vergleicheZeilen(neu, alt, wo) {
  const a = zeilen(alt), n = zeilen(neu);
  assert.equal(n.length, a.length, `${wo}: gleich viele Protokollzeilen`);
  const anders = [];
  n.forEach((z, i) => { if (text(z) !== text(a[i])) anders.push([z, a[i]]); });
  for (const [z, w] of anders) {
    assert.equal(z[0], 'clear_table', `${wo}: nur das clear_table der Dorfphase meldet anders`);
    assert.equal(z[1], w[1] + DRITTE, `${wo}: das target nennt die dritte Kategorie`);
    assert.deepEqual([z[0], z[2], z[3]], [w[0], w[2], w[3]], `${wo}: Art, Status und Grund sind gleich`);
  }
  return anders.length;
}
const stapel = (st, label) => st.stacks.find(s => s.label === label)?.cards.length;
const HELDEN = (n, count = 3) => ({ type: 'deal_to_zone', stackLabel: 'Heldentaten', count, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: true });
const EREIGNIS_OFFEN = (n) => ({ type: 'deal_to_zone', stackLabel: 'Dorf-Ereignisse', count: 1, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: false });

/**
 * **Von Hand gebauter Tisch der Lage mehrfach oder normal** (aus dem Tisch von Welle 1 umgebaut, ohne `FH`): der gemeinsame Topf fehlt, `Münzen Dörfler 1 … n` liegen (15), die sechs Heldentaten
 * der Auslage sind weg, in jeder der `n` Hände liegen drei verdeckte; bei `normal` liegen die 25 geheimen Ereignisse **obenauf** im Stapel `Dorf-Ereignisse` (80 + 25).
 */
function spielerTisch(n, lage, zonen = FF) {
  const st = copy(tisch(zonen, n).state);
  st.counters = st.counters.filter(c => c.name !== GEM);
  for (let i = 1; i <= n; i++) st.counters.push({ id: randomUUID(), name: `Münzen Dörfler ${i}`, value: 15, x: 278 + 580 * (i - 1), y: 1870, locked: false });
  st.cards = st.cards.filter(c => kat(c) !== 'Heldentaten');
  let z = st;
  for (let i = 1; i <= n; i++) z = lauf(zonen, [HELDEN(i)], z).state;
  if (lage === 'normal') {
    const s = z.stacks.find(x => x.label === 'Dorf-Ereignisse');
    const top = Math.max(...s.cards.map(c => c.zIndex)) + 1;
    cards.filter(c => c.category === 'Dorf-Ereignisse (geheim)').forEach((c, i) => s.cards.push({ id: c.id, name: c.name, category: c.category, image_path: c.image_path, width: c.width, height: c.height, card_back_id: c.card_back_id ?? null, tableId: randomUUID(), cardId: c.id, zIndex: top + i, faceDown: true, rotation: 0 }));
  }
  return z;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1  Der Zielstand — genau diese Stücke, alles andere byteweise gleich; die Beträge aus einer Konstante
// ─────────────────────────────────────────────────────────────────────────────

test('FG 1: der Eingang – nach EW 7 564 Zeichen, vier Aktionen; `dorfphase-beginnen` 43 und `dorfereignis` 6 Schritte', () => {
  assert.equal(text(W1).length, 7564);
  assert.equal(sha(text(W1)), '9f41211076a4');
  assert.deepEqual(W1.map(a => a.id), AKTIONEN.slice().sort((a, b) => W1.findIndex(x => x.id === a) - W1.findIndex(x => x.id === b)));
  assert.equal(schritte(W1, 'dorfphase-beginnen').length, 43);
  assert.equal(schritte(W1, 'dorfereignis').length, 6);
});

test('FG 1: Zielstand – genau die Stücke der Aufgabe (Gates, 15 neue Schritte, die dritte Kategorie), **alles andere** byteweise gleich; 43 → 53 und 6 → 11 Schritte', () => {
  const r = dz.patchAktionenSpieler(W1);
  assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  assert.deepEqual(Object.keys(r).sort(), ['action', 'art'], 'geschrieben wird `action_data`, sonst nichts');
  assert.equal(text(r.action), text(orakel(W1)), 'genau das Orakel');
  assert.deepEqual(r.action.map(a => a.id), W1.map(a => a.id), 'dieselbe Reihenfolge der Aktionen');
  assert.equal(schritte(r.action, 'dorfphase-beginnen').length, 53);
  assert.equal(schritte(r.action, 'dorfereignis').length, 11);
  for (const id of ['kampf-beginnen', 'laden-nachfuellen']) assert.equal(text(r.action.find(a => a.id === id)), text(W1.find(a => a.id === id)), `${id}: Zeichen für Zeichen gleich`);
  for (const a of r.action) assert.deepEqual(Object.keys(a), Object.keys(W1.find(x => x.id === a.id)), `${a.id}: dieselben Schlüssel der Aktion`);
  // Jeder Schritt von Welle 1 steht noch da — bis auf das genannte Gate und die dritte Kategorie, an derselben Stelle der Folge.
  const wo = (neu, alt) => alt.map(s => neu.findIndex(x => text(x) === text(s) || text({ ...x, onlyCounter: undefined }) === text(s) || text({ ...x, category: s.category }) === text(s)));
  for (const id of ['dorfphase-beginnen', 'dorfereignis']) {
    const idx = wo(schritte(r.action, id), schritte(W1, id));
    assert.ok(idx.every(i => i >= 0), `${id}: jeder Schritt von Welle 1 ist wiederzufinden`);
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b), `${id}: in derselben Reihenfolge`);
  }
});

test('FG 1: die Konstanten – Ausgang ist der Zielstand von `aktionen` (7 564 Zeichen, sha 9f41211076a4), Ziel ist gerechnet; nur die Spalte `action`', () => {
  const s = dz.SCHRITTE['aktionen-spieler'];
  assert.ok(s, 'SCHRITTE[\'aktionen-spieler\'] ist eingetragen');
  assert.deepEqual(Object.keys(s.ausgang), ['action']);
  assert.deepEqual(Object.keys(s.ziel), ['action']);
  assert.deepEqual(s.ausgang.action, { laenge: 7564, sha: '9f41211076a4' }, 'ausgeschrieben: dieselbe Zahl wie das Ziel von `aktionen`');
  assert.deepEqual(s.ausgang, dz.SCHRITTE.aktionen.ziel);
  assert.deepEqual(s.ausgang.action, { laenge: text(W1).length, sha: sha(text(W1)) });
  assert.deepEqual(s.ziel.action, { laenge: text(ziel()).length, sha: sha(text(ziel())) });
  assert.ok(s.ziel.action.laenge > s.ausgang.action.laenge);
  console.log(`FG Bauprotokoll: action_data ${s.ausgang.action.laenge} / ${s.ausgang.action.sha} -> ${s.ziel.action.laenge} / ${s.ziel.action.sha}`);
});

test('FG 1: **die Beträge** – alle sechs `+6`/`+6*$doerflerzahl` (fünf Töpfe, ein gemeinsamer) tragen **dieselbe** Zahl, und es ist die Konstante des Bausteins (M31.16: sechs Zahlen, die auseinanderlaufen)', () => {
  assert.equal(dz.MUENZEN_NACH_KAMPF, BETRAG, 'die Konstante des Bausteins ist die Zahl der Regel');
  const z = ziel();
  const sechs = [...schritte(z, 'dorfphase-beginnen').filter(s => s.type === 'set_counter' && /^Münzen /.test(s.name))];
  assert.equal(sechs.length, 6, 'ein gemeinsamer Topf und fünf je Dörfler');
  assert.deepEqual(sechs.map(s => s.name), [GEM, ...[1, 2, 3, 4, 5].map(n => `Münzen Dörfler ${n}`)]);
  const zahlen = sechs.map(s => Number(/^\+(\d+)(\*\$doerflerzahl)?$/.exec(s.value)?.[1]));
  assert.deepEqual(zahlen, [6, 6, 6, 6, 6, 6]);
  assert.equal(sechs[0].value, '+6*$doerflerzahl', 'der gemeinsame Topf: das Produkt aus Welle 1, unverändert');
  for (const s of sechs.slice(1)) assert.equal(s.value, '+6', s.name);
  // Die Gleichheit hält der Prüfer fest: weicht einer der sechs ab, ist der Zielstand beanstandet.
  const mitWert = (name, v) => { const c = ziel(); schritte(c, 'dorfphase-beginnen').find(s => s.name === name).value = v; return c; };
  assert.deepEqual(dz.pruefeAktionenSpieler(z), []);
  assert.ok(dz.pruefeAktionenSpieler(mitWert('Münzen Dörfler 4', '+7')).length > 0, 'ein Topf mit +7');
  assert.ok(dz.pruefeAktionenSpieler(mitWert(GEM, '+7*$doerflerzahl')).length > 0, 'der gemeinsame Topf mit 7');
  assert.ok(dz.pruefeAktionenSpieler(mitWert('Münzen Dörfler 1', '+6*$doerflerzahl')).length > 0, 'ein Topf mit dem Produkt');
});

test('FG 1: die Zahl steht im **Quelltext des Bausteins nirgends als Literal** – kein `\'+6\'`, kein `"+6…"`, kein `` `+6… `` außerhalb der Kommentare; sie entsteht aus `MUENZEN_NACH_KAMPF`', () => {
  const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/['"`]\+6/.test(quelle), 'ein Literal `+6` im Code');
  assert.match(quelle, /MUENZEN_NACH_KAMPF/);
});

test('FG 1: Rückwärtsbeweis – ohne Gates, ohne die 15 neuen Schritte, mit zwei Kategorien ergibt den gelesenen Text, Zeichen für Zeichen (`--zurueck` führt auf den Ausgang)', () => {
  assert.deepEqual(dz.beweiseAktionenSpieler({ action: W1 }, { action: ziel() }), []);
  // Von Hand, unabhängig vom Baustein:
  const z = ziel();
  for (const a of z) {
    if (a.id === 'dorfphase-beginnen') a.steps = a.steps.filter(s => !(s.type === 'set_counter' && /^Münzen Dörfler/.test(s.name)) && !(s.type === 'deal_to_zone' && s.onlyCounter === `!${GEM}`));
    if (a.id === 'dorfereignis') a.steps = a.steps.filter(s => s.onlyCounter !== `!${GEM}`);
    a.steps = a.steps.map(({ onlyCounter: _g, ...rest }) => (rest.category?.includes('Dorf-Ereignisse (geheim)') ? { ...rest, category: rest.category.filter(c => c !== 'Dorf-Ereignisse (geheim)') } : rest));
  }
  assert.equal(text(z), text(W1));
});

test('FG 1: der Beweis fängt, was nicht stimmt – ein falscher Betrag, ein falsches Gate, ein fehlender und ein zusätzlicher Schritt, eine falsche Kategorie, eine verdeckte Karte offen', () => {
  const fehler = (nach) => dz.beweiseAktionenSpieler({ action: W1 }, { action: nach });
  const mit = (fn) => { const z = ziel(); fn(schritte(z, 'dorfphase-beginnen'), schritte(z, 'dorfereignis')); return z; };
  assert.ok(fehler(mit(d => { d.find(s => s.name === 'Münzen Dörfler 2').value = '+7'; })).length > 0, 'Betrag');
  assert.ok(fehler(mit(d => { d.find(s => s.name === 'Münzen Dörfler 2').onlyCounter = 'Münzen Dörfler 3'; })).length > 0, 'falsches Gate');
  assert.ok(fehler(mit(d => { d.splice(d.findIndex(s => s.name === 'Münzen Dörfler 5'), 1); })).length > 0, 'ein Topf fehlt');
  assert.ok(fehler(mit(d => { d.push({ ...d[0] }); })).length > 0, 'ein Schritt mehr');
  assert.ok(fehler(mit(d => { d[2].category = KATEGORIEN_NEU.slice(1); })).length > 0, 'Kategorie');
  assert.ok(fehler(mit((d, e) => { e.at(-1).faceDown = false; })).length > 0, 'eine verdeckte Karte offen');
  assert.ok(fehler(mit((d, e) => { e[1].onlyCounter = `!${GEM}`; })).length > 0, 'eine offene Austeilung mit dem falschen Gate');
  assert.ok(fehler(mit(d => { d[18].onlyCounter = 'Münzen (gemeinsam) '; })).length > 0, 'ein Leerzeichen im Namen');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2  Vorbedingung je Stück, Abbruch mit Pfad
// ─────────────────────────────────────────────────────────────────────────────

const abweichend = (acts) => {
  const r = dz.patchAktionenSpieler(acts);
  assert.equal(r.art, 'abweichend', `erwartet abweichend, ist ${r.art}`);
  assert.equal(r.action, undefined, 'bei einer Abweichung gibt es keinen Zielstand');
  assert.ok(Array.isArray(r.probleme) && r.probleme.length > 0);
  return r.probleme.join('\n');
};
const mitSchritt = (acts, id, i, fn) => { const c = copy(acts); fn(schritte(c, id)[i], schritte(c, id), c); return c; };

test('FG 2: der Ausgang (Welle 1) → zu schreiben; schon im Ziel → „schon-da“, die Eingabe kommt als Kopie zurück und wird nicht verändert', () => {
  assert.equal(dz.patchAktionenSpieler(W1).art, 'zu-schreiben');
  const z = ziel(), vorher = text(z);
  const r = dz.patchAktionenSpieler(z);
  assert.equal(r.art, 'schon-da');
  assert.equal(text(r.action), vorher);
  assert.notEqual(r.action, z, 'eine Kopie');
  assert.equal(text(z), vorher, 'Eingabe unverändert');
});

test('FG 2: **Welle 1 muss geschrieben sein** – der Stand nach M30 (EW noch nicht) ist kein Ausgang; die Meldung nennt EW und den Pfad', () => {
  const m = abweichend(AKT_ALT);
  assert.match(m, /EW|aktionen|Welle 1/);
  assert.match(m, /action_data/);
});

test('FG 2: Abbruch mit Pfad – jedes Stück einzeln verändert (Kategorie, gemeinsame Münzen, Auslage, jede der fünf offenen Austeilungen): die Meldung nennt `action_data`, die Aktion, den Index und das Stück', () => {
  const faelle = [
    ['dorfphase-beginnen', 2, (s) => { s.category = ['Dorf-Ereignisse']; }, /steps\[2\]/],
    ['dorfphase-beginnen', 18, (s) => { s.value = '+18'; }, /steps\[18\]/],
    ['dorfphase-beginnen', 18, (s) => { s.name = 'Münzen'; }, /steps\[18\]/],
    ['dorfphase-beginnen', 21, (s) => { s.count = 5; }, /steps\[21\]/],
    ['dorfphase-beginnen', 21, (s) => { s.fill = false; }, /steps\[21\]/],
    ...[1, 2, 3, 4, 5].map(i => ['dorfereignis', i, (s) => { s.count = 2; }, new RegExp(`steps\\[${i}\\]`)]),
  ];
  for (const [id, i, fn, pfad] of faelle) {
    const m = abweichend(mitSchritt(W1, id, i, fn));
    assert.match(m, /action_data/);
    assert.ok(m.includes(`"${id}"`), `${id}[${i}]: nennt die Aktion: ${m}`);
    assert.match(m, pfad, `${id}[${i}]: ${m}`);
  }
});

test('FG 2: Abbruch – die Zahl der Schritte stimmt nicht (einer fehlt, einer mehr), eine Aktion fehlt oder ist doppelt, `steps` ist keine Liste, die Eingabe keine Liste', () => {
  assert.match(abweichend(mitSchritt(W1, 'dorfphase-beginnen', 30, (s, st) => { st.splice(30, 1); })), /Schritte|steps/);
  assert.match(abweichend(mitSchritt(W1, 'dorfereignis', 0, (s, st) => { st.push({ type: 'require_zone', zoneLabel: 'x', expect: 'empty' }); })), /dorfereignis/);
  assert.match(abweichend(W1.filter(a => a.id !== 'dorfereignis')), /dorfereignis/);
  assert.match(abweichend([...copy(W1), copy(W1[1])]), /dorfereignis|Aktionen mit der Id/);
  assert.match(abweichend(copy(W1).map(a => (a.id === 'dorfereignis' ? { ...a, steps: 'x' } : a))), /dorfereignis/);
  assert.equal(dz.patchAktionenSpieler('keine Liste').art, 'abweichend');
  assert.equal(dz.patchAktionenSpieler(null).art, 'abweichend');
});

test('FG 2: **teils** geschrieben ist ein Abbruch – ein Stück neu, die anderen alt (Kategorie allein, Münzen allein, Auslage allein; eine der fünf Austeilungen allein; eine Aktion fertig, die andere nicht): nichts wird überschrieben', () => {
  const fertig = ziel();
  const nur = (id, ...teile) => { const c = copy(W1); const i = c.findIndex(a => a.id === id); c[i] = { ...c[i], steps: teile.length ? teile[0](schritte(c, id)) : schritte(fertig, id) }; return c; };
  // eine Aktion ganz im Ziel, die andere im Ausgang
  assert.match(abweichend(nur('dorfphase-beginnen')), /halber Stand|teils/);
  assert.match(abweichend(nur('dorfereignis')), /halber Stand|teils/);
  // ein Stück der Dorfphase allein
  assert.match(abweichend(mitSchritt(W1, 'dorfphase-beginnen', 2, (s) => { s.category = KATEGORIEN_NEU; })), /halber Stand|teils/);
  assert.match(abweichend(mitSchritt(W1, 'dorfphase-beginnen', 18, (s, st) => { st.splice(18, 1, mitGem(s), ...[1, 2, 3, 4, 5].map(topf)); })), /halber Stand|teils/);
  assert.match(abweichend(mitSchritt(W1, 'dorfphase-beginnen', 21, (s, st) => { st.splice(21, 1, mitGem(s), ...[1, 2, 3, 4, 5].map(heldenHand)); })), /halber Stand|teils/);
  // eine der fünf offenen Austeilungen allein gegatet
  assert.match(abweichend(mitSchritt(W1, 'dorfereignis', 1, (s) => { s.onlyCounter = GEM; })), /halber Stand|teils|steps\[/);
  // alle fünf gegatet, aber keine verdeckte
  assert.match(abweichend(mitSchritt(W1, 'dorfereignis', 1, (s, st) => { for (let i = 1; i <= 5; i++) st[i] = mitGem(st[i]); })), /dorfereignis/);
});

test('FG 2: **disjunkt** – der Baustein schreibt `action_data` und sonst nichts (kein `scenario_data`, kein `sequence_data` — das ist `aufbau-spieler`, `FH`); `kampf-beginnen` und `laden-nachfuellen` sind unberührt', () => {
  assert.deepEqual(Object.keys(dz.patchAktionenSpieler(W1)).sort(), ['action', 'art']);
  assert.deepEqual(Object.keys(dz.SCHRITTE['aktionen-spieler'].ziel), ['action']);
  const quelle = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8');
  const def = /'aktionen-spieler': \{\s*spalten: \[([^\]]*)\]/.exec(quelle);
  assert.ok(def, 'der Eintrag in DEFS');
  assert.equal(def[1].trim(), "'action'");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3  Folgenlos in der Lage solo — der Tisch von Welle 1
// ─────────────────────────────────────────────────────────────────────────────

test('FG 3: **Lage solo, gleiche Zonen** – Kampf, Dorfphase, Ereignis (zwei Runden, 2 bis 5 Dörfler): mit den neuen und den alten Daten **derselbe Zustand** (`deepEqual`, keine Ausnahme) und **dieselben Protokollzeilen**', () => {
  const Z = ziel();
  for (const n of [2, 3, 4, 5]) {
    let a = tisch(FF, n).state, b = a;
    for (const runde of [1, 2]) {
      for (const id of ['kampf-beginnen', 'dorfphase-beginnen', 'dorfereignis', 'laden-nachfuellen']) {
        const ra = lauf(FF, schritte(W1, id), a), rb = lauf(FF, schritte(Z, id), b);
        const wo = `${n} Dörfler, Runde ${runde}, ${id}`;
        assert.equal(vergleicheZeilen(rb, ra, wo), id === 'dorfphase-beginnen' ? 1 : 0, `${wo}: Zeilen, die anders lauten`);
        assert.deepEqual(ohneIds(rb.state), ohneIds(ra.state), `${wo}: derselbe Zustand`);
        assert.deepEqual(schlecht(rb), schlecht(ra), `${wo}: dieselben Beanstandungen (keine neuen)`);
        a = ra.state; b = rb.state;
      }
    }
  }
});

test('FG 3: Münzen **+18 / +12 …** und die Auslage – mit den neuen Daten steigt der gemeinsame Topf je Dorfphase um 6 × Dörfler (2: +12, 3: +18, 4: +24, 5: +30), die Auslage wird auf **6** aufgefüllt, die Hände bleiben leer, keine Zeile `skipped`', () => {
  const Z = ziel();
  for (const n of [2, 3, 4, 5]) {
    const r0 = tisch(FF, n).state;
    const k = lauf(FF, schritte(Z, 'kampf-beginnen'), r0);
    const vorher = zaehler(k.state, GEM).value;
    assert.equal(vorher, 15 * n, `${n} Dörfler: 15 je Dörfler am Anfang`);
    const p = lauf(FF, schritte(Z, 'dorfphase-beginnen'), k.state);
    assert.deepEqual(schlecht(p), [], `${n} Dörfler: keine Beanstandung`);
    assert.equal(zaehler(p.state, GEM).value - vorher, 6 * n, `${n} Dörfler: +${6 * n}`);
    assert.equal(p.state.counters.length, 1, 'kein Topf je Dörfler entsteht');
    assert.equal(inZone(FF, p.state, 'Heldentaten-Auslage').length, 6, 'die Auslage hat sechs');
    for (let i = 1; i <= 5; i++) assert.equal(inHand(FF, p.state, i).length, 0, `Hand ${i} bleibt leer`);
    const e = lauf(FF, schritte(Z, 'dorfereignis'), p.state);
    assert.deepEqual(schlecht(e), []);
    for (let i = 1; i <= n; i++) { const h = inHand(FF, e.state, i); assert.equal(h.length, 1, `Hand ${i}`); assert.equal(h[0].faceDown, false, `Hand ${i}: offen`); assert.match(kat(h[0]), /^Dorf-Ereignisse( [(]Neue Nachbarn[)])?$/, `Hand ${i}: kein geheimes Ereignis`); }
  }
});

test('FG 3: die **Welle-1-Daten auf dem Tisch von Welle 1** gegen die **neuen Daten mit den Zonen von `FF`** (der echte Übergang) – derselbe Zustand **bis auf die Lage der Ereigniskarten in den Hand-Zonen**: nur dort, nur `x`, genau −15 (die benannte Ausnahme aus `FF`)', () => {
  const Z = ziel();
  for (const n of [2, 3, 4, 5]) {
    let a = tisch(EU, n).state, b = tisch(FF, n).state;
    for (const id of ['kampf-beginnen', 'dorfphase-beginnen', 'dorfereignis']) {
      const ra = lauf(EU, schritte(W1, id), a), rb = lauf(FF, schritte(Z, id), b);
      const wo = `${n} Dörfler, ${id}`;
      assert.equal(vergleicheZeilen(rb, ra, wo), id === 'dorfphase-beginnen' ? 1 : 0, `${wo}: Zeilen, die anders lauten`);
      for (const f of ['tokens', 'counters', 'boards', 'stacks']) assert.deepEqual(ohneIds(rb.state[f]), ohneIds(ra.state[f]), `${wo}: ${f}`);
      const A = ohneIds(ra.state.cards), B = ohneIds(rb.state.cards);
      assert.equal(B.length, A.length);
      const anders = A.map((c, i) => [c, B[i]]).filter(([x, y]) => text(x) !== text(y));
      const erwartet = id === 'dorfereignis' ? n : 0;
      assert.equal(anders.length, erwartet, `${wo}: ${erwartet} Karten liegen anders`);
      for (const [x, y] of anders) { assert.equal(text({ ...y, x: 0 }), text({ ...x, x: 0 }), `${wo}: nur x`); assert.equal(y.x - x.x, -15, `${wo}: 15 Punkte weiter links`); }
      a = ra.state; b = rb.state;
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4  Lage mehrfach und normal — Tische von Hand gebaut
// ─────────────────────────────────────────────────────────────────────────────

test('FG 4: der von Hand gebaute Tisch ist, was die Gates lesen – `Münzen Dörfler 1 … n` liegen, `Münzen (gemeinsam)` fehlt, jede Hand trägt drei verdeckte Heldentaten, die Auslage ist leer', () => {
  for (const lage of ['mehrfach', 'normal']) {
    for (const n of [2, 3, 4, 5]) {
      const st = spielerTisch(n, lage);
      assert.deepEqual(st.counters.map(c => c.name).sort(), [1, 2, 3, 4, 5].slice(0, n).map(i => `Münzen Dörfler ${i}`).sort(), `${lage}, ${n}`);
      assert.equal(zaehler(st, GEM), undefined);
      for (let i = 1; i <= n; i++) { const h = inHand(FF, st, i); assert.equal(h.length, 3); assert.ok(h.every(c => c.faceDown && kat(c) === 'Heldentaten')); }
      assert.equal(inZone(FF, st, 'Heldentaten-Auslage').length, 0);
      assert.equal(stapel(st, 'Dorf-Ereignisse'), lage === 'normal' ? 105 : 80);
    }
  }
});

test('FG 4: **`dorfphase-beginnen`** – je Topf **+6**, **keine** Karte in die Auslage, jede Hand auf **drei** aufgefüllt (nicht vier), **keine** Zeile `skipped` oder `failed` (2 bis 5 Dörfler, mehrfach und normal)', () => {
  const Z = ziel();
  for (const lage of ['mehrfach', 'normal']) {
    for (const n of [2, 3, 4, 5]) {
      const st = spielerTisch(n, lage);
      const k = lauf(FF, schritte(Z, 'kampf-beginnen'), st);
      assert.deepEqual(schlecht(k), []);
      // Zwei Hände fehlen Heldentaten, damit das Auffüllen etwas zu tun hat: Hand 1 nur eine, Hand 2 gar keine.
      const lueckig = copy(k.state);
      const raus = new Set([...inHand(FF, lueckig, 1).slice(1), ...inHand(FF, lueckig, 2)].map(c => c.tableId));
      lueckig.cards = lueckig.cards.filter(c => !raus.has(c.tableId));
      const p = lauf(FF, schritte(Z, 'dorfphase-beginnen'), lueckig);
      const wo = `${lage}, ${n} Dörfler`;
      assert.deepEqual(schlecht(p), [], `${wo}: keine Zeile skipped/failed`);
      assert.equal(p.state.counters.length, n, `${wo}: n Töpfe, kein gemeinsamer`);
      for (let i = 1; i <= n; i++) assert.equal(zaehler(p.state, `Münzen Dörfler ${i}`).value, 15 + BETRAG, `${wo}: Topf ${i} +6`);
      assert.equal(zaehler(p.state, GEM), undefined, `${wo}: kein gemeinsamer Topf entsteht`);
      assert.equal(inZone(FF, p.state, 'Heldentaten-Auslage').length, 0, `${wo}: keine Karte in der Auslage`);
      for (let i = 1; i <= 5; i++) {
        const h = inHand(FF, p.state, i);
        assert.equal(h.length, i <= n ? 3 : 0, `${wo}: Hand ${i} hat ${i <= n ? 'drei' : 'keine'} (nicht vier)`);
        assert.ok(h.every(c => c.faceDown && kat(c) === 'Heldentaten'), `${wo}: Hand ${i}: verdeckte Heldentaten`);
      }
      // 2 Karten fehlten (1 + 3 = 3 nein: Hand 1 hatte 3, eine blieb, Hand 2 hatte 3, keine blieb → 2 + 3 = 5 nachgelegt) – der Stapel hat sie hergegeben
      assert.equal(stapel(p.state, 'Heldentaten') - stapel(lueckig, 'Heldentaten'), -(2 + 3), `${wo}: fünf Karten vom Stapel`);
    }
  }
});

test('FG 4: **die heikle Stelle: auf drei, nicht auf vier** – liegt ein Ereignis in der Hand, räumt das `clear_table` (Schritt 2) es **vorher** ab, `fill` zählt es nicht; mit vertauschter Reihenfolge käme eine Heldentat zu wenig', () => {
  const Z = ziel();
  for (const lage of ['mehrfach', 'normal']) {
    const n = 3;
    const k = lauf(FF, schritte(Z, 'kampf-beginnen'), spielerTisch(n, lage)).state;
    // Hand 1: eine Heldentat + ein offenes Ereignis (belegt 2); Hand 2: drei Heldentaten + ein verdecktes Ereignis (belegt 4 = voll); Hand 3: drei Heldentaten + ein Ereignis der Neuen Nachbarn.
    let st = copy(k);
    const weg = new Set(inHand(FF, st, 1).slice(1).map(c => c.tableId));
    st.cards = st.cards.filter(c => !weg.has(c.tableId));
    st = lauf(FF, [EREIGNIS_OFFEN(1), { ...EREIGNIS_OFFEN(2), faceDown: true }, EREIGNIS_OFFEN(3)], st).state;
    const belegt = (s) => [1, 2, 3].map(i => inHand(FF, s, i).length);
    const helden = (s) => [1, 2, 3].map(i => inHand(FF, s, i).filter(c => kat(c) === 'Heldentaten').length);
    assert.deepEqual(belegt(st), [2, 4, 4], `${lage}: Ausgangslage — Hand 1 belegt 2, Hände 2 und 3 voll (4)`);
    assert.deepEqual(helden(st), [1, 3, 3]);
    const vorStapel = stapel(st, 'Dorf-Ereignisse');

    const richtig = lauf(FF, schritte(Z, 'dorfphase-beginnen'), st);
    assert.deepEqual(schlecht(richtig), [], `${lage}: keine skipped-Zeile`);
    assert.deepEqual(belegt(richtig.state), [3, 3, 3], `${lage}: jede Hand genau drei`);
    assert.deepEqual(helden(richtig.state), [3, 3, 3], `${lage}: und es sind drei Heldentaten`);
    assert.equal(richtig.state.cards.filter(c => /Dorf-Ereignisse/.test(kat(c))).length, 0, `${lage}: kein Ereignis liegt mehr am Tisch`);
    assert.equal(stapel(richtig.state, 'Dorf-Ereignisse') - vorStapel, 3, `${lage}: die drei Ereignisse liegen wieder im Stapel`);

    // Gegenprobe: das `clear_table` HINTER den Auffüllungen — das Auffüllen sieht das Ereignis in Hand 1, legt nur eine Heldentat nach.
    const dp = schritte(Z, 'dorfphase-beginnen');
    const falsch = [...dp.slice(0, 2), ...dp.slice(3), dp[2]];
    const r = lauf(FF, falsch, st);
    assert.deepEqual(helden(r.state), [2, 3, 3], `${lage}: in falscher Reihenfolge hat Hand 1 nur zwei Heldentaten (das Auffüllen zählte das Ereignis mit)`);
    assert.notDeepEqual(helden(r.state), helden(richtig.state));
    console.log(`FG 4 Messung (${lage}): Hand 1 belegt 2 → richtig [${belegt(richtig.state)}], Heldentaten [${helden(richtig.state)}]; vertauscht Heldentaten [${helden(r.state)}]`);
  }
});

test('FG 4: **`dorfereignis`** – n **verdeckte** Karten in n Hände (je eine), keine Zeile `skipped`, auch wenn jede Hand schon drei Heldentaten trägt (dafür ist die vierte Stelle da); die offenen Schritte laufen nicht', () => {
  const Z = ziel();
  for (const lage of ['mehrfach', 'normal']) {
    for (const n of [2, 3, 4, 5]) {
      const st = spielerTisch(n, lage);                 // ohne Kampf: `dorfereignis` hält mit `require_zone` (Bösewicht-Tableau leer), solange ein Bösewicht liegt
      const vorher = stapel(st, 'Dorf-Ereignisse');
      const r = lauf(FF, schritte(Z, 'dorfereignis'), st);
      const wo = `${lage}, ${n} Dörfler`;
      assert.deepEqual(r.log.map(e => e.status), Array(n + 1).fill('ok'), `${wo}: die Wache und n Austeilungen, alle ok`);
      assert.equal(stapel(r.state, 'Dorf-Ereignisse'), vorher - n, `${wo}: n Karten aus dem Stapel`);
      for (let i = 1; i <= n; i++) {
        const h = inHand(FF, r.state, i);
        assert.equal(h.length, 4, `${wo}: Hand ${i}: drei Heldentaten und ein Ereignis`);
        const e = h.filter(c => /Dorf-Ereignisse/.test(kat(c)));
        assert.equal(e.length, 1, `${wo}: Hand ${i}: genau ein Ereignis`);
        assert.equal(e[0].faceDown, true, `${wo}: Hand ${i}: verdeckt`);
        if (lage === 'normal') assert.equal(kat(e[0]), 'Dorf-Ereignisse (geheim)', `${wo}: die obenauf liegenden geheimen`);
        else assert.match(kat(e[0]), /^Dorf-Ereignisse( [(]Neue Nachbarn[)])?$/, `${wo}: aus dem offenen Stapel`);
      }
      for (let i = n + 1; i <= 5; i++) assert.equal(inHand(FF, r.state, i).length, 0, `${wo}: Hand ${i} gibt es nicht`);
      assert.equal(r.state.cards.filter(c => /Dorf-Ereignisse/.test(kat(c)) && !c.faceDown).length, 0, `${wo}: keine offene Ereigniskarte`);
    }
  }
});

test('FG 4: Gegenprobe – **mit capacity 3** (Zonen nach EU) bliebe das Ereignis im Stapel, auch mit den neuen Aktionen: die vierte Stelle aus `FF` ist die Voraussetzung (die Reihenfolge der Schritte `FF` → `FG`)', () => {
  const Z = ziel();
  const st = spielerTisch(3, 'normal', EU);          // die Heldentaten liegen auf den drei Plätzen von EU, die Hände sind voll
  assert.equal(inHand(EU, st, 1).length, 3);
  const r = lauf(EU, schritte(Z, 'dorfereignis'), st);
  assert.equal(schlecht(r).length, 3);
  assert.ok(schlecht(r).every(e => e.status === 'skipped' && /^zone "Hand Dörfler \d" is full \(3\)$/.test(e.reason)));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5  Die geheimen Ereignisse räumen ab
// ─────────────────────────────────────────────────────────────────────────────

test('FG 5: **Lage normal** – geheime Ereignisse in den Händen: `dorfphase-beginnen` legt sie in den Stapel `Dorf-Ereignisse` zurück (Stapel wieder 105, keine am Tisch)', () => {
  const Z = ziel();
  for (const n of [2, 3, 5]) {
    const d = lauf(FF, schritte(Z, 'dorfereignis'), spielerTisch(n, 'normal'));
    assert.equal(d.state.cards.filter(c => kat(c) === 'Dorf-Ereignisse (geheim)').length, n, `${n}: n geheime liegen in den Händen`);
    assert.equal(stapel(d.state, 'Dorf-Ereignisse'), 105 - n);
    const k = lauf(FF, schritte(Z, 'kampf-beginnen'), d.state);          // der Zyklus: Ereignis, Kampf, Dorfphase
    assert.equal(k.state.cards.filter(c => kat(c) === 'Dorf-Ereignisse (geheim)').length, n, `${n}: der Kampf räumt nichts ab`);
    const p = lauf(FF, schritte(Z, 'dorfphase-beginnen'), k.state);
    assert.deepEqual(schlecht(p), []);
    assert.equal(p.state.cards.filter(c => /Dorf-Ereignisse/.test(kat(c))).length, 0, `${n}: nichts liegt mehr am Tisch`);
    assert.equal(stapel(p.state, 'Dorf-Ereignisse'), 105, `${n}: der Stapel ist wieder voll`);
    assert.equal(p.state.stacks.find(s => s.label === 'Dorf-Ereignisse').cards.filter(c => kat(c) === 'Dorf-Ereignisse (geheim)').length, 25, `${n}: alle 25 geheimen im Stapel`);
  }
});

test('FG 5: Gegenprobe – **ohne** die dritte Kategorie (die Aktion von Welle 1) bleiben die geheimen Ereignisse in der Hand liegen; die dritte Kategorie ist also nötig', () => {
  const Z = ziel();
  const d = lauf(FF, schritte(Z, 'kampf-beginnen'), lauf(FF, schritte(Z, 'dorfereignis'), spielerTisch(3, 'normal')).state).state;
  const alt = schritte(Z, 'dorfphase-beginnen').map((s, i) => (i === 2 ? { ...s, category: KATEGORIEN_NEU.slice(0, 2) } : s));
  const p = lauf(FF, alt, d);
  assert.equal(p.state.cards.filter(c => kat(c) === 'Dorf-Ereignisse (geheim)').length, 3, 'drei geheime bleiben am Tisch');
  assert.equal(stapel(p.state, 'Dorf-Ereignisse'), 105 - 3);
});

test('FG 5: **Lage solo** – die dritte Kategorie ist ein **No-op**: `Dorf-Ereignisse (geheim)` liegt nie am Tisch, der Schritt ändert nichts und meldet `ok`; die offenen Ereignisse räumen wie vorher ab', () => {
  const Z = ziel();
  const schritt = schritte(Z, 'dorfphase-beginnen')[2];
  assert.deepEqual(schritt.category, KATEGORIEN_NEU);
  for (const n of [2, 3, 5]) {
    const st = tisch(FF, n).state;
    assert.equal(st.cards.filter(c => kat(c) === 'Dorf-Ereignisse (geheim)').length, 0);
    assert.equal(stapel(st, 'Dorf-Ereignisse'), 80);
    const nur = lauf(FF, [schritt], st);
    assert.deepEqual(nur.log.map(e => e.status), ['ok']);
    assert.deepEqual(ohneIds(nur.state), ohneIds(st), `${n}: der Schritt ändert nichts`);
    // Mit Ereignissen in den Händen: dieselbe Wirkung wie der Schritt von Welle 1 (zwei Kategorien).
    const d = lauf(FF, schritte(Z, 'dorfereignis'), st).state;
    const neu = lauf(FF, [schritt], d), alt = lauf(FF, [schritte(W1, 'dorfphase-beginnen')[2]], d);
    assert.deepEqual(ohneIds(neu.state), ohneIds(alt.state), `${n}: wie mit zwei Kategorien`);
    assert.equal(stapel(neu.state, 'Dorf-Ereignisse'), 80);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7  Die Prüfer
// ─────────────────────────────────────────────────────────────────────────────

test('FG 7: `validateOptions` auf dem neuen `action_data` → `[]`; `validateStep` auf **jedem** Schritt → keine Beanstandung (Editor, in einer Aktion); der Prüfer des Skripts sagt dasselbe', () => {
  const Z = ziel();
  const opts = WELLE1.scenario.options;
  assert.deepEqual(validateOptions(opts, WELLE1.sequence, Z), []);
  const ctx = {
    stackLabels: ['Dorf-Ereignisse', 'Heldentaten', 'Nachschub (Tante Emma)', 'Verhaltensdeck'], zoneLabels: FF.map(z => z.label), pools: assetPools(ASSETS),
    assetNames: assetNames(ASSETS), grids, cardCategories: [...new Set(cards.map(c => c.category).filter(Boolean))], cards, options: opts, inAction: true,
  };
  let gezaehlt = 0;
  for (const a of Z) a.steps.forEach((s, i) => { assert.deepEqual(validateStep(s, ctx), [], `${a.id} Schritt ${i}: ${text(s)}`); gezaehlt++; });
  assert.equal(gezaehlt, 19 + 11 + 1 + 53);
  assert.deepEqual(dz.pruefeAktionenSpieler(Z), []);
  // … und er findet, was falsch ist.
  const mit = (fn) => { const c = ziel(); fn(schritte(c, 'dorfphase-beginnen'), schritte(c, 'dorfereignis')); return c; };
  assert.ok(dz.pruefeAktionenSpieler(mit((d) => { d.find(s => s.type === 'deal_to_zone' && s.onlyCounter === `!${GEM}`).onlyChoice = { doerfler4: '!keiner' }; })).length > 0, 'onlyChoice in einer Aktion');
  assert.ok(dz.pruefeAktionenSpieler(mit((d) => { d[18].onlyLage = 'solo'; })).length > 0, 'onlyLage in einer Aktion');
  assert.ok(dz.pruefeAktionenSpieler(mit((d, e) => { e[7].onlySeated = 0; })).length > 0, 'onlySeated 0');
  assert.ok(dz.pruefeAktionenSpieler(mit((d) => { d[18].onlyCounter = ''; })).length > 0, 'onlyCounter leer');
  assert.ok(dz.pruefeAktionenSpieler(mit((d) => { d[18].onlyCounter = 'Münzen (gemeinsam) '; })).length > 0, 'onlyCounter mit Leerzeichen');
  assert.ok(dz.pruefeAktionenSpieler(mit((d) => { d.splice(19, 1); })).length > 0, 'ein Topf fehlt');
  assert.ok(dz.pruefeAktionenSpieler(mit((d, e) => { e.pop(); })).length > 0, 'eine verdeckte Austeilung fehlt');
});

test('FG 7: der Kopf des Skripts und SCHRITTE – `aktionen-spieler` ist gebaut, jetzt acht Schritte; der Eintrag trägt FG', () => {
  assert.deepEqual(Object.keys(dz.SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen', 'haende', 'aktionen-spieler', 'aufbau-spieler', 'eigentum']);
  for (const k of Object.keys(dz.SCHRITTE)) assert.notEqual(dz.SCHRITTE[k], null, k);
  const kopf = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8').split('\n').slice(0, 14).join('\n');
  assert.match(kopf, /aktionen-spieler/, 'der Kopf nennt den Schritt');
  assert.match(kopf, /FG/, 'mit der Aufgabe');
});

// ─────────────────────────────────────────────────────────────────────────────
// main — gegen eine Wegwerf-Datenbank (nie gegen eine echte)
// ─────────────────────────────────────────────────────────────────────────────

function frischeDatenbank(aktionenText) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-doerflerzahl-spielerachse-'));
  const file = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    'const { setupDatabase, closeDatabase } = await import("./src/database.js"); await setupDatabase(); closeDatabase();'],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, CGE_DB_PATH: file }, stdio: 'pipe' });
  const db = new Database(file);
  db.prepare("insert into games (id, name) values (?, 'TFT')").run(GAME_ID);
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Aufbau', '{}', text(FF), dzFixture.sequence, '[]', aktionenText, dzFixture.scenario);
  db.prepare("insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, 'Auto Save', '{\"a\":0}', ?)").run(randomUUID(), GAME_ID, SETUP_ID);
  db.close();
  return { tmp, file };
}

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

/** Alles außer `action_data` in der Zeile des Aufbaus, und jede Zeile von `save_states`. */
function andere(file) {
  const db = new Database(file, { readonly: true });
  try {
    const row = db.prepare('select * from setups where id = ?').get(SETUP_ID);
    const { action_data: _a, ...rest } = row;
    return { setups: text(rest), saves: text(db.prepare('select * from save_states order by rowid').all()) };
  } finally { db.close(); }
}
const aktionsDaten = (file) => {
  const db = new Database(file, { readonly: true });
  try { return db.prepare('select action_data from setups where id = ?').get(SETUP_ID).action_data; } finally { db.close(); }
};
const sicherungsSha = (t) => dz.sicherungsHash(t).slice(0, 12);

test('FG main: --check – schreibgeschützt, „zu schreiben“, Beweis, Prüfer, Zielstand, Hash für die Sicherung; geschrieben wird nichts', async () => {
  const { tmp, file } = frischeDatenbank(text(W1));
  try {
    const vorher = aktionsDaten(file);
    const r = await fahre(['--check', file, '--schritt', 'aktionen-spieler']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /zu schreiben/);
    assert.ok(r.out.includes(dz.sicherungsHash(text(W1))), 'der Hash für die Sicherung steht in der Ausgabe');
    assert.match(r.out, /Rückwärtsbeweis action_data: ja/);
    assert.match(r.out, new RegExp(`${dz.SCHRITTE['aktionen-spieler'].ziel.action.laenge} Zeichen`));
    assert.equal(aktionsDaten(file), vorher);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FG main: --write mit Sicherung – action_data auf dem Zielstand, nichts sonst geändert; der zweite Lauf schreibt nichts („schon geschrieben“)', async () => {
  const { tmp, file } = frischeDatenbank(text(W1));
  try {
    const andereVorher = andere(file);
    const r = await fahre(['--write', file, '--schritt', 'aktionen-spieler', '--sicherung-sha', sicherungsSha(text(W1))]);
    assert.equal(r.code, 0, r.out);
    assert.equal(aktionsDaten(file), text(ziel()));
    assert.equal(aktionsDaten(file), text(orakel(W1)));
    assert.deepEqual(andere(file), andereVorher);
    const zweit = await fahre(['--write', file, '--schritt', 'aktionen-spieler']);
    assert.equal(zweit.code, 0, zweit.out);
    assert.match(zweit.out, /schon geschrieben|nichts zu schreiben/);
    assert.equal(aktionsDaten(file), text(ziel()));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FG main: ohne oder mit falscher Sicherung wird nichts geschrieben; --force ist ein Benutzungsfehler', async () => {
  const { tmp, file } = frischeDatenbank(text(W1));
  try {
    assert.equal((await fahre(['--write', file, '--schritt', 'aktionen-spieler'])).code, 1);
    assert.equal((await fahre(['--write', file, '--schritt', 'aktionen-spieler', '--sicherung-sha', 'abcdefabcdef'])).code, 1);
    assert.equal((await fahre(['--write', file, '--schritt', 'aktionen-spieler', '--force'])).code, 2);
    assert.equal(aktionsDaten(file), text(W1));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FG main: Abbruch mit Pfad auf der Datenbank – ein abweichendes Stück, ein Stand **teils**, und der Stand vor Welle 1: Exit 1, die Spalte bleibt, wie sie war', async () => {
  const faelle = [
    mitSchritt(W1, 'dorfphase-beginnen', 18, (s) => { s.value = '+18'; }),
    mitSchritt(W1, 'dorfphase-beginnen', 2, (s) => { s.category = KATEGORIEN_NEU; }),
    AKT_ALT,
  ];
  for (const acts of faelle) {
    const { tmp, file } = frischeDatenbank(text(acts));
    try {
      const r = await fahre(['--write', file, '--schritt', 'aktionen-spieler', '--sicherung-sha', sicherungsSha(text(acts))]);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /action_data/);
      assert.equal(aktionsDaten(file), text(acts));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
});

test('FG main: --zurueck – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen; ein Stand, der nicht der Zielstand ist, wird nicht überschrieben', async () => {
  const { tmp, file } = frischeDatenbank(text(W1));
  try {
    assert.equal((await fahre(['--write', file, '--schritt', 'aktionen-spieler', '--sicherung-sha', sicherungsSha(text(W1))])).code, 0);
    const sicherung = path.join(tmp, 'sicherung.json');
    fs.writeFileSync(sicherung, JSON.stringify({ action_data: text(W1), sha256: dz.sicherungsHash(text(W1)), updated_at: 'test' }));
    const r = await fahre(['--zurueck', sicherung, file, '--schritt', 'aktionen-spieler']);
    assert.equal(r.code, 0, r.out);
    assert.equal(aktionsDaten(file), text(W1));
    const nochmal = await fahre(['--zurueck', sicherung, file, '--schritt', 'aktionen-spieler']);
    assert.equal(nochmal.code, 0, nochmal.out);
    assert.match(nochmal.out, /nichts zu tun/);
    // Und ein Stand, der weder Ziel noch Ausgang ist (jemand hat danach weitergearbeitet), wird nicht überschrieben.
    const fremd = text(mitSchritt(ziel(), 'dorfphase-beginnen', 19, (s) => { s.value = '+9'; }));
    const db = new Database(file); db.prepare('update setups set action_data = ? where id = ?').run(fremd, SETUP_ID); db.close();
    assert.equal((await fahre(['--zurueck', sicherung, file, '--schritt', 'aktionen-spieler'])).code, 1);
    assert.equal(aktionsDaten(file), fremd);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
