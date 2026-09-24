// M8.5 – die Kartenbibliothek hat keine Suche (Aufgabe N1).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Derselbe Grund wie bei pan-target.test.js und library-shelf.test.js: der
// Client hat keine Testinfrastruktur, also liegt der entscheidbare Teil – passt
// dieser Name zu dieser Anfrage? – in einem reinen Modul und wird von hier
// geprueft.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { squashName, matchesCardSearch } = await import('../../client/src/utils/cardSearch.js');

/** So sieht ein Name aus dem OCR-Textlayer aus: jedes Wort gedoppelt. */
function ocr(name) {
  return name.split(' ').map(w => `${w} ${w}`).join(' ').toUpperCase();
}

test('zusammenschieben: klein, ohne Leerzeichen', () => {
  assert.equal(squashName('HO H LE R HE UH A UF EN'), 'hohlerheuhaufen');
  assert.equal(squashName('  Paulis\tGebiss\n'), 'paulisgebiss');
  assert.equal(squashName(null), '');
});

test('Abnahme 1: heuhaufen findet den gedoppelten OCR-Namen', () => {
  const name = 'HO H LE R HO H LE R HE UH A UF EN HE UH A UF EN';
  assert.equal(matchesCardSearch(name, 'heuhaufen'), true);
  assert.equal(matchesCardSearch(name, 'HEUHAUFEN'), true);
});

test('der ganze Name findet ihn auch – bei zwei Woertern und bei drei', () => {
  // Zwei Woerter fielen auch mit reinem Zusammenschieben durch, drei nicht:
  // "thetherootyrootytootertooter" enthaelt "therootytooter" nicht.
  assert.equal(matchesCardSearch(ocr('Hohler Heuhaufen'), 'Hohler Heuhaufen'), true);
  assert.equal(matchesCardSearch(ocr('The Rooty Tooter'), 'The Rooty Tooter'), true);
  assert.equal(matchesCardSearch(ocr('The Rooty Tooter'), 'tooter'), true);
});

test('die Reihenfolge der Woerter ist egal, ein fehlendes Wort nicht', () => {
  const name = ocr('Paulis Gebiss');
  assert.equal(matchesCardSearch(name, 'gebiss paulis'), true);
  assert.equal(matchesCardSearch(name, 'paulis krone'), false);
});

test('was nicht passt, passt nicht', () => {
  assert.equal(matchesCardSearch(ocr('Paulis Gebiss'), 'heuhaufen'), false);
});

test('Abnahme 5: ohne Eingabe passt jeder Name', () => {
  assert.equal(matchesCardSearch('irgendwas', ''), true);
  assert.equal(matchesCardSearch('irgendwas', '   '), true);
  assert.equal(matchesCardSearch('irgendwas', null), true);
  assert.equal(matchesCardSearch(null, ''), true);
});
