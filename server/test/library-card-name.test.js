// AN2 / Spec K3 — Kartennamen in der Bibliothek brechen um, statt zu kürzen.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Bericht der sechsten Solopartie: „In der Bibliothek sind die Kartennamen
// in der Kachel abgeschnitten („WEDELNDER SCHW…"), gerade das ★ der Beutekarte
// fällt damit weg. Es steht nur im `title`-Attribut."
//
// `truncate` ist einzeilig und endet in einer Auslassung; was hinten steht,
// ist weg. Ein Zeichen am Ende des Namens ist aber genau das, was eine
// Beutekarte von einer gewöhnlichen unterscheidet.
//
// Reine Auszeichnung, also ein Quellentest — Muster `table-bars.test.js`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameDetail.jsx', import.meta.url)), 'utf8');

test('K3: der Kartenname in der Kachel wird nicht mehr abgeschnitten', () => {
  const lines = source.split('\n');
  const i = lines.findIndex(l => l.includes('data-testid={`card-name-${card.id}`}'));
  assert.ok(i >= 0, 'den Kartennamen in der Kachel gibt es nicht mehr');
  const el = lines.slice(Math.max(0, i - 4), i + 3).join('\n');
  assert.doesNotMatch(el, /\btruncate\b/, `der Name wird wieder einzeilig gekürzt:\n${el}`);
  assert.match(el, /line-clamp-2/, `ohne Zeilengrenze sprengt ein langer Name die Kachel:\n${el}`);
  assert.match(el, /break-words/, `ein Name ohne Leerzeichen läuft sonst aus der Kachel:\n${el}`);
});

test('K3: der `title` bleibt als dritter Weg stehen', () => {
  assert.match(source, /title=\{`\$\{card\.name\} \(click to edit\)`\}/,
    'der vollständige Name steht nicht mehr im Tooltip');
});
