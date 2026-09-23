/**
 * The step vocabulary of the setup sequence, as the editor needs it (M2.7).
 *
 * Everything the editor decides about a step lives here, not in the JSX:
 * which types exist, which fields a type actually has, what a fresh step looks
 * like, how a step reads as one line, and what is wrong with it. The editor is
 * then only the rendering of these answers - which is what makes them testable
 * without any client test infrastructure (see server/test/sequence-steps.test.js).
 *
 * The field lists are the fields `applyStep` in sequenceExecutor.js reads, one
 * for one. Offering a field the handler ignores is worse than offering none:
 * it is a promise the setup does not keep.
 */
import { counterMax } from '../../../shared/counters.js';
import { cellFromLabel } from '../../../shared/gridGeometry.js';
import { hasPlaceholder } from '../../../shared/sequenceExecutor.js';

/**
 * The step types, in the order the dropdown offers them: card steps first
 * (they came first), then assets, because that is how a setup is written.
 * `fields` is the full set; `stepFields` narrows it per step where the step
 * itself decides (place_asset: zone or coordinates, not both).
 */
export const STEP_TYPES = [
  { value: 'shuffle', label: 'Shuffle', fields: ['stackLabel'] },
  { value: 'set_face_down', label: 'Set Face Down', fields: ['stackLabel'] },
  { value: 'set_face_up', label: 'Set Face Up', fields: ['stackLabel'] },
  { value: 'flip_top_card', label: 'Flip Top Card', fields: ['stackLabel'] },
  { value: 'split', label: 'Split Stack', fields: ['stackLabel', 'count', 'outputLabels', 'spacing'] },
  { value: 'deal_to_zone', label: 'Deal to Zone', fields: ['stackLabel', 'count', 'targetZoneLabel', 'faceDown'] },
  { value: 'move', label: 'Move Stack', fields: ['stackLabel', 'x', 'y'] },
  { value: 'place_stack', label: 'Place Stack', fields: ['category', 'label', 'x', 'y', 'faceDown'] },
  { value: 'remove_stack', label: 'Remove Stack', fields: ['stackLabel'] },
  { value: 'place_asset', label: 'Place Asset', fields: ['assetName', 'targetZoneLabel', 'gridLabel', 'cell', 'x', 'y', 'faceDown'] },
  { value: 'draw_assets', label: 'Draw Assets', fields: ['pool', 'count', 'targetZoneLabel', 'faceDown'] },
  { value: 'set_asset_face', label: 'Set Asset Face', fields: ['assetName', 'faceDown'] },
  { value: 'lock_asset', label: 'Lock Asset', fields: ['assetName'] },
  { value: 'unlock_asset', label: 'Unlock Asset', fields: ['assetName'] },
  { value: 'place_counter', label: 'Place Counter', fields: ['name', 'value', 'max', 'x', 'y'] },
  { value: 'reveal_next', label: 'Reveal Next', fields: ['zoneLabel', 'targetZoneLabel'] },
  { value: 'clear_zone', label: 'Clear Zone', fields: ['zoneLabel', 'targetZoneLabel', 'targetStackLabel', 'faceDown'] },
  { value: 'clear_grid', label: 'Clear Grid', fields: ['gridLabel'] },
  // M7/T6: kein `gridLabel` - das Raster steht in den Szenariodaten, nicht am
  // Schritt. Der Schritt hat genau eine Einstellung: ob der Endkampf-Abschnitt
  // dazugehoert.
  { value: 'build_scenario', label: 'Build Scenario', fields: ['final'] },
];

const typeOf = (step) => (typeof step === 'string' ? step : step?.type);
const specOf = (step) => STEP_TYPES.find(t => t.value === typeOf(step)) || null;

/** The readable name of a step type, or the raw type if it is unknown. */
export function stepTypeLabel(step) {
  return specOf(step)?.label || typeOf(step) || '(unknown step)';
}

/**
 * The fields to show for this step. Takes a type or a whole step: place_asset
 * is positioned either by a zone or by coordinates, and showing both invites
 * setting x/y that the zone then silently overrides.
 */
export function stepFields(step) {
  const spec = specOf(step);
  if (!spec) return [];
  // place_asset: zone, grid field and x/y are three exclusive ways of saying
  // where something goes, so only the chosen one is shown. Offering all three
  // invites setting an x/y that the zone then silently overrides.
  if (spec.value === 'place_asset' && typeof step === 'object') {
    if (step?.targetZoneLabel) return spec.fields.filter(f => !['gridLabel', 'cell', 'x', 'y'].includes(f));
    if (step?.cell) return spec.fields.filter(f => f !== 'x' && f !== 'y');
  }
  // clear_zone: die Seite gilt nur für Karten, die in einen Stapel
  // zurückgehen. Ohne Stapelziel wäre sie eine Einstellung ohne Wirkung.
  if (spec.value === 'clear_zone' && typeof step === 'object' && !step?.targetStackLabel) {
    return spec.fields.filter(f => f !== 'faceDown');
  }
  return [...spec.fields];
}

// ── Pools and asset names ────────────────────────────────────────────────────

const clean = (list) => [...new Set(list.map(v => String(v ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

/**
 * The draw pools of a game: the categories of its table assets. Not a new
 * concept - `draw_assets` matches `pool` against `table_assets.category`, and
 * an asset without a category belongs to no pool.
 */
export function assetPools(assets) {
  return Array.isArray(assets) ? clean(assets.map(a => a?.category)) : [];
}

/**
 * The addressable asset names. An imported asset with an empty name cannot be
 * named by a step (spec section 9), so it is not offered either.
 */
export function assetNames(assets) {
  return Array.isArray(assets) ? clean(assets.map(a => a?.name)) : [];
}

/**
 * M7/T3: die Stapelnamen, die ein Schritt adressieren kann - die am Tisch
 * benannten plus die, die ein `place_stack` in dieser Folge erst herstellt.
 * Ohne die zweite Hälfte wäre `place_stack` ein Schritt, dessen Ergebnis weder
 * `shuffle` noch `remove_stack` im Editor benennen könnte: der Stapel liegt
 * beim Bearbeiten nicht am Tisch.
 */
export function stackLabelsFor(steps, existing = []) {
  const made = (Array.isArray(steps) ? steps : []).filter(s => s?.type === 'place_stack').map(s => s?.label);
  return clean([...(Array.isArray(existing) ? existing : []), ...made]);
}

// ── New steps ────────────────────────────────────────────────────────────────

const first = (list) => (Array.isArray(list) && list.length ? list[0] : '');

/**
 * A fresh step, prefilled from what the setup already has, so that a newly
 * added step is usually already valid instead of a form full of blanks.
 *
 * `ctx` is { stackLabels, zoneLabels, pools, assetNames } - the same context
 * `validateStep` checks against.
 */
export function defaultStep(type, ctx = {}) {
  const { stackLabels = [], zoneLabels = [], pools = [], assetNames: names = [], cardCategories = [] } = ctx;
  const stackLabel = first(stackLabels);
  const zone = first(zoneLabels);

  switch (type) {
    case 'split':
      return { type, stackLabel, count: 2, outputLabels: ['', ''], spacing: 130 };
    case 'deal_to_zone':
      return { type, stackLabel, count: 1, targetZoneLabel: '', faceDown: false };
    case 'move':
      return { type, stackLabel, x: 0, y: 0 };
    case 'place_asset':
      // No zone by default: a board is laid out at a position, and a zone can
      // be picked afterwards. Picking one hides x/y (see stepFields).
      // Kein Raster und kein Feld: beides hiesse, x/y auszublenden, und ein
      // geratenes Feld ist eine Behauptung darueber, wo das Objekt hingehoert.
      return { type, assetName: first(names), targetZoneLabel: '', gridLabel: '', cell: '', x: 0, y: 0, faceDown: false };
    case 'draw_assets':
      return { type, pool: first(pools), count: 1, targetZoneLabel: zone, faceDown: false };
    case 'place_stack':
      // Der Stapelname bleibt leer: er ist die eine Entscheidung, die der Schritt
      // nicht vorwegnehmen darf - er ist der feste Name, unter dem ihn
      // `shuffle` und `remove_stack` später wiederfinden (M7/T3).
      return { type, category: first(cardCategories), label: '', x: 0, y: 0, faceDown: false };
    case 'set_asset_face':
      return { type, assetName: first(names), faceDown: true };
    case 'place_counter':
      // Kein `max`: die Obergrenze ist optional und wird nicht geraten. Der
      // Name bleibt leer, weil ihn nur der Autor kennt - er ist das eine Feld,
      // das die Validierung darum sofort anmahnt.
      return { type, name: '', value: 0, x: 0, y: 0 };
    case 'lock_asset':
    case 'unlock_asset':
      return { type, assetName: first(names) };
    case 'reveal_next':
      // Ohne Zielzone: Aufdecken bzw. Abraeumen und Verschieben sind zwei
      // Entscheidungen - und ein vorgegebenes Ziel waere beim Abraeumen die
      // falsche Vorgabe, weil "vom Tisch nehmen" der haeufigere Fall ist.
      return { type, zoneLabel: zone, targetZoneLabel: '' };
    case 'clear_grid':
      // Kein Ziel, keine Seite: clear_grid loescht, und das Raster ist seine
      // einzige Angabe (M7/T2).
      return { type, gridLabel: first((ctx.grids || []).map(g => g?.label).filter(Boolean)) };
    case 'build_scenario':
      // „auto" ist die Vorgabe: der Endkampf haengt am letzten Platz der
      // Leiste, und den weiss erst der Tisch (M7/T6).
      return { type, final: 'auto' };
    case 'clear_zone':
      // Dasselbe fuer beide Ziele - und ohne `faceDown`: die Seite wird nicht
      // geraten, eine frische Vorgabe laesst jede Karte ihre behalten (M5.1).
      return { type, zoneLabel: zone, targetZoneLabel: '', targetStackLabel: '' };
    default:
      return { type, stackLabel };
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

const q = (v, fallback = '(none)') => {
  const s = String(v ?? '').trim();
  return s ? `"${s}"` : fallback;
};
const down = (step) => (step?.faceDown ? ', face down' : '');

/**
 * One line per step, for the list in the editor. Without this the list shows
 * the bare type and every "Place Asset" row looks like every other one.
 */
export function describeStep(step) {
  const type = typeOf(step);
  const zone = step?.targetZoneLabel ? `zone ${q(step.targetZoneLabel)}` : 'all player zones';
  switch (type) {
    case 'shuffle': return `Shuffle ${q(step.stackLabel)}`;
    case 'set_face_down': return `Turn ${q(step.stackLabel)} face down`;
    case 'set_face_up': return `Turn ${q(step.stackLabel)} face up`;
    case 'flip_top_card': return `Flip top card of ${q(step.stackLabel)}`;
    case 'split': return `Split ${q(step.stackLabel)} into ${step.count ?? 2} stacks`;
    case 'deal_to_zone': return `Deal ${step.count ?? 1} from ${q(step.stackLabel)} to ${zone}${down(step)}`;
    case 'move': return `Move ${q(step.stackLabel)} to ${step.x ?? 0}, ${step.y ?? 0}`;
    case 'place_stack':
      return `Place card category ${q(step.category)} as stack ${q(step.label)} at ${step.x ?? 0}, ${step.y ?? 0}${down(step)}`;
    case 'remove_stack': return `Remove stack ${q(step.stackLabel)} from the table`;
    case 'place_asset': {
      const where = step.targetZoneLabel
        ? `in zone ${q(step.targetZoneLabel)}`
        : step.cell || step.gridLabel
          ? `on grid ${q(step.gridLabel)} field ${q(step.cell)}`
          : `at ${step.x ?? 0}, ${step.y ?? 0}`;
      return `Place ${q(step.assetName)} ${where}${down(step)}`;
    }
    case 'draw_assets':
      return `Draw ${step.count ?? 1} from pool ${q(step.pool)} into ${zone}${down(step)}`;
    case 'place_counter': {
      // Die Obergrenze steht so da, wie sie am Tisch steht: "2 / 3".
      const max = counterMax(step?.max);
      const start = max === undefined ? `${step?.value ?? 0}` : `${step?.value ?? 0} / ${max}`;
      return `Place counter ${q(step.name)} at ${step.x ?? 0}, ${step.y ?? 0} starting at ${start}`;
    }
    case 'set_asset_face':
      return `Turn ${q(step.assetName)} ${step.faceDown ? 'face down' : 'face up'}`;
    case 'reveal_next': {
      const into = step?.targetZoneLabel ? ` into zone ${q(step.targetZoneLabel)}` : '';
      return `Reveal the next face-down object in zone ${q(step.zoneLabel)}${into}`;
    }
    case 'clear_zone': {
      // Die Seite steht nur dort, wo sie gilt - und nur, wenn sie gesetzt ist:
      // ohne sie behaelt jede Karte ihre eigene (M5.1).
      const side = typeof step?.faceDown === 'boolean' ? (step.faceDown ? ', face down' : ', face up') : '';
      const into = step?.targetZoneLabel ? `into zone ${q(step.targetZoneLabel)}`
        : step?.targetStackLabel ? `under stack ${q(step.targetStackLabel)}${side}`
        : 'off the table';
      return `Clear zone ${q(step.zoneLabel)} ${into}`;
    }
    case 'clear_grid': return `Clear grid ${q(step.gridLabel)} off the table`;
    case 'build_scenario': {
      const when = step?.final === true || step?.final === 'true' ? 'with the final fight section'
        : step?.final === false || step?.final === 'false' ? 'without the final fight section'
        : 'with the final fight section only from the last slot of the bar';
      return `Build the revealed boss's scenario, ${when}`;
    }
    case 'lock_asset': return `Lock ${q(step.assetName)}`;
    case 'unlock_asset': return `Unlock ${q(step.assetName)}`;
    default: return stepTypeLabel(step);
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

const findGrid = (grids, label) =>
  (Array.isArray(grids) ? grids : []).find(g => String(g?.label ?? '').trim() === String(label ?? '').trim());

/**
 * What is wrong with this step, given what the setup has. Spec section 9 wants
 * a step pointing at a missing or empty name reported while it is edited, not
 * when the table is built - by then it is a silently skipped step in a setup
 * that otherwise looks right.
 *
 * A list that is empty or absent is "not known here", not "nothing exists":
 * the editor may not have loaded the assets yet, and inventing problems then
 * would train the author to ignore the warnings.
 *
 * @returns {string[]} problems, empty when the step is fine
 */
export function validateStep(step, ctx = {}) {
  const { stackLabels, zoneLabels, pools, assetNames: names, grids, cardCategories } = ctx || {};
  const fields = new Set(stepFields(step));
  const problems = [];

  const known = (list, value) => !Array.isArray(list) || list.length === 0 || list.includes(value);

  if (fields.has('stackLabel')) {
    if (!step?.stackLabel) problems.push('no stack chosen');
    else if (!known(stackLabels, step.stackLabel)) problems.push(`stack "${step.stackLabel}" not found`);
  }
  if (fields.has('assetName')) {
    // Ein Platzhalter ($revealed, $revealedTier) steht fuer einen Namen, den
    // erst der Tisch kennt - hier gaebe es dazu nur einen falschen Alarm. Das
    // gilt in jedem Namensfeld, nicht nur hier (M7/T4).
    if (!step?.assetName) problems.push('no asset chosen');
    else if (!hasPlaceholder(step.assetName) && !known(names, step.assetName)) problems.push(`asset "${step.assetName}" not found`);
  }
  // reveal_next liest die Zone, aus der aufgedeckt wird - anders als bei
  // targetZoneLabel ist "keine" hier keine gueltige Wahl.
  if (fields.has('zoneLabel')) {
    if (!step?.zoneLabel) problems.push('no zone chosen');
    else if (!known(zoneLabels, step.zoneLabel)) problems.push(`zone "${step.zoneLabel}" not found`);
  }
  if (fields.has('pool')) {
    if (!step?.pool) problems.push('no pool chosen');
    else if (!known(pools, step.pool)) problems.push(`pool "${step.pool}" is empty or unknown`);
  }
  // M7/T3: `place_stack` liest eine *Karten*kategorie – dieselbe Idee wie der
  // Pool bei `draw_assets`, nur die andere Bibliothek. Der Stapelname daneben
  // ist Pflicht: ohne ihn findet `remove_stack` den Stapel nie wieder.
  if (fields.has('category')) {
    if (!step?.category) problems.push('no card category chosen');
    else if (!hasPlaceholder(step.category) && !known(cardCategories, step.category)) problems.push(`card category "${step.category}" is empty or unknown`);
  }
  if (fields.has('label') && !String(step?.label ?? '').trim()) problems.push('no stack name given');
  // M7/T1: Raster und Feld gehoeren zusammen - ein Feld ohne Raster ist keine
  // Adresse, und ein Feld, das es auf dem gewaehlten Raster nicht gibt, wird am
  // Tisch uebersprungen. Beides leer heisst "ueber x/y", das ist gueltig.
  if (fields.has('cell') && (step?.cell || step?.gridLabel)) {
    const grid = Array.isArray(grids) && grids.length ? findGrid(grids, step?.gridLabel) : undefined;
    if (!step?.gridLabel) problems.push('no grid chosen for the field');
    else if (Array.isArray(grids) && grids.length && !grid) problems.push(`grid "${step.gridLabel}" not found`);
    else if (!step?.cell) problems.push('no field chosen');
    // Ein Platzhalter ($B, $D1) ist kein Feldname: welches Feld er meint, weiß
    // erst `build_scenario` am Tisch (M7/T4).
    else if (grid && !hasPlaceholder(step.cell) && !cellFromLabel(grid, step.cell)) problems.push(`grid "${step.gridLabel}" has no field "${step.cell}"`);
  }
  // M7/T2: bei `clear_grid` *ist* das Raster die Adresse, nicht eine von dreien
  // wie bei `place_asset` - "keins" ist hier also keine gueltige Wahl.
  if (fields.has('gridLabel') && !fields.has('cell')) {
    if (!step?.gridLabel) problems.push('no grid chosen');
    else if (Array.isArray(grids) && grids.length && !findGrid(grids, step.gridLabel)) {
      problems.push(`grid "${step.gridLabel}" not found`);
    }
  }
  // An empty zone is a legal choice ("all player zones" / free placement); a
  // named one that no longer exists is not.
  if (fields.has('targetZoneLabel') && step?.targetZoneLabel && !known(zoneLabels, step.targetZoneLabel)) {
    problems.push(`zone "${step.targetZoneLabel}" not found`);
  }
  // Dasselbe fuer das Stapelziel - und beide zugleich ist ein Autorenfehler,
  // auch wenn der Schritt ihn ueberlebt (die Zone gewinnt, M5.1).
  if (fields.has('targetStackLabel') && step?.targetStackLabel) {
    if (!known(stackLabels, step.targetStackLabel)) problems.push(`stack "${step.targetStackLabel}" not found`);
    else if (step?.targetZoneLabel) problems.push(`zone and stack given, the zone wins: stack "${step.targetStackLabel}" is ignored`);
  }
  // M4a: ein Zähler hat weder Stapel noch Zone, nur einen Namen und eine
  // Stelle. Beides fehlt der Executor sonst erst am Tisch (er überspringt den
  // Schritt), und dann ist der Aufbau schon gelaufen.
  if (fields.has('name') && !String(step?.name ?? '').trim()) problems.push('no counter name given');
  // Nur hier: `move` darf x oder y weglassen (dann bleibt die Koordinate, wie
  // sie ist), und `place_asset` mit Zone zeigt x/y gar nicht erst an.
  if (typeOf(step) === 'place_counter' || typeOf(step) === 'place_stack') {
    const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
    if (!Number.isFinite(num(step?.x)) || !Number.isFinite(num(step?.y))) problems.push('no position given');
  }
  // Ein `max`, das keine Zahl ist, stünde am Tisch als "2 / NaN" - also lieber
  // hier melden. Kein `max` ist die gültige Vorgabe.
  if (fields.has('max') && step?.max !== undefined && step?.max !== null && step?.max !== ''
    && counterMax(step.max) === undefined) {
    problems.push('max must be a number');
  }
  if (fields.has('count')) {
    const min = step?.type === 'split' ? 2 : 1;
    const n = Number(step?.count);
    if (!Number.isFinite(n) || n < min) problems.push(`count must be at least ${min}`);
  }

  return problems;
}
