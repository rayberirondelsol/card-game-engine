// M8.5 – die Kartenbibliothek hat keine Suche (Aufgabe N1).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Derselbe Grund wie bei pan-target.test.js und library-shelf.test.js: der
// Client hat keine Testinfrastruktur, also liegt der entscheidbare Teil – passt
// dieser Name zu dieser Anfrage? – in einem reinen Modul und wird von hier
// geprueft.
//
// Seit M8.8 (Aufgabe A1) liegt das Modul in `shared/`: `place_card` im Executor
// braucht dieselbe Normalisierung, und `client/` gibt es im Server-Image nicht.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { squashName, matchesCardSearch, findCardByName } = await import('../../shared/cardSearch.js');

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

// ── findCardByName (M8.8 / A1) ───────────────────────────────────────────────
//
// Die Suche darf grosszuegig sein, ein Aufbauschritt nicht. `place_card` legt
// eine Karte **bei Namen**, und wenn der Name auf drei Karten passt, ist ein
// Zufallsgriff schlimmer als keine Karte.

const card = (over) => ({
  id: 'c1', name: 'X', image_path: '/uploads/cards/x.png', width: 300, height: 420, ...over,
});

test('A1: genau ein Treffer – der saubere Name und der zerlegte finden dieselbe Karte', () => {
  const lib = [
    card({ id: 'c1', name: 'Hohler Heuhaufen' }),
    card({ id: 'c2', name: ocr('The Rooty Tooter'), image_path: '/uploads/cards/rt.png' }),
  ];
  assert.equal(findCardByName(lib, 'Hohler Heuhaufen').card.id, 'c1');
  // Der kaputte OCR-Name ist ueber die grosszuegige Stufe erreichbar – genau
  // die Karte, die in der Partie unauffindbar blieb.
  assert.equal(findCardByName(lib, 'The Rooty Tooter').card.id, 'c2');
  assert.equal(findCardByName(lib, 'rooty').card.id, 'c2');
});

test('A1: exakt schlaegt grosszuegig – "Zaun" neben "Holzzaun" bleibt eindeutig', () => {
  const lib = [
    card({ id: 'z', name: 'Zaun', image_path: '/uploads/cards/z.png' }),
    card({ id: 'h', name: 'Holzzaun', image_path: '/uploads/cards/h.png' }),
  ];
  const hit = findCardByName(lib, 'Zaun');
  assert.equal(hit.card?.id, 'z');
  assert.ok(!hit.ambiguous);
  // Umgekehrt bleibt die grosszuegige Stufe fuer das, was exakt nichts trifft.
  assert.equal(findCardByName(lib, 'holz').card.id, 'h');
});

test('A1: zwei verschiedene Karten – melden und nichts liefern (Spec-Regel 3)', () => {
  const lib = [
    card({ id: 'a', name: 'Holzzaun', image_path: '/uploads/cards/a.png' }),
    card({ id: 'b', name: 'Gartenzaun', image_path: '/uploads/cards/b.png' }),
  ];
  const hit = findCardByName(lib, 'zaun');
  assert.equal(hit.card, null);
  assert.equal(hit.ambiguous, true);
  assert.match(hit.reason, /Holzzaun/);
  assert.match(hit.reason, /Gartenzaun/);
});

test('A1: zwei Exemplare derselben Karte sind keine Mehrdeutigkeit', () => {
  // In einem Deck aus drei Erweiterungen sind Dubletten der Normalfall. Jedes
  // Exemplar ist richtig – "nichts legen" waere eine erfundene Fehlermeldung.
  const lib = [
    card({ id: 'a', name: 'Muenze', image_path: '/uploads/cards/m.png' }),
    card({ id: 'b', name: 'Muenze', image_path: '/uploads/cards/m.png' }),
  ];
  const hit = findCardByName(lib, 'Muenze');
  assert.equal(hit.card?.id, 'a', 'das erste Exemplar');
  assert.ok(!hit.ambiguous);
  assert.match(hit.reason, /2/, 'die Zahl der Exemplare steht im Protokoll');
});

test('A1: kein Treffer und keine Anfrage melden, ohne mehrdeutig zu sein', () => {
  const lib = [card({ name: 'Hohler Heuhaufen' })];
  const none = findCardByName(lib, 'Gebiss');
  assert.equal(none.card, null);
  assert.ok(!none.ambiguous);
  assert.match(none.reason, /Gebiss/);

  // Ohne Anfrage passt bei `matchesCardSearch` jeder Name (Abnahme 5 aus M8.5).
  // Hier darf daraus nicht "die erste Karte der Bibliothek" werden.
  for (const empty of ['', '   ', null, undefined]) {
    const hit = findCardByName(lib, empty);
    assert.equal(hit.card, null, `"${empty}" darf keine Karte liefern`);
  }
  assert.equal(findCardByName([], 'Gebiss').card, null);
  assert.equal(findCardByName(null, 'Gebiss').card, null);
});
