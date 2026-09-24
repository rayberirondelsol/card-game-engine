// M2.9 – the context menu stays on screen (spec section "M2.9").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Same reason as zone-draft.test.js and grid-geometry.test.js: the client has
// no test setup, so the decidable part – where a layer of known size may sit in
// a viewport of known size – lives in a pure module and is tested from here.
// The DOM part left in GameTable.jsx is only "measure, call this, apply".

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { menuPlacement } = await import('../../client/src/utils/menuPlacement.js');

// A desktop window. Default margin is 8, so the usable area is 8…1192 × 8…792.
const VIEW = { viewportWidth: 1200, viewportHeight: 800 };
const MENU = { width: 200, height: 240 };

/** Everything the rule promises, checked at once: nothing sticks out. */
function assertInside(p, { width, height }, view, margin = 8, insets = {}) {
  const left = margin + (insets.left || 0);
  const top = margin + (insets.top || 0);
  const right = view.viewportWidth - (insets.right || 0) - margin;
  const bottom = view.viewportHeight - (insets.bottom || 0) - margin;
  assert.ok(p.left >= left, `left ${p.left} < ${left}`);
  assert.ok(p.top >= top, `top ${p.top} < ${top}`);
  assert.ok(p.left + width <= right, `right edge ${p.left + width} > ${right}`);
  const h = p.maxHeight === null ? height : Math.min(height, p.maxHeight);
  assert.ok(p.top + h <= bottom, `bottom edge ${p.top + h} > ${bottom}`);
}

test('a click in the middle opens down-right, exactly at the click point', () => {
  const p = menuPlacement({ x: 400, y: 300, ...MENU, ...VIEW });
  assert.deepEqual(p, { left: 400, top: 300, maxHeight: null });
  assertInside(p, MENU, VIEW);
});

test('near the bottom edge the menu flips up: bottom edge on the click point', () => {
  const p = menuPlacement({ x: 400, y: 780, ...MENU, ...VIEW });
  assert.equal(p.top + MENU.height, 780);
  assert.equal(p.left, 400);
  assert.ok(p.top >= 8, 'top keeps the margin');
  assert.equal(p.maxHeight, null, 'it fits after flipping, so no cap');
  assertInside(p, MENU, VIEW);
});

test('near the right edge the menu flips left: right edge on the click point', () => {
  const p = menuPlacement({ x: 1150, y: 300, ...MENU, ...VIEW });
  assert.equal(p.left + MENU.width, 1150);
  assert.equal(p.top, 300, 'vertical placement is untouched');
  assertInside(p, MENU, VIEW);
});

test('in the bottom-right corner it flips both ways at once', () => {
  const p = menuPlacement({ x: 1150, y: 780, ...MENU, ...VIEW });
  assert.equal(p.left + MENU.width, 1150);
  assert.equal(p.top + MENU.height, 780);
  assertInside(p, MENU, VIEW);
});

test('a menu taller than the viewport is clamped and capped, not flipped', () => {
  const tall = { width: 200, height: 2000 };
  const p = menuPlacement({ x: 400, y: 600, ...tall, ...VIEW });
  assert.equal(p.top, 8, 'pushed to the top of the usable area');
  assert.equal(p.maxHeight, 784, '800 − 2 × 8 margin: overflow:auto takes over');
  assertInside(p, tall, VIEW);
});

test('a menu that fits nowhere beside the click but into the window is only moved', () => {
  const big = { width: 200, height: 600 };
  const p = menuPlacement({ x: 400, y: 400, ...big, ...VIEW });
  assert.equal(p.top, 192, 'bottom edge lands on 792, the usable bottom');
  assert.equal(p.maxHeight, null, 'it fits once moved, so nothing is cut off');
  assertInside(p, big, VIEW);
});

test('the margin is kept on every edge, even for a click outside it', () => {
  const topLeft = menuPlacement({ x: 0, y: 0, ...MENU, ...VIEW });
  assert.deepEqual(topLeft, { left: 8, top: 8, maxHeight: null });

  const bottomRight = menuPlacement({ x: 1200, y: 800, ...MENU, ...VIEW });
  assert.deepEqual(bottomRight, { left: 1200 - 8 - 200, top: 800 - 8 - 240, maxHeight: null });
  assertInside(bottomRight, MENU, VIEW);

  const wide = menuPlacement({ x: 600, y: 400, ...MENU, ...VIEW, margin: 40 });
  assert.deepEqual(wide, { left: 600, top: 400, maxHeight: null });
  assert.deepEqual(
    menuPlacement({ x: 1200, y: 800, ...MENU, ...VIEW, margin: 40 }),
    { left: 1200 - 40 - 200, top: 800 - 40 - 240, maxHeight: null },
  );
});

test('safe-area insets shrink the usable area', () => {
  const insets = { top: 44, right: 0, bottom: 34, left: 0 };
  // Usable vertically: 52 … 758.
  const p = menuPlacement({ x: 400, y: 5, ...MENU, ...VIEW, insets });
  assert.equal(p.top, 52, 'the notch pushes the menu below itself');
  assertInside(p, MENU, VIEW, 8, insets);

  const tall = { width: 200, height: 2000 };
  const capped = menuPlacement({ x: 400, y: 400, ...tall, ...VIEW, insets });
  assert.equal(capped.top, 52);
  assert.equal(capped.maxHeight, 706, '800 − 44 − 34 − 2 × 8');

  const side = menuPlacement({ x: 1150, y: 300, ...MENU, ...VIEW, insets: { right: 60 } });
  assert.equal(side.left, 1200 - 60 - 8 - 200, 'the right inset is part of the edge');
  assertInside(side, MENU, VIEW, 8, { right: 60 });
});

test('degenerate input gives sane numbers, never NaN or a negative size', () => {
  const empty = menuPlacement({ x: 400, y: 300, width: 0, height: 0, ...VIEW });
  assert.deepEqual(empty, { left: 400, top: 300, maxHeight: null });

  // Window smaller than two margins: there is no usable area left at all.
  const tiny = menuPlacement({ x: 5, y: 5, ...MENU, viewportWidth: 10, viewportHeight: 10 });
  assert.deepEqual(tiny, { left: 8, top: 8, maxHeight: 0 });
  for (const v of Object.values(tiny)) assert.ok(Number.isFinite(v), `NaN in ${JSON.stringify(tiny)}`);
});

// ── M10.12 / C2: der Rechtsklick kommt am eigenen Menue vorbei ───────────────
//
// Der Befund: das Kontextmenue schien umzuschalten – nach einem Klick woanders
// brauchte es zwei Rechtsklicks. Umgeschaltet hat nie jemand; die elf
// `onContextMenu`-Handler setzen alle nur. Geschluckt hat der Klickfaenger,
// ein `fixed inset-0 z-40` unter dem Menue, der bei offenem Menue **jeden**
// Zeiger abfing: das Objekt bekam seinen Rechtsklick nie, der Finger seinen
// `touchstart` nie (Langdruck-Menue M2.11), und geschlossen wurde trotzdem.
//
// Statt des Faengers entscheidet jetzt diese Frage am `document`. Sie steht
// hier, weil das Kontextmenue schon diesem Modul gehoert – eine zweite Stelle
// mit einer zweiten Lesart von "im Menue" waere der Fehler von vorhin.

const { closesMenu } = await import('../../client/src/utils/menuPlacement.js');

/** Ein Knoten mit genau so viel DOM, wie die Frage braucht. */
function node(children = []) {
  const self = {
    children,
    contains: (t) => t === self || children.some(c => c === t || c.contains?.(t)),
  };
  return self;
}

test('M10.12 Abnahme 1: ein Druck neben dem Menue schliesst es – gleich was vorher war', () => {
  const eintrag = node();
  const menu = node([eintrag]);
  const karte = node();
  assert.equal(closesMenu(karte, menu), true);
});

test('M10.12 Abnahme 2: der Druck auf ein anderes Objekt kommt durch, statt nur zu schliessen', () => {
  // Die Umkehrung des Faengers: das Ziel ist das Objekt, nicht das Menue.
  // Geschlossen wird, geoeffnet wird vom Handler des Objekts – beides im
  // selben Zeigerereignis, `pointerdown` laeuft vor `contextmenu`.
  const menu = node();
  const anderesObjekt = node();
  assert.equal(closesMenu(anderesObjekt, menu), true);
});

test('ein Druck IM Menue schliesst es nicht – sonst fraesse das Schliessen den Eintrag', () => {
  const eintrag = node();
  const menu = node([eintrag]);
  assert.equal(closesMenu(eintrag, menu), false);
  assert.equal(closesMenu(menu, menu), false);
});

test('tief verschachtelte Eintraege zaehlen auch als "im Menue"', () => {
  const icon = node();
  const knopf = node([icon]);
  const menu = node([node([knopf])]);
  assert.equal(closesMenu(icon, menu), false);
});

test('ohne Menue und ohne Ziel bleibt es beim Schliessen', () => {
  assert.equal(closesMenu(node(), null), true, 'kein gemessenes Menue: nichts zu verschonen');
  assert.equal(closesMenu(null, node()), true);
  assert.equal(closesMenu(null, null), true);
});
