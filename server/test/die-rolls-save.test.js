// AT / Spec M15.6 — der Wurfzähler übersteht Speichern und Laden.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund N7 der siebten Solopartie: der „#n"-Zähler aus M14.11 stand nach
// sieben Würfen auf 7 und war beim nächsten Blick 0, bei gleicher Würfel-ID.
//
// Die Ursache ist eine **halbe Feldliste**: `loadGameState` liest `rolls` an
// allen drei Würfelarten (`rolls: d.rolls || 0`), `getGameState` schrieb es an
// keiner. Genau dieselbe Einseitigkeit wie bei `rotation` am Token (M7.1) und
// bei `category` an der Karte (AQ1) — ein Feld, das nur eine der beiden Listen
// führt, überlebt kein Speichern.
//
// Die Mechanik im Bericht stimmt dabei nicht: `performAutoSave` schreibt nur
// und lädt nichts zurück, der Zähler am Bildschirm fiel also nicht. Auf 0 stand
// er in dem, was der Spieler gelesen hat — im gespeicherten Zustand. Dasselbe
// Messproblem wie bei N4, hier aber mit einem echten Fehler darunter.
// Begründung in `docs/tasks-partie7.md`, „Wo die Spec nicht stimmt (Teil 2)",
// Punkt 9.
//
// Der Client hat keine Testinfrastruktur (CLAUDE.md), also wird die Quelle
// gelesen — Muster `table-bars.test.js`, wie schon bei `die-rolls.test.js`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

/** Die Feldliste, die `getGameState` für eine Würfelart schreibt. */
function written(list) {
  const start = source.indexOf(`      ${list}: `);
  assert.ok(start > 0, `getGameState schreibt ${list} nicht mehr`);
  const end = source.indexOf('\n      })),', start);
  assert.ok(end > start, `die Feldliste von ${list} ist nicht zu finden`);
  return source.slice(start, end);
}

test('AT: getGameState schreibt den Wurfzähler an allen drei Würfelarten', () => {
  for (const list of ['dice', 'hitDice', 'customDice']) {
    assert.match(written(list), /rolls:/, `${list} verliert den Wurfzähler beim Speichern`);
  }
});

test('AT: loadGameState liest ihn weiterhin an allen drei', () => {
  // Drei Lesestellen – ohne sie wäre das Schreiben wirkungslos.
  assert.ok((source.match(/rolls: d\.rolls \|\| 0/g) || []).length >= 3,
    'loadGameState liest den Wurfzähler nicht mehr an allen drei Würfelarten');
});
