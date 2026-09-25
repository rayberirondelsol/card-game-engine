// AF2 / Spec M14.5 — ein Zug auf einer Bedienleiste gehört dem Tisch darunter.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Befund der sechsten Solopartie: der Bösewicht stand auf `H13:I14` und
// damit auf Bildschirmhöhe von „Dorfereignis ziehen" (x 150–292, y 65–110).
// Der Zug bewegte ihn nicht, sondern feuerte den Knopf — zweimal unbemerkt, je
// drei Ereigniskarten.
//
// **Warum `pointer-events` allein das nicht löst.** Der Druck landete auf dem
// Knopf selbst, nicht in der Lücke daneben. Ein Knopf, der Klicks annimmt,
// nimmt am selben Pixel auch den Zeigerdruck an; und weil ein `click` nur
// entsteht, wenn Druck und Loslassen auf demselben Element liegen, feuerte er
// obendrein — drei Rasterfelder bei 48 % Zoom sind rund 40–70 px, der Knopf ist
// 142 px breit.
//
// Die Unterscheidung ist deshalb **Klick gegen Zug**: bleibt der Zeiger in
// Ruhe, gehört der Druck dem Knopf; wandert er über die Schwelle, gehört er
// dem Stück darunter. Geprüft wird hier die Schwelle; welches Stück unter dem
// Druckpunkt liegt, beantwortet `pickTopmost` (geprüft in
// `pick-topmost.test.js`).
//
// Reine Logik, geprüft ohne Browser: der Client hat keine Testinfrastruktur.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { BAR_SLOP, passedSlop } = await import('../../client/src/utils/barPassthrough.js');

test('AF2: ein ruhiger Druck bleibt ein Klick', () => {
  const start = { clientX: 200, clientY: 80 };
  assert.equal(passedSlop(start, { clientX: 200, clientY: 80 }), false);
  // Genau auf der Schwelle ist noch kein Zug: ein zittriger Finger soll den
  // Knopf nicht verlieren.
  assert.equal(passedSlop(start, { clientX: 200 + BAR_SLOP, clientY: 80 }), false);
  assert.equal(passedSlop(start, { clientX: 200, clientY: 80 - BAR_SLOP }), false);
});

test('AF2: ein Weg über die Schwelle ist ein Zug – in jeder Richtung', () => {
  const start = { clientX: 200, clientY: 80 };
  for (const p of [
    { clientX: 200 + BAR_SLOP + 1, clientY: 80 },
    { clientX: 200 - BAR_SLOP - 1, clientY: 80 },
    { clientX: 200, clientY: 80 + BAR_SLOP + 1 },
    { clientX: 200, clientY: 80 - BAR_SLOP - 1 },
  ]) {
    assert.equal(passedSlop(start, p), true, `${JSON.stringify(p)} gilt nicht als Zug`);
  }
});

test('AF2: die Schwelle ist dieselbe wie beim Tippen auf eine Karte', () => {
  // `handleGlobalTouchMove` unterscheidet Tipp und Zug seit jeher bei 8 px.
  // Zwei Schwellen wären zwei Antworten auf dieselbe Frage.
  assert.equal(BAR_SLOP, 8);
});

test('AF2: unbrauchbare Punkte sind kein Zug', () => {
  assert.equal(passedSlop(null, { clientX: 1000, clientY: 1000 }), false);
  assert.equal(passedSlop({ clientX: 0, clientY: 0 }, null), false);
  assert.equal(passedSlop({ clientX: NaN, clientY: 0 }, { clientX: 500, clientY: 0 }), false);
});
