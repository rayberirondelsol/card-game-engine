// AV / Spec M15.8 — Griff und Kartenbibliothek lassen den Zug durch.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befunde N9 und N10 der siebten Solopartie: der Griff der eingeklappten
// Werkzeugleiste (38 × 38 mittig am unteren Rand) und die geöffnete
// Kartenbibliothek (die rechten ~110 Bildschirmpunkte) liegen über dem Tisch
// und schlucken jeden Druck. M14.5 hat die beiden **Leisten** durchlässig
// gemacht; diese zwei Flächen trugen das Attribut `data-bar-overlay` nie.
//
// **Die Bibliothek ist keine Leiste**, und das kostet eine Unterscheidung: sie
// hat einen Rollbereich (`flex-1 overflow-y-auto`) und ein Suchfeld. Beides
// lebt von einem wandernden Druck — auf dem Finger rollt man die Kartenliste,
// mit der Maus markiert man Text im Suchfeld. Gäbe man ihr dieselbe Behandlung
// wie einer Leiste, zöge ein Rollen das Stück darunter über den Tisch. Darum
// trägt das Attribut einen **Wert**, und die Entscheidung steht als reine
// Funktion neben der Schwelle, nicht als zweite Mechanik.
//
// Begründung in `docs/tasks-partie7.md`, „Wo die Spec nicht stimmt (Teil 2)",
// Punkte 11 und 12. Die Grenze der Mechanik steht dort ebenfalls: sie trägt
// **Züge**, keine Klicks — ein ruhiger Druck gehört der Fläche, sonst verlöre
// jeder Knopf seinen Klick.
//
// Reine Logik, geprüft ohne Browser: der Client hat keine Testinfrastruktur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { overlayPassesGesture } = await import('../../client/src/utils/barPassthrough.js');

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

test('AV1: ohne markierte Fläche wird nichts weitergegeben', () => {
  assert.equal(overlayPassesGesture({ kind: undefined }), false);
  assert.equal(overlayPassesGesture({ kind: null }), false);
  assert.equal(overlayPassesGesture({ kind: '' }), false);
  assert.equal(overlayPassesGesture(), false);
});

test('AV1: eine Leiste gibt weiter – mit Maus und mit Finger', () => {
  assert.equal(overlayPassesGesture({ kind: 'true' }), true);
  assert.equal(overlayPassesGesture({ kind: 'true', isTouch: true }), true);
});

test('AV1: eine Rollfläche gibt mit der Maus weiter, mit dem Finger nicht', () => {
  // Mit der Maus rollt man am Rad, nicht durch Ziehen – der Zug ist frei.
  assert.equal(overlayPassesGesture({ kind: 'scroll' }), true);
  // Auf dem Finger **ist** der Zug das Rollen. Verloren geht dabei fast nichts:
  // die Schublade ist dort fensterbreit oder 192 Punkte schmal.
  assert.equal(overlayPassesGesture({ kind: 'scroll', isTouch: true }), false);
});

test('AV1: ein Druck auf einem Eingabefeld gehört immer dem Feld', () => {
  for (const kind of ['true', 'scroll']) {
    for (const isTouch of [false, true]) {
      assert.equal(overlayPassesGesture({ kind, isTouch, onField: true }), false,
        `${kind}/${isTouch}: das Suchfeld verliert seine Textauswahl`);
    }
  }
});

test('AV2: Griff und Schublade sind markiert', () => {
  // Vier Flächen tragen das Attribut: Kopfleiste und Werkzeugleiste (M14.5),
  // Griff und Schublade (hier).
  assert.equal((source.match(/data-bar-overlay=/g) || []).length, 4,
    'nicht genau vier Flächen tragen das Attribut');
  assert.match(source, /data-testid="toolbar-show-btn"[\s\S]{0,400}?data-bar-overlay="true"/,
    'der eingeklappte Griff ist nicht markiert');
  assert.match(source, /data-bar-overlay="scroll"[\s\S]{0,400}?data-testid="card-drawer"/,
    'die Kartenbibliothek ist nicht als Rollfläche markiert');
});

test('AV2: handleGlobalStart entscheidet über die eine Funktion', () => {
  const lines = source.split('\n');
  const i = lines.findIndex(l => l.includes('function handleGlobalStart('));
  const next = lines.findIndex((l, k) => k > i && /^\s{0,2}function \w/.test(l));
  const start = lines.slice(i, next).join('\n');
  assert.match(start, /overlayPassesGesture\(/,
    'handleGlobalStart fragt die Funktion nicht');
  assert.match(start, /data-bar-overlay/,
    'handleGlobalStart sucht die Fläche nicht mehr');
});
