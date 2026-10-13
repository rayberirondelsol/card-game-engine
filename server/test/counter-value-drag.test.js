// AU / Spec M15.7 — ruhiger Druck öffnet das Eingabefeld, wandernder zieht den Zähler.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund N8 der siebten Solopartie: ein Zug, der auf dem **Wert** beginnt,
// bewegte den Zähler nicht und tat auch sonst nichts, ohne Meldung. Der Spieler
// hat den Münztopf erst 540 Weltpunkte weit verschleppt und ihn dann dreimal
// nicht zurückziehen können.
//
// **Zwei Korrekturen am Befund**, beide am Code gemessen und in
// `docs/tasks-partie7.md`, „Wo die Spec nicht stimmt (Teil 2)", Punkt 10
// begründet:
//
// 1. Die Wertanzeige stoppte nur `onMouseDown`, **nicht** `onTouchStart` — auf
//    dem Finger zog der Zähler schon vorher. Der Befund ist ein Mausbefund.
// 2. „Nur der Namensstreifen trägt den Zug" ist falsch: `−` und `+` stoppen nur
//    `onClick`, nicht `onMouseDown`, von ihnen aus zog der Zähler ebenfalls.
//    Dafür **feuerten** sie am Ende eines Zuges mit — Druck und Loslassen auf
//    demselben Knopf ergeben einen `click`, genau die Begründung aus
//    `barPassthrough.js`. Derselbe Fehler am „Roll"-Knopf jedes Würfels.
//
// Beides ist dieselbe Ursache, und sie wird mit der Mechanik aus M14.5 erledigt
// statt mit einer zweiten: `passedSlop` entscheidet ruhig gegen wandernd, und
// das vorhandene Klick-Veto (`barClickRef` + das eine `onClickCapture` am
// Tischbehälter) nimmt dem Knopf den Klick, der nach einem Zug noch kommt.

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

/**
 * Der Eigenschaftenblock des JSX-Elements, in dem diese Kennung steht: von der
 * Zeile mit `<` bis zu der Zeile, die ihn schliesst (`>` oder `/>`).
 */
function element(testid) {
  const lines = source.split('\n');
  const i = lines.findIndex(l => l.includes(`data-testid={\`${testid}`));
  assert.ok(i >= 0, `${testid} gibt es nicht mehr`);
  let open = i;
  while (open > 0 && !/^\s*</.test(lines[open])) open--;
  let close = i;
  while (close < lines.length - 1 && !/^\s*\/?>\s*$/.test(lines[close])) close++;
  return lines.slice(open, close + 1).join('\n');
}

test('AU1: die Wertanzeige nimmt den Druck nicht mehr weg', () => {
  const span = element('counter-value-${counter');
  assert.doesNotMatch(span, /onMouseDown/,
    'die Wertanzeige stoppt den Druck weiterhin – der Zug kommt nicht am Zähler an');
  // Der Klick bleibt ihr: er öffnet das Eingabefeld (Abnahme 2).
  assert.match(span, /startCounterEdit/);
});

test('AU1: das Eingabefeld behaelt seinen Druck – Tippen verschiebt nichts', () => {
  const input = element('counter-value-input-${counter');
  assert.match(input, /onMouseDown=\{\(e\) => e\.stopPropagation\(\)\}/);
  assert.match(input, /onTouchStart=\{\(e\) => e\.stopPropagation\(\)\}/);
});

test('AU2: ein Objektzug merkt sich seinen Druckpunkt', () => {
  assert.match(body('handleObjDragStart'), /objPressRef\.current = /,
    'handleObjDragStart merkt den Druckpunkt nicht');
});

test('AU2: wandert der Zug über die Schwelle, gehoert der Klick niemandem', () => {
  const move = body('handleObjDragMove');
  assert.match(move, /passedSlop\(objPressRef\.current/,
    'handleObjDragMove fragt die Schwelle aus M14.5 nicht');
  assert.match(move, /barClickRef\.current = true/,
    'das vorhandene Klick-Veto wird nicht gesetzt');
});

test('AU2: es bleibt bei einer Schwelle und einem Veto', () => {
  // Keine zweite Zahl neben BAR_SLOP und keine zweite Veto-Stelle: `passedSlop`
  // kommt aus `barPassthrough.js`, das `onClickCapture` steht einmal.
  assert.match(source, /import \{ passedSlop[^}]*\} from '\.\.\/utils\/barPassthrough\.js'/);
  assert.equal((source.match(/onClickCapture=/g) || []).length, 1,
    'ein zweites onClickCapture ist eine zweite Antwort auf dieselbe Frage');
});
