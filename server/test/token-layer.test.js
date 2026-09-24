// M8.2 – eine Figur auf einem Gelaende-Terrain ist weder sichtbar noch greifbar.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Regel ist "je groesser die Grundflaeche, desto weiter hinten". Was oben
// liegt, bekommt auch den Zeiger – Trefferflaeche und Zeichenreihenfolge sind
// derselbe Wert. Geprueft wird deshalb nur die Reihenfolge; ein Browser kommt
// dafuer nicht ins Spiel (der Client hat keine Testinfrastruktur).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { tokenLayers, TOKEN_Z_FLOOR } = await import('../../client/src/utils/tokenLayer.js');

const figur = { id: 'f', width: 100, height: 100 };
const gelaende = { id: 'g', width: 300, height: 150 };
const hauptplan = { id: 'p', width: 1200, height: 1000 };

test('Abnahme 1+2: die kleinere Figur liegt ueber dem Gelaendeteil', () => {
  const z = tokenLayers([gelaende, figur]);
  assert.ok(z(figur) > z(gelaende), `${z(figur)} > ${z(gelaende)}`);
});

test('Abnahme 4: zwei Stuecke gleicher Groesse bekommen denselben Wert', () => {
  const a = { id: 'a', width: 142, height: 142 };
  const b = { id: 'b', width: 142, height: 142 };
  const z = tokenLayers([a, b, figur]);
  assert.equal(z(a), z(b));
});

test('der Hauptplan liegt hinter allem, was auf ihm steht', () => {
  const z = tokenLayers([figur, hauptplan, gelaende]);
  assert.ok(z(hauptplan) < z(gelaende));
  assert.ok(z(gelaende) < z(figur));
});

test('kein Token faellt unter den bisherigen Wert 20', () => {
  assert.equal(TOKEN_Z_FLOOR, 20);
  const z = tokenLayers([figur, hauptplan, gelaende, { id: 'x', width: 30, height: 30 }]);
  for (const t of [figur, hauptplan, gelaende]) {
    assert.ok(z(t) >= TOKEN_Z_FLOOR, `${t.id}: ${z(t)}`);
  }
  assert.equal(z(hauptplan), TOKEN_Z_FLOOR, 'die groesste Flaeche behaelt 20');
});

test('die Flaeche wird wie beim Zeichnen gelesen: width/height, sonst size, sonst 30', () => {
  const alt = { id: 'alt', size: 60 };            // Spielstand von vor M3c
  const neu = { id: 'neu', width: 60, height: 60 };
  const ohne = { id: 'ohne' };                    // 30x30, der Rueckfall im Tisch
  const z = tokenLayers([alt, neu, ohne]);
  assert.equal(z(alt), z(neu), 'size und width/height meinen dasselbe');
  assert.ok(z(ohne) > z(neu), '30x30 ist kleiner als 60x60');
});

test('ein nicht-quadratisches Stueck zaehlt mit seiner Flaeche, nicht mit einer Kante', () => {
  // 600x100 (12x2 Felder) belegt 60 000, die Figur 10 000 – das Band liegt
  // hinten, obwohl es schmaler ist als der Hauptplan.
  const band = { id: 'b', width: 600, height: 100 };
  const z = tokenLayers([band, figur]);
  assert.ok(z(figur) > z(band));
});

test('ein unbekanntes Token und eine leere Liste werfen nicht', () => {
  const z = tokenLayers([]);
  assert.equal(z({ id: 'unbekannt', width: 50, height: 50 }), TOKEN_Z_FLOOR);
  assert.equal(tokenLayers(null)(figur), TOKEN_Z_FLOOR);
  assert.equal(tokenLayers(undefined)(null), TOKEN_Z_FLOOR);
});
