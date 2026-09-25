// AG / Spec M14.6 — „Enlarge" nutzt das Fenster aus.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Befund der sechsten Solopartie: das Bösewicht-Tableau trägt Stufen-
// fähigkeit und Schwäche, davon hängt jede Kampfrunde ab — über „Enlarge" war
// es nicht zu entziffern. Der Umweg war der Tischzoom auf 151 %.
//
// **Die Spec sagt „feste ~400 px". Das stimmt nicht.** Beide Vorschauen
// rechneten schon mit dem Fenster: `height: 74vh`, `maxWidth: 92vw`,
// Seitenverhältnis erhalten. Bei 794 px Fensterhöhe sind das 587 px Höhe, für
// ein 1:2-Tableau also 294 px Breite — 26 % der Fensterhöhe lagen brach, und
// `maxWidth: 92vw` greift bei einem hochkant stehenden Stück nie.
//
// **Und Einpassen allein macht es nicht lesbar.** Ein 1:2-Tableau, das ganz
// ins Fenster passen soll, kann bei 794 px Höhe höchstens rund 350 px breit
// werden — weniger als die 453 px, die der Tischzoom geliefert hat. Deshalb
// zwei Stellungen: eingepasst (so groß wie möglich, nichts läuft über) und auf
// Fensterbreite (senkrecht gescrollt). Begründung in `docs/tasks-partie6.md`,
// „Wo die Spec nicht stimmt", Punkt 3.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { previewBox, PREVIEW_CHROME_PX } = await import('../../client/src/utils/tableObjectView.js');

const TABLEAU = { w: 300, h: 600 };
const KARTE = { w: 744, h: 744 };

test('AG1: eingepasst begrenzt die Vorschau beide Achsen', () => {
  const box = previewBox(TABLEAU);
  assert.equal(box.aspectRatio, '300 / 600');
  assert.ok(box.maxHeight, 'ohne Höhengrenze läuft ein hohes Stück aus dem Fenster');
  assert.ok(box.maxWidth, 'ohne Breitengrenze läuft ein breites Stück aus dem Fenster');
  assert.equal(box.height, box.maxHeight, 'die Höhe ist die Grenze, nicht nur ein Deckel');
});

test('AG1: eingepasst ist mehr Fenster als die bisherigen 74 vh', () => {
  // Der Bericht misst in einem 794 px hohen Fenster. Darunter stehen nur zwei
  // Textzeilen – 74 % waren zu vorsichtig.
  const fenster = 794;
  assert.ok(fenster - PREVIEW_CHROME_PX > 0.74 * fenster,
    `${fenster - PREVIEW_CHROME_PX} px sind nicht mehr als die bisherigen ${0.74 * fenster} px`);
  // Und die Beschriftung darunter braucht wirklich Platz: Name plus Hinweis.
  assert.ok(PREVIEW_CHROME_PX >= 60, 'die Beschriftung unter dem Bild fiele aus dem Fenster');
});

test('AG2: auf Fensterbreite gibt die Breite vor und lässt die Höhe laufen', () => {
  const box = previewBox(TABLEAU, true);
  assert.equal(box.aspectRatio, '300 / 600');
  assert.ok(box.width, 'ohne Breitenvorgabe ist die zweite Stellung dieselbe wie die erste');
  assert.equal(box.height, undefined, 'die Höhe darf laufen, sonst wird nichts größer');
  assert.equal(box.maxHeight, undefined);
});

test('AG1: eine quadratische Karte wird nicht kleiner als bisher', () => {
  const box = previewBox(KARTE);
  assert.equal(box.aspectRatio, '744 / 744');
  // Bei 1:1 begrenzt in einem breiten Fenster die Höhe – und die ist gewachsen.
  assert.equal(box.height, previewBox(TABLEAU).height);
});

test('AG1: ein Stück ohne brauchbare Maße ist quadratisch, nicht NaN', () => {
  for (const r of [null, undefined, {}, { w: 0, h: 0 }, { w: 'zwei', h: -1 }]) {
    assert.equal(previewBox(r).aspectRatio, '1 / 1', `${JSON.stringify(r)} ergibt kein Verhältnis`);
  }
});

// ── Die Verdrahtung. Der Client hat keine Testinfrastruktur (CLAUDE.md), also
//    wird die Quelle gelesen – nach dem Muster von `table-bars.test.js`.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

test('AG1: beide Vorschauen rechnen an derselben Stelle', () => {
  assert.doesNotMatch(source, /74vh/, 'irgendwo steht wieder eine feste Vorschaugröße');
  // Token (M11.6) und Karte (M10.2) – zwei Aufrufe, eine Rechnung.
  assert.equal((source.match(/previewBox\(/g) || []).length, 2,
    'nicht beide Vorschauen fragen `previewBox`');
});

test('AG2: der Umschalter ist ein Knopf und fingergroß', () => {
  const lines = source.split('\n');
  const i = lines.findIndex(l => l.includes('data-testid="token-preview-zoom-btn"'));
  assert.ok(i >= 0, 'es gibt keinen Umschalter');
  const el = lines.slice(Math.max(0, i - 4), i + 4).join('\n');
  assert.match(el, /min-w-\[44px\]/, `zu schmal für einen Finger:\n${el}`);
  assert.match(el, /min-h-\[44px\]/, `zu niedrig für einen Finger:\n${el}`);
  // Ein `<button>` und kein `<div>`: sonst gäbe es keinen Tastaturweg.
  assert.ok(lines.slice(Math.max(0, i - 4), i).some(l => l.includes('<button')),
    'der Umschalter ist kein Knopf – die Tastatur erreicht ihn nicht');
});
