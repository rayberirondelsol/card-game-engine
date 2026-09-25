// M12.2 und M12.4 — was der Tisch **nicht** tun darf (AB1, AD1).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Zwei Befunde aus der fünften Solopartie, die kein reines Modul fangen kann,
// weil sie nicht im Rechnen stehen, sondern in dem, was aufgerufen wird:
//
//   M12.2  „Save current view" rief `window.prompt`. Die Umgebung antwortet
//          `prompt() is not supported`, der Rückgabewert ist `null`, die
//          Funktion kehrt still um: keine Ansicht, keine Meldung. Es war die
//          einzige Stelle im ganzen Tisch mit einem Browserdialog.
//   M12.4  Über 13 500 `[TouchDetection]`-Zeilen in einer Partie haben ältere
//          Ausgaben aus dem Puffer verdrängt — und die Konsole ist das
//          Werkzeug, mit dem jeder dieser Berichte entstanden ist.
//
// Der Client hat keine Testinfrastruktur (CLAUDE.md). Geprüft wird deshalb die
// Quelle, nach dem Muster von `table-bars.test.js`. Begründung in
// `docs/tasks-partie5.md`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CLIENT_SRC = fileURLToPath(new URL('../../client/src/', import.meta.url));

/** Jede Quelldatei unter `client/src/`, rekursiv. */
function sources(dir = CLIENT_SRC) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sources(full));
    else if (/\.jsx?$/.test(name)) out.push(full);
  }
  return out;
}

const FILES = sources();
const rel = (f) => path.relative(CLIENT_SRC, f).replace(/\\/g, '/');

/**
 * Jede Zeile, die `re` trifft, als "datei:zeile  text".
 *
 * Reine Kommentarzeilen zählen nicht: gesucht wird, was **aufgerufen** wird.
 * Die Begründung, warum `window.prompt` verschwunden ist, steht genau dort,
 * wo es stand, und muss den Namen nennen dürfen.
 */
const COMMENT = /^\s*(?:\/\/|\*|\/\*)/;

function hits(re, files = FILES) {
  const found = [];
  for (const file of files) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (!COMMENT.test(line) && re.test(line)) found.push(`${rel(file)}:${i + 1}  ${line.trim()}`);
    });
  }
  return found;
}

// ── M12.2: kein Browserdialog am Tisch ───────────────────────────────────────

// „Im ganzen Tisch" ist der Tisch: `GameTable.jsx`, seine Bausteine und seine
// Module. `GameDetail.jsx` ist die Spiel-Detailseite und nicht gemeint — dort
// stehen `confirm`-Rückfragen vor dem Löschen, die ein eigener Befund wären.
const TABLE = FILES.filter(f => {
  const r = rel(f);
  return r === 'pages/GameTable.jsx' || r.startsWith('components/') || r.startsWith('utils/');
});

test('M12.2 Abnahme 2: kein window.prompt, confirm oder alert im ganzen Tisch', () => {
  // Zwei Zweige, weil `window.prompt(` und das nackte `prompt(` sich in dem
  // unterscheiden, was **davor** stehen darf: dort ein Punkt, hier keiner.
  const found = hits(/window\s*\.\s*(?:prompt|confirm|alert)\s*\(|(?<![\w.$])(?:prompt|confirm|alert)\s*\(/, TABLE);
  assert.deepEqual(found, [], `Browserdialog am Tisch:\n${found.join('\n')}`);
});

test('M12.2 Abnahme 1: die Ansicht bekommt denselben Dialog wie „Save Game"', () => {
  const gameTable = readFileSync(path.join(CLIENT_SRC, 'pages/GameTable.jsx'), 'utf8');
  // Nicht ein zweiter Dialog neben „Save Game", sondern derselbe Baustein.
  assert.match(gameTable, /data-testid="view-save-modal"/, 'es gibt keinen Dialog für den Namen');
  assert.match(gameTable, /data-testid="view-name-input"/, 'es gibt kein Eingabefeld');
  assert.match(gameTable, /data-testid="view-save-confirm-btn"/, 'es gibt keinen Bestätigungsknopf');
  // Und er schreibt in die geprüfte Logik, statt eine zweite danebenzustellen.
  assert.match(gameTable, /putView\(/, '`putView` wird nicht mehr aufgerufen');
});

// ── M12.4: die Konsole bleibt ein Werkzeug ───────────────────────────────────

test('M12.4 Abnahme 1: eine gespielte Runde erzeugt keine Debugausgaben', () => {
  const found = hits(/console\s*\.\s*(?:log|debug|info|trace|dir|table|group|time|count)\s*\(/);
  assert.deepEqual(found, [], `Debugausgabe im Client:\n${found.join('\n')}`);
});

test('M12.4 Abnahme 2: Fehler und Warnungen erscheinen weiterhin', () => {
  // Kein Kahlschlag: wer die Debugzeilen mit einem Suchen-und-Ersetzen über
  // alle `console.` entfernt, nimmt die Diagnose gleich mit — und das ist
  // genau der Schaden, gegen den M12.4 steht.
  assert.ok(hits(/console\s*\.\s*(?:warn|error)\s*\(/).length > 0,
    'es steht keine einzige Warnung oder Fehlermeldung mehr im Client');
});
