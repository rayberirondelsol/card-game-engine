// AL / Spec M14.11 — man sieht einem Würfel an, ob er gerollt hat.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Befund der sechsten Solopartie: beim zweiten Angriff Henlos zeigte der
// Würfel vor und nach dem Klick eine 4. Ob der Wurf stattgefunden hat und
// zufällig wieder 4 fiel oder ob der Klick verlorenging, war nicht
// feststellbar. Der Spieler hat konservativ entschieden — zu seinen Ungunsten.
//
// **Die Spec verlangt „eine kurze sichtbare Rückmeldung beim Wurf". Die gibt
// es längst:** alle drei Würfelarten zeigen 800 ms lang `animate-bounce`,
// zählen die Augenzahl zehnmal durch und schreiben `...` auf den Knopf. Was
// fehlt, ist eine **bleibende** Spur — wer 800 ms lang nicht hinsieht, steht
// hinterher vor derselben Frage. Ein mitlaufender Wurfzähler beantwortet sie
// auch eine Minute später.
//
// Begründung in `docs/tasks-partie6.md`, „Wo die Spec nicht stimmt", Punkt 6.
//
// Der Client hat keine Testinfrastruktur (CLAUDE.md), und der Zähler ist eine
// Zeile in drei Wurffunktionen — also wird die Quelle gelesen, nach dem Muster
// von `table-bars.test.js`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

/** Der Rumpf einer Funktion, ab ihrer Zeile bis zur nächsten `function`. */
function body(name) {
  const lines = source.split('\n');
  const i = lines.findIndex(l => l.includes(`function ${name}(`));
  assert.ok(i >= 0, `${name} gibt es nicht mehr`);
  const next = lines.findIndex((l, k) => k > i && /^\s{0,2}function \w/.test(l));
  return lines.slice(i, next > i ? next : lines.length).join('\n');
}

test('AL1: jede der drei Wurfarten zählt ihren Wurf', () => {
  for (const fn of ['rollDie', 'rollCustomDie', 'rollHitDie']) {
    assert.match(body(fn), /rolls:\s*\(?\w+\.rolls\s*\|\|\s*0\)?\s*\+\s*1/,
      `${fn} zählt seinen Wurf nicht`);
  }
});

test('AL1: der Zähler steht am Würfel, nicht nur im Zustand', () => {
  // Drei Anzeigen – eine je Würfelart. Ohne sie wäre der Zähler unsichtbar,
  // und der Befund unverändert.
  assert.equal((source.match(/data-testid=\{`die-rolls-/g) || []).length, 3,
    'nicht jede Würfelart zeigt ihren Wurfzähler');
});

test('AL1: wo `rolling` angelegt wird, steht auch der Wurfzähler', () => {
  // Drei Anlegestellen (`createDie`, `createHitDie`, das Aufstellen eines
  // eigenen Würfels) und drei Wiederherstellungen aus einem Spielstand. Fehlt
  // der Zähler an einer, zeigt der erste Wurf dort „NaN" – oder er fällt beim
  // Laden auf 0 zurück und behauptet, es sei nie gewürfelt worden.
  const lines = source.split('\n');
  const stellen = lines.map((l, i) => [l, i]).filter(([l]) => /^\s*rolling: false,/.test(l));
  assert.ok(stellen.length >= 6, `nur ${stellen.length} Stellen mit \`rolling: false\``);
  for (const [, i] of stellen) {
    assert.match(lines.slice(i - 1, i + 2).join('\n'), /rolls:/,
      `Zeile ${i + 1}: kein Wurfzähler neben \`rolling\``);
  }
});
