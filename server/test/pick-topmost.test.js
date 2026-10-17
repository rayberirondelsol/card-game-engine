// M10.1 – eine Figur laesst sich nicht gezielt greifen (Aufgabe W1).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Vier von etwa fuenfzehn Figurenzuegen der dritten Solopartie haben die
// falsche Figur erwischt. Ursache: eine Figur belegt ein Kaestchen von zwei
// mal zwei Feldern, stehen zwei auf benachbarten Feldern, ueberlappen sich
// ihre Kaestchen um ein volles Feld – und wer oben liegt, bekommt den ganzen
// Streifen. M8.2 hat das fuer *verschieden grosse* Stuecke ueber die Flaeche
// geloest; zwischen zwei gleich grossen hilft die Reihenfolge nicht.
//
// Die Regel steht deshalb genau dort, wo M8.2 sie offengelassen hat ("bei
// gleicher Flaeche bleibt es beim bisherigen Verhalten"): kleinere Flaeche
// gewinnt wie bisher, und **bei gleicher Flaeche** der naehere Mittelpunkt.
// Ueber der Flaeche entschieden zu haben waere M8.2 wieder abgeschafft – eine
// Figur nahe der Mitte eines grossen Gelaendeteils verloere gegen dessen
// Mittelpunkt.
//
// Reine Logik, geprueft ohne Browser: der Client hat keine Testinfrastruktur.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { pickTopmost, tableLayers } = await import('../../client/src/utils/tokenLayer.js');

// Die Masse der Partie: 82 x 82 Einheiten fuer zwei mal zwei Felder, also
// 41 Einheiten je Feld. Benachbarte Figuren stehen 41 auseinander und
// ueberlappen sich um ein volles Feld.
const FELD = 41;
const fig = (key, x, y) => ({ key, x, y, width: 2 * FELD, height: 2 * FELD });

test('Abnahme 3: eine einzeln stehende Figur bekommt jeden Druck in ihrem Kasten', () => {
  const a = fig('a', 100, 100);
  assert.equal(pickTopmost({ x: 100, y: 100 }, [a]), 'a', 'die Mitte');
  // Der durchsichtige Rand oben gehoert ihr weiterhin: ohne Bilddaten weiss
  // niemand, wo die gezeichnete Figur aufhoert (siehe tasks-greifen-und-lesen).
  assert.equal(pickTopmost({ x: 100, y: 62 }, [a]), 'a', 'der obere Rand');
  assert.equal(pickTopmost({ x: 200, y: 100 }, [a]), null, 'daneben liegt nichts');
});

test('Abnahme 2: zwei Figuren auf benachbarten Feldern sind beide einzeln greifbar', () => {
  const links = fig('links', 100, 100);
  const rechts = fig('rechts', 100 + FELD, 100);
  const items = [links, rechts];

  // Die Mitte jeder Figur trifft sie selbst – vorher gewann im gesamten
  // Ueberlappungsstreifen die spaetere, und aus der Mitte des Boesewichts
  // wurde Henlo Bulwark bewegt.
  assert.equal(pickTopmost({ x: 100, y: 100 }, items), 'links');
  assert.equal(pickTopmost({ x: 100 + FELD, y: 100 }, items), 'rechts');

  // Der Ueberlappungsstreifen wird geteilt: jede Haelfte gehoert der naeheren.
  assert.equal(pickTopmost({ x: 110, y: 100 }, items), 'links');
  assert.equal(pickTopmost({ x: 131, y: 100 }, items), 'rechts');
});

test('Abnahme 4: vier Figuren in einer Reihe sind einzeln greifbar', () => {
  // Der Kampf: vier Figuren, jede um ein Feld versetzt. Der Zoom kommt in der
  // Regel nicht vor – gerechnet wird in Weltkoordinaten –, also gilt sie bei
  // 45 % genauso wie bei 100 %.
  const items = [0, 1, 2, 3].map(i => fig(`f${i}`, 100 + i * FELD, 100));
  items.forEach((f, i) => {
    assert.equal(pickTopmost({ x: f.x, y: f.y }, items), `f${i}`, `Figur ${i}`);
  });
});

test('M8.2 Abnahme 2 bleibt: die kleine Figur schlaegt das grosse Gelaende', () => {
  // Der Boesewicht stand auf L9:M10 mitten im "Ueberwucherten Maisfeld".
  const gelaende = { key: 'feld', x: 300, y: 200, width: 6 * FELD, height: 3 * FELD };
  const figur = fig('boese', 300, 200);
  // Genau der Fall, an dem "naechster Mittelpunkt gewinnt" ohne die Flaeche
  // davor zerbricht: beide Mittelpunkte liegen aufeinander.
  assert.equal(pickTopmost({ x: 320, y: 210 }, [gelaende, figur]), 'boese');
  assert.equal(pickTopmost({ x: 300, y: 200 }, [gelaende, figur]), 'boese');
});

test('M8.2 Abnahme 3 bleibt: neben der Figur gewinnt das Gelaende', () => {
  const gelaende = { key: 'feld', x: 300, y: 200, width: 6 * FELD, height: 3 * FELD };
  const figur = fig('boese', 300, 200);
  assert.equal(pickTopmost({ x: 400, y: 200 }, [gelaende, figur]), 'feld');
});

test('bei gleichem Abstand bleibt es beim bisherigen Verhalten', () => {
  // Deckungsgleich: der spaetere in der Liste liegt oben und bekommt den
  // Zeiger – genau wie tableLayers es zeichnet.
  const a = fig('a', 100, 100);
  const b = fig('b', 100, 100);
  assert.equal(pickTopmost({ x: 100, y: 100 }, [a, b]), 'b');
});

test('die Rueckfaelle sind die von tokenArea: `size` statt width/height', () => {
  const alt = { key: 'alt', x: 100, y: 100, size: 30 };
  assert.equal(pickTopmost({ x: 108, y: 108 }, [alt]), 'alt');
  assert.equal(pickTopmost({ x: 120, y: 100 }, [alt]), null);
});

test('eine leere Liste und ein kaputter Punkt werfen nicht', () => {
  assert.equal(pickTopmost({ x: 0, y: 0 }, []), null);
  assert.equal(pickTopmost({ x: 0, y: 0 }, null), null);
  assert.equal(pickTopmost(null, [fig('a', 0, 0)]), null);
});

// ── M11.9: der Griff in die Mitte des grossen Stuecks ────────────────────────
//
// Nach dem Nachtrag zu M7.2/M7.3 sind die Doerfler 1x1 (50x50), der Boesewicht
// bleibt 2x2 (100x100). Sein Mittelpunkt liegt damit auf dem Kreuz zwischen
// vier Feldern – also genau auf der **Ecke** des Kastens jedes Doerflers, der
// auf einem dieser Felder steht. Dort gewann bisher der Doerfler, weil er die
// kleinere Flaeche hat.

const F = 50;
const boss = { key: 'boss', x: 500, y: 500, width: 2 * F, height: 2 * F };
// Doerfler auf dem Feld rechts unten unter dem Boesewicht: Feldmitte, also
// (25, 25) vom Kreuz aus.
const doerfler = { key: 'granny', x: 500 + F / 2, y: 500 + F / 2, width: F, height: F };

test('Abnahme 1: der Griff in die Mitte des Boesewichts nimmt den Boesewicht', () => {
  assert.equal(pickTopmost({ x: 500, y: 500 }, [boss, doerfler]), 'boss');
  // Und auch knapp daneben, solange man naeher an seinem Mittelpunkt ist.
  assert.equal(pickTopmost({ x: 505, y: 505 }, [boss, doerfler]), 'boss');
});

test('Abnahme 2: der Griff auf dem Feld des Doerflers nimmt den Doerfler', () => {
  assert.equal(pickTopmost({ x: doerfler.x, y: doerfler.y }, [boss, doerfler]), 'granny');
  // Der aeussere Teil seines Feldes erst recht.
  assert.equal(pickTopmost({ x: 540, y: 540 }, [boss, doerfler]), 'granny');
});

test('die drei anderen Felder des Boesewichts bleiben seine', () => {
  for (const [dx, dy] of [[-F / 2, -F / 2], [F / 2, -F / 2], [-F / 2, F / 2]]) {
    assert.equal(pickTopmost({ x: 500 + dx, y: 500 + dy }, [boss, doerfler]), 'boss', `${dx}/${dy}`);
  }
});

// ── BK / Spec M19.1: eine Figur auf ihrem Gelände gehört der Figur ───────────
//
// Partie 10, mit echten Mausereignissen nachgemessen (docs/tasks-partie10.md,
// Phase 0): ein Druck auf dem Mittelpunkt des Bösewichts bewegt ihn — aber ein
// Druck auf dem Punkt, unter dem der **Mittelpunkt des Geländeteils** liegt,
// bewegt das Geländeteil, obwohl er mitten im Bösewicht-Kasten liegt.
//
// Ursache: M11.9 misst „Mitte" in halben Feldern, und das Feld **rät** die
// Funktion als kleinste Kantenlänge unter dem Zeiger. Steht eine Figur allein
// auf einem Geländeteil, ist das die Figur selbst — beim 2x2-Bösewicht also das
// Doppelte des echten Feldes, und die „Mitte" des 7x4-Geländeteils wird zu einem
// 100x100 großen Bereich, den der Bösewicht überdeckt.

const FELD50 = 50;
// Die Maße der Partie: Bösewicht 2x2, Geländeteil "Dichter Wald" 7x4.
const WALD = { key: 'wald', x: 1100, y: 650, width: 7 * FELD50, height: 4 * FELD50 };
const BOSS2 = { key: 'boss', x: 1125, y: 650, width: 2 * FELD50, height: 2 * FELD50 };

test('BK Abnahme 1: jeder Punkt im Bösewicht-Kasten nimmt den Bösewicht', () => {
  const items = [WALD, BOSS2];
  // Sein Mittelpunkt (ging schon vorher),
  assert.equal(pickTopmost({ x: 1125, y: 650 }, items, FELD50), 'boss', 'Mitte');
  // der Punkt über dem Mittelpunkt des Geländeteils (der gemeldete Fehler),
  assert.equal(pickTopmost({ x: 1100, y: 650 }, items, FELD50), 'boss', 'über der Geländemitte');
  // und alles dazwischen und daneben.
  for (const x of [1080, 1090, 1110, 1140, 1170]) {
    assert.equal(pickTopmost({ x, y: 650 }, items, FELD50), 'boss', `x=${x}`);
  }
  for (const y of [605, 630, 670, 695]) {
    assert.equal(pickTopmost({ x: 1100, y }, items, FELD50), 'boss', `y=${y}`);
  }
});

test('BK Abnahme 1: neben der Figur gewinnt das Gelände weiterhin', () => {
  assert.equal(pickTopmost({ x: 1250, y: 650 }, [WALD, BOSS2], FELD50), 'wald');
});

test('BK Abnahme 3: M11.9 gilt mit übergebenem Feldmaß unverändert', () => {
  const items = [boss, doerfler];
  assert.equal(pickTopmost({ x: 500, y: 500 }, items, F), 'boss', 'Mitte des Bösewichts');
  assert.equal(pickTopmost({ x: 505, y: 505 }, items, F), 'boss', 'knapp daneben');
  assert.equal(pickTopmost({ x: doerfler.x, y: doerfler.y }, items, F), 'granny', 'Feld des Dörflers');
  assert.equal(pickTopmost({ x: 540, y: 540 }, items, F), 'granny', 'äußerer Teil seines Feldes');
  for (const [dx, dy] of [[-F / 2, -F / 2], [F / 2, -F / 2], [-F / 2, F / 2]]) {
    assert.equal(pickTopmost({ x: 500 + dx, y: 500 + dy }, items, F), 'boss', `${dx}/${dy}`);
  }
});

test('BK: ein kaputtes Feldmaß fällt auf das geratene zurück', () => {
  for (const bad of [0, -1, NaN, null, undefined, 'viel']) {
    assert.equal(pickTopmost({ x: 500, y: 500 }, [boss, doerfler], bad), 'boss', String(bad));
  }
});

// ── M25.1/CD: ein Grabhuegel ist kein kleineres Stueck ───────────────────────
//
// Partie 14, gemessen am laufenden Tisch: eine Doerflerfigur misst 50 x 50
// (genau ein Feld), die fuenf Grabhuegel messen 45x44 bis 48x48 - alle
// flaechenkleiner. Beide stehen auf demselben Feld, haben also denselben
// Mittelpunkt; der Abstand ist immer gleich, die Flaeche entscheidet immer,
// und sie entscheidet immer fuer den Huegel. Dreimal wanderte der Huegel statt
// des Doerflers, stumm.
//
// Der Unterschied ist Bildrauschen, kein Spielmass: ein eingescanntes
// Plaettchen behaelt sein Seitenverhaeltnis. Deshalb misst die Ordnung in
// **Feldern**, wo ein Raster liegt - mit `fieldArea`, derselben Rechnung, mit
// der `snapToGrid` das Stueck schon setzt.

const { fieldArea } = await import('../../shared/gridGeometry.js');

const KAMPFFELD = [{
  id: 'g1', label: 'Kampffeld', x: 0, y: 0, width: 950, height: 700,
  cols: 19, rows: 14, type: 'square', labels: { cols: 'alpha', rows: 'numeric' },
}];

/** Ein Stueck wie am Tisch: mit der Feldflaeche, die unter ihm liegt. */
const piece = (key, x, y, width, height) => ({
  key, x, y, width, height, area: fieldArea(KAMPFFELD, x, y, { width, height }),
});

test('M25.1: Figur und Grabhuegel auf demselben Feld sind gleich gross - der spaetere gewinnt', () => {
  const FELD = 50;
  const cx = 425, cy = 325; // Feldmitte irgendwo auf dem Kampffeld
  const huegel = piece('huegel', cx, cy, 46, 45);
  const figur = piece('figur', cx, cy, 50, 50);

  // Reihenfolge wie im Spielstand: `build_scenario` legt das Gelaende, die
  // Doerfler kommen in der Sequenz danach.
  assert.equal(pickTopmost({ x: cx, y: cy }, [huegel, figur], FELD), 'figur');
  assert.equal(pickTopmost({ x: cx + 10, y: cy - 8 }, [huegel, figur], FELD), 'figur');

  // Und die Zeichnung sagt dasselbe: die Figur liegt oben.
  const z = tableLayers([huegel, figur]);
  assert.ok(z('figur') > z('huegel'), 'was den Zeiger bekommt, wird auch oben gezeichnet');
});

test('M25.1: ohne Figur bleibt der Grabhuegel greifbar', () => {
  const huegel = piece('huegel', 425, 325, 46, 45);
  assert.equal(pickTopmost({ x: 425, y: 325 }, [huegel], 50), 'huegel');
});

test('M25.1: ein mehrfeldriges Gelaendeteil liegt weiter unter der Figur darauf (M19.1)', () => {
  // Sieben mal vier Felder, die Figur steht mitten darauf.
  const gelaende = piece('gelaende', 425, 325, 350, 200);
  const figur = piece('figur', 425, 325, 50, 50);
  assert.equal(pickTopmost({ x: 425, y: 325 }, [gelaende, figur], 50), 'figur');
  const z = tableLayers([gelaende, figur]);
  assert.ok(z('figur') > z('gelaende'));
});

test('M25.1: ohne Raster rechnet alles wie bisher', () => {
  const a = { key: 'a', x: 100, y: 100, width: 46, height: 45 };
  const b = { key: 'b', x: 100, y: 100, width: 50, height: 50 };
  assert.equal(fieldArea(KAMPFFELD, 5000, 5000, { width: 50, height: 50 }), 0, 'kein Raster, keine Feldflaeche');
  assert.equal(pickTopmost({ x: 100, y: 100 }, [a, b]), 'a', 'die kleinere Flaeche gewinnt wie bisher');
});
