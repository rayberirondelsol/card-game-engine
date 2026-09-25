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

const { pickTopmost } = await import('../../client/src/utils/tokenLayer.js');

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
