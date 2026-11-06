// Der Tisch der Dörfler-Tests: die Kurzpartie, wie sie ihre Dörfler baut.
//
// Geteilt von `villagers.test.js` und `swap-villager.test.js`: derselbe Aufbau
// (Auszug aus der Datenbank, `fixtures/doerfler-kurzpartie.json`, mit den
// Umschreibungen aus `scripts/doerfler-daten.mjs`), dieselben Zonen, dieselben
// Dörferdaten. Nichts wird von Hand in einen Zustand geschrieben, den der
// Aufbau nie hergestellt hätte. Kein `.test.js`: der Runner lädt es nicht
// selbst.

import assert from 'node:assert/strict';
import fs from 'node:fs';

import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { zoneContains } from '../../shared/zoneGeometry.js';
import { equipmentZones } from '../../scripts/equipment-zones.mjs';
import { patchSequence, patchScenario } from '../../scripts/doerfler-daten.mjs';

export const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/doerfler-kurzpartie.json', import.meta.url), 'utf8'));

export const FIGHT = { id: 'zfight', label: 'Bösewicht-Tableau', shape: 'rect', type: 'shared', accepts: ['asset'], capacity: 1, layout: 'stack', x: 1900, y: 200, width: 300, height: 600 };
export const STONES = { id: 'zstones', label: "Buyin'/Beatin'-Leiste", shape: 'rect', type: 'shared', accepts: ['asset'], capacity: 5, layout: 'column', x: 100, y: 100, width: 60, height: 300 };
export const ZONES = [...equipmentZones(), ...fx.leisten, FIGHT, STONES];
export const scenarioData = patchScenario({});

export const opts = (over = {}) => ({ assets: fx.assets, cards: fx.cards, scenarioData, ...over });
export const run = (state, steps, over = {}) => executeSequenceWithLog(state, steps, over.zones || ZONES, opts(over));
export const swap = (state, seat, villager, over = {}) => run(state, [{ type: 'swap_villager', seat, villager }], over);

export const copy = (x) => JSON.parse(JSON.stringify(x));

/** Der Tisch nach dem Aufbau der Kurzpartie (nur der Dörfler-Teil). */
export function build() {
  const { state, log } = run({}, patchSequence(fx.sequenceBefore));
  assert.deepEqual(log.filter(e => e.status !== 'ok'), [], 'der Aufbau muss ohne Beanstandung laufen');
  return state;
}

/** Derselbe Tisch mit einem Bösewicht-Tableau – es läuft ein Kampf. */
export function imKampf(s) {
  const k = copy(s);
  k.tokens.push({ id: 'b', label: 'Tableau: Waggums', assetId: 'x', x: 2050, y: 500, shape: 'image', size: 300 });
  return k;
}

export const tokenNamed = (state, label) => state.tokens.filter(t => t.label === label);
export const counterNamed = (state, name) => state.counters.find(c => c.name === name);
export const cardNamed = (state, name) => state.cards.find(c => c.name === name);
export const resolved = (state) => resolveZones(ZONES, anchorBoxes(state.boards, state.tokens));
export const inZone = (state, o, label) => zoneContains(resolved(state).find(z => z.label === label), o.x, o.y);
