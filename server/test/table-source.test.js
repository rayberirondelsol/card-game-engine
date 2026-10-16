// M22/BY – welche Quelle den Tisch fuellt, ist eine Rechnung, kein Zeitverhalten.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Vorher ergab sich die Antwort daraus, welcher von zwei `useEffect` zuletzt
// `loadGameState` aufrief. Gemessen gewann der Aufbau, weil sein Zweig drei
// Umlaeufe mehr braucht (`setups`, `table-assets`, `cards`/`categories`) -
// eine laufende Partie ueberlebte damit kein Neuladen. Die Entscheidung faellt
// jetzt vor dem ersten Netzzugriff, aus den Parametern allein.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { resolveTableSource } = await import('../../client/src/utils/tableSource.js');

test('ein Spielstand schlaegt den Aufbau - er ist das Spaetere', () => {
  const r = resolveTableSource({ setupId: 's1', saveId: 'v1' });
  assert.equal(r.kind, 'save');
  assert.equal(r.saveId, 'v1');
  // Die Herkunft des Standes steht in seiner Zeile, nicht in der URL - die
  // `setupId` daneben wird nicht uebernommen, sonst waere es die Automatik,
  // die M22 verbietet.
  assert.equal(r.setupId, null);
});

test('ein Spielstand oeffnet nie den Editor', () => {
  const r = resolveTableSource({ mode: 'setup', editSetupId: 's1', saveId: 'v1' });
  assert.equal(r.kind, 'save');
  // Der Editor-Schalter haengt weiter allein an `mode` - das war vorher so.
  assert.equal(r.setupMode, true);
});

test('die fuenf Faelle', () => {
  assert.deepEqual(resolveTableSource({ saveId: 'v1' }), {
    kind: 'save', saveId: 'v1', setupId: null, setupMode: false,
  });
  assert.deepEqual(resolveTableSource({ setupId: 's1' }), {
    kind: 'setup', saveId: null, setupId: 's1', setupMode: false,
  });
  assert.deepEqual(resolveTableSource({ mode: 'setup', editSetupId: 's1' }), {
    kind: 'setup-edit', saveId: null, setupId: 's1', setupMode: true,
  });
  assert.deepEqual(resolveTableSource({ mode: 'setup' }), {
    kind: 'setup-new', saveId: null, setupId: null, setupMode: true,
  });
  assert.deepEqual(resolveTableSource({}), {
    kind: 'blank', saveId: null, setupId: null, setupMode: false,
  });
});

test('ein Aufbau zum Spielen schlaegt den Editor nur ohne editSetupId', () => {
  // Der alte Zweig lief bei `setupId && !editSetupId` - dieselbe Regel.
  assert.equal(resolveTableSource({ mode: 'setup', setupId: 's1', editSetupId: 's2' }).kind, 'setup-edit');
  assert.equal(resolveTableSource({ mode: 'setup', setupId: 's1', editSetupId: 's2' }).setupId, 's2');
  // `editSetupId` ohne `mode=setup` ist kein Editor - so war es auch vorher.
  assert.equal(resolveTableSource({ setupId: 's1', editSetupId: 's2' }).kind, 'setup');
});

test('leere Werte gelten als nicht gesetzt', () => {
  // `?saveId=` ohne Wert ist kein Spielstand; `searchParams.get` liefert '' .
  assert.equal(resolveTableSource({ saveId: '', setupId: 's1' }).kind, 'setup');
  assert.equal(resolveTableSource({ saveId: '  ' }).kind, 'blank');
  assert.equal(resolveTableSource({ setupId: '' }).kind, 'blank');
  // Und `null` statt eines Strings, wie `searchParams.get` es fuer einen
  // fehlenden Parameter liefert.
  assert.deepEqual(resolveTableSource({ mode: null, setupId: null, editSetupId: null, saveId: null }).kind, 'blank');
});

test('die Rechnung braucht nichts als ihre vier Eingaben', () => {
  // Ohne Argument (kein Fehler) und mit einem fremden Feld daneben.
  assert.equal(resolveTableSource().kind, 'blank');
  assert.equal(resolveTableSource({ foo: 'bar' }).kind, 'blank');
});

test('M22/CB: welchen Hinweis ein geladener Stand verdient', async () => {
  const { scaffoldNotice } = await import('../../client/src/utils/tableSource.js');
  // Ein alter Stand ohne Herkunft - alle vier Produktionsstaende sind solche.
  assert.equal(scaffoldNotice(null, false), 'missing');
  assert.equal(scaffoldNotice('', true), 'missing');
  // Herkunft da, Aufbau geladen: kein Hinweis.
  assert.equal(scaffoldNotice('s1', true), 'none');
  // Herkunft da, Aufbau geloescht (404): derselbe halbe Tisch, anderer Satz.
  assert.equal(scaffoldNotice('s1', false), 'gone');
});
