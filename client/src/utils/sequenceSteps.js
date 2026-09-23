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
  { value: 'place_asset', label: 'Place Asset', fields: ['assetName', 'targetZoneLabel', 'x', 'y', 'faceDown'] },
  { value: 'draw_assets', label: 'Draw Assets', fields: ['pool', 'count', 'targetZoneLabel', 'faceDown'] },
  { value: 'set_asset_face', label: 'Set Asset Face', fields: ['assetName', 'faceDown'] },
  { value: 'lock_asset', label: 'Lock Asset', fields: ['assetName'] },
  { value: 'unlock_asset', label: 'Unlock Asset', fields: ['assetName'] },
  { value: 'place_counter', label: 'Place Counter', fields: ['name', 'value', 'max', 'x', 'y'] },
  { value: 'reveal_next', label: 'Reveal Next', fields: ['zoneLabel', 'targetZoneLabel'] },
  { value: 'clear_zone', label: 'Clear Zone', fields: ['zoneLabel', 'targetZoneLabel', 'targetStackLabel', 'faceDown'] },
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
  if (spec.value === 'place_asset' && typeof step === 'object' && step?.targetZoneLabel) {
    return spec.fields.filter(f => f !== 'x' && f !== 'y');
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
  const { stackLabels = [], zoneLabels = [], pools = [], assetNames: names = [] } = ctx;
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
      return { type, assetName: first(names), targetZoneLabel: '', x: 0, y: 0, faceDown: false };
    case 'draw_assets':
      return { type, pool: first(pools), count: 1, targetZoneLabel: zone, faceDown: false };
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
    case 'place_asset': {
      const where = step.targetZoneLabel
        ? `in zone ${q(step.targetZoneLabel)}`
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
    case 'lock_asset': return `Lock ${q(step.assetName)}`;
    case 'unlock_asset': return `Unlock ${q(step.assetName)}`;
    default: return stepTypeLabel(step);
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

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
  const { stackLabels, zoneLabels, pools, assetNames: names } = ctx || {};
  const fields = new Set(stepFields(step));
  const problems = [];

  const known = (list, value) => !Array.isArray(list) || list.length === 0 || list.includes(value);

  if (fields.has('stackLabel')) {
    if (!step?.stackLabel) problems.push('no stack chosen');
    else if (!known(stackLabels, step.stackLabel)) problems.push(`stack "${step.stackLabel}" not found`);
  }
  if (fields.has('assetName')) {
    // Ein Platzhalter ($revealed) steht fuer einen Namen, den erst reveal_next
    // am Tisch kennt - hier gaebe es dazu nur einen falschen Alarm.
    if (!step?.assetName) problems.push('no asset chosen');
    else if (!step.assetName.includes('$revealed') && !known(names, step.assetName)) problems.push(`asset "${step.assetName}" not found`);
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
  if (typeOf(step) === 'place_counter') {
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
