// Stapelgriffe im Raum (docs/tasks-stapel-raum.md) – die reinen Teile des Clients (`client/src/utils/stackOps.js`):
// was ein Tisch aus der Rückmeldung des Servers macht. Der Absender wendet **dieselbe** Rückmeldung an wie jeder andere.
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const ops = await import('../../client/src/utils/stackOps.js');

const karte = (tableId, extra = {}) => ({ tableId, cardId: `c-${tableId}`, x: 0, y: 0, zIndex: 1, faceDown: false, rotation: 0, inStack: null, ...extra });

// ── GA: umdrehen ─────────────────────────────────────────────────────────────

test('GA: applyStackFlip setzt die absoluten Seiten der Stapelkarten; andere Karten bleiben dieselben Objekte', () => {
  const lose = karte('x', { faceDown: true });
  const tisch = [karte('a', { inStack: 's', faceDown: true }), karte('b', { inStack: 's' }), karte('z', { inStack: 't' }), lose];
  const neu = ops.applyStackFlip(tisch, { type: 'stack_flip', stack_id: 's', face_down: { a: false, b: true } });
  assert.deepEqual(neu.map(c => c.faceDown), [false, true, false, true]);
  assert.equal(neu[2], tisch[2], 'ein anderer Stapel bleibt dasselbe Objekt');
  assert.equal(neu[3], lose);
});

test('GA: applyStackFlip – ein zweites Echo derselben absoluten Werte ändert nichts; Unsinn lässt die Liste, wie sie ist', () => {
  const tisch = [karte('a', { inStack: 's', faceDown: false })];
  assert.equal(ops.applyStackFlip(tisch, { stack_id: 's', face_down: { a: false } })[0].faceDown, false);
  assert.equal(ops.applyStackFlip(tisch, { stack_id: 'gibtsnicht', face_down: { a: true } }), tisch);
  assert.equal(ops.applyStackFlip(tisch, { stack_id: 's' }), tisch);
  assert.equal(ops.applyStackFlip(tisch, { stack_id: 's', face_down: null }), tisch);
  assert.equal(ops.applyStackFlip(undefined, { stack_id: 's', face_down: {} }), undefined);
});
