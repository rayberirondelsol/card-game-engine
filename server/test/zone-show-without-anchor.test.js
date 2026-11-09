// EO / Spec M31.8 Punkt 7, M31.9 - `showWithoutAnchor: false`: ein leerer Platz zeigt seine Zonen nicht.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Bei der Vorgabe zwei Doerfler sind drei Plaetze leer, und deren Zonen haben keinen
// Anker am Tisch. Zwei Folgen: `ZoneOverlay` zeichnet sie (30 Geisterzonen), und
// `require_marker` liest sie mit den Standardmassen `x 0, y 0, 100 x 140` aus
// `box()` - ein Plaettchen irgendwo in der Tischecke zaehlte als lebender Doerfler.
// Das Feld setzt an der Zone das vorhandene `facingAway` (`resolveZones`, eine
// Zeile); die Leser von `facingAway` tun danach, was sie immer tun.
//
// Nur ein ausdrueckliches `false` wirkt (wie `showInPlay`); eine Zone ohne das
// Feld verhaelt sich unveraendert (Test 1). Test 3 ist die Abnahme und belegt
// **beides**: mit dem Feld zaehlt das geparkte Plaettchen nicht, ohne zaehlte es.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { zoneAt, zoneRejects, objectsInZone, zoneSlotNumbered } from '../../shared/zoneGeometry.js';
import { ZONES, LINEUP, run, copy } from './villager-table.js';

// ── Test 1: resolveZones ────────────────────────────────────────────────────

const MISSING = { assetId: 'gibts-nicht', relX: 0, relY: 0, relWidth: 1, relHeight: 1 };
const there = { id: 'a', label: 'Tableau', x: 500, y: 500, width: 200, height: 300, assetId: 'da', shape: 'image' };
const anchors = anchorBoxes([], [there]);
const zone = (over = {}) => ({ id: 'z', label: 'Z', anchor: MISSING, ...over });
const one = (z) => resolveZones([z], anchors)[0];

test('EO 1: showWithoutAnchor false + fehlender Anker -> anchorMissing UND facingAway', () => {
  const r = one(zone({ showWithoutAnchor: false }));
  assert.equal(r.anchorMissing, true);
  assert.equal(r.facingAway, true);
});

test('EO 1: ohne das Feld nur anchorMissing, wie heute', () => {
  const r = one(zone());
  assert.equal(r.anchorMissing, true);
  assert.equal('facingAway' in r, false);
});

test('EO 1: Anker da -> keines von beiden; ein veraltetes Kennzeichen faellt weg', () => {
  const onTable = { assetId: 'da', relX: 0, relY: 0, relWidth: 1, relHeight: 1 };
  const r = one(zone({ anchor: onTable, showWithoutAnchor: false, anchorMissing: true, facingAway: true }));
  assert.equal('anchorMissing' in r, false);
  assert.equal('facingAway' in r, false);
  assert.equal(r.x, 400); // das Feld bleibt Teil der Zone, die Box ist aufgeloest
});

test('EO 1: nur ein ausdrueckliches false wirkt - true, "false", 0 und null nicht', () => {
  for (const v of [true, 'false', 0, null, undefined, '']) {
    const r = one(zone({ showWithoutAnchor: v }));
    assert.equal(r.anchorMissing, true);
    assert.equal('facingAway' in r, false, `showWithoutAnchor ${JSON.stringify(v)} darf nichts bewirken`);
  }
});

// ── Test 2: die Leser tun, was facingAway ihnen sagt ────────────────────────

test('EO 2: zoneAt trifft sie nicht, zoneRejects weist ab, objectsInZone gibt []', () => {
  // Keine Box gespeichert: ohne das Feld sind es die Standardmasse (0, 0, 100 x 140).
  const ohne = one(zone());
  const mit = one(zone({ showWithoutAnchor: false }));
  const parked = { id: 'p', x: 10, y: 10 };

  assert.equal(zoneAt([ohne], 10, 10), ohne, 'Gegenprobe: ohne das Feld trifft die Standardbox');
  assert.equal(zoneRejects(ohne, 'asset', 0), null);
  assert.deepEqual(objectsInZone(ohne, [parked]), [parked]);

  assert.equal(zoneAt([mit], 10, 10), null);
  assert.match(zoneRejects(mit, 'asset', 0), /not showing/);
  assert.deepEqual(objectsInZone(mit, [parked]), []);
});

// ── Test 3: die Wache auf einem Fuenf-Plaetze-Tisch mit zwei Doerflern ──────

const LEISTEN = (n) => `Dörfler ${n}: Leben`;
const FUENF = [1, 2, 3, 4, 5].map(LEISTEN);
const SATZ = 'Auf keiner Lebensleiste liegt noch ein Marker.';

/** Platz 4 und 5 synthetisch aus Platz 3 kopiert; ihr Tableau ist nie am Tisch. */
function zonen(mitFeld) {
  const platz3 = ZONES.find(z => z.label === LEISTEN(3));
  const mark = (z) => (mitFeld ? { ...z, showWithoutAnchor: false } : z);
  const kopie = (n) => ({ ...copy(platz3), id: `z-leben-${n}`, label: LEISTEN(n), anchor: { ...platz3.anchor, assetId: `tableau-${n}` } });
  return [...ZONES.map(z => (z.label === LEISTEN(3) ? mark(z) : z)), mark(kopie(4)), mark(kopie(5))];
}

const guard = { type: 'require_marker', zoneLabel: FUENF, above: 0, confirm: true, message: SATZ };
const after = { type: 'clear_zone', zoneLabel: 'Gibts Nicht' };
const ran = (log) => log.length === 2 && /not found/.test(log[1].reason);

/** Zwei Doerfler sitzen; Platz 3, 4 und 5 sind leer. */
function zweiDoerfler(mitFeld) {
  const { state, log } = run({}, LINEUP.slice(0, 2), { zones: zonen(mitFeld) });
  assert.deepEqual(log.filter(e => e.status !== 'ok'), []);
  return state;
}
const besiegt = (state) => {
  const s = copy(state);
  s.tokens = s.tokens.filter(t => !/^Marker [12]: Leben$/.test(t.label));
  return s;
};
const parken = (state, x, y) => {
  const s = copy(state);
  s.tokens.push({ id: 'parked', label: 'Verirrtes Plättchen', shape: 'image', size: 22, x, y });
  return s;
};
const wache = (state, mitFeld) => run(state, [guard, after], { zones: zonen(mitFeld) }).log;

test('EO 3: mit dem Feld haelt die Wache weder mit "has no places" noch mit "unlesbar"', () => {
  const log = wache(zweiDoerfler(true), true);
  assert.equal(log[0].status, 'ok', log[0].reason); // die zwei Lebensmarker liegen
  assert.ok(ran(log));
});

test('EO 3: beide Lebensmarker von den Leisten genommen - die Wache FRAGT', () => {
  const log = wache(besiegt(zweiDoerfler(true)), true);
  assert.equal(log.length, 1);
  assert.equal(log[0].status, 'skipped');
  assert.equal(log[0].message, SATZ);
  assert.equal(log[0].confirm, true);
  assert.doesNotMatch(log[0].reason, /has no places|cannot be read/);
});

test('EO 3: ein in die Ecke (10, 10) geparktes Plaettchen zaehlt NICHT - ohne das Feld zaehlte es', () => {
  const tot = besiegt(zweiDoerfler(true));

  // Mit dem Feld: die Zonen sind weg, das Plaettchen liegt in keiner - die Wache fragt.
  const mit = wache(parken(tot, 10, 10), true);
  assert.equal(mit[0].message, SATZ);

  // Ohne das Feld (der Fehler von heute): (10, 10) liegt in der Standardbox der Leiste
  // 4, aber auf keinem ihrer Plaetze - die Leiste ist "unlesbar", die Wache fragt nicht
  // mehr mit dem Satz.
  const ohne = wache(parken(tot, 10, 10), false);
  assert.equal(ohne[0].message, undefined);
  assert.match(ohne[0].reason, /cannot be read/);

  // Und liegt das Plaettchen auf einem der Plaetze der Standardbox, ist es ein
  // lebender Doerfler: die Wache besteht und fragt nicht, obwohl sie muesste.
  const p = zoneSlotNumbered(zonen(false).find(z => z.label === LEISTEN(4)), 5);
  const stumm = wache(parken(tot, p.x, p.y), false);
  assert.equal(stumm[0].status, 'ok', 'ohne das Feld zaehlt das geparkte Plaettchen als Marker');
  const still = wache(parken(tot, p.x, p.y), true);
  assert.equal(still[0].message, SATZ, 'mit dem Feld zaehlt es nicht');
});

// ── Test 4: readMarker einer Zone ohne Box ──────────────────────────────────

test('EO 4: readMarker einer abgewandten Zone ist none - auch wenn sie slots traegt', () => {
  const tot = besiegt(zweiDoerfler(true));
  const platz4 = zonen(true).find(z => z.label === LEISTEN(4));
  assert.ok(platz4.slots.length > 0, 'die Zone traegt Plaetze');
  const p = zoneSlotNumbered(zonen(false).find(z => z.label === LEISTEN(4)), 5);
  const s = parken(tot, p.x, p.y);

  const { log } = run(s, [{ ...guard, zoneLabel: [LEISTEN(4)] }], { zones: zonen(true) });
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Dörfler 4: Leben: no marker/);
  assert.doesNotMatch(log[0].reason, /has no place|objects/);
});
