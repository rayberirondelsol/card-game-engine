// M8.2 – eine Figur auf einem Gelaende-Terrain ist weder sichtbar noch greifbar.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Regel ist "je groesser die Grundflaeche, desto weiter hinten". Was oben
// liegt, bekommt auch den Zeiger – Trefferflaeche und Zeichenreihenfolge sind
// derselbe Wert. Geprueft wird deshalb nur die Reihenfolge; ein Browser kommt
// dafuer nicht ins Spiel (der Client hat keine Testinfrastruktur).
//
// M9.1 hat `tokenLayers` (Flaeche → z-index) durch `tableLayers` (Objekt →
// z-index) ersetzt, damit Karten ihre eigene Reihe als Tie-Break behalten. Die
// Abnahmen von M8.2 gelten unveraendert weiter und stehen deshalb hier;
// M9.1 steht in table-layer.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { tableLayers, TOKEN_Z_FLOOR } = await import('../../client/src/utils/tokenLayer.js');

const figur = { key: 'f', width: 100, height: 100 };
const gelaende = { key: 'g', width: 300, height: 150 };
const hauptplan = { key: 'p', width: 1200, height: 1000 };

test('Abnahme 1+2: die kleinere Figur liegt ueber dem Gelaendeteil', () => {
  const z = tableLayers([gelaende, figur]);
  assert.ok(z('f') > z('g'), `${z('f')} > ${z('g')}`);
});

test('Abnahme 4: zwei Stuecke gleicher Groesse verhalten sich unveraendert', () => {
  // Frueher trugen beide denselben Wert und das DOM entschied, wer oben liegt.
  // Jetzt sagt es die Zahl – und zwar dasselbe: der spaetere im DOM liegt oben.
  const a = { key: 'a', width: 142, height: 142 };
  const b = { key: 'b', width: 142, height: 142 };
  const z = tableLayers([a, b, figur]);
  assert.ok(z('b') > z('a'), 'der spaetere im DOM liegt oben');
  assert.ok(z('f') > z('b'), 'die kleinere Figur bleibt ueber beiden');
});

test('der Hauptplan liegt hinter allem, was auf ihm steht', () => {
  const z = tableLayers([figur, hauptplan, gelaende]);
  assert.ok(z('p') < z('g'));
  assert.ok(z('g') < z('f'));
});

test('kein Token faellt unter den bisherigen Wert 20', () => {
  assert.equal(TOKEN_Z_FLOOR, 20);
  const z = tableLayers([figur, hauptplan, gelaende, { key: 'x', width: 30, height: 30 }]);
  for (const key of ['f', 'p', 'g', 'x']) {
    assert.ok(z(key) >= TOKEN_Z_FLOOR, `${key}: ${z(key)}`);
  }
  assert.equal(z('p'), TOKEN_Z_FLOOR, 'die groesste Flaeche behaelt 20');
});

test('die Flaeche wird wie beim Zeichnen gelesen: width/height, sonst size, sonst 30', () => {
  const alt = { key: 'alt', size: 60 };            // Spielstand von vor M3c
  const neu = { key: 'neu', width: 60, height: 60 };
  const ohne = { key: 'ohne' };                    // 30x30, der Rueckfall im Tisch
  const z = tableLayers([alt, neu, ohne]);
  assert.ok(z('neu') > z('alt'), 'size und width/height meinen dasselbe Mass');
  assert.ok(z('ohne') > z('neu'), '30x30 ist kleiner als 60x60');
});

test('ein nicht-quadratisches Stueck zaehlt mit seiner Flaeche, nicht mit einer Kante', () => {
  // 600x100 (12x2 Felder) belegt 60 000, die Figur 10 000 – das Band liegt
  // hinten, obwohl es schmaler ist als der Hauptplan.
  const band = { key: 'b', width: 600, height: 100 };
  const z = tableLayers([band, figur]);
  assert.ok(z('f') > z('b'));
});

test('ein unbekanntes Token und eine leere Liste werfen nicht', () => {
  const z = tableLayers([]);
  assert.equal(z('unbekannt'), TOKEN_Z_FLOOR);
  assert.equal(tableLayers(null)('f'), TOKEN_Z_FLOOR);
  assert.equal(tableLayers(undefined)(null), TOKEN_Z_FLOOR);
});
