// M13.1 / DR1–DR4 – ein Token am Tisch drehen.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund: der Bösewicht hat eine mechanische Blickrichtung („er dreht sich zum
// Ziel und geht dann BEW Felder geradeaus"), aber sein Kontextmenü kennt nur
// Lock, Flip, Enlarge und Delete. `E`/`Q` drehen nur Karten und hängen an
// `selectedCards` – für Tokens gibt es keine Auswahl. Auch Geländeteile sind
// Tokens: es fehlt nicht die Blickrichtung, sondern das Drehen überhaupt.
//
// Was hier geprüft wird:
//   * DR1: `nextRotation` – Umlauf in beide Richtungen, unlesbarer Eingang,
//     unbekannter Schritt; das Ergebnis ist immer einer der vier Winkel
//   * DR2: die Verdrahtung im Tisch (Quelltest, weil der Client keine
//     Testinfrastruktur hat – Muster wie `client-hygiene.test.js`)
//   * DR3: die Serveraktion `token_rotate` – setzt, verwirft Unlesbares,
//     verrät nichts
//   * DR4: der Beleg, dass Raster und Kasten nichts zu tun haben
//
// Begründung und die Stellen, an denen die Spec nicht stimmt, in
// `docs/tasks-drehen.md`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { assetToken, nextRotation, rotationOf, ROTATIONS } = await import('../../shared/assetToken.js');
const { snapInto, cellPoint, gridAddress } = await import('../../shared/gridGeometry.js');
const { handleMessage } = await import('../src/websocket/messageHandler.js');

// ── DR1: nextRotation ────────────────────────────────────────────────────────

test('rechts herum zählt durch die vier Winkel und läuft um', () => {
  assert.equal(nextRotation(0, 90), 90);
  assert.equal(nextRotation(90, 90), 180);
  assert.equal(nextRotation(180, 90), 270);
  assert.equal(nextRotation(270, 90), 0, '270 + 90 ist 0, nicht 360');
});

test('links herum ebenso, in die andere Richtung', () => {
  assert.equal(nextRotation(0, -90), 270, '0 − 90 ist 270, nicht −90');
  assert.equal(nextRotation(270, -90), 180);
  assert.equal(nextRotation(180, -90), 90);
  assert.equal(nextRotation(90, -90), 0);
});

test('viermal drehen bringt das Token in die Ausgangslage zurück', () => {
  // Spec-Abnahme 2: der gespeicherte Winkel ist danach 0, nicht 360.
  let angle = 0;
  for (let i = 0; i < 4; i++) angle = nextRotation(angle, 90);
  assert.equal(angle, 0);

  let back = 0;
  for (let i = 0; i < 4; i++) back = nextRotation(back, -90);
  assert.equal(back, 0);
});

test('ein Token ohne Winkel dreht sich wie eines mit 0', () => {
  // `rotation` fehlt in jedem Spielstand von vor M7.1 – das ist kein Fehler,
  // sondern die Vorgabe, und `rotationOf` sagt es bereits.
  assert.equal(nextRotation(undefined, 90), 90);
  assert.equal(nextRotation(null, 90), 90);
  assert.equal(nextRotation('', 90), 90);
  assert.equal(nextRotation('180', 90), 270, 'eine Zahl als Text ist eine Zahl');
});

test('ein unlesbarer Winkel gilt als 0, statt weitergereicht zu werden', () => {
  // Ihn durchzulassen hieße, ihn zu speichern – genau das, was `token_rotate`
  // unten verweigert. Und 360 ist kein Sonderfall, sondern wie eine viermal
  // gedrehte Karte heute aussähe.
  assert.equal(nextRotation(45, 90), 90);
  assert.equal(nextRotation(360, 90), 90);
  assert.equal(nextRotation('abc', 90), 90);
  assert.equal(nextRotation(360, -90), 270);
});

test('ein unbekannter Schritt lässt den Winkel, wie er ist', () => {
  assert.equal(nextRotation(90, 0), 90);
  assert.equal(nextRotation(90, 45), 90);
  assert.equal(nextRotation(90, 180), 90);
  assert.equal(nextRotation(90, undefined), 90);
  assert.equal(nextRotation(360, 45), 0, 'zurück kommt der ausgelegte Winkel, nicht der rohe');
});

test('jedes Ergebnis ist einer der vier erlaubten Winkel', () => {
  const inputs = [0, 90, 180, 270, 45, 360, -90, null, undefined, '', 'abc'];
  for (const value of inputs) {
    for (const step of [90, -90, 0, 45]) {
      const out = nextRotation(value, step);
      assert.ok(ROTATIONS.includes(out), `nextRotation(${String(value)}, ${step}) = ${out}`);
    }
  }
});

// ── DR2: die Verdrahtung im Tisch ────────────────────────────────────────────

test('der Tisch dreht über nextRotation und meldet es als token_rotate', () => {
  // Der Client hat keine Testinfrastruktur (CLAUDE.md); geprüft wird die
  // Quelle, damit die Verdrahtung nicht still verschwindet. Kommentare zählen
  // nicht – gesucht wird, was aufgerufen wird.
  const src = readFileSync(fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8')
    .split('\n')
    .filter(line => !/^\s*(?:\/\/|\*|\/\*)/.test(line))
    .join('\n');

  assert.match(src, /nextRotation/, 'der Tisch rechnet den nächsten Winkel nicht selbst');
  assert.match(src, /import \{[^}]*nextRotation[^}]*\} from '\.\.\/\.\.\/\.\.\/shared\/assetToken\.js'/,
    'und holt sie aus shared/, nicht aus einer zweiten Auslegung');
  assert.match(src, /type: 'token_rotate'/, 'der zweite Platz erfährt sonst nichts davon');
  assert.match(src, /case 'token_rotate'/, 'und sähe eine fremde Drehung nicht');
});

// ── DR3: die Serveraktion ────────────────────────────────────────────────────

function boardAsset(over = {}) {
  return {
    id: 'asset-boss',
    name: 'Bösewicht',
    type: 'token',
    image_path: '/uploads/front.png',
    back_image_path: '/uploads/back.png',
    width: 100,
    height: 100,
    ...over,
  };
}

/** Kleinstmöglicher Raum – wie in `token-flip.test.js`. */
function fakeRoom(tokens) {
  const sent = [];
  const ws = { readyState: 1, send: data => sent.push(JSON.parse(data)) };
  return {
    sent,
    players: new Map([['p1', { color: 'red' }], ['p2', { color: 'blue' }]]),
    connections: new Map([['p2', ws]]), // p1 ist der Absender, bekommt nichts
    zones: [],
    boardState: { cards: [], stacks: [], tokens, counters: [], notes: [], dice: [], customDice: [] },
  };
}

test('token_rotate setzt den Winkel auf der Serverkopie und meldet ihn weiter', () => {
  const token = assetToken(boardAsset(), 100, 100, false);
  const room = fakeRoom([token]);

  handleMessage(room, 'p1', JSON.stringify({ type: 'token_rotate', token_id: token.id, rotation: 90 }));

  assert.equal(room.boardState.tokens[0].rotation, 90);
  assert.equal(room.sent.length, 1, 'der zweite Platz sieht die Drehung');
  assert.deepStrictEqual(
    Object.keys(room.sent[0]).sort(),
    ['from_player_id', 'rotation', 'timestamp', 'token_id', 'type'],
  );
  assert.equal(room.sent[0].rotation, 90);

  handleMessage(room, 'p1', JSON.stringify({ type: 'token_rotate', token_id: token.id, rotation: 0 }));
  assert.equal(room.boardState.tokens[0].rotation, 0, 'auch zurück auf 0, nicht nur weg von 0');
});

test('der Broadcast verrät weder Namen noch Bild', () => {
  const token = assetToken(boardAsset(), 100, 100, true);
  const room = fakeRoom([token]);

  handleMessage(room, 'p1', JSON.stringify({ type: 'token_rotate', token_id: token.id, rotation: 270 }));

  const wire = JSON.stringify(room.sent[0]);
  assert.ok(!wire.includes('Bösewicht'), 'der Name gäbe ein verdecktes Stück preis');
  assert.ok(!wire.includes('/uploads/'), 'und die Bild-URL ebenso');
});

test('ein Winkel, der rotationOf nicht passiert, wird verworfen statt gespeichert', () => {
  for (const bad of [45, 360, -90, 'abc', {}]) {
    const token = assetToken(boardAsset(), 100, 100, false);
    const room = fakeRoom([token]);

    handleMessage(room, 'p1', JSON.stringify({ type: 'token_rotate', token_id: token.id, rotation: bad }));

    assert.equal(room.boardState.tokens[0].rotation, 0, `rotation ${String(bad)} darf nicht landen`);
    assert.equal(room.sent.length, 0, 'und niemandem wird eine Drehung gemeldet, die nicht stattfand');
  }
});

test('ein fehlender Winkel liest sich als 0 – wie überall sonst auch', () => {
  // `rotationOf` ist die **eine** Auslegung eines Winkels (M7.1): „steht nichts
  // da" ist 0, nicht „unlesbar". Hier daneben zu unterscheiden wäre eine
  // zweite Auslegung. Praktisch schickt nur der Tisch `token_rotate`, und er
  // rechnet den Winkel vorher über `nextRotation` aus.
  const token = { ...assetToken(boardAsset(), 100, 100, false), rotation: 180 };
  const room = fakeRoom([token]);

  handleMessage(room, 'p1', JSON.stringify({ type: 'token_rotate', token_id: token.id }));

  assert.equal(room.boardState.tokens[0].rotation, 0);
  assert.equal(room.sent.length, 1);
});

test('ein unbekanntes Token tut nichts und wirft nicht', () => {
  const room = fakeRoom([]);
  handleMessage(room, 'p1', JSON.stringify({ type: 'token_rotate', token_id: 'gibt-es-nicht', rotation: 90 }));
  assert.equal(room.sent.length, 0);
});

// ── DR4: Raster und Kasten haben nichts zu tun ───────────────────────────────

/** 10x10 Felder à 50px im Ursprung – C3:D4 ist damit 100x100 gross. */
const grid = {
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 50, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
};

test('ein 2x2-Bösewicht liegt nach dem Drehen auf denselben vier Feldern', () => {
  // Spec-Abnahme 3. Die Drehung dreht das Bild, nicht den Kasten (M7.1) –
  // `snapInto` rechnet mit `width`/`height`, und die ändert niemand.
  const p = cellPoint(grid, 'C3:D4');
  const size = { width: 100, height: 100 };

  const vorher = snapInto(p.x, p.y, { grids: [grid], size, cell: 'C3:D4' });
  const token = { ...assetToken(boardAsset(), p.x, p.y, false), gridId: vorher.gridId, cell: vorher.cell };
  const gedreht = { ...token, rotation: nextRotation(token.rotation, 90) };
  const nachher = snapInto(gedreht.x, gedreht.y, { grids: [grid], size, cell: gedreht.cell });

  assert.deepStrictEqual(nachher, vorher, 'dieselben vier Felder, dieselbe Mitte');
  assert.deepStrictEqual(gridAddress(gedreht), gridAddress(token), 'und dieselbe gemeldete Adresse');
});

test('ein 200x50-Geländeteil behält seinen Kasten über vier Drehungen', () => {
  // Spec-Abnahme 4' (siehe docs/tasks-drehen.md, „Wo die Spec nicht stimmt"):
  // der Kasten bleibt 200x50, der Renderer tauscht nur die Bildmasse.
  const zaun = {
    ...assetToken(boardAsset({ id: 'asset-zaun', name: 'Holzzaun', width: 200, height: 50 }), 100, 100, false),
    gridId: 'g1', cell: 'A1:D1',
  };

  let now = zaun;
  for (let i = 0; i < 4; i++) {
    now = { ...now, rotation: nextRotation(now.rotation, 90) };
    assert.deepStrictEqual(
      { width: now.width, height: now.height, gridId: now.gridId, cell: now.cell, x: now.x, y: now.y },
      { width: 200, height: 50, gridId: 'g1', cell: 'A1:D1', x: 100, y: 100 },
      'nur rotation darf sich ändern',
    );
  }
  assert.equal(now.rotation, 0);
});

test('ein Winkel aus nextRotation überlebt Speichern und Laden', () => {
  // Spec-Abnahme 5. `GameTable.jsx` führt `rotation` seit M7.1 in beiden
  // Feldlisten und schreibt `t.rotation || 0`; geprüft wird hier, dass
  // `nextRotation` nur Werte liefert, die diesen Weg unverändert überstehen –
  // und die `handleTokenRotate` oben annimmt.
  let angle = 0;
  for (let i = 0; i < 8; i++) {
    angle = nextRotation(angle, i % 2 ? -90 : 90);
    assert.equal(rotationOf(angle), angle, 'sonst verwürfe der Server die eigene Drehung');
    assert.equal(JSON.parse(JSON.stringify({ rotation: angle || 0 })).rotation, angle);
  }
});
