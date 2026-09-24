// M8.5 Regel 3 – das Mausrad ueber der Liste scrollt die Liste (Aufgabe N3).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Bauform ist die von panTarget.js (M2.13): eine reine Funktion, mehrere
// Aufrufer. Die Bedingung ist eine andere – `data-ui-element` taugt hier
// nicht, weil Boards und Token es selbst tragen und das Rad ueber dem
// Hauptplan weiter zoomen muss.
//
// Die DOM-Ziele sind einfache Objekte mit `parentElement`, `scrollHeight` und
// `clientHeight`; mehr fragt die Regel nicht ab.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { canZoomTable } = await import('../../client/src/utils/wheelTarget.js');

/** Ein Element mit Ueberlauf `over` und Elternteil `parent`. */
function el({ parent = null, scrollHeight = 100, clientHeight = 100, overflow = 'visible' } = {}) {
  return { parentElement: parent, scrollHeight, clientHeight, overflow };
}

/** Der Ueberlauf-Stil, wie ihn `getComputedStyle` im Browser liefern wuerde. */
const overflowOf = (node) => node.overflow;

const container = el();

test('ueber einem ueberlaufenden Scrollpanel gehoert das Rad dem Panel', () => {
  const panel = el({ parent: container, scrollHeight: 4000, clientHeight: 600, overflow: 'auto' });
  const card = el({ parent: panel });
  assert.equal(canZoomTable(card, container, overflowOf), false);
});

test('dasselbe Panel ohne Ueberlauf zoomt weiter', () => {
  const panel = el({ parent: container, scrollHeight: 600, clientHeight: 600, overflow: 'auto' });
  assert.equal(canZoomTable(el({ parent: panel }), container, overflowOf), true);
});

test('ein ueberlaufender Vorfahr ohne Scroll-Overflow zoomt weiter', () => {
  // Der world-transform-wrapper: `absolute inset-0` ueber einem viel groesseren
  // Tisch, also scrollHeight > clientHeight – aber overflow: visible. Wer nur
  // die Hoehen vergleicht, schaltet damit das Zoomen ganz ab.
  const wrapper = el({ parent: container, scrollHeight: 5000, clientHeight: 800, overflow: 'visible' });
  assert.equal(canZoomTable(el({ parent: wrapper }), container, overflowOf), true);
});

test('M2.13 bleibt heil: ueber einem Token zoomt das Rad', () => {
  // Ein Token traegt data-ui-element="true" und wuerde von der Bedingung des
  // React-Horchers abgewiesen. Hier nicht – es scrollt nichts.
  const token = el({ parent: container });
  assert.equal(canZoomTable(token, container, overflowOf), true);
});

test('der Container selbst und die Leinwand zoomen', () => {
  assert.equal(canZoomTable(container, container, overflowOf), true);
  assert.equal(canZoomTable(el({ parent: container }), container, overflowOf), true);
});

test('ohne Ziel oder ohne Container wird gezoomt wie bisher', () => {
  assert.equal(canZoomTable(null, container, overflowOf), true);
  assert.equal(canZoomTable(el(), null, overflowOf), true);
});

test('scroll zaehlt wie auto, hidden nicht', () => {
  const scrolling = el({ parent: container, scrollHeight: 4000, clientHeight: 600, overflow: 'scroll' });
  assert.equal(canZoomTable(el({ parent: scrolling }), container, overflowOf), false);
  const hidden = el({ parent: container, scrollHeight: 4000, clientHeight: 600, overflow: 'hidden' });
  assert.equal(canZoomTable(el({ parent: hidden }), container, overflowOf), true);
});
