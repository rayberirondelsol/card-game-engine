// BL / Spec M19.6 — angelegt trägt die Karte selbst.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund der zehnten Partie (Prüfpunkt 1): M18 unterscheidet angelegt von
// weggepackt über die **Zone** — und das bleibt so, „angelegt" ist eine Lage und
// kein Feld an der Karte. Gezeichnet wird die Unterscheidung aber nur an der
// **Fläche**; wer die Karte ansieht, sieht ihr nichts an.
//
// Nachgemessen in den Daten des Aufbaus *TFT Kurzpartie* (45 Zonen): genau die
// fünfzehn Ausrüstungs-Slots tragen `color: "green"`, alle dreißig anderen
// tragen `null`. Die Farbe ist also die einzige Aussage dieser Art, die ein
// Setup an einer Zone treffen kann, ohne ein Feld zu erfinden — und daraus wird
// die Darstellung abgeleitet. Begründung in `docs/tasks-partie10.md`, BL.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { cardTint, ZONE_COLOR_HEX } from '../../shared/zoneGeometry.js';

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');

/** Ein Slot und der Vorrat darunter, mit den Maßen aus `zone_data` (BH). */
const SLOT = {
  id: 'brust', label: 'Dörfler 1: Brust', color: 'green',
  x: 150, y: 1808, width: 100, height: 140, accepts: ['card'], capacity: 1, layout: 'row',
};
const VORRAT = {
  id: 'vorrat', label: 'Ausrüstung Dörfler 1', color: null,
  x: 150, y: 2000, width: 500, height: 280, accepts: ['card'], capacity: 5, layout: 'grid',
};
const ZONES = [VORRAT, SLOT];

const card = (x, y) => ({ tableId: 't1', x, y });

test('BL Abnahme 1: eine Karte in einer farbigen Zone bekommt deren Farbe', () => {
  assert.equal(cardTint(ZONES, card(200, 1878)), '#22c55e');
});

test('BL Abnahme 1: eine Karte im farblosen Vorrat bekommt nichts', () => {
  assert.equal(cardTint(ZONES, card(400, 2140)), null);
});

test('BL Abnahme 1: eine Karte außerhalb jeder Zone bekommt nichts', () => {
  assert.equal(cardTint(ZONES, card(5, 5)), null);
});

test('BL Abnahme 1: kaputte Eingabe wirft nicht', () => {
  assert.equal(cardTint(null, card(200, 1878)), null);
  assert.equal(cardTint(ZONES, null), null);
  assert.equal(cardTint(ZONES, { x: 'nein', y: undefined }), null);
  assert.equal(cardTint([{ ...SLOT, color: 'kein-name' }], card(200, 1878)), null,
    'ein unbekannter Farbname ist keine Farbe');
});

test('BL: bei überlappenden Zonen gewinnt die spätere – wie bei zoneAt', () => {
  // Die Slots stehen in den Daten hinter `Ausrüstung Dörfler N`. Eine zweite
  // Suche danebenzustellen wäre eine zweite Antwort (M6).
  const ueberlappend = { ...VORRAT, x: 150, y: 1808, width: 500, height: 500 };
  assert.equal(cardTint([ueberlappend, SLOT], card(200, 1878)), '#22c55e');
  assert.equal(cardTint([SLOT, ueberlappend], card(200, 1878)), null);
});

test('BL Abnahme 2: die Farbtabelle steht genau einmal im Projekt', () => {
  const overlay = read('../../client/src/components/ZoneOverlay.jsx');
  const table = read('../../shared/zoneGeometry.js');
  assert.match(table, /ZONE_COLOR_HEX/, 'die Tabelle liegt in shared/');
  assert.equal(ZONE_COLOR_HEX.green, '#22c55e');
  assert.ok(!/const COLOR_HEX\s*=\s*\{/.test(overlay),
    'ZoneOverlay hält keine eigene Tabelle mehr');
  assert.match(overlay, /ZONE_COLOR_HEX/, 'ZoneOverlay liest dieselbe Tabelle');
});

test('BL Abnahme 2: die Karte am Tisch liest cardTint, nicht eine zweite Rechnung', () => {
  const table = read('../../client/src/pages/GameTable.jsx');
  assert.match(table, /cardTint\(/, 'renderCard fragt cardTint');
  // Rangfolge: Vorgänge bleiben vorn, die Zonenfarbe ersetzt nur den
  // Ruhezustand. Sonst stünde beim Ziehen die Herkunft über dem Ziel.
  assert.match(table, /isDropTarget[\s\S]{0,400}isSelected[\s\S]{0,400}tint/,
    'Ziel-Leuchten und Auswahl stehen vor der Zonenfarbe');
});
