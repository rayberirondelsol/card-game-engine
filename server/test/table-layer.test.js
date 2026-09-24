// M9.1 – Karten, Wuerfel und Zaehler verschwinden unter den Brettern.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// M8.2 ordnete nur die Token. Karten bekamen ihren z-index aus einer eigenen,
// bei 1 beginnenden Reihe, Wuerfel/Zaehler/Notizen trugen `z-20` – denselben
// Wert wie der groesste Token, und da bei Gleichstand der spaetere im DOM
// gewinnt und die Token *nach* ihnen gezeichnet werden, lag der Hauptplan
// darueber.
//
// Geprueft wird nur die Reihenfolge; ein Browser kommt dafuer nicht ins Spiel
// (der Client hat keine Testinfrastruktur). Trefferflaeche und
// Zeichenreihenfolge sind derselbe Wert – was oben liegt, bekommt den Zeiger.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { tableLayers, WIDGET_BOX, TOKEN_Z_FLOOR } =
  await import('../../client/src/utils/tokenLayer.js');
const { getCardDims } = await import('../../client/src/utils/cardDims.js');

/** Der Hauptplan, als Token auf dem Tisch. */
const hauptplan = { key: 'token:plan', width: 1200, height: 1000 };
/** Eine RUFFIAN-Leiste: schmal, aber grossflaechig. */
const leiste = { key: 'token:leiste', width: 600, height: 100 };
/** Eine Figur von zwei mal zwei Feldern. */
const figur = { key: 'token:figur', width: 100, height: 100 };

function karte(id, zIndex, card = {}) {
  const { w, h } = getCardDims(card);
  return { key: `card:${id}`, width: w, height: h, zIndex };
}

function widget(kind, id) {
  return { key: `${kind}:${id}`, ...WIDGET_BOX[kind] };
}

test('Abnahme 1+2: eine Karte auf einem Brett liegt darueber', () => {
  const z = tableLayers([hauptplan, karte('aktion', 1)]);
  assert.ok(
    z('card:aktion') > z('token:plan'),
    `Karte ${z('card:aktion')} muss ueber dem Brett ${z('token:plan')} liegen`,
  );
});

test('Abnahme 3: ein Zaehler an einer Leiste liegt ueber der Leiste', () => {
  const z = tableLayers([hauptplan, leiste, widget('counter', 'leben')]);
  assert.ok(z('counter:leben') > z('token:leiste'));
  assert.ok(z('counter:leben') > z('token:plan'));
});

test('Abnahme 4: ein neuer Wuerfel liegt ueber dem Hauptplan', () => {
  const z = tableLayers([hauptplan, widget('die', 'd6')]);
  assert.ok(z('die:d6') > z('token:plan'));
});

test('Abnahme 5: die Ordnung der Token untereinander bleibt', () => {
  const z = tableLayers([hauptplan, leiste, figur]);
  assert.ok(z('token:plan') < z('token:leiste'));
  assert.ok(z('token:leiste') < z('token:figur'));
  assert.equal(z('token:plan'), TOKEN_Z_FLOOR, 'die groesste Flaeche behaelt 20');
});

test('M8.2 Abnahme 4: zwei gleich grosse Token behalten ihre DOM-Reihenfolge', () => {
  // Frueher trugen beide denselben Wert und das DOM entschied. Jetzt
  // entscheidet die Zahl – und zwar genauso: der spaetere liegt oben.
  const frueh = { key: 'token:a', width: 142, height: 142 };
  const spaet = { key: 'token:b', width: 142, height: 142 };
  const z = tableLayers([frueh, spaet, figur]);
  assert.ok(z('token:b') > z('token:a'), 'der spaetere im DOM liegt oben');
});

test('Z2: Karten gleicher Groesse behalten ihre eigene Reihe', () => {
  // Zwei offen abgelegte Aktionskarten liegen in derselben Zone genau
  // uebereinander (M8.9 Nachtrag 2). Wer oben liegt, sagt `card.zIndex`.
  const unten = karte('unten', 3);
  const oben = karte('oben', 7);
  const z = tableLayers([hauptplan, ...[unten, oben].sort((a, b) => a.zIndex - b.zIndex)]);
  assert.ok(z('card:oben') > z('card:unten'));
  assert.ok(z('card:unten') > z('token:plan'));
});

test('Z3: der Wuerfel liegt ueber dem Zaehler, der Zaehler ueber der Notiz', () => {
  const z = tableLayers([
    hauptplan,
    widget('note', 'n'),
    widget('counter', 'c'),
    widget('die', 'd'),
  ]);
  assert.ok(z('die:d') > z('counter:c'));
  assert.ok(z('counter:c') > z('note:n'));
  assert.ok(z('note:n') > z('token:plan'));
});

test('Z3: jede Bedienwidget-Sorte hat ein Mass', () => {
  for (const kind of ['die', 'hitDie', 'customDie', 'counter', 'note', 'textField']) {
    const box = WIDGET_BOX[kind];
    assert.ok(box && box.width > 0 && box.height > 0, `${kind} ohne Mass`);
  }
});

test('die Flaeche wird wie beim Zeichnen gelesen: width/height, sonst size, sonst 30', () => {
  const alt = { key: 'token:alt', size: 60 };            // Spielstand von vor M3c
  const neu = { key: 'token:neu', width: 60, height: 60 };
  const ohne = { key: 'token:ohne' };                    // 30x30, der Rueckfall im Tisch
  const z = tableLayers([alt, neu, ohne]);
  assert.ok(z('token:neu') > z('token:alt'), 'gleiche Flaeche, spaeter im DOM');
  assert.ok(z('token:ohne') > z('token:neu'), '30x30 ist kleiner als 60x60');
});

test('ein unbekannter Schluessel und eine leere Liste werfen nicht', () => {
  assert.equal(tableLayers([])('token:weg'), TOKEN_Z_FLOOR);
  assert.equal(tableLayers(null)('token:weg'), TOKEN_Z_FLOOR);
  assert.equal(tableLayers(undefined)(null), TOKEN_Z_FLOOR);
});
