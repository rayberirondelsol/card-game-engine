// M10.13 / X1+X2 – eine Zone gilt fuer eine Seite ihres Ankers.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Der Befund aus der dritten Partie, nachgebaut: `Nachschub-Auslage` haengt
// auf der Dorfphasenseite des Zusatz-Bretts, `Aktionen` und `Ablage` auf der
// Kampfseite. Dieselbe Flaeche, dasselbe Brett. `zoneAt` nahm die zuletzt
// eingetragene, also die `Ablage`, und eine Ladenkarte landete dort.
//
// Geprueft wird:
//   * `assetBox` traegt die Seite mit, die der Anker zeigt
//   * `resolveZones` kennzeichnet abgewandte Zonen und raeumt alte Kennzeichen ab
//   * eine Zone ohne `anchorSide` verhaelt sich unveraendert (Abnahme 3)
//   * `zoneAt` uebergeht die abgewandte (Abnahme 1 und 2)
//   * `zoneRejects` nennt den Grund (Abnahme 4)
//   * `objectsInZone` zaehlt nichts in einer abgewandten Zone – der Besen
//   * der Executor: `deal_to_zone` scheitert mit Grund und gelingt nach dem Wenden
//   * `setAnchor` verliert `anchorSide` nicht

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { assetBox, anchorBoxes, resolveZones, setAnchor } = await import('../../shared/anchoring.js');
const { zoneAt, zoneRejects, objectsInZone, countInZone, zoneSlots } = await import('../../shared/zoneGeometry.js');
const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures: das Zusatz-Brett und die drei Zonen darauf ─────────────────────

/** Das Zusatz-Brett, 300x999, Mitte bei (1000, 1000). `faceDown` = Dorfphase. */
function sideboard(faceDown) {
  return {
    id: 'tok-sideboard', assetId: 'asset-sideboard', label: 'Zusatz-Brett',
    imageUrl: '/uploads/sb.png', frontImageUrl: '/uploads/sb.png', backImageUrl: '/uploads/sb-back.png',
    faceDown, x: 1000, y: 1000, width: 300, height: 999, size: 300,
  };
}

const anchor = (assetId = 'asset-sideboard') => ({ assetId, relX: 0.083, relY: 0.579, relWidth: 0.38, relHeight: 0.18 });

/** Die Ladenauslage: Dorfphasenseite, also Rueckseite. Zehn Plaetze. */
const auslage = {
  id: 'z-auslage', label: 'Nachschub-Auslage', shape: 'rect',
  accepts: ['card'], capacity: 10, layout: 'grid', snap: true,
  anchor: anchor(), anchorSide: 'back',
};

/** Die Ablage: Kampfseite, also Vorderseite. Liegt spaeter in der Liste. */
const ablage = {
  id: 'z-ablage', label: 'Ablage', shape: 'rect',
  accepts: ['card'], capacity: null, layout: 'stack', snap: true,
  anchor: anchor(), anchorSide: 'front',
};

/** Dieselbe Box, aber ohne Seitenangabe – der Fall von vor M10.13. */
const alt = { ...ablage, id: 'z-alt', label: 'Alt', anchorSide: undefined };

function resolved(faceDown, zones) {
  return resolveZones(zones, anchorBoxes([], [sideboard(faceDown)]));
}

// ── X1: die Auflösung ────────────────────────────────────────────────────────

test('assetBox traegt die Seite mit, die der Anker zeigt', () => {
  assert.equal(assetBox(sideboard(true)).faceDown, true);
  assert.equal(assetBox(sideboard(false)).faceDown, false);
  // Ein Brett aus einem Stand von vor M3c hat das Feld gar nicht: Vorderseite.
  assert.equal(assetBox({ id: 'b', x: 0, y: 0, width: 10, height: 10 }).faceDown, false);
});

test('resolveZones kennzeichnet die Zone, deren Seite nicht zu sehen ist', () => {
  const [a, b] = resolved(true, [auslage, ablage]); // Dorfphase liegt oben
  assert.ok(!a.facingAway, 'die Ladenauslage liegt auf der sichtbaren Seite');
  assert.equal(b.facingAway, true, 'die Ablage liegt auf der abgewandten');

  const [c, d] = resolved(false, [auslage, ablage]); // Kampfphase liegt oben
  assert.equal(c.facingAway, true);
  assert.ok(!d.facingAway);
});

test('eine Zone ohne anchorSide verhaelt sich unveraendert (Abnahme 3)', () => {
  for (const down of [true, false]) {
    const [z] = resolved(down, [alt]);
    assert.ok(!z.facingAway);
    // und die Box ist die, die sie immer war
    assert.equal(z.x, 1000 - 150 + 0.083 * 300);
  }
});

test('facingAway ist ein Befund der Aufloesung, kein gespeichertes Feld', () => {
  // Der Editor schreibt aufgeloeste Zonen zurueck; ein altes Kennzeichen darf
  // die naechste Aufloesung nicht ueberleben.
  const stale = { ...auslage, facingAway: true };
  const [z] = resolved(true, [stale]);
  assert.ok(!('facingAway' in z) || z.facingAway !== true);

  // Auch wenn der Anker fehlt: dort gilt die Zone weiter, aber nicht wegen
  // eines Kennzeichens von gestern.
  const [m] = resolveZones([stale], []);
  assert.equal(m.anchorMissing, true);
  assert.ok(!m.facingAway);
});

test('setAnchor verliert anchorSide nicht', () => {
  const box = assetBox(sideboard(true));
  const bound = setAnchor({ ...auslage, x: 100, y: 100, width: 50, height: 50 }, box);
  assert.equal(bound.anchorSide, 'back');
  // und beim Loesen bleibt es stehen, ohne zu wirken (kein Anker, keine Seite)
  assert.equal(setAnchor(bound, null).anchorSide, 'back');
});

// ── X2: die abgewandte Zone ist nicht da ─────────────────────────────────────

test('zoneAt uebergeht die abgewandte Zone (Abnahme 1 und 2)', () => {
  const p = { x: 930, y: 1000 - 499.5 + 0.579 * 999 + 40 }; // in beiden Boxen

  const dorf = resolved(true, [auslage, ablage]);
  assert.equal(zoneAt(dorf, p.x, p.y)?.label, 'Nachschub-Auslage');

  const kampf = resolved(false, [auslage, ablage]);
  assert.equal(zoneAt(kampf, p.x, p.y)?.label, 'Ablage');
});

test('zoneRejects nennt den Grund (Abnahme 4)', () => {
  const [, away] = resolved(true, [auslage, ablage]);
  const reason = zoneRejects(away, 'card', 0);
  assert.match(reason, /"Ablage"/);
  assert.match(reason, /not showing/);
  // Die sichtbare Zone weist nichts ab.
  const [here] = resolved(true, [auslage, ablage]);
  assert.equal(zoneRejects(here, 'card', 0), null);
});

test('objectsInZone zaehlt nichts in einer abgewandten Zone', () => {
  const [here, away] = resolved(true, [auslage, ablage]);
  // M11.8: die Auslage hat zehn Plaetze, also zaehlt sie belegte Plaetze. Die
  // Karte liegt deshalb auf einem - ein Punkt irgendwo im Rechteck zaehlte
  // vorher als Belegung und tut es seither nicht mehr (M11.8 Abnahme 1).
  const card = { tableId: 'c1', ...zoneSlots(here)[0] };
  assert.equal(countInZone(here, [card]), 1);
  assert.equal(objectsInZone(away, [card]).length, 0, 'sonst fegt clear_zone Ablage die Ladenkarten weg');
});

// ── X2: derselbe Weg durch den Executor ──────────────────────────────────────

const CARDS = Array.from({ length: 3 }, (_, i) => ({ id: `card-${i}`, name: `Ware ${i}`, category: 'Nachschub' }));

function run(steps, faceDown) {
  const state = { cards: [], tokens: [], boards: [], stacks: [], counters: [] };
  const board = sideboard(faceDown);
  state.tokens.push(board);
  return executeSequenceWithLog(state, steps, [auslage, ablage], {
    assets: [{ id: 'asset-sideboard', name: 'Zusatz-Brett', image_path: '/uploads/sb.png', back_image_path: '/uploads/sb-back.png', width: 300, height: 999 }],
    cards: CARDS,
  });
}

test('deal_to_zone in eine abgewandte Zone scheitert mit Grund', () => {
  const steps = [
    { type: 'place_stack', category: 'Nachschub', label: 'Nachschub', x: 0, y: 0 },
    { type: 'deal_to_zone', stackLabel: 'Nachschub', count: 2, targetZoneLabel: 'Nachschub-Auslage' },
  ];
  // Kampfseite oben: die Ladenauslage ist abgewandt.
  const { state, log } = run(steps, false);
  const entry = log[1];
  assert.equal(entry.status, 'skipped');
  assert.match(entry.reason, /not showing/);
  assert.equal(state.cards.length, 0, 'nichts liegt daneben');
});

test('nach dem Wenden gelingt derselbe Schritt', () => {
  const steps = [
    { type: 'place_stack', category: 'Nachschub', label: 'Nachschub', x: 0, y: 0 },
    { type: 'set_asset_face', assetName: 'Zusatz-Brett', faceDown: true },
    { type: 'deal_to_zone', stackLabel: 'Nachschub', count: 2, targetZoneLabel: 'Nachschub-Auslage' },
  ];
  const { state, log } = run(steps, false);
  assert.equal(log[2].status, 'ok', log[2].reason || '');
  assert.equal(state.cards.length, 2);
});

test('eine Zone ohne Seitenangabe nimmt weiterhin in jeder Lage an', () => {
  const steps = [
    { type: 'place_stack', category: 'Nachschub', label: 'Nachschub', x: 0, y: 0 },
    { type: 'deal_to_zone', stackLabel: 'Nachschub', count: 1, targetZoneLabel: 'Alt' },
  ];
  for (const down of [true, false]) {
    const state = { cards: [], tokens: [sideboard(down)], boards: [], stacks: [], counters: [] };
    const { log } = executeSequenceWithLog(state, steps, [alt], { assets: [], cards: CARDS });
    assert.equal(log[1].status, 'ok', log[1].reason || '');
  }
});
