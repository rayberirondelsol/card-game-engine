// FL / Spec M32.4 — die Wache: `mayTouch`, `mayTouchCard`, `resolveServerZones` in `shared/ownership.js`.
// Reine Funktionen; die Handler rufen sie erst in FO. Die alte `isActionAllowed`
// (`server/src/websocket/messageHandler.js`) hat die Mängel (a) bis (d) aus M32.1 Nr. 2.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Fälle der alten Wache stehen hier als **Abschrift** (`alteWache`) – sie bleiben, Fall für Fall (Nr. 1);
// die Mängel sind eigene Tests (Nr. 2–7). Die Hand-Zonen kommen aus der echten Fixture (EU + FF angewendet,
// `platz` 1 … 5 vom Test gesetzt, gebunden mit `bindZones`) – Hand 3 ist dort verankert, ohne absolute Box.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { mayTouch, mayTouchCard, resolveServerZones, ownersOfPlayers, bindZones } from '../../shared/ownership.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { handleMessage } from '../src/websocket/messageHandler.js';
import * as dz from '../../scripts/doerflerzahl-daten.mjs';

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const auszug = lies('auslagen-kurzpartie.json');
const FF = dz.patchHaende(dz.patchZonen(auszug.zones).zone).zone;
const MIT_PLATZ = FF.map(z => (/^zhand(\d)$/.test(z.id) ? { ...z, platz: Number(z.id.slice(5)) } : z));

/** Die alte Rechnung, wörtlich aus `isActionAllowed` (`messageHandler.js:98-112`), ohne das Raumobjekt. */
function alteWache(zones, player, x, y) {
  if (!zones || zones.length === 0) return true;
  if (!player) return false;
  for (const zone of zones) {
    if (!zone.exclusive) continue;
    if (zone.type !== 'player') continue;
    if (x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height) return zone.color === player.color;
  }
  return true;
}

const rot = { id: 'p1', color: 'red', seat: 1, isConnected: true };
const blau = { id: 'p2', color: 'blue', seat: 2, isConnected: true };
const SPIELER = [rot, blau];
const zone = (id, extra = {}) => ({ id, label: id, shape: 'rect', type: 'player', color: null, exclusive: false, x: 0, y: 0, width: 100, height: 100, ...extra });

// ── 1. Die Fälle der alten Wache bleiben ─────────────────────────────────────

test('FL 1: fremde exclusive-Zone → false, eigene → true, außerhalb → true, `shared` mit exclusive → ignoriert', () => {
  const zones = [
    zone('zrot', { color: 'red', exclusive: true, x: 0, y: 0 }),
    zone('zblau', { color: 'blue', exclusive: true, x: 200, y: 0 }),
    zone('zgemeinsam', { type: 'shared', color: 'blue', exclusive: true, x: 400, y: 0 }),
    zone('zoffen', { color: 'green', exclusive: false, x: 600, y: 0 }),
  ];
  assert.equal(mayTouch(zones, SPIELER, 'red', 250, 50), false, 'in der Zone von blau');
  assert.equal(mayTouch(zones, SPIELER, 'red', 50, 50), true, 'in der eigenen');
  assert.equal(mayTouch(zones, SPIELER, 'red', 1000, 1000), true, 'außerhalb');
  assert.equal(mayTouch(zones, SPIELER, 'red', 450, 50), true, 'type shared');
  assert.equal(mayTouch(zones, SPIELER, 'red', 650, 50), true, 'nicht exclusive');
  assert.equal(mayTouch(zones, SPIELER, 'blue', 50, 50), false);
  assert.equal(mayTouch(zones, SPIELER, 'blue', 250, 50), true);
});

test('FL 1: Fall für Fall wie die alte Wache – gleiche Antwort auf einem Raster, wo die Mängel nicht greifen', () => {
  const zones = [
    zone('zrot', { color: 'red', exclusive: true, x: 0, y: 0, width: 150, height: 80 }),
    zone('zblau', { color: 'blue', exclusive: true, x: 300, y: 100, width: 120, height: 200 }),
    zone('zgemeinsam', { type: 'shared', color: 'red', exclusive: true, x: 500, y: 0 }),
    zone('zneutral', { color: null, exclusive: false, x: 600, y: 600 }),
  ];
  let verglichen = 0;
  for (const spieler of SPIELER) {
    for (let x = -20; x <= 700; x += 10) {
      for (let y = -20; y <= 700; y += 10) {
        assert.equal(mayTouch(zones, SPIELER, spieler.color, x, y), alteWache(zones, spieler, x, y), `${spieler.color} (${x}, ${y})`);
        verglichen++;
      }
    }
  }
  assert.ok(verglichen > 10000);
});

test('FL 1: die Kante gehört zur Zone (wie bisher `>=` / `<=`)', () => {
  const zones = [zone('zblau', { color: 'blue', exclusive: true, x: 10, y: 10, width: 100, height: 100 })];
  assert.equal(mayTouch(zones, SPIELER, 'red', 10, 10), false);
  assert.equal(mayTouch(zones, SPIELER, 'red', 110, 110), false);
  assert.equal(mayTouch(zones, SPIELER, 'red', 111, 110), true);
});

// ── 2. Der Befund als Test: rohe Zonen ───────────────────────────────────────

/** Bis 4 Dörfler, 2 Spieler: rot führt 1+2, blau 3+4. Die Tableaus liegen, wo `doerflerzahl-zonen.test.js` sie misst. */
const OWNERS = ownersOfPlayers({ players: 2, villagers: 4, kind: 'mehrfach' }, [rot, blau]);
const GEBUNDEN = bindZones(MIT_PLATZ, OWNERS).zones;
const TABLEAU3 = { id: 't3', assetId: 'bad13f49-c614-4551-9e81-fe8603dbf09a', x: 1460, y: 1600, width: 300, height: 400 };
const boardState = (tokens) => ({ cards: [], stacks: [], tokens, boards: [] });

/** Die Mitte der aufgelösten Hand 3, wo ihr Eigentum liegt. */
function mitteHand3(state) {
  const z = resolveServerZones(state, GEBUNDEN).find(x => x.id === 'zhand3');
  return { x: z.x + z.width / 2, y: z.y + z.height / 2 };
}

test('FL 2: rohe Zonen schützen die verankerte Hand 3 nie – aufgelöste schon (der Grund für die Auflösung)', () => {
  const hand3 = GEBUNDEN.find(z => z.id === 'zhand3');
  assert.equal(hand3.exclusive, true);
  assert.equal(hand3.color, 'blue');
  assert.ok(hand3.anchor && hand3.x === undefined, 'Hand 3 hat nur den Anker, keine absolute Box (`handRelativ`)');

  const state = boardState([TABLEAU3]);
  const p = mitteHand3(state);
  // die alte Rechnung gegen die rohe Liste: nicht geschützt – das ist der Mangel (c)
  assert.equal(alteWache(GEBUNDEN, rot, p.x, p.y), true);
  // dieselbe Frage gegen die aufgelöste Liste: geschützt
  assert.equal(mayTouch(resolveServerZones(state, GEBUNDEN), SPIELER, 'red', p.x, p.y), false);
  assert.equal(mayTouch(resolveServerZones(state, GEBUNDEN), SPIELER, 'blue', p.x, p.y), true, 'der Eigentümer darf');
  // und die rohe Liste bleibt in `mayTouch` ohne Wurf und ohne Treffer an der Stelle des Nullpunkts
  assert.equal(mayTouch(GEBUNDEN, SPIELER, 'red', p.x, p.y), true);
  assert.equal(mayTouch(GEBUNDEN, SPIELER, 'red', 5, 5), true, 'eine Zone ohne Box nimmt nicht still den Nullpunkt (Vorgabemaße von `box()`)');
});

test('FL 2: `resolveServerZones(boardState, zones)` = `resolveZones(zones, anchorBoxes(boards, tokens))`', () => {
  const state = { ...boardState([TABLEAU3]), boards: [{ id: 'b', x: 500, y: 500, width: 200, height: 200 }] };
  assert.deepEqual(resolveServerZones(state, GEBUNDEN), resolveZones(GEBUNDEN, anchorBoxes(state.boards, state.tokens)));
  assert.deepEqual(resolveServerZones(null, GEBUNDEN), resolveZones(GEBUNDEN, []));
  assert.deepEqual(resolveServerZones(state, null), []);
});

test('FL 2: ein Tableau ohne Platz am Tisch (`anchorMissing`) – die Hand hat keine Fläche und sperrt nichts', () => {
  const zones = resolveServerZones(boardState([]), GEBUNDEN);
  assert.equal(zones.find(z => z.id === 'zhand3').anchorMissing, true);
  assert.equal(mayTouch(zones, SPIELER, 'red', 5, 5), true);
  assert.equal(mayTouch(zones, SPIELER, 'red', 50, 50), true);
});

// ── 3. Das Tableau wandert, die Hand mit ─────────────────────────────────────

test('FL 3: nach einem `token_move` des Tableau-Tokens liegt der geschützte Bereich an der neuen Stelle', () => {
  const token = { ...TABLEAU3 };
  const room = {
    players: new Map(SPIELER.map(p => [p.id, p])),
    connections: new Map(),
    boardState: boardState([token]),
  };
  const alt = mitteHand3(room.boardState);
  assert.equal(mayTouch(resolveServerZones(room.boardState, GEBUNDEN), SPIELER, 'red', alt.x, alt.y), false);

  handleMessage(room, 'p1', JSON.stringify({ type: 'token_move', token_id: 't3', x: 600, y: 900 }));
  assert.equal(room.boardState.tokens[0].x, 600, 'der Handler hat das Token verschoben');

  const neu = mitteHand3(room.boardState);
  assert.notDeepEqual(neu, alt);
  const zones = resolveServerZones(room.boardState, GEBUNDEN);
  assert.equal(mayTouch(zones, SPIELER, 'red', neu.x, neu.y), false, 'die neue Stelle ist geschützt');
  assert.equal(mayTouch(zones, SPIELER, 'red', alt.x, alt.y), true, 'die alte nicht mehr');
});

// ── 4. exclusive ohne Farbe ──────────────────────────────────────────────────

test('FL 4: `exclusive` ohne Farbe ist kein Eigentümer und sperrt niemanden aus (M32.1 Nr. 2d)', () => {
  const zones = [zone('zhand', { color: null, exclusive: true })];
  assert.equal(alteWache(zones, rot, 50, 50), false, 'die alte Rechnung sperrte jeden aus');
  for (const c of ['red', 'blue', null, undefined]) assert.equal(mayTouch(zones, SPIELER, c, 50, 50), true, String(c));
});

// ── 5. Eigentümer weg ────────────────────────────────────────────────────────

test('FL 5: kein Spieler zur Zonenfarbe im Raum → offen; nur offline → bleibt gesperrt', () => {
  const zones = [zone('zblau', { color: 'blue', exclusive: true })];
  assert.equal(mayTouch(zones, [rot], 'red', 50, 50), true, 'blau ist gegangen');
  assert.equal(mayTouch(zones, [rot, { ...blau, isConnected: false }], 'red', 50, 50), false, 'blau ist nur offline');
  assert.equal(mayTouch(zones, [], 'red', 50, 50), true);
  // eine Map (`room.players`) geht ebenso
  assert.equal(mayTouch(zones, new Map([[rot.id, rot]]), 'red', 50, 50), true);
  assert.equal(mayTouch(zones, new Map([[rot.id, rot], [blau.id, blau]]), 'red', 50, 50), false);
  // ohne Spielerliste keine Auskunft über Abwesenheit: die Zone gilt
  assert.equal(mayTouch(zones, null, 'red', 50, 50), false);
});

// ── 6. Mehrere Zonen am Punkt ────────────────────────────────────────────────

test('FL 6: fremde und neutrale Zone am Punkt → fremd, in jeder Reihenfolge', () => {
  const fremd = zone('zblau', { color: 'blue', exclusive: true });
  const neutral = zone('zneutral', { color: null, exclusive: false });
  const eigen = zone('zrot', { color: 'red', exclusive: true });
  for (const zones of [[fremd, neutral], [neutral, fremd], [fremd, eigen], [eigen, fremd]]) {
    assert.equal(mayTouch(zones, SPIELER, 'red', 50, 50), false, zones.map(z => z.id).join(','));
  }
  assert.equal(mayTouch([neutral, eigen], SPIELER, 'red', 50, 50), true);
});

test('FL 6: eine Zone, die vom anderen Brett abgewandt ist (`facingAway`), ist nicht da', () => {
  const zones = [zone('zblau', { color: 'blue', exclusive: true, facingAway: true })];
  assert.equal(mayTouch(zones, SPIELER, 'red', 50, 50), true);
});

test('FL 6: die Form zählt (Kreis): die Ecke des Kastens ist nicht in der Zone', () => {
  const zones = [zone('zblau', { color: 'blue', exclusive: true, shape: 'circle' })];
  assert.equal(mayTouch(zones, SPIELER, 'red', 50, 50), false, 'Mitte');
  assert.equal(mayTouch(zones, SPIELER, 'red', 2, 2), true, 'Kastenecke, außerhalb des Kreises');
});

// ── 7. mayTouchCard ──────────────────────────────────────────────────────────

test('FL 7: mayTouchCard – verboten, wenn der Ort **jetzt** oder das Ziel fremd ist (Mangel a)', () => {
  const zones = [
    zone('zrot', { color: 'red', exclusive: true, x: 0, y: 0 }),
    zone('zblau', { color: 'blue', exclusive: true, x: 200, y: 0 }),
  ];
  const inBlau = { x: 250, y: 50, faceDown: true };
  const inRot = { x: 50, y: 50, faceDown: true };
  const draussen = { x: 500, y: 500, faceDown: false };

  assert.equal(mayTouchCard(zones, SPIELER, 'red', draussen, { x: 250, y: 50 }), false, 'Ziel fremd');
  assert.equal(mayTouchCard(zones, SPIELER, 'red', inBlau, { x: 500, y: 500 }), false, 'Ort fremd – das Herausziehen');
  assert.equal(mayTouchCard(zones, SPIELER, 'red', inBlau, { x: 250, y: 60 }), false, 'beides fremd');
  assert.equal(mayTouchCard(zones, SPIELER, 'red', inRot, { x: 60, y: 60 }), true, 'innerhalb der eigenen');
  assert.equal(mayTouchCard(zones, SPIELER, 'red', inRot, { x: 500, y: 500 }), true, 'aus der eigenen heraus');
  assert.equal(mayTouchCard(zones, SPIELER, 'red', draussen, { x: 50, y: 50 }), true, 'in die eigene hinein');
  assert.equal(mayTouchCard(zones, SPIELER, 'red', draussen, { x: 600, y: 600 }), true, 'übriger Tisch');
});

test('FL 7: ohne Ziel (Flip, Rotate) zählt nur der Ort; verdeckt wie aufgedeckt in der eigenen Zone – keine Regel „erst aufdecken"', () => {
  const zones = [zone('zrot', { color: 'red', exclusive: true }), zone('zblau', { color: 'blue', exclusive: true, x: 200 })];
  for (const faceDown of [true, false]) {
    assert.equal(mayTouchCard(zones, SPIELER, 'red', { x: 50, y: 50, faceDown }), true, `eigene, faceDown ${faceDown}`);
    assert.equal(mayTouchCard(zones, SPIELER, 'red', { x: 250, y: 50, faceDown }), false, `fremde, faceDown ${faceDown}`);
  }
});

test('FL 7: eine Karte ohne Ort (`x`/`y` fehlen) wirft nicht und gilt als am übrigen Tisch', () => {
  const zones = [zone('zblau', { color: 'blue', exclusive: true })];
  assert.equal(mayTouchCard(zones, SPIELER, 'red', {}), true);
  assert.equal(mayTouchCard(zones, SPIELER, 'red', null), true);
  assert.equal(mayTouchCard(zones, SPIELER, 'red', {}, { x: 50, y: 50 }), false);
});

// ── 8. Ohne Eigentümer ändert sich nichts ────────────────────────────────────

test('FL 8: Zonen ohne Farbe/exclusive, leere Liste, `null`, keine Liste → true, kein Wurf', () => {
  const neutral = [zone('z1'), zone('z2', { type: 'shared' })];
  for (const zones of [neutral, [], null, undefined, 'x', {}]) {
    assert.doesNotThrow(() => mayTouch(zones, SPIELER, 'red', 50, 50));
    assert.equal(mayTouch(zones, SPIELER, 'red', 50, 50), true);
    assert.equal(mayTouchCard(zones, SPIELER, 'red', { x: 50, y: 50 }, { x: 60, y: 60 }), true);
  }
  assert.equal(mayTouch(neutral, null, null, undefined, undefined), true);
  // die Fixture ohne `platz` (jeder Stand vor FS): nichts gebunden, nichts gesperrt
  const roh = resolveServerZones(boardState([TABLEAU3]), FF);
  for (const z of roh) if (Number.isFinite(z.x)) assert.equal(mayTouch(roh, SPIELER, 'red', z.x + 1, z.y + 1), true, z.id);
});
