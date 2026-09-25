// M13.4 / KA1–KA3 – der Kasten dreht mit.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund: M13.1 dreht nur `rotation`. Ein `Holzzaun` von 200x50 steht danach
// quer, aber auf ein Viertel gestaucht – `object-fit: contain` passt ein
// 4:1-Bild in einen 1:4-Kasten ein. Ein gedrehtes langes Teil passt nicht in
// seinen ungedrehten Kasten; kein Einpassungsmodus aendert das. Der Kasten muss
// mitdrehen, und damit die Feldbelegung.
//
// Was hier geprueft wird:
//   * KA1: `rotatePlacement` – Maßtausch, Neueinrasten ueber `snapInto`,
//     Rand, Karte, kein Raster, unbekannter Schritt
//   * KA2: die Verdrahtung im Tisch (Quelltest, der Client hat keine
//     Testinfrastruktur)
//   * KA3: `token_rotate` traegt die Platzierung mit
//
// Begruendung und die Stellen, an denen die Spec nicht stimmt, in
// `docs/tasks-kasten.md`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { rotatePlacement, cellPoint } = await import('../../shared/gridGeometry.js');
const { handleMessage } = await import('../src/websocket/messageHandler.js');

/** 10x10 Felder à 50px im Ursprung. */
const grid = {
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 50, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
};

/** Ein Token auf einem benannten Bereich, mit den Massen dieses Bereichs. */
function on(cell, width, height, over = {}) {
  const p = cellPoint(grid, cell);
  return {
    id: 't1', shape: 'image', rotation: 0,
    x: p.x, y: p.y, width, height, size: width,
    gridId: grid.id, cell, attachedTo: null, attachedCorner: null,
    ...over,
  };
}

// ── KA1: rotatePlacement ─────────────────────────────────────────────────────

test('ein 200x50-Zaun liegt nach 90 Grad ueber vier Felder in der Senkrechten', () => {
  // Spec-Abnahme 1. 50x200 ist die volle Laenge quer – nicht die 12,5x50, die
  // `object-fit: contain` aus einem ungedrehten Kasten macht.
  const zaun = on('A3:D3', 200, 50);
  const p = rotatePlacement(zaun, { grids: [grid], step: 90 });

  assert.equal(p.rotation, 90);
  assert.equal(p.width, 50);
  assert.equal(p.height, 200);
  assert.equal(p.cell, 'C2:C5', 'vier Felder in der Senkrechten');
  assert.equal(p.gridId, 'g1');
  assert.equal(p.offGrid, false);
});

test('zweimal 90 Grad gibt die Waagerechte zurueck', () => {
  // Abnahme 2' (siehe docs/tasks-kasten.md, Abweichung 3): die Masse kommen
  // zurueck, der Ort darf um ein halbes Feld je Drehung gewandert sein – beim
  // Wechsel zwischen gerader und ungerader Feldzahl gibt es keinen
  // ganzzahligen Mittelpunkt, und `rangeAt` rundet.
  const zaun = on('A3:D3', 200, 50);
  const quer = { ...zaun, ...rotatePlacement(zaun, { grids: [grid], step: 90 }) };
  const p = rotatePlacement(quer, { grids: [grid], step: 90 });

  assert.equal(p.rotation, 180);
  assert.equal(p.width, 200);
  assert.equal(p.height, 50);
  assert.equal(p.cell, 'B4:E4', 'wieder vier Felder waagerecht');
});

test('ein 2x2-Boesewicht liegt nach jeder Drehung auf denselben vier Feldern', () => {
  // Spec-Abnahme 3, unveraendert aus M13.1: bei einem quadratischen Token ist
  // der Tausch ein Nullzug. Das ist der Kern der Sache – der Kasten dreht mit,
  // ohne dass sich fuer die meisten Stuecke etwas aendert.
  let boss = on('C3:D4', 100, 100);
  for (const step of [90, 90, 90, 90]) {
    const p = rotatePlacement(boss, { grids: [grid], step });
    assert.equal(p.cell, 'C3:D4');
    assert.equal(p.width, 100);
    assert.equal(p.height, 100);
    assert.equal(p.x, boss.x);
    assert.equal(p.y, boss.y);
    boss = { ...boss, ...p };
  }
  assert.equal(boss.rotation, 0, 'viermal rechts herum ist wieder 0');
});

test('laeuft der gedrehte Bereich ueber den Rand, wird gedreht und markiert', () => {
  // Spec-Abnahme 4 – dasselbe wie beim Ziehen ueber den Rand (M10.10):
  // sichtbar markieren, nicht zurueckspringen und nicht die Drehung verweigern.
  const zaun = on('A1:D1', 200, 50);
  const p = rotatePlacement(zaun, { grids: [grid], step: 90 });

  assert.equal(p.rotation, 90, 'die Drehung findet statt');
  assert.equal(p.width, 50);
  assert.equal(p.height, 200);
  assert.equal(p.offGrid, true);
  assert.equal(p.gridId, null);
  assert.equal(p.cell, null);
  assert.equal(p.x, undefined, 'der Ort bleibt, wo er ist – er wird nicht neu gesetzt');
});

test('ein Token an einer Karte behaelt Ort und Bindung', () => {
  // Spec-Abnahme 5. Anhaengen loescht die Rasteradresse schon beim Ablegen
  // (`handleObjDragEnd`), die Abfrage schreibt die Regel nur dorthin, wo man
  // sie sucht.
  const marke = on('C3:D4', 60, 40, {
    gridId: null, cell: null, attachedTo: 'card-7', attachedCorner: 'top-left',
  });
  const p = rotatePlacement(marke, { grids: [grid], step: -90 });

  assert.deepStrictEqual(p, { rotation: 270, width: 40, height: 60 });
});

test('ohne Raster unter sich dreht nur das Bild, und die Masse tauschen', () => {
  const frei = { id: 't9', shape: 'image', rotation: 0, x: 900, y: 900, width: 80, height: 20 };
  assert.deepStrictEqual(
    rotatePlacement(frei, { grids: [grid], step: 90 }),
    { rotation: 90, width: 20, height: 80 },
  );
  assert.deepStrictEqual(
    rotatePlacement(frei, { step: 90 }),
    { rotation: 90, width: 20, height: 80 },
    'ohne Rasterliste dasselbe – ein Schritt ohne Ziel ist kein Schritt',
  );
});

test('ein Token, das nur `size` traegt, bekommt getauschte Masse daraus', () => {
  // Staende von vor M3c haben kein width/height. Dieselbe Ruecksicht wie im
  // Ablegecode (`token.width || token.size`).
  const alt = { id: 't2', shape: 'image', size: 30, x: 500, y: 500 };
  assert.deepStrictEqual(rotatePlacement(alt, { step: 90 }), { rotation: 90, width: 30, height: 30 });
});

test('ein Schritt, der keine Vierteldrehung ist, aendert nichts', () => {
  const zaun = on('A3:D3', 200, 50);
  for (const step of [180, 0, 45, undefined]) {
    assert.deepStrictEqual(
      rotatePlacement(zaun, { grids: [grid], step }),
      { rotation: 0 },
      `step ${String(step)} darf weder Masse noch Ort anfassen`,
    );
  }
});

test('der unlesbare Winkel eines alten Standes gilt als 0', () => {
  // `nextRotation` ist die eine Winkelrechnung; hier steht keine zweite daneben.
  const p = rotatePlacement({ ...on('C3:D4', 100, 100), rotation: 360 }, { grids: [grid], step: 90 });
  assert.equal(p.rotation, 90);
});

// ── KA2: die Verdrahtung im Tisch ────────────────────────────────────────────

test('der Tisch dreht ueber rotatePlacement und schickt die Adresse mit', () => {
  const src = readFileSync(fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8')
    .split('\n')
    .filter(line => !/^\s*(?:\/\/|\*|\/\*)/.test(line))
    .join('\n');

  assert.match(src, /import \{[^}]*rotatePlacement[^}]*\} from '\.\.\/\.\.\/\.\.\/shared\/gridGeometry\.js'/,
    'die Platzierung wird nicht im Tisch nachgerechnet');
  assert.match(src, /rotatePlacement\(tok, \{ grids: tableGrids, step \}\)/,
    'und mit den Rastern des Tischs gefragt');
  const senden = src.slice(src.indexOf("type: 'token_rotate'"));
  assert.match(senden.slice(0, 300), /gridAddress\(place\)/,
    'die Adresse geht ueber dieselbe Feldliste wie bei token_move mit');
});

// ── KA3: die Serveraktion traegt die Platzierung ─────────────────────────────

function fakeRoom(tokens) {
  const sent = [];
  const ws = { readyState: 1, send: data => sent.push(JSON.parse(data)) };
  return {
    sent,
    players: new Map([['p1', { color: 'red' }], ['p2', { color: 'blue' }]]),
    connections: new Map([['p2', ws]]),
    zones: [],
    boardState: { cards: [], stacks: [], tokens, counters: [], notes: [], dice: [], customDice: [] },
  };
}

test('token_rotate setzt Winkel, Ort und Adresse auf der Serverkopie', () => {
  // Spec-Abnahme 6: sonst saehe der zweite Platz den Zaun gedreht, aber in
  // alter Groesse auf altem Feld – und `placeOnGrids` zoege ihn beim naechsten
  // Laden dorthin zurueck.
  const room = fakeRoom([on('A3:D3', 200, 50)]);
  handleMessage(room, 'p1', JSON.stringify({
    type: 'token_rotate', token_id: 't1', rotation: 90,
    x: 125, y: 150, gridId: 'g1', cell: 'C2:C5', width: 50, height: 200, offGrid: false,
  }));

  const token = room.boardState.tokens[0];
  assert.deepStrictEqual(
    { rotation: token.rotation, x: token.x, y: token.y, cell: token.cell, width: token.width, height: token.height },
    { rotation: 90, x: 125, y: 150, cell: 'C2:C5', width: 50, height: 200 },
  );
  assert.equal(room.sent.length, 1);
  assert.deepStrictEqual(
    Object.keys(room.sent[0]).sort(),
    ['cell', 'from_player_id', 'gridId', 'height', 'offGrid', 'rotation', 'timestamp', 'token_id', 'type', 'width', 'x', 'y'].sort(),
  );
});

test('token_rotate ohne Ort laesst den Ort stehen', () => {
  // Ein aelterer Client schickt nur den Winkel; sein Zug darf die vorhandene
  // Lage nicht loeschen – dieselbe Haltung wie bei den Adressfeldern.
  const room = fakeRoom([on('A3:D3', 200, 50)]);
  handleMessage(room, 'p1', JSON.stringify({ type: 'token_rotate', token_id: 't1', rotation: 180 }));

  const token = room.boardState.tokens[0];
  assert.deepStrictEqual(
    { rotation: token.rotation, x: token.x, y: token.y, cell: token.cell, width: token.width },
    { rotation: 180, x: 100, y: 125, cell: 'A3:D3', width: 200 },
  );
  assert.deepStrictEqual(
    Object.keys(room.sent[0]).sort(),
    ['from_player_id', 'rotation', 'timestamp', 'token_id', 'type'],
    'und die Nachricht traegt nichts, was nicht drinstand',
  );
});

test('ein unlesbarer Winkel verwirft auch die mitgeschickte Adresse', () => {
  const room = fakeRoom([on('A3:D3', 200, 50)]);
  handleMessage(room, 'p1', JSON.stringify({
    type: 'token_rotate', token_id: 't1', rotation: 45, x: 999, y: 999, cell: 'B4:E4',
  }));

  const token = room.boardState.tokens[0];
  assert.deepStrictEqual({ x: token.x, cell: token.cell, rotation: token.rotation }, { x: 100, cell: 'A3:D3', rotation: 0 });
  assert.equal(room.sent.length, 0);
});

test('der Tisch legt Winkel, Ort und Adresse einer fremden Drehung an', () => {
  const src = readFileSync(fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');
  const zweig = src.slice(src.indexOf("case 'token_rotate':"), src.indexOf("case 'counter_move':"));
  assert.match(zweig, /gridAddress\(msg\)/, 'sonst bliebe der zweite Platz auf der alten Adresse');
  assert.match(zweig, /msg\.x/, 'und am alten Ort');
});
