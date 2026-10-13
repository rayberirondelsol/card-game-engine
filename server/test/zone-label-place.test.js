// AW1 / Spec M16.1 — das Namensschild sitzt nicht mehr auf Platz 1.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund F1 des achten Durchgangs (`docs/partie8-zonen.md`): das Schild der
// `Buyin'/Beatin'-Leiste` steht **im** Kasten oben links, also genau auf dem
// obersten Reihenfolge-Plättchen, und verdeckt 73 % davon. Auf dieser Leiste
// steht, wer als Erster dran ist.
//
// Die Spec wollte „über den oberen Rand, und wo darüber kein Platz ist,
// darunter". Einen oberen Brettrand gibt es in Weltkoordinaten nicht (keine
// Weltgrenze, keine Kamerabeschränkung, seit AS1 kein `overflow-hidden`).
// Den Fall, der zählt, gibt es: der Streifen über einer Zone kann in die
// **Fläche einer anderen Zone** fallen — und damit auf ein Stück, das dort
// liegt. Begründung und Messwerte in `docs/tasks-zonen.md`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { zoneLabelAbove, ZONE_LABEL_HEIGHT, ZONE_LABEL_WIDTH } from '../../shared/zoneGeometry.js';

const overlay = readFileSync(
  fileURLToPath(new URL('../../client/src/components/ZoneOverlay.jsx', import.meta.url)), 'utf8');

// Die beiden Zonen, an denen es sich entscheidet, mit den am laufenden Tisch
// gemessenen Weltkoordinaten (DOM, Aufbau b1e10f4e-…).
const BUYIN = { id: 'b', label: "Buyin'/Beatin'-Leiste", x: 155.2, y: 212.4, width: 90.4, height: 274.4 };
const PLATZ = { id: 'p', label: 'Bösewicht-Platz', x: 165.2, y: 149.2, width: 49.6, height: 49.6 };
const HAND = { id: 'h', label: 'Hand Dörfler 1', x: 150, y: 1140, width: 360, height: 170 };

test('AW1: die gemessenen Maße des einzeiligen Schilds', () => {
  // 19 Weltpunkte hoch (gemessen, einzeilig) + 2 Punkte Luft.
  assert.equal(ZONE_LABEL_HEIGHT, 21);
  // Das breiteste Schild des Tisches misst 118 Weltpunkte (gemessen).
  assert.ok(ZONE_LABEL_WIDTH >= 118, 'der Streifen ist schmaler als das breiteste Schild');
});

test('AW1: über einer freistehenden Zone bleibt das Schild oben', () => {
  assert.equal(zoneLabelAbove(HAND, [HAND, BUYIN, PLATZ]), true);
  assert.equal(zoneLabelAbove(HAND, []), true);
  // Ohne Liste ist nichts im Weg.
  assert.equal(zoneLabelAbove(HAND), true);
});

test('AW1: eine Zone über der Zone drängt das Schild nach unten', () => {
  // Gemessen: Streifen über Buyin' läge bei y 191,4…210,4, der Kasten von
  // `Bösewicht-Platz` endet bei 198,8 — 7,4 Punkte Überschneidung, also 15 %
  // des Bösewicht-Plättchens. „Immer oben" tauscht den Fehler nur aus.
  assert.equal(zoneLabelAbove(BUYIN, [BUYIN, PLATZ]), false);
  // Unter Buyin' ist frei (Kasten endet bei 486,8, die nächste Zone beginnt
  // bei 633,6) — der Fall „beides besetzt" tritt hier nicht ein.
  assert.equal(zoneLabelAbove(PLATZ, [BUYIN, PLATZ]), true);
});

test('AW1: 7,4 Punkte Überschneidung sind der Grund – 0 Punkte Berührung nicht', () => {
  const unten = { id: 'u', x: 0, y: 100, width: 100, height: 100 };
  // Kasten endet genau am oberen Rand des Streifens: kein Stück liegt darin.
  const bündig = { id: 'o', x: 0, y: 100 - ZONE_LABEL_HEIGHT - 50, width: 100, height: 50 };
  assert.equal(zoneLabelAbove(unten, [unten, bündig]), true);
  // Einen Punkt tiefer schneidet er.
  assert.equal(zoneLabelAbove(unten, [unten, { ...bündig, y: bündig.y + 1 }]), false);
});

test('AW1: die Zone selbst und abgewandte Zonen drängen nichts', () => {
  // Die eigene Fläche beginnt erst unter dem Streifen – aber eine Zone, die mit
  // sich selbst verglichen wird, darf sich nie nach unten drängen.
  const hoch = { id: 's', x: 0, y: 0, width: 100, height: 100 };
  assert.equal(zoneLabelAbove(hoch, [hoch]), true);
  // M10.13: was nicht da ist, liegt nicht im Weg.
  const weg = { id: 'w', x: 0, y: -ZONE_LABEL_HEIGHT, width: 100, height: ZONE_LABEL_HEIGHT, facingAway: true };
  assert.equal(zoneLabelAbove(hoch, [hoch, weg]), true);
  assert.equal(zoneLabelAbove(hoch, [hoch, { ...weg, facingAway: false }]), false);
});

test('AW1: oben und unten besetzt – dann oben, denn keine Seite ist besser', () => {
  const mitte = { id: 'm', x: 0, y: 100, width: 100, height: 100 };
  const drüber = { id: 'd', x: 0, y: 90, width: 100, height: 10 };
  const drunter = { id: 'u', x: 0, y: 200, width: 100, height: 10 };
  assert.equal(zoneLabelAbove(mitte, [mitte, drüber, drunter]), true);
});

test('AW1: ZoneOverlay rechnet die Lage nicht selbst nach', () => {
  // Der Client hat keine Testinfrastruktur – eine Zahl im JSX wäre ungeprüft.
  assert.match(overlay, /zoneLabelAbove/, 'die Lage des Schilds kommt nicht aus shared/');
  // Einzeilig, sonst wäre der Streifen mal 21 und mal 35 Punkte hoch und die
  // Rechnung hätte zwei Antworten (gemessen: 19 bzw. 33 Weltpunkte).
  assert.match(overlay, /whitespace-nowrap/, 'das Schild bricht weiterhin um');
  // Es sitzt außerhalb des Kastens, nicht mehr `top-1` darin.
  assert.doesNotMatch(overlay, /absolute top-1 left-2/, 'das Schild sitzt weiterhin im Kasten');
});
