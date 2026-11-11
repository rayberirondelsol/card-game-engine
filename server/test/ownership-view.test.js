// FM Nr. 1 / Spec M32.5 — der Blick: `seesFace(zones, card, myColor)` in `shared/ownership.js`.
// Wahr für eine **verdeckte** Karte in einer Zone mit **meiner** Farbe und `exclusive`; sonst falsch.
// Der Client zeichnet sie dann aufgedeckt (FQ); der Zustand bleibt `faceDown: true` (Stufe A, M32.5).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Zonen und Karten kommen aus der echten Fixture (`auslagen-kurzpartie.json`, EU + FF angewendet,
// `platz` vom Test gesetzt und mit `bindZones` gebunden): rot führt Platz 1 + 2, blau Platz 3 + 4.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { seesFace, bindZones, ownersOfPlayers } from '../../shared/ownership.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import * as dz from '../../scripts/doerflerzahl-daten.mjs';

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const auszug = lies('auslagen-kurzpartie.json');
const copy = (x) => JSON.parse(JSON.stringify(x));

const FF = dz.patchHaende(dz.patchZonen(auszug.zones).zone).zone;
const MIT_PLATZ = FF.map(z => (/^zhand(\d)$/.test(z.id) ? { ...z, platz: Number(z.id.slice(5)) } : z));
const OWNERS = ownersOfPlayers({ players: 2, villagers: 4, kind: 'mehrfach' }, [
  { id: 'p1', seat: 1, color: 'red' }, { id: 'p2', seat: 2, color: 'blue' },
]);
const TABLEAU3 = { id: 't3', assetId: 'bad13f49-c614-4551-9e81-fe8603dbf09a', x: 1460, y: 1600, width: 300, height: 400 };
const ZONES = resolveZones(bindZones(MIT_PLATZ, OWNERS).zones, anchorBoxes([TABLEAU3]));
const hand = (n) => ZONES.find(z => z.id === `zhand${n}`);
const mitte = (z) => ({ x: z.x + z.width / 2, y: z.y + z.height / 2 });
/** Eine Tischkarte, wie der Executor sie austeilt: Karte der Bibliothek + Ort, Seite, Stapel. */
const karte = (ort, faceDown = true) => ({ ...auszug.cards[0], tableId: 'c1', ...ort, faceDown, rotation: 0, zIndex: 1 });

test('FM 1: verdeckte Karte in der eigenen Hand-Zone → wahr (Platz 1 und 2 für rot, Platz 3 – verankert – für blau)', () => {
  assert.equal(seesFace(ZONES, karte(mitte(hand(1))), 'red'), true);
  assert.equal(seesFace(ZONES, karte(mitte(hand(2))), 'red'), true);
  assert.equal(hand(3).anchor && hand(3).x !== undefined, true, 'Hand 3 ist aufgelöst');
  assert.equal(seesFace(ZONES, karte(mitte(hand(3))), 'blue'), true);
});

test('FM 1: verdeckte Karte in der fremden Hand-Zone → falsch', () => {
  assert.equal(seesFace(ZONES, karte(mitte(hand(3))), 'red'), false);
  assert.equal(seesFace(ZONES, karte(mitte(hand(1))), 'blue'), false);
});

test('FM 1: aufgedeckte Karte → falsch (es gibt nichts zu enthüllen)', () => {
  assert.equal(seesFace(ZONES, karte(mitte(hand(1)), false), 'red'), false);
  assert.equal(seesFace(ZONES, { ...karte(mitte(hand(1))), faceDown: undefined }, 'red'), false);
});

test('FM 1: ohne `myColor` (`null`/`undefined`: Hotseat, kein Raum) → falsch', () => {
  const k = karte(mitte(hand(1)));
  assert.equal(seesFace(ZONES, k, null), false);
  assert.equal(seesFace(ZONES, k, undefined), false);
  assert.equal(seesFace(ZONES, k, ''), false);
});

test('FM 1: ohne Zonen, außerhalb jeder Zone, in einer Zone ohne Eigentümer → falsch', () => {
  const k = karte(mitte(hand(1)));
  assert.equal(seesFace([], k, 'red'), false);
  assert.equal(seesFace(null, k, 'red'), false);
  assert.equal(seesFace(undefined, k, 'red'), false);
  assert.equal(seesFace(ZONES, karte({ x: 5, y: 5 }), 'red'), false, 'außerhalb jeder Zone');
  // die ungebundenen Hände (Stand vor FS / Solo): `color: null`, `exclusive: false` → keine sieht etwas
  assert.equal(seesFace(FF, karte(mitte(FF.find(z => z.id === 'zhand1'))), 'red'), false);
  // eine gefärbte Zone **ohne** `exclusive` (grüne Auslagen-Zonen des Aufbaus) macht niemanden zum Eigentümer
  const gruen = { id: 'zg', type: 'player', color: 'green', exclusive: false, x: 0, y: 0, width: 100, height: 100 };
  assert.equal(seesFace([gruen], karte({ x: 50, y: 50 }), 'green'), false);
});

test('FM 1: kaputte Karten werfen nicht (kein Ort, `null`)', () => {
  assert.equal(seesFace(ZONES, null, 'red'), false);
  assert.equal(seesFace(ZONES, { faceDown: true }, 'red'), false);
  assert.equal(seesFace(ZONES, { faceDown: true, x: NaN, y: 1 }, 'red'), false);
});

test('FM 1: eine Karte, die auch in einer fremden Zone liegt (Überlappung), wird nicht aufgedeckt – kein Leck', () => {
  const eigen = { id: 'ze', type: 'player', color: 'red', exclusive: true, x: 0, y: 0, width: 100, height: 100 };
  const fremd = { id: 'zf', type: 'player', color: 'blue', exclusive: true, x: 50, y: 0, width: 100, height: 100 };
  const k = { faceDown: true, x: 75, y: 50 };
  assert.equal(seesFace([eigen, fremd], k, 'red'), false);
  assert.equal(seesFace([fremd, eigen], k, 'red'), false);
  assert.equal(seesFace([eigen, fremd], { ...k, x: 25 }, 'red'), true, 'nur in der eigenen');
});

test('FM 1: die Funktion verändert `card` und `zones` nicht (bytegleich)', () => {
  const k = karte(mitte(hand(1)));
  const vorK = JSON.stringify(k);
  const vorZ = JSON.stringify(ZONES);
  seesFace(ZONES, k, 'red');
  seesFace(ZONES, k, 'blue');
  assert.equal(JSON.stringify(k), vorK);
  assert.equal(JSON.stringify(ZONES), vorZ);
  assert.deepEqual(copy(k), k);
});
