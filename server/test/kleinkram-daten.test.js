// CC/CD — Spec M24.1 und M24.3. Die Regeln der beiden Datenänderungen, geprüft
// ohne Datenbank: der Schalter `scripts/kleinkram-daten.mjs` wendet genau diese
// Funktionen auf die vier Spalten an, die er anfasst.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  ALT, NEU, renameIn, slugId, patchStep, patchSteps, patchActions,
} = await import('../../scripts/kleinkram-daten.mjs');

// ── CC: der Name ────────────────────────────────────────────────────────────

test('CC1: der Zusatz in Klammern wird ersetzt', () => {
  assert.equal(renameIn('Dorf-Ereignisse (Üble Nachbarn)'), 'Dorf-Ereignisse (Neue Nachbarn)');
  assert.equal(renameIn('Gelände (Üble Nachbarn) Back'), 'Gelände (Neue Nachbarn) Back');
});

test('CC2: ohne Klammern bleibt der Text stehen', () => {
  // Der historische Name steht in Fließtext und in Berichten. Ein Schalter,
  // der jedes Vorkommen ersetzt, trifft irgendwann eine Stelle, an der genau
  // dieser Name gemeint ist.
  assert.equal(renameIn('Die Erweiterung hieß früher Üble Nachbarn.'), 'Die Erweiterung hieß früher Üble Nachbarn.');
});

test('CC3: Namen ohne den Zusatz bleiben unberührt', () => {
  for (const n of ['Nachschub', 'Nachschub (freischaltbar)', 'Beute: Barry Bluff', 'Startausrüstung (Hookbox)']) {
    assert.equal(renameIn(n), n);
  }
});

test('CC4: ein zweiter Lauf ändert nichts mehr', () => {
  const einmal = renameIn('Startausrüstung (Üble Nachbarn)');
  assert.equal(renameIn(einmal), einmal);
  assert.ok(!einmal.includes(ALT));
  assert.ok(einmal.includes(NEU));
});

// ── CC: die Schritte, die eine Kategorie beim Namen rufen ───────────────────

test('CC5: place_stack mit Kategorienliste – nur die Liste ändert sich', () => {
  const step = {
    type: 'place_stack',
    category: ['Dorf-Ereignisse', 'Dorf-Ereignisse (Üble Nachbarn)'],
    label: 'Dorf-Ereignisse', x: 1780, y: 200, faceDown: true,
  };
  const next = patchStep(step);
  assert.deepEqual(next.category, ['Dorf-Ereignisse', 'Dorf-Ereignisse (Neue Nachbarn)']);
  // Alles andere Zeichen für Zeichen: Ort, Name, Seite.
  assert.deepEqual({ ...next, category: null }, { ...step, category: null });
});

test('CC6: clear_table mit Kategorienliste ebenso', () => {
  const step = {
    type: 'clear_table',
    category: ['Dorf-Ereignisse', 'Dorf-Ereignisse (Üble Nachbarn)'],
    targetStackLabel: 'Dorf-Ereignisse', faceDown: true,
  };
  assert.deepEqual(patchStep(step).category, ['Dorf-Ereignisse', 'Dorf-Ereignisse (Neue Nachbarn)']);
});

test('CC7: eine Kategorie als einzelner String', () => {
  assert.equal(patchStep({ type: 'place_stack', category: 'Gelände (Üble Nachbarn)' }).category, 'Gelände (Neue Nachbarn)');
});

test('CC8: ein unbeteiligter Schritt ist danach dasselbe Objekt', () => {
  // Kein neues Objekt heißt: der Schalter kann abzählen, wie viel er anfasst,
  // und seine Schranke („höchstens ein Schritt") greift wirklich.
  const step = { type: 'place_asset', assetName: 'Hauptplan', x: 0, y: 0 };
  assert.equal(patchStep(step), step);
  const steps = [step, { type: 'place_stack', category: ['Heldentaten'] }];
  assert.deepEqual(patchSteps(steps).filter((s, i) => s !== steps[i]), []);
});

// ── CD: die fehlende id ─────────────────────────────────────────────────────

test('CD1: eine Aktion ohne id bekommt eine aus ihrem Label', () => {
  const [a] = patchActions([{ label: 'Dorfphase beginnen', steps: [] }]);
  assert.equal(a.id, 'dorfphase-beginnen');
  assert.equal(a.label, 'Dorfphase beginnen');
});

test('CD2: die Schreibweise ist die der vorhandenen drei', () => {
  assert.equal(slugId('Kampf beginnen'), 'kampf-beginnen');
  assert.equal(slugId('Laden nachfüllen'), 'laden-nachfuellen');
  assert.equal(slugId('Dorfereignis ziehen'), 'dorfereignis-ziehen');
  assert.equal(slugId('Größe & Maß!'), 'groesse-mass');
});

test('CD3: eine Aktion mit id behält sie', () => {
  const vorher = [{ id: 'kampf-beginnen', label: 'Kampf beginnen', steps: [] }];
  assert.equal(patchActions(vorher)[0], vorher[0]);
});

test('CD4: die Schritte der Aktion reisen unverändert mit', () => {
  const steps = [{ type: 'clear_zone', zoneLabel: 'Ablage' }, { type: 'set_counter', name: 'Henlo: Leben', value: 3 }];
  const [a] = patchActions([{ label: 'Dorfphase beginnen', steps }]);
  assert.deepEqual(a.steps, steps);
  assert.equal(a.steps[0], steps[0]);
});

test('CD5: beide Änderungen an einer Aktion zugleich', () => {
  const [a] = patchActions([{
    label: 'Dorfphase beginnen',
    steps: [{ type: 'clear_table', category: ['Dorf-Ereignisse', `Dorf-Ereignisse (${ALT})`] }],
  }]);
  assert.equal(a.id, 'dorfphase-beginnen');
  assert.ok(!JSON.stringify(a).includes(ALT));
});

test('CD6: alle fünf Aktionen des Spiels tragen danach verschiedene id', () => {
  const labels = ['Kampf beginnen', 'Dorfereignis ziehen', 'Laden nachfüllen', 'Dorfphase beginnen'];
  const ids = patchActions(labels.map(label => ({ label, steps: [] }))).map(a => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(Boolean));
});
