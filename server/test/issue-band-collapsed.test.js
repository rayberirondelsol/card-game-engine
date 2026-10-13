// AY1 / Spec M16.2 — das Meldeband überlebt das Einklappen der Kopfleiste.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund F2 des achten Durchgangs: die elfte Ausrüstungskarte wurde abgewiesen,
// „zone ‚Ausrüstung Dörfler 1' is full (10)" entstand auch — aber die drei
// Meldebänder standen **innerhalb** von `{showTopBar && (<>`. Eingeklappt
// wurden sie nicht verdeckt, sie wurden nicht gerendert. Die Rolle empfiehlt
// einzuklappen; wer das tut, sieht keine Meldung.
//
// Kein zweiter Meldeweg (M6): das Band aus M12.1 ist die Stelle, es verlässt
// nur den einklappbaren Zweig — hinter den Chevron aus M11.1, damit eine Zeile
// im Fluss die Zeilen darüber weiter nicht überdecken kann.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { zoneRejects } from '../../shared/zoneGeometry.js';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

const BANDS = ['data-testid="setup-issues"', 'data-testid="save-toast"', 'data-testid="draw-toast"'];

test('AY1: die drei Meldebänder stehen nicht mehr im einklappbaren Zweig', () => {
  const open = source.indexOf('{showTopBar && (<>');
  assert.ok(open > 0, 'der Zweig der Kopfleiste ist nicht mehr zu finden');
  const close = source.indexOf('</>)}', open);
  assert.ok(close > open, 'der Zweig der Kopfleiste schließt nicht');
  for (const band of BANDS) {
    const at = source.indexOf(band);
    assert.ok(at > 0, `${band} wird nicht mehr gezeichnet`);
    assert.ok(at > close, `${band} liegt weiterhin im showTopBar-Zweig`);
  }
});

test('AY1: und auch nicht im !showTopBar-Zweig – sie gelten in beiden Lagen', () => {
  const chevron = source.indexOf('{!showTopBar && (');
  assert.ok(chevron > 0, 'der Chevron aus M11.1 ist weg');
  for (const band of BANDS) {
    assert.ok(source.indexOf(band) > chevron,
      `${band} steht vor dem Chevron – M11.1 Regel 1 (Bänder zuletzt im Fluss)`);
  }
  // Zwischen Chevron-Block und Band darf kein zweiter Zweig aufgehen.
  const after = source.slice(chevron, source.indexOf(BANDS[1]));
  assert.equal((after.match(/\{!?showTopBar/g) || []).length, 1,
    'die Bänder hängen an einem weiteren Zustand der Kopfleiste');
});

test('AY1: die Meldung nennt Zone und Kapazität – unverändert aus zoneRejects', () => {
  const zone = { label: 'Ausrüstung Dörfler 1', layout: 'grid', capacity: 10, accepts: ['card'], width: 580, height: 280 };
  assert.equal(zoneRejects(zone, 'card', 10), 'zone "Ausrüstung Dörfler 1" is full (10)');
  assert.equal(zoneRejects(zone, 'card', 9), null);
});

test('AY1: das abgewiesene Ziehen meldet weiter über dieselbe Stelle', () => {
  // Es war nie stumm (die Spec vermutete das) – `setSetupIssues` steht im
  // Abweisungszweig des Kartenzugs, direkt neben dem Zurückspringen.
  // M17.3/BE: die Abweisung wird oben **berechnet** und erst nach `resolveDrop`
  // ausgeführt – ein Stapel unter der Karte schlägt sie. Die Meldung selbst ist
  // unverändert geblieben, nur ihr Zweig steht eine Rechnung weiter unten.
  const i = source.indexOf("refusal = zoneRejects(dropZone, 'card'");
  assert.ok(i > 0, 'der Abweisungszweig des Kartenzugs ist weg');
  const j = source.indexOf('if (finalRefusal) {', i);
  assert.ok(j > i, 'die berechnete Abweisung wird nirgends mehr ausgeführt');
  const branch = source.slice(j, j + 900);
  assert.match(branch, /setSetupIssues\(\[\{ index: 0, type: 'drop'/);
  assert.match(branch, /reason: finalRefusal/);
});
