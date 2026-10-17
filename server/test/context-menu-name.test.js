// CF/CG / Spec M24.4 (Ä1, Ä2) — das Kontextmenü nennt das Stück und füllt
// nicht mehr den Bildschirm.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Ä2 (Partie 9): das Menü sagte „STACK ACTIONS" und sonst nichts; bei acht
// gleich aussehenden Rückseiten kostete jede Identifizierung zwei Klicks über
// „Enlarge".
//
// Ä1 (Partie 9, nachgemessen 2026-10-17): 23 Einträge, 924 × 726 Punkte in
// einem Fenster von 932 × 742 — 99 % der Breite, 98 % der Höhe. Neun davon
// sind `Reveal Top Card to "…"`, und **die langen Zonennamen machen die
// Breite**. M23.2 hat sechs Ablagestapel gebaut, jeder ist ein Eintrag.
//
// Der Client hat keine Testinfrastruktur: die Rechnung steht in
// `tableObjectView.js` und wird hier geprüft, die Verdrahtung im JSX ist ein
// Einzeiler je Stelle und wird am Quelltext geprüft (wie `issue-band-collapsed`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { stackCaption, tableObjectView, HIDDEN_CAPTION } =
  await import('../../client/src/utils/tableObjectView.js');

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

// ── CG: wie ein Stapel heißt ────────────────────────────────────────────────

test('CG1: ein benannter Stapel steht mit Namen und Zahl da', () => {
  assert.equal(stackCaption('Dorf-Ereignisse', 80), 'Dorf-Ereignisse (80)');
});

test('CG2: ein am Tisch zusammengeschobener Stapel hat keinen Namen', () => {
  // Er ist trotzdem zu unterscheiden – über seine Höhe.
  assert.equal(stackCaption(null, 3), 'Stack: 3 cards');
  assert.equal(stackCaption(undefined, 1), 'Stack: 1 cards');
  assert.equal(stackCaption('', 12), 'Stack: 12 cards');
});

test('CG3: dieselbe Auskunft wie bisher – Wortlaut unverändert', () => {
  // `title=` und Schwebeschild sagten das schon, zweimal gleichlautend im JSX.
  // Hier steht es ab jetzt einmal (M6), und zwar wörtlich wie vorher.
  assert.equal(stackCaption('Nachschub (Tante Emma)', 20), 'Nachschub (Tante Emma) (20)');
});

test('CG4: eine verdeckte Einzelkarte verrät ihren Namen auch hier nicht', () => {
  const karte = { tableId: 'c1', name: 'Samuel Strawman', faceDown: true };
  assert.equal(tableObjectView(karte, 'Card').caption, HIDDEN_CAPTION);
  karte.faceDown = false;
  assert.equal(tableObjectView(karte, 'Card').caption, 'Samuel Strawman');
});

test('CG5: alle drei Stellen rufen stackCaption – keine zweite Formel', () => {
  assert.equal((source.match(/stackCaption\(/g) || []).length, 3);
  // Die beiden abgeschriebenen Formeln von vorher sind weg.
  assert.ok(!/\$\{stackNames\[stackId\]\} \(\$\{stackSize\}\)/.test(source),
    'eine der abgeschriebenen Stapelformeln steht noch im JSX');
  assert.ok(!/Stack: \$\{stackSize\} cards/.test(source),
    'eine der abgeschriebenen Stapelformeln steht noch im JSX');
});

test('CG6: die Kopfzeile des Menüs nennt das Stück statt „Stack Actions"', () => {
  const at = source.indexOf('data-testid="context-title"');
  assert.ok(at > 0, 'die Kopfzeile des Kontextmenüs ist nicht zu finden');
  // Der Text wird unmittelbar davor berechnet: Stapel über `stackCaption`,
  // Einzelkarte über `tableObjectView` (und damit verdeckt „Face down").
  const kopf = source.slice(at - 500, at + 200);
  assert.match(kopf, /contextMenu\.stackId[\s\S]*stackCaption\(stackNames\[contextMenu\.stackId\]/);
  assert.match(kopf, /tableObjectView\(tableCards\.find\(c => c\.tableId === contextMenu\.cardTableId\), 'Card'\)\.caption/);
  assert.ok(!/'Stack Actions'/.test(source), '„Stack Actions" steht noch da');
  assert.ok(!/'Card Actions'/.test(source), '„Card Actions" steht noch da');
});

// ── CF: die neun Aufdeck-Einträge ───────────────────────────────────────────

test('CF1: die Reveal-Einträge hängen hinter einem Sammeleintrag', () => {
  const toggle = source.indexOf('data-testid="context-reveal-toggle"');
  assert.ok(toggle > 0, 'es gibt keinen Sammeleintrag');
  assert.ok(source.includes('data-testid={`context-reveal-${zone.label}`}'),
    'die einzelnen Zonen sind weg');
  // Gezeichnet werden sie nur aufgeklappt, und zwar nach dem Sammeleintrag.
  const gezeichnet = source.indexOf('{revealOpen && revealTargets.map(eintrag)}');
  assert.ok(gezeichnet > toggle, 'die Zonen hängen nicht an revealOpen');
});

test('CF2: zugeklappt ist die Vorgabe, und jedes Öffnen fängt zugeklappt an', () => {
  assert.match(source, /const \[revealOpen, setRevealOpen\] = useState\(false\)/);
  // Nicht an jedem der zwölf `setContextMenu({…})`-Aufrufe, sondern einmal an
  // der Stelle, die ohnehin auf „neues Menü" hört – und vor dem Zeichnen.
  assert.match(source, /useLayoutEffect\(\(\) => \{ setRevealOpen\(false\); \}, \[contextMenu\]\);/);
});

test('CF3: aufklappen misst die Platzierung neu', () => {
  // `menuPlacement` kappt die Höhe nur, wenn das Menü nicht passt. Zugeklappt
  // passt es – wer die Messung dann nicht wiederholt, lässt das aufgeklappte
  // Menü unten aus dem Bild laufen (M2.9, derselbe Fehler wie M2.8).
  assert.match(source, /placedMenu\.for === contextMenu && placedMenu\.open === revealOpen/);
  assert.match(source, /\}, \[contextMenu, revealOpen\]\);/);
});

test('CF4: ein einzelner Ablagestapel bleibt ein Griff (M8.9)', () => {
  // Der Normalfall der Spec: genau eine Zone. Dann steht sie unmittelbar da,
  // ohne Sammeleintrag – sonst kostete M8.9 plötzlich zwei Klicks.
  assert.match(source, /if \(revealTargets\.length <= 1\) return revealTargets\.map\(eintrag\);/);
});

test('CF5: revealZones selbst bleibt unangetastet – das ist eine Regelfrage', () => {
  const rz = readFileSync(
    fileURLToPath(new URL('../../client/src/utils/revealToZone.js', import.meta.url)), 'utf8');
  assert.match(rz, /return piles\.length \? piles : cardZones;/);
});
