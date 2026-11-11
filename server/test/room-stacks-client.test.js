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

// ── GB: bilden und mergen ────────────────────────────────────────────────────

test('GB: applyStackCreate – die Karten bekommen Stapel, Ort und zIndex der Nachricht (Reihenfolge unten → oben), Rasterfeld weg', () => {
  const tisch = [karte('a', { x: 5, y: 5, gridId: 'g', cell: 'C7' }), karte('b', { x: 9, y: 9 }), karte('z', { x: 1, y: 1 })];
  const neu = ops.applyStackCreate(tisch, { stack_id: 's', card_table_ids: ['b', 'a'], z_index: [20, 21], x: 100, y: 200 });
  const a = neu.find(c => c.tableId === 'a');
  const b = neu.find(c => c.tableId === 'b');
  assert.deepEqual([b.inStack, b.zIndex, b.x, b.y], ['s', 20, 100, 200]);
  assert.deepEqual([a.inStack, a.zIndex, a.x, a.y, a.gridId, a.cell], ['s', 21, 100, 200, null, null]);
  assert.equal(neu.find(c => c.tableId === 'z'), tisch[2], 'die übrigen bleiben dieselben Objekte');
  assert.equal(a.faceDown, false, 'die Seite bleibt, wie sie war');
});

test('GB: applyStackCreate – ein Quellstapel mit einer Restkarte löst sich auf, einer mit zwei bleibt', () => {
  const tisch = [
    karte('a', { inStack: 's1' }), karte('b', { inStack: 's1' }), karte('c', { inStack: 's1' }),
    karte('p', { inStack: 's2' }), karte('q', { inStack: 's2' }), karte('l'),
  ];
  const neu = ops.applyStackCreate(tisch, { stack_id: 'neu', card_table_ids: ['c', 'p', 'l'], z_index: [1, 2, 3], x: 0, y: 0 });
  assert.deepEqual(neu.map(c => c.inStack), ['s1', 's1', 'neu', 'neu', null, 'neu']);
  assert.equal(neu.find(c => c.tableId === 'q').inStack, null, 'q blieb allein im Stapel s2');
});

test('GB: applyStackCreate – eine vorhandene Id wird neu gefasst (Haufen im Ablagestapel); unlesbare Nachrichten ändern nichts', () => {
  const tisch = [karte('a', { inStack: 's', zIndex: 1 }), karte('b', { inStack: 's', zIndex: 2 }), karte('c', { zIndex: 3 })];
  const neu = ops.applyStackCreate(tisch, { stack_id: 's', card_table_ids: ['a', 'b', 'c'], z_index: [1, 2, 3], x: 7, y: 8 });
  assert.deepEqual(neu.map(c => c.inStack), ['s', 's', 's']);
  assert.deepEqual(neu.map(c => [c.x, c.y]), [[7, 8], [7, 8], [7, 8]]);
  for (const bad of [null, {}, { stack_id: 's', card_table_ids: ['a'], x: 0, y: 0 }, { stack_id: 's', card_table_ids: ['a', 'b'], x: 'x', y: 0 }, { card_table_ids: ['a', 'b'], x: 0, y: 0 }]) {
    assert.equal(ops.applyStackCreate(tisch, bad), tisch, JSON.stringify(bad));
  }
  assert.equal(ops.applyStackCreate(tisch, { stack_id: 'n', card_table_ids: ['gibtsnicht', 'nochnicht'], x: 0, y: 0 }), tisch, 'keine der Karten ist da');
});

test('GB: applyStackCreate – ohne z_index behalten die Karten ihren zIndex', () => {
  const neu = ops.applyStackCreate([karte('a', { zIndex: 4 }), karte('b', { zIndex: 5 })], { stack_id: 's', card_table_ids: ['a', 'b'], x: 0, y: 0 });
  assert.deepEqual(neu.map(c => c.zIndex), [4, 5]);
});

test('GB: applyStackMerge – ein Stapel kommt oben auf das Ziel, an dessen Ort, mit den zIndex der Nachricht', () => {
  const tisch = [karte('a', { inStack: 't', x: 50, y: 60, zIndex: 1 }), karte('b', { inStack: 't', x: 50, y: 60, zIndex: 2 }),
    karte('p', { inStack: 's', x: 9, y: 9, zIndex: 7, gridId: 'g', cell: 'C1' }), karte('q', { inStack: 's', x: 9, y: 9, zIndex: 8 })];
  const neu = ops.applyStackMerge(tisch, { from_stack_id: 's', to_stack_id: 't', card_table_ids: ['q', 'p'], z_index: [3, 4], x: 50, y: 60 });
  const p = neu.find(c => c.tableId === 'p');
  const q = neu.find(c => c.tableId === 'q');
  assert.deepEqual([q.inStack, q.zIndex, q.x, q.y], ['t', 3, 50, 60]);
  assert.deepEqual([p.inStack, p.zIndex, p.x, p.y, p.gridId, p.cell], ['t', 4, 50, 60, null, null]);
  assert.equal(neu.find(c => c.tableId === 'a'), tisch[0]);
});

test('GB: applyStackMerge – eine lose Karte kommt oben auf den Stapel; unlesbare Nachrichten ändern nichts', () => {
  const tisch = [karte('a', { inStack: 't', x: 50, y: 60, zIndex: 1 }), karte('l', { x: 1, y: 1, zIndex: 9 })];
  const neu = ops.applyStackMerge(tisch, { from_table_id: 'l', to_stack_id: 't', card_table_ids: ['l'], z_index: [2], x: 50, y: 60 });
  assert.deepEqual([neu[1].inStack, neu[1].zIndex, neu[1].x, neu[1].y], ['t', 2, 50, 60]);
  for (const bad of [null, {}, { to_stack_id: 't', card_table_ids: [] }, { to_stack_id: 't', card_table_ids: ['gibtsnicht'], x: 0, y: 0 }, { card_table_ids: ['l'], x: 0, y: 0 }, { to_stack_id: 't', card_table_ids: ['l'], x: 'x', y: 0 }]) {
    assert.equal(ops.applyStackMerge(tisch, bad), tisch, JSON.stringify(bad));
  }
});

// ── GB: der Haufen im Ablagestapel als Plan ──────────────────────────────────

const { pilePlan, pileUp } = await import('../../client/src/utils/cardDrop.js');
const ablage = { label: 'Ablage', layout: 'stack', shape: 'rect', x: 1479.6, y: 638.921, width: 117, height: 179.82 };
const MITTE = { x: ablage.x + ablage.width / 2, y: ablage.y + ablage.height / 2 };
const abgelegt = (id, n, extra = {}) => ({ tableId: id, x: MITTE.x + n * 6, y: MITTE.y + n * 6, zIndex: 10 + n, inStack: null, ...extra });

test('GB: pilePlan nennt dieselbe Zuordnung, die pileUp schreibt (neuer Stapel: Reihenfolge, zIndex, Ort)', () => {
  const tisch = [abgelegt('b', 1), abgelegt('a', 0), abgelegt('c', 2)];
  const plan = pilePlan(tisch, ablage, 's-neu');
  assert.deepEqual(plan, { stack_id: 's-neu', card_table_ids: ['a', 'b', 'c'], z_index: [10, 11, 12], x: MITTE.x, y: MITTE.y });
  const out = pileUp(tisch, ablage, 's-neu');
  for (const c of out) {
    const i = plan.card_table_ids.indexOf(c.tableId);
    assert.deepEqual([c.inStack, c.zIndex, c.x, c.y], [plan.stack_id, plan.z_index[i], plan.x, plan.y]);
  }
});

test('GB: pilePlan – ein vorhandener Stapel behält seine Id und seine Karten stehen unten; Hinzukommende oben', () => {
  const tisch = [abgelegt('a', 0, { inStack: 's-alt' }), abgelegt('b', 1, { inStack: 's-alt' }), abgelegt('c', 2)];
  const plan = pilePlan(tisch, ablage, 's-neu');
  assert.equal(plan.stack_id, 's-alt');
  assert.deepEqual(plan.card_table_ids, ['a', 'b', 'c']);
});

test('GB: pilePlan – nichts zu tun gibt null (eine Karte, keine Stapel-Zone, schon ein Stapel, Unsinn)', () => {
  assert.equal(pilePlan([abgelegt('a', 0)], ablage, 's'), null);
  assert.equal(pilePlan([abgelegt('a', 0), abgelegt('b', 1)], { ...ablage, layout: 'row' }, 's'), null);
  assert.equal(pilePlan([abgelegt('a', 0, { inStack: 's-alt' }), abgelegt('b', 1, { inStack: 's-alt' })], ablage, 's'), null);
  assert.equal(pilePlan(null, ablage, 's'), null);
});
