// M11.1 – die Leisten über dem Tisch.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// **Warum dieser Test die Quelle liest.** Der Befund der vierten Solopartie
// ist kein Rechenfehler, den ein reines Modul fangen könnte: das Meldeband
// `setup-issues` stand als `fixed top-16 z-50` über der Aktionszeile, drei
// Klicks auf „Dorfereignis ziehen" gingen ins Leere, und
// `document.elementFromPoint` lieferte das Band. Was schiefgehen kann, ist
// eine **Stelle in der Auszeichnung** – ein geratener Abstand statt einer
// Zeile im Fluss –, und die einzige Stelle, an der das steht, ist
// `GameTable.jsx`. Der Client hat keine Testinfrastruktur (CLAUDE.md); ohne
// diesen Test hält die Regel niemand.
//
// Der Test ist deshalb absichtlich grob: er prüft zwei Tatsachen, die man auch
// beim Lesen sieht, und nicht das Aussehen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url));
const source = readFileSync(SRC, 'utf8');

/** Die Zeile, in der ein `data-testid` steht, samt der Zeilen davor. */
function classAbove(testid) {
  const lines = source.split('\n');
  const i = lines.findIndex(l => l.includes(`data-testid="${testid}"`));
  assert.ok(i >= 0, `${testid} gibt es nicht mehr`);
  // Die className steht im selben Element – je nach Attributreihenfolge davor
  // oder dahinter, also ein Fenster um die Zeile herum.
  return lines.slice(Math.max(0, i - 6), i + 4).join('\n');
}

test('Regel 1: kein Meldeband steht auf einem geratenen Abstand über der Kopfleiste', () => {
  // `fixed top-…` heißt: dieses Band beansprucht einen Streifen, dessen Höhe
  // es nie gemessen hat. M2.8 hat das beim Setup-Banner und bei der Legende
  // schon zweimal behoben; M11.1 Befund A ist derselbe Fehler zum dritten Mal.
  for (const band of ['setup-issues', 'draw-toast', 'save-toast']) {
    const el = classAbove(band);
    assert.ok(!/\bfixed\b/.test(el), `${band} liegt wieder fixiert über der Kopfleiste:\n${el}`);
    assert.ok(!/\btop-\d/.test(el), `${band} rechnet wieder mit einem geratenen Abstand:\n${el}`);
    // Dass das Band Klicks annimmt, stand hier bis M12.1 – gemeint war, dass
    // sein × klickbar bleibt. Das steht jetzt weiter unten, am ×.
  }
});

test('Regel 2: beide Leisten über dem Tisch lassen sich wegräumen und zurückholen', () => {
  // Die untere seit M10.8, die obere seit M11.1. Ein Einklappknopf ohne
  // Ausklappknopf wäre eine Einbahnstraße – genau das, was M10.8 Abnahme 3
  // verbietet.
  for (const bar of ['toolbar', 'top-bar']) {
    assert.ok(source.includes(`data-testid="${bar}-collapse-btn"`), `${bar} lässt sich nicht einklappen`);
    assert.ok(source.includes(`data-testid="${bar}-show-btn"`), `${bar} lässt sich nicht zurückholen`);
  }
  // Und beide Wege hängen am selben Zustand, sonst klappt der eine etwas ein,
  // das der andere nicht zurückholt.
  assert.ok(source.includes('setShowTopBar(false)') && source.includes('setShowTopBar(true)'));
  assert.ok(source.includes('setShowToolbar(false)') && source.includes('setShowToolbar(true)'));
});

test('der Rückholknopf ist fingergroß – die Engine ist berührungsfähig', () => {
  const el = classAbove('top-bar-show-btn');
  assert.ok(/min-w-\[44px\]/.test(el) && /min-h-\[44px\]/.test(el), `zu klein für einen Finger:\n${el}`);
});

// ── M12.1 – das Band über dem Schlachtfeld (AA1) ─────────────────────────────
//
// Die fünfte Solopartie: ein Zug von `F9` nach `F11` bewegte nichts, weil das
// Band `setup-issues` von x≈155 bis 650 und y≈160 bis 250 darüber stand. M11.1
// hat die drei Aktionsknöpfe freigeräumt, den Tisch nicht — und der Tisch ist
// das größte Bedienelement, das es gibt.
//
// Die Bänder hängen im Fluss der Kopfleiste, die `pointer-events-none` ist.
// Sie setzen sich mit `pointer-events-auto` wieder davor, **für ihren ganzen
// Körper**. Genau der Körper hat nichts anzunehmen: anzunehmen hat das ×.
//
// Warum nicht „verschwindet von selbst" (M12.1 Abnahme 2, erste Hälfte): das
// Band ist die einzige Stelle, an der das Protokoll eines Aufbaus sichtbar
// wird, und diese Listen werden lang (M11.2: sechzehn Zeilen). Begründung in
// `docs/tasks-partie5.md`, „Vorab 2".

/** Der Block eines Bandes: ab seiner `data-testid`-Zeile bis zur nächsten. */
function bandBlock(testid) {
  const lines = source.split('\n');
  const i = lines.findIndex(l => l.includes(`data-testid="${testid}"`));
  assert.ok(i >= 0, `${testid} gibt es nicht mehr`);
  const next = lines.findIndex((l, k) => k > i && l.includes('data-testid='));
  return lines.slice(i, next > i ? next : lines.length);
}

test('M12.1 Abnahme 1: kein Meldeband nimmt an seinem Körper Klicks an', () => {
  for (const band of ['setup-issues', 'draw-toast', 'save-toast']) {
    const el = classAbove(band);
    assert.ok(!/pointer-events-auto/.test(el),
      `${band} schluckt wieder Züge auf dem Raster:\n${el}`);
  }
});

test('M12.1 Abnahme 3: das × jedes Bandes bleibt klickbar', () => {
  // Ohne das wäre die Meldung nicht mehr wegzubekommen – und ein Band, das
  // bleibt, muss weggehen können.
  for (const band of ['setup-issues', 'save-toast']) {
    const schliessen = bandBlock(band).filter(l => l.includes('&times;'));
    assert.equal(schliessen.length, 1, `${band} hat kein eindeutiges ×`);
    assert.match(schliessen[0], /pointer-events-auto/,
      `das × von ${band} nimmt keine Klicks mehr an:\n${schliessen[0]}`);
  }
});
