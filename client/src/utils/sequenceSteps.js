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
import { counterMax, counterValueForm } from '../../../shared/counters.js';
import { cellRange } from '../../../shared/gridGeometry.js';
import { ROTATIONS, rotationOf } from '../../../shared/assetToken.js';
import { hasPlaceholder, categoryList } from '../../../shared/sequenceExecutor.js';
import { findCardByName } from '../../../shared/cardSearch.js';

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
  // M11.2: `fill` liest `count` als Zielzahl statt als Menge - auf sechs
  // auffuellen statt sechs austeilen. Ein Feld daneben und keine dritte Lesart
  // von `count`: `count <= 0` heisst schon "der ganze Stapel", und `set_counter`
  // zeigt (R1), was vier Lesarten eines Feldes kosten - eine eigene
  // Formbestimmung plus eine Zeile, die sagt, welche gerade gilt.
  { value: 'deal_to_zone', label: 'Deal to Zone', fields: ['stackLabel', 'count', 'fill', 'targetZoneLabel', 'faceDown'] },
  { value: 'move', label: 'Move Stack', fields: ['stackLabel', 'x', 'y'] },
  // R3/M7.5: `targetZoneLabel` ist die zweite Art zu sagen, wo der Stapel
  // hingehoert - das Aktionsdeck liegt auf einer am Brett verankerten Zone.
  { value: 'place_stack', label: 'Place Stack', fields: ['category', 'label', 'targetZoneLabel', 'x', 'y', 'faceDown'] },
  { value: 'remove_stack', label: 'Remove Stack', fields: ['stackLabel'] },
  // M8.8/A3: eine benannte Karte aus der Bibliothek. Keine Stelle - „vor dem
  // Dörfler" ist eine am Brett verankerte Zone, und eine feste x/y ist das,
  // was M3a abgeschafft hat. Kein `label`: eine angelegte Karte ist kein Stapel.
  { value: 'place_card', label: 'Place Card', fields: ['cardName', 'targetZoneLabel'] },
  // M8.10/L3: `slot` nennt einen Platz der Zielzone bei seiner Nummer - die,
  // die auf dem Brett steht. Nur mit Zone, siehe `stepFields`.
  { value: 'place_asset', label: 'Place Asset', fields: ['assetName', 'targetZoneLabel', 'slot', 'gridLabel', 'cell', 'x', 'y', 'rotation', 'faceDown'] },
  { value: 'draw_assets', label: 'Draw Assets', fields: ['pool', 'count', 'targetZoneLabel', 'faceDown'] },
  { value: 'set_asset_face', label: 'Set Asset Face', fields: ['assetName', 'faceDown'] },
  { value: 'lock_asset', label: 'Lock Asset', fields: ['assetName'] },
  { value: 'unlock_asset', label: 'Unlock Asset', fields: ['assetName'] },
  { value: 'place_counter', label: 'Place Counter', fields: ['name', 'value', 'max', 'x', 'y'] },
  // R1/M8.4: der Gegenschritt zu `place_counter` - er schreibt in einen
  // vorhandenen Zaehler statt einen zweiten anzulegen. Weder Stelle noch `max`:
  // beides gehoert dem Zaehler, nicht dem Schreibenden.
  { value: 'set_counter', label: 'Set Counter', fields: ['name', 'value'] },
  { value: 'reveal_next', label: 'Reveal Next', fields: ['zoneLabel', 'targetZoneLabel'] },
  // R2/M8.4: die Leiste rueckt auf. Kein Ziel - gedreht wird *in* der Zone.
  { value: 'rotate_zone', label: 'Rotate Zone', fields: ['zoneLabel'] },
  { value: 'clear_zone', label: 'Clear Zone', fields: ['zoneLabel', 'targetZoneLabel', 'targetStackLabel', 'faceDown'] },
  { value: 'clear_grid', label: 'Clear Grid', fields: ['gridLabel'] },
  // M7/T6: kein `gridLabel` - das Raster steht in den Szenariodaten, nicht am
  // Schritt. Der Schritt hat genau eine Einstellung: ob der Endkampf-Abschnitt
  // dazugehoert.
  { value: 'build_scenario', label: 'Build Scenario', fields: ['final'] },
  // M9.3/P2: die Vorbedingung. Steht sie vorn, gilt sie fuer die ganze Folge -
  // trifft sie nicht zu, laeuft kein Schritt dahinter. `message` ist der Text,
  // den der Spieler liest: der Executor weiss nichts ueber das Spiel, „Erst
  // die Dorfphase beginnen" kann nur hier stehen.
  { value: 'require_zone', label: 'Require Zone', fields: ['zoneLabel', 'expect', 'message'] },
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
  // `slot` haengt an der Zone: ohne Zone gibt es keine Plaetze, und ein Feld
  // ohne Wirkung ist ein Versprechen, das der Aufbau nicht haelt (M8.10/L3).
  if (spec.value === 'place_asset' && typeof step === 'object') {
    if (step?.targetZoneLabel) return spec.fields.filter(f => !['gridLabel', 'cell', 'x', 'y'].includes(f));
    if (step?.cell) return spec.fields.filter(f => !['slot', 'x', 'y'].includes(f));
    return spec.fields.filter(f => f !== 'slot');
  }
  // place_stack: dieselbe Regel und derselbe Satz - Zone oder x/y, nie beides.
  if (spec.value === 'place_stack' && typeof step === 'object' && step?.targetZoneLabel) {
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
      // `fill: false`: ein frischer Schritt teilt aus. Auffuellen ist die
      // Ausnahme, und die Vorgabe darf kein vorhandenes Verhalten umdeuten.
      return { type, stackLabel, count: 1, fill: false, targetZoneLabel: '', faceDown: false };
    case 'move':
      return { type, stackLabel, x: 0, y: 0 };
    case 'place_asset':
      // No zone by default: a board is laid out at a position, and a zone can
      // be picked afterwards. Picking one hides x/y (see stepFields).
      // Kein Raster und kein Feld: beides hiesse, x/y auszublenden, und ein
      // geratenes Feld ist eine Behauptung darueber, wo das Objekt hingehoert.
      // Kein `slot`: leer heisst "der Reihe nach", und das ist, was jeder
      // vorhandene Aufbau tut (M8.10/L3).
      return { type, assetName: first(names), targetZoneLabel: '', slot: '', gridLabel: '', cell: '', x: 0, y: 0, rotation: 0, faceDown: false };
    case 'draw_assets':
      return { type, pool: first(pools), count: 1, targetZoneLabel: zone, faceDown: false };
    case 'place_stack':
      // Der Stapelname bleibt leer: er ist die eine Entscheidung, die der Schritt
      // nicht vorwegnehmen darf - er ist der feste Name, unter dem ihn
      // `shuffle` und `remove_stack` später wiederfinden (M7/T3).
      return { type, category: first(cardCategories), label: '', x: 0, y: 0, faceDown: false };
    case 'place_card':
      // Der Kartenname bleibt leer: den kennt nur der Autor, und geraten wäre
      // er eine Behauptung darüber, welche Karte gemeint ist. Die Zone ist
      // vorbelegt wie bei jedem anderen Zonenschritt.
      return { type, cardName: '', targetZoneLabel: zone };
    case 'set_asset_face':
      return { type, assetName: first(names), faceDown: true };
    case 'place_counter':
      // Kein `max`: die Obergrenze ist optional und wird nicht geraten. Der
      // Name bleibt leer, weil ihn nur der Autor kennt - er ist das eine Feld,
      // das die Validierung darum sofort anmahnt.
      return { type, name: '', value: 0, x: 0, y: 0 };
    case 'set_counter':
      // Derselbe Grund wie oben: den Namen kennt nur der Autor. `0` ist die
      // harmloseste der vier Lesarten - „auf null", nicht „um null".
      return { type, name: '', value: 0 };
    case 'rotate_zone':
      // Wie `reveal_next`: die Zone *ist* die Adresse, also steht die erste da.
      return { type, zoneLabel: zone };
    case 'require_zone':
      // „leer" ist der haeufigere Fall (und der aus M9.3). Die Meldung bleibt
      // leer: sie ist die eine Entscheidung, die der Schritt nicht vorwegnehmen
      // darf - geraten waere sie eine Auskunft, die niemand gegeben hat.
      return { type, zoneLabel: zone, expect: 'empty', message: '' };
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
    case 'deal_to_zone': return step?.fill
      ? `Fill ${zone} up to ${step.count ?? 1} from ${q(step.stackLabel)}${down(step)}`
      : `Deal ${step.count ?? 1} from ${q(step.stackLabel)} to ${zone}${down(step)}`;
    case 'move': return `Move ${q(step.stackLabel)} to ${step.x ?? 0}, ${step.y ?? 0}`;
    case 'place_stack': {
      const where = step?.targetZoneLabel ? `in zone ${q(step.targetZoneLabel)}` : `at ${step.x ?? 0}, ${step.y ?? 0}`;
      // M8.11/E2: die Kategorien stehen einzeln da. Eine zusammengeklebte
      // Zeile („A,B") liest sich wie *ein* Name mit Komma - und genau den
      // Unterschied soll die Zeile zeigen.
      const cats = categoryList(step?.category);
      const what = cats.length ? cats.map(c => `"${c}"`).join(' + ') : '(none)';
      return `Place card categor${cats.length > 1 ? 'ies' : 'y'} ${what} as stack ${q(step.label)} ${where}${down(step)}`;
    }
    case 'remove_stack': return `Remove stack ${q(step.stackLabel)} from the table`;
    case 'place_card': return `Place the card named ${q(step.cardName)} in ${zone}`;
    case 'place_asset': {
      // Der Platz steht nur da, wo er gilt und wenn er gesetzt ist - ohne ihn
      // fuellt der Schritt der Reihe nach, und "on place " waere Rauschen.
      const place = step.targetZoneLabel && step.slot !== undefined && step.slot !== null && step.slot !== ''
        ? ` on place ${step.slot}` : '';
      const where = step.targetZoneLabel
        ? `in zone ${q(step.targetZoneLabel)}${place}`
        : step.cell || step.gridLabel
          ? `on grid ${q(step.gridLabel)} field ${q(step.cell)}`
          : `at ${step.x ?? 0}, ${step.y ?? 0}`;
      // Die Drehung steht nur da, wenn es eine gibt: die Zeile ist eine
      // Zusammenfassung, und "rotated 0deg" waere Rauschen an jedem Schritt.
      const turned = rotationOf(step.rotation) ? `, rotated ${step.rotation}°` : '';
      return `Place ${q(step.assetName)} ${where}${turned}${down(step)}`;
    }
    case 'draw_assets':
      return `Draw ${step.count ?? 1} from pool ${q(step.pool)} into ${zone}${down(step)}`;
    case 'place_counter': {
      // Die Obergrenze steht so da, wie sie am Tisch steht: "2 / 3".
      const max = counterMax(step?.max);
      const start = max === undefined ? `${step?.value ?? 0}` : `${step?.value ?? 0} / ${max}`;
      return `Place counter ${q(step.name)} at ${step.x ?? 0}, ${step.y ?? 0} starting at ${start}`;
    }
    // R1: die Zeile sagt, **welche** der vier Lesarten von `value` gilt - „+18"
    // und „18" sehen nebeneinander gleich aus und tun Verschiedenes.
    case 'set_counter': {
      const form = counterValueForm(step?.value);
      const n = Number(String(step?.value ?? '').trim());
      const what = form === 'max' ? 'to its maximum'
        : form === 'add' ? `by ${n}`
        : form === 'set' ? `to ${n}`
        : `to ${q(step?.value, '(nothing)')}`;
      return `Set counter ${q(step.name)} ${what}`;
    }
    case 'rotate_zone':
      return `Rotate zone ${q(step.zoneLabel)} by one place`;
    // M9.3/P2: beide Haelften in einer Zeile - die Bedingung und was passiert,
    // wenn sie nicht gilt. Ohne die zweite liest sich der Schritt wie eine
    // Pruefung ohne Folgen.
    case 'require_zone': {
      const want = step?.expect === 'occupied' ? 'occupied' : 'empty';
      const say = String(step?.message ?? '').trim();
      return `Require zone ${q(step.zoneLabel)} to be ${want}, else stop the sequence${say ? `: "${say}"` : ''}`;
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
  const { stackLabels, zoneLabels, pools, assetNames: names, grids, cardCategories, cards } = ctx || {};
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
  // M8.11/E2: die Kategorie ist eine **Liste**, und jeder Eintrag wird einzeln
  // geprüft. Hier ist die einzige Stelle, die einen Tippfehler von einer
  // absichtlich weggelassenen Erweiterung unterscheiden kann: der Executor
  // sieht nur die Kartenbibliothek, für ihn sind „gibt es nicht" und „hat
  // keine Karten" dasselbe. Der Tippfehler wird hier gemacht und gehört hier
  // gemeldet - am Tisch ist er nach Regel 2 nur noch eine Zeile im Protokoll.
  if (fields.has('category')) {
    const cats = categoryList(step?.category);
    if (!cats.length) problems.push('no card category chosen');
    for (const cat of cats) {
      if (!hasPlaceholder(cat) && !known(cardCategories, cat)) problems.push(`card category "${cat}" is empty or unknown`);
    }
  }
  if (fields.has('label') && !String(step?.label ?? '').trim()) problems.push('no stack name given');
  // M8.8/A3: der Name wird hier gegen die Kartenzeilen gehalten, nicht erst am
  // Tisch. Genau dieser Fehler - ein Name, der auf keine Karte passt - hat die
  // Startausrüstung in der Partie gekostet. Ohne geladene Karten wird nichts
  // erfunden, das ist dieselbe Regel wie bei Pools und Zonen.
  if (fields.has('cardName')) {
    if (!String(step?.cardName ?? '').trim()) problems.push('no card name given');
    else if (!hasPlaceholder(step.cardName) && Array.isArray(cards) && cards.length) {
      const { card, reason } = findCardByName(cards, step.cardName);
      if (!card) problems.push(reason);
    }
    // Anders als bei `deal_to_zone` ist „keine Zone" keine gültige Wahl: eine
    // ausgelegte Karte ohne Zone hat keinen Ort.
    if (!String(step?.targetZoneLabel ?? '').trim()) problems.push('no zone chosen');
  }
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
    else if (grid && !hasPlaceholder(step.cell) && !cellRange(grid, step.cell)) problems.push(`grid "${step.gridLabel}" has no field "${step.cell}"`);
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
  // R1: `set_counter` hat vier Lesarten für `value` (Zahl, „+n", „max",
  // Platzhalter). Was keine davon trifft, überspringt der Executor am Tisch -
  // und dann ist der Rundenwechsel schon gelaufen. `place_counter` ist davon
  // nicht betroffen: sein `value` ist ein Zahlenfeld und der Startwert.
  if (typeOf(step) === 'set_counter' && !hasPlaceholder(step?.value)
    && counterValueForm(step?.value) === null) {
    problems.push(`"${String(step?.value ?? '').trim()}" is not a value: a number, "+6", "-6" or "max"`);
  }
  // Nur hier: `move` darf x oder y weglassen (dann bleibt die Koordinate, wie
  // sie ist), und `place_asset`/`place_stack` mit Zone zeigen x/y gar nicht an.
  if (fields.has('x') && (typeOf(step) === 'place_counter' || typeOf(step) === 'place_stack')) {
    const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
    if (!Number.isFinite(num(step?.x)) || !Number.isFinite(num(step?.y))) problems.push('no position given');
  }
  // Ein `max`, das keine Zahl ist, stünde am Tisch als "2 / NaN" - also lieber
  // hier melden. Kein `max` ist die gültige Vorgabe.
  if (fields.has('max') && step?.max !== undefined && step?.max !== null && step?.max !== ''
    && counterMax(step.max) === undefined) {
    problems.push('max must be a number');
  }
  // M8.10/L3: ein Platz wird bei seiner Nummer genannt, und die ist eine ganze
  // Zahl (die Accuracy-Leiste zaehlt von -4, also auch negativ). Leer ist die
  // gueltige Vorgabe: der Reihe nach. Ob es die Nummer in der Zone *gibt*,
  // prueft der Editor nicht - er kennt nur die Zonennamen, und der Executor
  // meldet den Fall am Tisch mit demselben Satz.
  if (fields.has('slot') && step?.slot !== undefined && step?.slot !== null && step?.slot !== ''
    && !hasPlaceholder(step.slot) && !Number.isInteger(Number(step.slot))) {
    problems.push(`"${String(step.slot).trim()}" is not a place: a whole number like 15 or -1`);
  }
  // M7.1: ein Plaettchen liegt auf einem Raster. Kein Feld heisst 0 - alte
  // Sequenzen tragen keins, und das ist kein Fehler.
  if (fields.has('rotation') && rotationOf(step?.rotation) === null) {
    problems.push(`rotation "${step.rotation}" is not one of ${ROTATIONS.join('/')}`);
  }
  // M9.3/P2: die Wache hat zwei Antworten, und eine dritte laesst der Executor
  // nicht durch - er haelt dann die ganze Folge an. Das gehoert hierher
  // gemeldet, nicht am Tisch.
  if (typeOf(step) === 'require_zone') {
    if (step?.expect !== 'empty' && step?.expect !== 'occupied') {
      problems.push(`"${String(step?.expect ?? '').trim()}" is not a condition: "empty" or "occupied"`);
    }
    // Spec M9.3 Regel 2: die Meldung nennt die Bedingung, nicht den Schritt,
    // der umgefallen ist. Ohne sie steht am Tisch eine Diagnose.
    if (!String(step?.message ?? '').trim()) {
      problems.push('no message given: the protocol then shows a diagnosis, not what to do');
    }
  }
  if (fields.has('count')) {
    const min = step?.type === 'split' ? 2 : 1;
    const n = Number(step?.count);
    if (!Number.isFinite(n) || n < min) problems.push(`count must be at least ${min}`);
  }

  return problems;
}
