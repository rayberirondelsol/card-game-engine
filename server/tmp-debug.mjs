import fs from 'node:fs';
import { bauen, patchSequence, patchScenario, patchActions } from '../scripts/auslagen-daten.mjs';
import { executeSequenceWithLog } from '../shared/sequenceExecutor.js';
const fx = JSON.parse(fs.readFileSync('test/fixtures/auslagen-kurzpartie.json', 'utf8'));
const seq = patchSequence(fx.sequenceBefore).next, sce = patchScenario(fx.scenarioBefore).next, act = patchActions(fx.actionsBefore).next;
const env = { assets: fx.assets, cards: fx.cards, grids: fx.grids, scenarioData: sce };
const built = bauen({ state: fx.state, sequence: seq, zones: fx.zones, ...env }, { partie: 'lang', troedel: 'ohne' }, 5).state;
const LEISTE = 'Bösewicht-Leiste';
const boss = 'Handsy';
const andere = Object.keys(sce.bosses).filter(k => k !== boss).slice(0, 3);
const steps = [
  { type: 'clear_zone', zoneLabel: LEISTE },
  { type: 'place_asset', assetName: `Bösewicht: ${boss}`, targetZoneLabel: LEISTE, slot: 4, faceDown: true },
];
const t = executeSequenceWithLog(built, steps, fx.zones, env);
console.log(t.log.map(e => `${e.index} ${e.type} ${e.status} ${e.reason ?? ''}`).join('\n'));
const z = fx.zones.find(z => z.label === LEISTE);
console.log(JSON.stringify(z).slice(0, 400));
console.log(t.state.tokens.filter(x => /Bösewicht: /.test(x.label)).map(x => [x.label, x.x, x.y, x.faceDown]));
const a = act.find(x => x.id === 'kampf-beginnen');
const r = executeSequenceWithLog(t.state, a.steps, fx.zones, env);
console.log(r.log.map(e => `${e.index} ${e.type} ${e.status} ${e.target} ${e.reason ?? ''}`).join('\n'));
console.log(r.state.cards.filter(c => /TRILLER/.test(c.name)).map(c => [c.name, c.category, c.x, c.y]), r.revealedLast);
