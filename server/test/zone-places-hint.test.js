// M10.11 / C3 + C4 – die Ladenauslage rastet beim Zurücklegen nicht ein.
//
// Zwei Teile, und der zweite ist der wichtigere:
//
// C4 ist der **Beleg, dass am Ablegen nichts zu aendern ist**. Der Auftrag
// vermutete dieselbe Ursache wie M9.4 (ein Stapel als fuenfzehn Belegungen
// gezaehlt). Die ist seit M9.4/H2 behoben (`zoneOccupants`), und die uebrige
// Kette - `zoneCapacity` -> `zoneSlots` -> `snapPoint` / `zoneRejects` -
// leistet alle drei Abnahmen, sobald die Zone `snap: true` traegt. "Nichts zu
// tun" ist eine gueltige Antwort, aber nur eine geprueefte.
//
// C3 ist das, was daraus folgt: `snap` ist ein eigener Schalter, der beim
// Anlegen auf `false` steht, und **nur der Zug von Hand fragt ihn** - der
// Aufbau geht ueber `zoneSlotFor` und schnappt immer. Eine Zone legt ihre zehn
// Karten also richtig aus und nimmt sie nicht wieder an. Genau diese Falle hat
// M10.11 erzeugt, und der Editor warnt bisher nur vor ihrer anderen Haelfte
// ("Set a capacity to get fixed places").

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { snapInto } = await import('../../shared/gridGeometry.js');
const { zoneSlots, zoneRejects, countInZone } = await import('../../shared/zoneGeometry.js');
const { zonePlacesHint } = await import('../../client/src/utils/zoneDraft.js');

/** Die Nachschub-Auslage: zehn feste Plaetze in einer breiten Leiste. */
function auslage(over = {}) {
  return {
    id: 'z-auslage', label: 'Nachschub-Auslage',
    x: 200, y: 600, width: 1000, height: 160,
    layout: 'grid', capacity: 10, snap: true,
    ...over,
  };
}

// ── C4: die drei Abnahmen aus M10.11, gegen die vorhandene Kette ─────────────

test('Abnahme 1: eine in die Auslage gelegte Karte sitzt auf einem der zehn Plaetze', () => {
  const zone = auslage();
  const plaetze = zoneSlots(zone);
  assert.equal(plaetze.length, 10, 'Kapazitaet und Anordnung machen die Plaetze');

  // Zwischen zwei Plaetze fallengelassen - genau der Befund.
  const mitte = { x: (plaetze[2].x + plaetze[3].x) / 2, y: plaetze[2].y + 11 };
  const hit = snapInto(mitte.x, mitte.y, { zone, grids: [], taken: [] });

  assert.equal(hit.snapped, true);
  assert.ok(plaetze.some(p => Math.abs(p.x - hit.x) < 0.5 && Math.abs(p.y - hit.y) < 0.5),
    `zwischen den Plaetzen liegengeblieben: ${JSON.stringify(hit)}`);
});

test('Abnahme 2: ist ein Platz besetzt, nimmt sie den naechsten freien', () => {
  const zone = auslage();
  const plaetze = zoneSlots(zone);
  const besetzt = [plaetze[3]];

  // Direkt auf den besetzten Platz gelegt.
  const hit = snapInto(plaetze[3].x, plaetze[3].y, { zone, grids: [], taken: besetzt });
  assert.equal(hit.snapped, true);
  assert.ok(Math.abs(hit.x - plaetze[3].x) > 0.5 || Math.abs(hit.y - plaetze[3].y) > 0.5,
    'der besetzte Platz wird nicht doppelt belegt');
  assert.ok(plaetze.some(p => Math.abs(p.x - hit.x) < 0.5 && Math.abs(p.y - hit.y) < 0.5));
});

test('Abnahme 3: sind alle zehn besetzt, wird sie abgewiesen - mit Grund', () => {
  const zone = auslage();
  const drin = zoneSlots(zone).map((p, i) => ({ id: `c${i}`, ...p }));
  assert.equal(countInZone(zone, drin), 10);

  const grund = zoneRejects(zone, 'card', countInZone(zone, drin));
  assert.match(grund, /full \(10\)/);
  assert.match(grund, /Nachschub-Auslage/);

  // Und mit neun ist noch Platz.
  assert.equal(zoneRejects(zone, 'card', countInZone(zone, drin.slice(0, 9))), null);
});

test('mit `snap: false` faellt genau das aus - und nur das', () => {
  const zone = auslage({ snap: false });
  assert.equal(zoneSlots(zone).length, 10, 'die Plaetze gibt es weiterhin');
  const hit = snapInto(505, 660, { zone, grids: [], taken: [] });
  assert.equal(hit.snapped, false, 'der Zug von Hand rastet nicht ein');
  assert.deepEqual({ x: hit.x, y: hit.y }, { x: 505, y: 660 }, 'die Karte bleibt, wo sie fiel');
});

// ── C3: die Warnung, die den Fall im Editor sichtbar macht ──────────────────

test('eine Zone mit Plaetzen, aber ohne `snap`, wird im Editor angemahnt', () => {
  const hinweis = zonePlacesHint(auslage({ snap: false }));
  assert.equal(typeof hinweis, 'string');
  assert.match(hinweis, /snap/i);
});

test('mit `snap` gibt es nichts anzumahnen', () => {
  assert.equal(zonePlacesHint(auslage()), null);
});

test('ohne Plaetze gibt es nichts anzumahnen - da warnt schon die Kapazitaetszeile', () => {
  assert.equal(zonePlacesHint(auslage({ snap: false, capacity: null })), null);
  assert.equal(zonePlacesHint(auslage({ snap: false, layout: 'free' })), null);
  assert.equal(zonePlacesHint(auslage({ snap: false, layout: null })), null);
  assert.equal(zonePlacesHint(null), null);
});

test('ein Stapelplatz hat einen Platz und faellt damit unter dieselbe Warnung', () => {
  // `stack` ist die Ausnahme in `zoneSlots`: ein Platz, mit oder ohne
  // Kapazitaet. Ohne `snap` traegt auch er nur den Aufbau.
  assert.equal(typeof zonePlacesHint({ layout: 'stack', snap: false }), 'string');
  assert.equal(zonePlacesHint({ layout: 'stack', snap: true }), null);
});
