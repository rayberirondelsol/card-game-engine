// BC / Spec M17.1 — der Tischrahmen ist kein Rollbereich.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund F1 der neunten Solopartie: nach „Hide toolbar" sass die ganze
// Bedienebene rund 300 px zu hoch, die Kopfleiste ausserhalb des Fensters, und
// nur Shift+Tab holte sie zurueck.
//
// Die Spec vermutete eine veraltete Messung. Es gibt keine: beide Leisten
// stehen rein in CSS. Der Fehler ist `overflow-hidden` am Tischrahmen. Das
// versteckt die Rollbalken, macht das Element aber **zum Rollbereich** — und es
// hat etwas zu rollen, weil die Tischobjekte im Satzspiegel bei ihren echten
// Tischkoordinaten liegen (die Kamera ist ein `transform`, der verschiebt nur
// das Bild). Am laufenden Tisch gemessen: `scrollHeight` 1703 bei
// `clientHeight` 790, `scrollTop` 184,8, Kopfleiste bei y = −184,8.
//
// Gerollt wird vom **Fokus**: ein `focus()` auf einen Zaehlerknopf im
// Weltraum-Wrapper setzte `scrollTop` in einem Schritt auf 912,8. Beide
// Leisten sind `absolute`-Kinder genau dieses Rollbereichs und wandern mit.
//
// `overflow: clip` schneidet genauso ab, stellt aber keinen Rollbereich her:
// `scrollTop` bleibt 0, und es gibt nichts, wohin der Browser etwas einrollen
// koennte. Am laufenden Tisch vorab geprueft.
//
// Geprueft wird am Quelltext, weil der Client keine Testinfrastruktur hat —
// dieselbe Bauart wie `zone-in-play.test.js` (AS1).
//
// Begruendung in `docs/tasks-partie9.md`, Aufgabe BC.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

test('BC: der Tischrahmen schneidet ab, ohne zu rollen', () => {
  assert.equal((source.match(/w-screen h-screen relative overflow-clip select-none/g) || []).length, 1,
    'der Tischrahmen muss `overflow-clip` tragen');
  assert.equal((source.match(/w-screen h-screen relative overflow-hidden/g) || []).length, 0,
    '`overflow-hidden` macht den Tischrahmen zum Rollbereich (F1)');
});
