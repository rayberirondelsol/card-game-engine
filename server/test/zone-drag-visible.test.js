// AX1 / Spec M16.3 — beim Ziehen sind die Zonen zu sehen, auch die stillgelegten.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund F3 des achten Durchgangs: die vierzehn Markerleisten tragen seit AS3
// `showInPlay: false`, und seither legt man dort blind ab — ein Marker neben
// seiner Spur blieb lose auf dem Tableau liegen.
//
// **Die wichtigste Antwort zuerst, denn die Spec vermutete das Gegenteil:**
// `showInPlay` schaltet **nur** die Darstellung ab. `zoneShownInPlay` wird im
// ganzen Projekt an zwei Stellen gelesen, und beide zeichnen. Die
// Trefferrechnung (`zoneAt` → `zoneContains`, `snapInto`, `snapPoint`,
// `zoneSlots`) kennt das Feld nicht; eine stillgelegte Zone nimmt, zählt,
// weist ab und rastet ein wie jede andere. Dieser Test hält das fest.
//
// Der wirkliche Grund, warum der Marker lose liegenblieb, ist Geometrie:
// Fridgettes BEW-Spur ist 21,7 Weltpunkte breit, der Abstand zur Nachbarspur
// 32,4; neun Bildschirmpunkte bei 43 % Zoom sind 20,9 Weltpunkte, der
// Mittelpunkt landete also im Zwischenraum. Rechnung und die Begründung,
// warum es dafür **keine** Toleranz gibt, stehen in `docs/tasks-zonen.md`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { zoneAt, snapPoint, zoneSlots, zoneCapacity, zoneRejects } from '../../shared/zoneGeometry.js';
import { snapInto } from '../../shared/gridGeometry.js';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');
const overlay = readFileSync(
  fileURLToPath(new URL('../../client/src/components/ZoneOverlay.jsx', import.meta.url)), 'utf8');

// Fridgettes BEW-Spur, mit den Maßen aus `zone_data` über den Anker
// `Tableau: Fridgette Jones` (300 × 400): x 189,4, Breite 21,7, zehn Plätze.
const SPUR = {
  id: 'bew', label: 'Dörfler 2: Bewegung', showInPlay: false, snap: true,
  x: 189.4, y: 16.4, width: 21.7, height: 205.6,
  layout: 'slots', accepts: ['asset'],
  slots: Array.from({ length: 10 }, (_, i) => ({ relX: 0.5, relY: (i + 0.5) / 10, n: i + 1 })),
};

test('AX1: eine stillgelegte Zone fängt einen Zug wie jede andere', () => {
  const mitte = { x: SPUR.x + SPUR.width / 2, y: SPUR.y + SPUR.height / 2 };
  assert.equal(zoneAt([SPUR], mitte.x, mitte.y), SPUR, '`showInPlay: false` entscheidet über Treffer mit');
  assert.equal(zoneCapacity(SPUR), 10);
  assert.equal(zoneSlots(SPUR).length, 10);
  assert.equal(zoneRejects(SPUR, 'asset', 0), null);
});

test('AX1: und sie rastet ein – das war nicht der Fehler', () => {
  // Mitten auf der Spur, zwischen Platz 5 und 6 losgelassen.
  const p = snapPoint(SPUR, SPUR.x + SPUR.width / 2, SPUR.y + SPUR.height * 0.47);
  const slots = zoneSlots(SPUR);
  assert.ok(slots.some(s => s.x === p.x && s.y === p.y), 'nicht auf einem Platz gelandet');
  const hit = snapInto(SPUR.x + SPUR.width / 2, SPUR.y + SPUR.height * 0.47, { zone: SPUR });
  assert.equal(hit.snapped, true, '`snapInto` rastet auf einer stillgelegten Zone nicht ein');
});

test('AX1: neben der Spur fängt niemand – und das ist gerechnet, nicht geraten', () => {
  // 9 Bildschirmpunkte bei 43 % Zoom = 20,9 Weltpunkte neben der Mitte.
  const x = SPUR.x + SPUR.width / 2 + 9 / 0.43;
  assert.equal(zoneAt([SPUR], x, SPUR.y + 100), null);
  // Die Nachbarspur beginnt 32,4 Punkte weiter: der Punkt liegt 1,7 Punkte vor
  // ihrem Rand. Eine Toleranz, die ihn der BEW-Spur zuschlägt, müsste über die
  // MUM-Spur hinweggreifen — und ein Marker auf der falschen Spur verfälscht
  // still einen Wert. Darum gibt es sie nicht.
  const MUM = { ...SPUR, id: 'mum', label: 'Dörfler 2: Mumm', x: 221.8 };
  assert.ok(x < MUM.x, 'die Rechnung stimmt nicht mehr: der Punkt liegt schon in der Nachbarspur');
  assert.ok(MUM.x - x < 2, 'der Punkt liegt näher an der Nachbarspur als an seiner eigenen');
});

test('AX1: der Zonen-Block zeichnet beim Ziehen auch die stillgelegten', () => {
  const i = source.indexOf('<ZoneOverlay');
  const before = source.slice(0, i);
  const block = before.slice(before.lastIndexOf('{!setupMode'));
  assert.match(block, /dragActive \|\| zoneShownInPlay/,
    'der Block zeichnet beim Ziehen nicht alle Zonen');
  const tag = source.slice(i, source.indexOf('/>', i) + 2);
  assert.match(tag, /all=\{tableZones\}/,
    'ohne alle Zonen kann das Schild seine Lage nicht gegen sie prüfen (M16.1)');
});

test('AX1: das Schild hängt weiter allein an zoneShownInPlay', () => {
  // AS3: zwölf Leistenschilder über drei Tableaus waren ein unleserlicher
  // grauer Fleck über genau dem Aufdruck, den sie beschreiben. Gezogen wird
  // auf einen Rahmen, nicht auf einen Namen.
  assert.match(overlay, /const labelled = zoneShownInPlay\(zone\)/);
  assert.match(overlay, /\{labelled && \(/);
});

test('AX1: ein Zug gilt, sobald er wandert – und alle vier Arten laufen dort zusammen', () => {
  // `draggingCard` ist schon beim Druck gesetzt; hinge die Sichtbarkeit daran,
  // blitzten die Zonen bei jedem Klick auf eine Karte auf.
  assert.doesNotMatch(source, /setDragActive\(true\)[\s\S]{0,40}DragStart/);
  // Gesetzt in der einen Stelle, die Karte, Objekt und Hand-zu-Tisch verteilt.
  const move = source.slice(source.indexOf('function handleGlobalMove'),
    source.indexOf('function handleGlobalMouseMove'));
  assert.match(move, /setDragActive\(true\)/, 'handleGlobalMove setzt den Zustand nicht');
  // Und zurückgesetzt an beiden Enden – `handleGlobalTouchCancel` ruft
  // `handleGlobalEnd` nicht auf, dort steht jeder Zugzustand einzeln.
  const end = source.slice(source.indexOf('function handleGlobalEnd'),
    source.indexOf('function handleGlobalMouseUp'));
  assert.match(end, /setDragActive\(false\)/, 'handleGlobalEnd setzt den Zustand nicht zurück');
  const cancel = source.slice(source.indexOf('function handleGlobalTouchCancel'));
  assert.match(cancel.slice(0, 3000), /setDragActive\(false\)/,
    'ein abgebrochener Touch lässt die Zonen stehen');
});
