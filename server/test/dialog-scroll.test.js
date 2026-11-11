// Dialoge, die mit den Aufbau-Optionen wachsen, muessen scrollen koennen.
//
// Befund (Produktion): „Create Room" mit TFT und vier Doerflern ist ~974 px
// hoch; auf 726 px Viewport waren Kopf und Knopf unerreichbar. Quelltest, der
// Client hat keine Testinfrastruktur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => readFileSync(fileURLToPath(new URL(`../../client/src/components/${name}`, import.meta.url)), 'utf8');

for (const name of ['CreateRoomModal.jsx', 'SetupChoiceDialog.jsx']) {
  test(`${name}: Dialog ist hoehenbegrenzt und scrollt, der Rand bleibt frei`, () => {
    const src = read(name);
    assert.match(src, /fixed inset-0[^"]*\bp-4\b/, 'Overlay ohne Rand beruehrt den Bildschirmrand');
    assert.match(src, /rounded-xl[^"]*\bmax-h-\[90vh\][^"]*\boverflow-y-auto\b/, 'Dialog waechst sonst ueber den Bildschirm');
  });
}
