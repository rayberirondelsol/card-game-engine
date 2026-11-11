// FS Teil 1 / Spec M32.9 — die Bindung: `platz: 1 … 5` an den fünf Hand-Zonen. `scripts/doerflerzahl-daten.mjs`, Schritt `eigentum` (der zehnte).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Zu schreiben (später, **Teil 2**, nach dem Deploy und mit ausdrücklicher Freigabe) ist in `zone_data` an `Hand Dörfler n` (`zhand<n>`) das Feld `platz: n`, sonst nichts. **Der Schalter der Eigentumsrechte**:
// ohne `platz` bindet der Raumstart nichts (`bindZones` gibt die Zonen unverändert zurück, M32.7 Nr. 4), mit `platz` und `Spieler ≥ 2` setzt der Raum Farbe und `exclusive` auf **seine Kopie** (nie in `zone_data`).
//
// Eingang ist der Stand, auf dem `FS` aufsetzt: die Zonen aus `fixtures/auslagen-kurzpartie.json` **mit `patchZonen` (EU) und `patchHaende` (FF) angewendet** (82 Zonen, die Hände mit `capacity 4`, `zone_data`
// 39 886 / `e6bf6aeaf3d6` laut `docs/m31-welle2-belege.md`). Teil 1 öffnet **keine** Produktion: jede Datenbank hier ist eine Wegwerf-Datenbank im Temp-Verzeichnis.
// Diese Datei ändert keine andere Zonen-Testdatei; die Listen der Schritte in den älteren Tests sind um `eigentum` verlängert.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as dz from '../../scripts/doerflerzahl-daten.mjs';
import { bauen, seededRng } from '../../scripts/auslagen-daten.mjs';
import { resolveZones, anchorBoxes, setAnchor } from '../../shared/anchoring.js';
import { bindZones, ownersOfPlayers } from '../../shared/ownership.js';

const { default: Database } = await import('better-sqlite3');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const auszug = lies('auslagen-kurzpartie.json');
const dzFixture = lies('doerflerzahl-kurzpartie.json');
const { assets, cards, zones, grids, state } = auszug;
const { SETUP_ID, GAME_ID } = dz;

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const quelle = (rel) => fs.readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8');

// ── Der Eingang (nach EU und FF) und der Zielstand ──────────────────────────────

const frost = (x) => { Object.values(x).forEach(v => { if (v && typeof v === 'object') frost(v); }); return Object.freeze(x); };
const FF = frost(dz.patchHaende(dz.patchZonen(zones).zone).zone);
const HAND_LABELS = [1, 2, 3, 4, 5].map(n => `Hand Dörfler ${n}`);
const istHand = (z) => HAND_LABELS.includes(z?.label);
const platzVon = (z) => HAND_LABELS.indexOf(z.label) + 1;

/** Der Zielstand, aus dem Eingang gerechnet — eine Kopie je Aufruf (Tests dürfen sie verändern). */
const ziel = () => copy(dz.patchEigentum(FF).zone);

/** Unabhängiges Orakel (aus der Aufgabe, nicht aus dem Baustein): `platz: n` **als letzter Schlüssel** der fünf Hände, sonst nichts. */
const orakel = (zonen) => zonen.map(z => (istHand(z) ? { ...z, platz: platzVon(z) } : z));
const ohneHaende = (zonen) => zonen.filter(z => !istHand(z));
const ohnePlatz = (zonen) => zonen.map(z => { if (!istHand(z) || !('platz' in z)) return z; const { platz: _p, ...rest } = z; return rest; });

// ─────────────────────────────────────────────────────────────────────────────
// 1  Der Zielstand — `platz` an den fünf Händen, alles andere byteweise gleich
// ─────────────────────────────────────────────────────────────────────────────

test('FS 1: der Eingang – nach EU und FF 82 Zonen, die fünf Hände mit capacity 4, **ohne** platz', () => {
  assert.equal(FF.length, 82);
  assert.equal(FF.filter(istHand).length, 5);
  for (const z of FF.filter(istHand)) { assert.equal(z.capacity, 4, z.label); assert.ok(!('platz' in z), z.label); }
  assert.deepEqual(FF.filter(z => 'platz' in z), [], 'keine andere Zone trägt platz');
  assert.deepEqual(FF.filter(istHand).map(z => z.id), ['zhand1', 'zhand2', 'zhand3', 'zhand4', 'zhand5'], 'Label und Id stimmen überein');
});

test('FS 1: Zielstand – `platz: n` an `zhand<n>`, **alles andere** byteweise gleich (die 77 übrigen Zonen, Reihenfolge, Schlüssel der Hände)', () => {
  const r = dz.patchEigentum(FF);
  assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  assert.deepEqual(Object.keys(r).sort(), ['art', 'zone'], 'geschrieben wird `zone_data`, sonst nichts');
  assert.equal(r.zone.length, 82);
  assert.equal(text(r.zone), text(orakel(FF)), 'genau das Orakel: nur platz, an letzter Stelle der Schlüssel');
  assert.equal(text(ohneHaende(r.zone)), text(ohneHaende(FF)), 'alle 77 anderen Zonen Zeichen für Zeichen gleich');
  assert.deepEqual(r.zone.map(z => z.id), FF.map(z => z.id), 'dieselbe Reihenfolge der Zonen');
  for (const z of r.zone.filter(istHand)) {
    const alt = FF.find(x => x.id === z.id);
    assert.equal(z.platz, Number(z.id.slice(5)), `${z.id}: platz ist die Nummer der Id`);
    assert.deepEqual(Object.keys(z), [...Object.keys(alt), 'platz'], `${z.label}: dieselben Schlüssel, platz zuletzt`);
    assert.equal(text(ohnePlatz([z])[0]), text(alt), `${z.label}: außer platz nichts`);
    // Die Daten tragen **nur** die Bindung (Spec M32.9): keine Farbe und kein `exclusive` an den Händen – die setzt der Raum auf seine Kopie.
    assert.equal(z.exclusive, alt.exclusive);
    assert.equal(z.color ?? null, alt.color ?? null);
  }
});

test('FS 1: die Konstanten – Ausgang ist der Zielstand von `haende` (39 886 Zeichen, sha e6bf6aeaf3d6), Ziel ist gerechnet; nur die Spalte `zone`', () => {
  const s = dz.SCHRITTE.eigentum;
  assert.ok(s, 'SCHRITTE.eigentum ist eingetragen');
  assert.deepEqual(Object.keys(s.ausgang), ['zone']);
  assert.deepEqual(Object.keys(s.ziel), ['zone']);
  assert.deepEqual(s.ausgang.zone, { laenge: 39886, sha: 'e6bf6aeaf3d6' }, 'ausgeschrieben: dieselbe Zahl wie das Ziel von `haende`');
  assert.deepEqual(s.ausgang, dz.SCHRITTE.haende.ziel);
  assert.deepEqual(s.ausgang.zone, { laenge: text(FF).length, sha: sha(text(FF)) });
  assert.deepEqual(s.ziel.zone, { laenge: text(ziel()).length, sha: sha(text(ziel())) });
  assert.notEqual(s.ziel.zone.sha, s.ausgang.zone.sha);
  assert.equal(s.ziel.zone.laenge - s.ausgang.zone.laenge, 5 * ',"platz":1'.length, 'fünf Felder `,"platz":n`');
});

test('FS 1: Rückwärtsbeweis – ohne platz ergibt den gelesenen Text, Zeichen für Zeichen (`--zurueck` führt auf den Ausgang)', () => {
  assert.deepEqual(dz.beweiseEigentum({ zone: FF }, { zone: ziel() }), []);
  assert.equal(text(ohnePlatz(ziel())), text(FF));
});

test('FS 1: der Beweis fängt, was nicht stimmt – ein falsches platz, ein fehlendes, ein fremdes Feld an einer Hand, eine Zone verändert, eine Zone mehr, eine Hand fehlt', () => {
  const fehler = (nach) => dz.beweiseEigentum({ zone: FF }, { zone: nach });
  const mit = (fn) => { const z = ziel(); fn(z); return z; };
  const hand = (z, n) => z.find(x => x.label === `Hand Dörfler ${n}`);
  assert.ok(fehler(mit(z => { hand(z, 2).platz = 5; })).length > 0, 'platz 5 an Hand 2');
  assert.ok(fehler(mit(z => { delete hand(z, 4).platz; })).length > 0, 'ein platz fehlt');
  assert.ok(fehler(mit(z => { hand(z, 1).exclusive = true; })).length > 0, 'fremdes Feld an einer Hand');
  assert.ok(fehler(mit(z => { z.find(x => x.id === 'zkopf1').platz = 1; })).length > 0, 'platz an einer anderen Zone');
  assert.ok(fehler(mit(z => { z.push(copy(z[0])); z.at(-1).id = 'zfremd'; })).length > 0, 'eine Zone mehr');
  assert.ok(fehler(mit(z => { z.splice(z.findIndex(x => x.label === 'Hand Dörfler 5'), 1); })).length > 0, 'eine Hand fehlt');
  assert.ok(fehler('keine Liste').length > 0);
});

test('FS 1: der Prüfer – der Zielstand besteht; er fängt ein falsches, ein fehlendes oder ein doppeltes platz und ein platz an einer anderen Zone', () => {
  assert.deepEqual(dz.pruefeEigentum(ziel()), []);
  assert.ok(dz.pruefeEigentum(FF).length > 0, 'ohne platz ist nicht das Ziel');
  const mit = (fn) => { const z = ziel(); fn(z); return z; };
  const hand = (z, n) => z.find(x => x.label === `Hand Dörfler ${n}`);
  assert.ok(dz.pruefeEigentum(mit(z => { hand(z, 3).platz = 4; })).length > 0, 'platz 4 an Hand 3');
  assert.ok(dz.pruefeEigentum(mit(z => { hand(z, 3).platz = '3'; })).length > 0, 'platz als Text');
  assert.ok(dz.pruefeEigentum(mit(z => { delete hand(z, 5).platz; })).length > 0, 'fehlt');
  assert.ok(dz.pruefeEigentum(mit(z => { z.find(x => x.id === 'zkopf1').platz = 1; })).length > 0, 'platz an einer Zone, die keine Hand ist');
  assert.ok(dz.pruefeEigentum(ziel().filter(z => z.label !== 'Hand Dörfler 2')).length > 0, 'eine Hand fehlt');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2  Vorbedingung je Stück: alle ohne → schreiben, alle im Ziel → schon da, sonst Abbruch; disjunkt zu `zonen` und `haende`
// ─────────────────────────────────────────────────────────────────────────────

const abweichend = (zonen) => {
  const r = dz.patchEigentum(zonen);
  assert.equal(r.art, 'abweichend', `erwartet abweichend, ist ${r.art}`);
  assert.equal(r.zone, undefined, 'bei einer Abweichung gibt es keinen Zielstand');
  assert.ok(Array.isArray(r.probleme) && r.probleme.length > 0);
  return r.probleme.join('\n');
};
const mitHand = (zonen, n, fn) => { const z = copy(zonen); fn(z.find(x => x.label === `Hand Dörfler ${n}`)); return z; };
const mitPlatzAn = (ns) => FF.map(z => (istHand(z) && ns.includes(platzVon(z)) ? { ...copy(z), platz: platzVon(z) } : copy(z)));

test('FS 2: der Ausgang – alle fünf Hände ohne platz → zu schreiben', () => {
  const r = dz.patchEigentum(FF);
  assert.equal(r.art, 'zu-schreiben');
});

test('FS 2: schon im Ziel → „schon-da“, die Eingabe kommt gleich zurück (als Kopie) und wird nicht verändert', () => {
  const z = ziel();
  const vorher = text(z);
  const r = dz.patchEigentum(z);
  assert.equal(r.art, 'schon-da');
  assert.equal(text(r.zone), vorher);
  assert.notEqual(r.zone, z, 'eine Kopie');
  assert.equal(text(z), vorher, 'Eingabe unverändert');
});

test('FS 2: **teils** geschrieben ist ein Abbruch – ein bis vier von fünf: nichts wird überschrieben, die Meldung sagt „teils“ und nennt die Hände', () => {
  for (const ns of [[1], [4], [1, 2], [2, 5], [3, 4], [1, 2, 3, 4], [2, 3, 4, 5]]) {
    const m = abweichend(mitPlatzAn(ns));
    assert.match(m, /teils/, `Hände ${ns}`);
    for (const n of ns) assert.ok(m.includes(`Hand Dörfler ${n}`), `Hände ${ns}: nennt Hand ${n}`);
  }
  assert.match(abweichend(mitPlatzAn([1, 2])), /2 von 5/);
});

test('FS 2: Abbruch mit Pfad – jede Hand einzeln mit einem anderen platz (0, 6, die Nummer einer anderen Hand, null, Text): die Meldung nennt `zone_data`, das Label und den gefundenen Wert', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    for (const p of [0, 6, n === 1 ? 2 : 1, null, String(n)]) {
      const m = abweichend(mitHand(ziel(), n, h => { h.platz = p; }));
      assert.match(m, /zone_data/, `Hand ${n}, platz ${text(p)}`);
      assert.ok(m.includes(`Hand Dörfler ${n}`), `Hand ${n}: ${m}`);
      assert.ok(m.includes(text(p)), `Hand ${n}: nennt den gefundenen Wert ${text(p)}: ${m}`);
    }
  }
});

test('FS 2: Abbruch – eine Hand fehlt oder kommt doppelt vor, eine Zone mehr, ein anderes Feld einer Hand, eine **andere** Zone verändert oder mit platz', () => {
  assert.match(abweichend(FF.filter(z => z.label !== 'Hand Dörfler 5')), /Hand Dörfler 5/);
  assert.match(abweichend([...copy(FF), { ...copy(FF.find(z => z.label === 'Hand Dörfler 2')), id: 'zdoppelt' }]), /Hand Dörfler 2.*2-mal/);
  assert.ok(abweichend([...copy(FF), { ...copy(FF[0]), id: 'zfremd', label: 'Fremd' }]).length > 0, 'eine Zone mehr');
  assert.match(abweichend(mitHand(FF, 2, h => { h.exclusive = true; })), /außer platz an den Händen sind die Zonen nicht der Stand nach FF/);
  assert.match(abweichend(mitHand(FF, 1, h => { h.x = 151; })), /außer platz an den Händen sind die Zonen nicht der Stand nach FF/);
  const z = copy(FF); z.find(x => x.id === 'zkopf1').capacity = 2;
  assert.ok(abweichend(z).length > 0, 'eine Zone, die nicht zum Schritt gehört, weicht ab');
  const mitFremdPlatz = copy(FF); mitFremdPlatz.find(x => x.id === 'zkopf1').platz = 1;
  assert.ok(abweichend(mitFremdPlatz).length > 0, 'platz an einer Zone, die keine Hand ist');
  assert.equal(dz.patchEigentum('keine Liste').art, 'abweichend');
  assert.equal(dz.patchEigentum(null).art, 'abweichend');
});

test('FS 2: **FF ist die Vorbedingung** – mit capacity 3 (Stand nach EU) oder vor EU (die Zonen der Fixture) gibt es keinen Ausgang; der Hinweis nennt FF', () => {
  const eu = dz.patchZonen(zones).zone;
  assert.match(abweichend(eu), /capacity 3|haende \(FF\)/);
  assert.ok(abweichend(zones).length > 0, 'vor EU (die 54 Zonen)');
  // capacity 3, aber platz da: ebenfalls kein Ausgang (FF fehlt)
  assert.ok(abweichend(orakel(eu)).length > 0);
});

test('FS 2: **disjunkt** zu `zonen` und `haende` – jedes Stück erkennt nur **seinen** Stand', () => {
  const EU = dz.patchZonen(zones).zone;
  const EIG = ziel();
  assert.equal(dz.patchZonen(zones).art, 'zu-schreiben');
  assert.equal(dz.patchZonen(EU).art, 'schon-da');
  assert.equal(dz.patchHaende(EU).art, 'zu-schreiben');
  assert.equal(dz.patchHaende(FF).art, 'schon-da');
  assert.equal(dz.patchEigentum(FF).art, 'zu-schreiben');
  // vor FS: die älteren Stücke sehen ihren Stand, FS sieht den seinen nicht
  assert.equal(dz.patchEigentum(EU).art, 'abweichend');
  assert.equal(dz.patchEigentum(zones).art, 'abweichend');
  // nach FS: die älteren Stücke melden ABWEICHEND (der erwartete Stand, `--check` Exit 1), FS meldet „schon-da“
  assert.equal(dz.patchEigentum(EIG).art, 'schon-da');
  assert.equal(dz.patchHaende(EIG).art, 'abweichend', 'haende sieht platz nicht als seinen Stand');
  assert.equal(dz.patchZonen(EIG).art, 'abweichend', 'zonen sieht platz nicht als seinen Stand');
  // und umgekehrt: FS rührt weder capacity noch ein anderes Stück an
  assert.equal(text(ohnePlatz(dz.patchEigentum(FF).zone)), text(FF));
});

test('FS 2: der Kopf des Skripts und SCHRITTE – `eigentum` ist der zehnte Schritt, `SCHRITTE` und `DEFS` kennen ihn; der Kopf nennt Schritt und Aufgabe', () => {
  assert.deepEqual(Object.keys(dz.SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen', 'haende', 'aktionen-spieler', 'aufbau-spieler', 'eigentum']);
  for (const k of Object.keys(dz.SCHRITTE)) assert.notEqual(dz.SCHRITTE[k], null, k);
  const kopf = quelle('scripts/doerflerzahl-daten.mjs').split('\n').slice(0, 12).join('\n');
  assert.match(kopf, /eigentum/, 'der Kopf nennt den Schritt');
  assert.match(kopf, /FS/, 'mit der Aufgabe');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3  Das Feld überlebt — `resolveZones`, ein Editor-Rundlauf, JSON
// ─────────────────────────────────────────────────────────────────────────────

test('FS 3: `platz` überlebt `resolveZones` (Hand 1 und 2 absolut, 3 bis 5 am Tableau verankert) und den Rundlauf durch JSON — an den **geschriebenen** Daten', () => {
  const EIG = ziel();
  const tableaus = [{ assetId: 'bad13f49-c614-4551-9e81-fe8603dbf09a', x: 1460, y: 1600, width: 300, height: 400 }];
  const gelöst = resolveZones(EIG, anchorBoxes(tableaus));
  for (const n of [1, 2, 3, 4, 5]) assert.equal(gelöst.find(z => z.id === `zhand${n}`).platz, n, `zhand${n}`);
  assert.deepEqual(JSON.parse(JSON.stringify(EIG)), EIG);
  assert.equal(text(JSON.parse(text(EIG))), text(EIG), 'zone_data ist kompaktes JSON.stringify (Vorbedingung des Gerüsts)');
});

test('FS 3: der **Editor-Rundlauf** – `updateZone` (`{ ...z, ...updates }`, dann `setAnchor` an einer verankerten Zone) lässt `platz` stehen', () => {
  const EIG = ziel();
  const anker = { id: 'bad13f49-c614-4551-9e81-fe8603dbf09a', x: 1460, y: 1600, width: 300, height: 400 };
  // genau der Code von `ZoneEditor.updateZone` (client/src/components/ZoneEditor.jsx): spreiten, dann bei Anker neu binden
  const updateZone = (list, id, updates) => list.map(z => {
    if (z.id !== id) return z;
    const next = { ...z, ...updates };
    return next.anchor && next.anchor.assetId === anker.id ? setAnchor(next, anker) : next;
  });
  for (const n of [1, 3, 5]) {
    const nachher = updateZone(EIG, `zhand${n}`, { label: `Hand Dörfler ${n} (verschoben)`, x: EIG.find(z => z.id === `zhand${n}`).x + 10 });
    assert.equal(nachher.find(z => z.id === `zhand${n}`).platz, n, `zhand${n}`);
  }
  // …und der Quelltext des Editors tut nichts anderes (kein Kopieren einzelner Felder)
  const editor = quelle('client/src/components/ZoneEditor.jsx');
  assert.match(editor, /const next = \{ \.\.\.z, \.\.\.updates \};/);
  assert.match(editor, /setAnchor\(z, anchor\)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4  Der Schalter, in beide Richtungen am Raum
// ─────────────────────────────────────────────────────────────────────────────

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'raum.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');
const { buildApp } = await import('../src/index.js');
const { getDb, closeDatabase } = await import('../src/database.js');
const { getRoom } = await import('../src/roomStore.js');
const { authHeaders } = await import('./helpers.js');

let app, headers;
const logLines = [];
before(async () => {
  app = await buildApp({ logger: { level: 'warn', stream: { write: (s) => logLines.push(JSON.parse(s)) } } });
  headers = authHeaders();
});
after(async () => {
  if (app) await app.close();
  closeDatabase();
  fs.rmSync(TMP, { recursive: true, force: true });
});

const NAMES = ['keiner', 'Henlo', 'Granny', 'Judy', 'Fridgette'];
const choicesOf = (names) => Object.fromEntries(names.map(n => [n, { label: n }]));
const seat = (def, on) => ({ label: 'Dörfler', default: def, choices: choicesOf(NAMES), ...(on ? { optional: { off: 'keiner', on, addLabel: 'Dörfler dazu' } } : {}) });
const OPTIONS = {
  spieler: { label: 'Spieler', default: 's1', choices: Object.fromEntries([1, 2, 3, 4].map(n => [`s${n}`, { label: String(n) }])) },
  doerfler1: seat('Henlo'), doerfler2: seat('Granny'), doerfler3: seat('keiner', 'Judy'), doerfler4: seat('keiner', 'Fridgette'),
};
const SCENARIO = { options: OPTIONS, villagers: { lage: { players: 'spieler', seats: ['doerfler1', 'doerfler2', 'doerfler3', 'doerfler4'] } } };
const VIER = { spieler: 's2', doerfler3: 'Judy', doerfler4: 'Fridgette' };
const FARBEN = ['red', 'blue'];

async function raumMit(zonen) {
  const g = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'FS' } });
  assert.equal(g.statusCode, 201, g.body);
  const gameId = g.json().id;
  const s = await app.inject({
    method: 'POST', url: `/api/games/${gameId}/setups`, headers,
    payload: {
      name: 'Aufbau', state_data: JSON.stringify({ stacks: [], cards: [], tokens: [], counters: [] }),
      sequence_data: JSON.stringify([{ type: 'place_counter', name: 'Probe', value: 1, x: 40, y: 50 }]),
      scenario_data: JSON.stringify(SCENARIO), zone_data: JSON.stringify(zonen),
    },
  });
  assert.equal(s.statusCode, 201, s.body);
  const created = await app.inject({
    method: 'POST', url: '/api/rooms', headers,
    payload: { game_id: gameId, display_name: 'Host', color: FARBEN[0], setup_id: s.json().id, setup_choices: VIER },
  });
  assert.equal(created.statusCode, 201, created.body);
  const { room_code: code, player_id: hostId } = created.json();
  const j = await app.inject({ method: 'POST', url: `/api/rooms/${code}/join`, headers, payload: { display_name: 'Gast', color: FARBEN[1] } });
  assert.equal(j.statusCode, 201, j.body);
  const start = await app.inject({ method: 'POST', url: `/api/rooms/${code}/start`, headers, payload: { player_id: hostId } });
  assert.equal(start.statusCode, 200, start.body);
  return { code, zonen: getRoom(code).zones };
}

test('FS 4: **der Schalter, aus** – die Zonen **ohne** platz (der Stand vor FS): der Raum mit Spieler 2 und vier Dörflern startet, **nichts gebunden** (Zonen unverändert), eine Warnung je Platz im Log', async () => {
  logLines.length = 0;
  const { zonen } = await raumMit(FF);
  assert.deepEqual(zonen, JSON.parse(text(FF)), 'die Raumkopie ist zone_data, Zeichen für Zeichen');
  assert.equal(zonen.some(z => z.exclusive && z.color), false, 'keine Hand ist an jemanden gebunden');
  const warnungen = logLines.filter(l => /Platz/.test(l.msg ?? '') || /platz/.test(l.msg ?? ''));
  assert.ok(warnungen.length >= 1, `der Raum meldet die fehlenden Plätze: ${logLines.map(l => l.msg).join(' | ')}`);
});

test('FS 4: **der Schalter, an** – die Zonen **mit** platz (der Zielstand): Hand 1 und 2 in der Farbe des Hosts, 3 und 4 in der des Gastes, alle exclusive; Platz 5 (kein Dörfler) bleibt, die übrigen Zonen unverändert; keine Warnung', async () => {
  logLines.length = 0;
  const { zonen } = await raumMit(ziel());
  const hand = (n) => zonen.find(z => z.id === `zhand${n}`);
  assert.deepEqual([1, 2].map(n => [hand(n).color, hand(n).exclusive]), [['red', true], ['red', true]]);
  assert.deepEqual([3, 4].map(n => [hand(n).color, hand(n).exclusive]), [['blue', true], ['blue', true]]);
  assert.equal(hand(5).exclusive, false);
  assert.equal(hand(5).color ?? null, null);
  const orig = ziel();
  zonen.forEach((z, i) => { if (!/^zhand[1-4]$/.test(z.id)) assert.deepEqual(z, orig[i], z.id); });
  assert.deepEqual(logLines.filter(l => /Platz/.test(l.msg ?? '')), []);
  // `zone_data` in der Datenbank bleibt, wie es geschrieben wurde: gebunden wird nur die Kopie des Raums
  const gespeichert = getDb().prepare('SELECT zone_data FROM setups ORDER BY rowid DESC LIMIT 1').get().zone_data;
  assert.equal(gespeichert, text(ziel()));
});

test('FS 4: die Bindung ist dieselbe Rechnung wie in `FN` – `bindZones` auf dem Zielstand mit der Zuordnung 2/4 (Gegenprobe ohne Server)', () => {
  const owners = ownersOfPlayers({ players: 2, villagers: 4, kind: 'mehrfach' }, [{ id: 'p1', seat: 1, color: 'red' }, { id: 'p2', seat: 2, color: 'blue' }]);
  const { zones: gebunden, warnings } = bindZones(ziel(), owners);
  assert.deepEqual(warnings, []);
  assert.deepEqual([1, 2, 3, 4, 5].map(n => gebunden.find(z => z.id === `zhand${n}`).color ?? null), ['red', 'red', 'blue', 'blue', null]);
  const ohne = bindZones(FF, owners);
  assert.equal(ohne.warnings.length, 4, 'ohne platz: eine Warnung je Platz 1 bis 4');
  assert.equal(ohne.zones.some(z => z.exclusive && z.color), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5  Der alte Prüfer und der alte Code stolpern nicht über das Feld
// ─────────────────────────────────────────────────────────────────────────────

test('FS 5: **an der Quelle gelesen** – der Server prüft `zone_data` beim Speichern nicht (der Text wird durchgereicht), der Editor spreitet, der Rest liest nur die Felder, die er kennt', () => {
  const setups = quelle('server/src/routes/setups.js');
  // Anlegen und Ändern: der Text (oder `JSON.stringify` des Objekts) geht in die Spalte – kein `JSON.parse`, keine Feldliste.
  assert.match(setups, /const zoneJson = zone_data !== undefined/);
  assert.doesNotMatch(setups, /JSON\.parse\(zone/);
  assert.doesNotMatch(setups, /zone_data\)\.(map|filter|forEach)/);
  // `loadGameState`/`setZones` am Tisch: das Objekt aus `zone_data` geht unverändert in den State
  const tisch = quelle('client/src/pages/GameTable.jsx');
  assert.match(tisch, /parsedZones = JSON\.parse\(setup\.zone_data \|\| '\[\]'\)/);
  assert.match(tisch, /setZones\(JSON\.parse\(setup\.zone_data\)\)/);
  // der Raum: `bindZones` ist die einzige Stelle, die `platz` liest
  const lesen = ['server/src/websocket/messageHandler.js', 'server/src/websocket/roomWs.js', 'server/src/routes/rooms.js', 'client/src/components/ZoneOverlay.jsx', 'client/src/components/ZoneShape.jsx']
    .filter(f => /\.platz\b|\bplatz:/.test(quelle(f).split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')));
  assert.deepEqual(lesen, ['server/src/routes/rooms.js'], 'nur rooms.js nennt `platz:` – und zwar die Antwort `plaetze` für die Lobby, nicht die Zone');
});

test('FS 5: **der alte Prüfer und der alte Executor** – `pruefeZonen`, `pruefeHaende` (ohne platz gelesen) und ein ganzer Aufbau (2 bis 5 Dörfler) stolpern nicht über das Feld: dieselben Karten, dieselben Protokollzeilen', () => {
  const EIG = ziel();
  assert.deepEqual(dz.pruefeZonen(EIG), [], 'der Prüfer von EU kennt das Feld nicht und beanstandet es nicht');
  assert.deepEqual(dz.pruefeHaende(ohnePlatz(EIG)), []);

  const scenario = JSON.parse(dzFixture.scenario), sequence = JSON.parse(dzFixture.sequence), actions = JSON.parse(dzFixture.actions);
  const ASSETS = dz.patchAssets(assets).assets;
  const AKTIONEN = dz.patchAktionen(actions).action;
  const SC_PROD = dz.patchWerte(dz.patchGelaende(scenario).scenario).scenario;
  const WELLE1 = dz.patchSchalter(SC_PROD, sequence, { zone: dz.patchZonen(zones).zone, assets: ASSETS, action: AKTIONEN });
  assert.equal(WELLE1.art, 'zu-schreiben', (WELLE1.probleme ?? []).join('\n'));
  const ohneIds = (v) => {
    if (Array.isArray(v)) return v.map(ohneIds);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !['id', 'tableId', 'stackId', 'table_ids', 'card_ids', 'inStack'].includes(k)).map(([k, x]) => [k, ohneIds(x)]));
    return v;
  };
  const wahl = (n) => ({ ...(n >= 3 ? { doerfler3: 'Granny' } : {}), ...(n >= 4 ? { doerfler4: 'Blopsy' } : {}), ...(n >= 5 ? { doerfler5: 'Yancy' } : {}) });
  for (const n of [2, 3, 4, 5]) {
    const lauf = (z) => bauen({ state, sequence: WELLE1.sequence, zones: z, grids, assets: ASSETS, cards, scenarioData: WELLE1.scenario }, wahl(n), 1);
    const a = lauf(FF), b = lauf(EIG);
    assert.deepEqual(b.log.filter(e => e.status === 'failed' || e.status === 'skipped'), [], `${n} Dörfler: kein Schritt scheitert`);
    assert.deepEqual(ohneIds(b.state), ohneIds(a.state), `${n} Dörfler: derselbe Tisch mit und ohne platz`);
    assert.deepEqual(b.log.map(e => [e.status, e.reason ?? null]), a.log.map(e => [e.status, e.reason ?? null]), `${n} Dörfler: dieselben Protokollzeilen`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// main — gegen eine Wegwerf-Datenbank (nie gegen eine echte)
// ─────────────────────────────────────────────────────────────────────────────

function frischeDatenbank(zonenText) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-doerflerzahl-eigentum-'));
  const file = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    'const { setupDatabase, closeDatabase } = await import("./src/database.js"); await setupDatabase(); closeDatabase();'],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, CGE_DB_PATH: file }, stdio: 'pipe' });
  const db = new Database(file);
  db.prepare("insert into games (id, name) values (?, 'TFT')").run(GAME_ID);
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Aufbau', '{}', zonenText, dzFixture.sequence, '[]', dzFixture.actions, dzFixture.scenario);
  db.prepare("insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, 'Auto Save', '{\"a\":0}', ?)").run(randomUUID(), GAME_ID, SETUP_ID);
  db.close();
  return { tmp, file };
}

async function fahre(args, { Db = Database } = {}) {
  const zeilen = [], fehler = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => zeilen.push(a.join(' '));
  console.error = (...a) => fehler.push(a.join(' '));
  try {
    const code = await dz.main(args, { Database: Db });
    return { code, out: [...zeilen, ...fehler].join('\n') };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

/** Alles außer `zone_data` in der Zeile des Aufbaus, und jede Zeile von `save_states`. */
function andere(file) {
  const db = new Database(file, { readonly: true });
  try {
    const row = db.prepare('select * from setups where id = ?').get(SETUP_ID);
    const { zone_data: _z, ...rest } = row;
    return { setups: text(rest), saves: text(db.prepare('select * from save_states order by rowid').all()) };
  } finally { db.close(); }
}
const zoneDaten = (file) => {
  const db = new Database(file, { readonly: true });
  try { return db.prepare('select zone_data from setups where id = ?').get(SETUP_ID).zone_data; } finally { db.close(); }
};
const sicherungsSha = (t) => dz.sicherungsHash(t).slice(0, 12);

test('FS main: --check – schreibgeschützt, „zu schreiben“, Beweis, Prüfer, Zielstand, Hash für die Sicherung; geschrieben wird nichts', async () => {
  const { tmp, file } = frischeDatenbank(text(FF));
  try {
    const vorher = zoneDaten(file);
    const r = await fahre(['--check', file, '--schritt', 'eigentum']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /zu schreiben/);
    assert.match(r.out, /Rückwärtsbeweis zone_data: ja/);
    assert.ok(r.out.includes(dz.sicherungsHash(text(FF))), 'der Hash für die Sicherung steht in der Ausgabe');
    assert.equal(zoneDaten(file), vorher);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FS main: --write mit Sicherung – zone_data auf dem Zielstand, nichts sonst geändert; der zweite Lauf schreibt nichts („schon geschrieben“)', async () => {
  const { tmp, file } = frischeDatenbank(text(FF));
  try {
    const andereVorher = andere(file);
    const r = await fahre(['--write', file, '--schritt', 'eigentum', '--sicherung-sha', sicherungsSha(text(FF))]);
    assert.equal(r.code, 0, r.out);
    assert.equal(zoneDaten(file), text(ziel()));
    assert.equal(zoneDaten(file), text(orakel(FF)));
    assert.match(r.out, /Zielstand aus den Konstanten.*erreicht/);
    assert.deepEqual(andere(file), andereVorher);
    const zweit = await fahre(['--write', file, '--schritt', 'eigentum']);
    assert.equal(zweit.code, 0, zweit.out);
    assert.match(zweit.out, /schon geschrieben|nichts zu schreiben/);
    assert.equal(zoneDaten(file), text(ziel()));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FS main: ohne oder mit falscher Sicherung wird nichts geschrieben; --force ist ein Benutzungsfehler', async () => {
  const { tmp, file } = frischeDatenbank(text(FF));
  try {
    assert.equal((await fahre(['--write', file, '--schritt', 'eigentum'])).code, 1);
    assert.equal((await fahre(['--write', file, '--schritt', 'eigentum', '--sicherung-sha', 'abcdefabcdef'])).code, 1);
    assert.equal((await fahre(['--write', file, '--schritt', 'eigentum', '--force'])).code, 2);
    assert.equal(zoneDaten(file), text(FF));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FS main: Abbruch mit Pfad auf der Datenbank – ein falsches platz, ein Stand **teils** (zwei von fünf) und **vor FF** (capacity 3): Exit 1, die Spalte bleibt, wie sie war', async () => {
  const vorFF = dz.patchZonen(zones).zone;
  for (const zonen of [mitHand(ziel(), 3, h => { h.platz = 5; }), mitPlatzAn([1, 2]), vorFF]) {
    const { tmp, file } = frischeDatenbank(text(zonen));
    try {
      const r = await fahre(['--write', file, '--schritt', 'eigentum', '--sicherung-sha', sicherungsSha(text(zonen))]);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /zone_data/);
      assert.equal(zoneDaten(file), text(zonen));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
});

test('FS main: nach dem Schreiben melden `--check` von `haende` und `zonen` ABWEICHEND (Exit 1) — der erwartete Stand, kein Fehler; `--check eigentum` meldet „schon geschrieben“ (Exit 0)', async () => {
  const { tmp, file } = frischeDatenbank(text(FF));
  try {
    assert.equal((await fahre(['--write', file, '--schritt', 'eigentum', '--sicherung-sha', sicherungsSha(text(FF))])).code, 0);
    for (const schritt of ['haende', 'zonen']) {
      const r = await fahre(['--check', file, '--schritt', schritt]);
      assert.equal(r.code, 1, `${schritt}: ${r.out}`);
      assert.match(r.out, /ABWEICHEND/, schritt);
    }
    const e = await fahre(['--check', file, '--schritt', 'eigentum']);
    assert.equal(e.code, 0, e.out);
    assert.match(e.out, /schon geschrieben/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FS main: --zurueck – der exakte Zielstand kommt auf den Ausgang (FF), Zeichen für Zeichen; ein Stand, der nicht der Zielstand ist, wird nicht überschrieben', async () => {
  const { tmp, file } = frischeDatenbank(text(FF));
  try {
    assert.equal((await fahre(['--write', file, '--schritt', 'eigentum', '--sicherung-sha', sicherungsSha(text(FF))])).code, 0);
    const sicherung = path.join(tmp, 'sicherung.json');
    fs.writeFileSync(sicherung, JSON.stringify({ zone_data: text(FF), sha256: dz.sicherungsHash(text(FF)), updated_at: 'test' }));
    const r = await fahre(['--zurueck', sicherung, file, '--schritt', 'eigentum']);
    assert.equal(r.code, 0, r.out);
    assert.equal(zoneDaten(file), text(FF));
    const nochmal = await fahre(['--zurueck', sicherung, file, '--schritt', 'eigentum']);
    assert.equal(nochmal.code, 0, nochmal.out);
    assert.match(nochmal.out, /nichts zu tun/);
    assert.equal(zoneDaten(file), text(FF));
    // jemand hat danach weitergearbeitet: weder Ziel noch Ausgang
    const fremd = text(mitHand(ziel(), 2, h => { h.capacity = 6; }));
    const db = new Database(file); db.prepare('update setups set zone_data = ? where id = ?').run(fremd, SETUP_ID); db.close();
    assert.equal((await fahre(['--zurueck', sicherung, file, '--schritt', 'eigentum'])).code, 1);
    assert.equal(zoneDaten(file), fremd);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
