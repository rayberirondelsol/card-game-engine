// M9.5 / H6: was aus dem Getippten am Zaehlerfeld wird - und was der Tisch
// sagt, wenn es nichts wird.
//
// Vorher verschwand eine unlesbare Eingabe stillschweigend: `counterValue` gab
// `null`, `commitCounterEdit` liess den Wert stehen und schloss das Feld. Am
// Tisch sah das aus wie "Enter tut nichts". `counterEdit` rechnet daneben
// **nichts** - es fragt `counterValue` und uebersetzt deren `null` in einen
// Grund fuer den Meldekasten (denselben, in dem eine abgewiesene Zone steht).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { counterEdit } from '../../shared/counters.js';

const muenzen = { id: 'c1', name: 'Münzen', value: -2 };
const leben = { id: 'c2', name: 'Waggums: Leben', value: 9, max: 14 };

test('eine nackte Zahl setzt (M9.5 Abnahme 3: 3 auf -2 ergibt 3)', () => {
  assert.deepEqual(counterEdit(muenzen, '3'), { value: 3 });
  assert.deepEqual(counterEdit(muenzen, '0'), { value: 0 });
  // Ein geschriebenes Minus rechnet - siehe naechster Test. Einen negativen
  // Wert *setzt* man deshalb nur ueber die Sequenz (`set_counter` mit der
  // JSON-Zahl -3), nicht am Feld. So steht es in M9.5 Abnahme 3.
});

test('ein geschriebenes Vorzeichen rechnet (M9.5 Abnahme 3)', () => {
  assert.deepEqual(counterEdit(muenzen, '+3'), { value: 1 });
  // "−3 auf −2 ergibt −5" - die Abnahme, mit dem Bindestrich der Tastatur.
  assert.deepEqual(counterEdit({ ...muenzen, value: -2 }, '-3'), { value: -5 });
});

test('"max" fuellt auf die Obergrenze', () => {
  assert.deepEqual(counterEdit(leben, 'max'), { value: 14 });
  assert.deepEqual(counterEdit(leben, 'MAX'), { value: 14 });
});

test('"max" ohne Obergrenze sagt, warum es nicht geht', () => {
  const r = counterEdit(muenzen, 'max');
  assert.equal(r.value, undefined);
  assert.match(r.reason, /maximum/);
});

test('eine unlesbare Eingabe laesst den Wert unveraendert und sagt es (Abnahme 4)', () => {
  // Genau der Befund: aus -2 wurde -2-3, weil der alte Wert stehenblieb.
  const r = counterEdit(muenzen, '-2-3');
  assert.equal(r.value, undefined);
  assert.match(r.reason, /-2-3/);
});

test('ein leeres Feld ist keine Aenderung, sondern ein Grund', () => {
  for (const raw of ['', '   ', null, undefined]) {
    assert.equal(counterEdit(muenzen, raw).value, undefined);
    assert.equal(typeof counterEdit(muenzen, raw).reason, 'string');
  }
});

test('die Obergrenze wird angezeigt, nicht erzwungen (M4a)', () => {
  assert.deepEqual(counterEdit(leben, '+9'), { value: 18 });
  assert.deepEqual(counterEdit(leben, '99'), { value: 99 });
});

test('der Grund ist ein Satz fuer den Meldekasten, keine Ausnahme', () => {
  // Wie `zoneRejects`: eine Zeile, die unveraendert in der Oberflaeche steht.
  assert.doesNotThrow(() => counterEdit(undefined, 'quatsch'));
  assert.equal(typeof counterEdit(undefined, 'quatsch').reason, 'string');
});
