/**
 * executeSequence – pure transformation function for setup sequences.
 * Applies an ordered list of setup actions to a game state snapshot.
 * Never throws: a step that cannot run is skipped and recorded in the protocol.
 *
 * Card steps address stacks by `stackLabel`; asset steps (tokens, figures,
 * boards) address a single asset by `assetName` (the table_assets name) and a
 * draw pool by `pool` (the asset's category name) – the same human-readable
 * label idea the stacks and zones already use.
 *
 * Two entry points, same work:
 *   executeSequence(...)        → the new state (what every existing caller expects)
 *   executeSequenceWithLog(...) → { state, log }
 * The protocol lives beside the state, never inside it: the state is persisted
 * as JSON, and a log smuggled into it would end up in the database.
 *
 * @param {object|string} stateData  – serialized game state (object or JSON string)
 * @param {Array}         sequenceData – array of sequence step objects
 * @param {Array}         zones       – zone objects from the setup (for deal_to_zone)
 * @param {object}        [options]   – { assets: table_assets rows, cards: card library rows
 *                                        (each with its category *name*, like assets), grids: grid objects,
 *                                        rng: () => [0,1) }
 * @returns {object} – new (deep-cloned) game state with all steps applied
 */
import { zoneSlots, zoneSlotFor, zoneCenter, zoneRejects, zoneCapacity, zoneContains, countInZone, objectsInZone } from './zoneGeometry.js';
import { resolveZones, anchorBoxes } from './anchoring.js';
import { resolveGrids, cellFromLabel, cellCenter, cellLabel, cellAt } from './gridGeometry.js';
import { assetToken, assetFace } from './assetToken.js';
import { validateScenarioData } from './scenarioData.js';
import { normalizeCounter } from './counters.js';

export function executeSequence(stateData, sequenceData, zones = [], options = {}) {
  return executeSequenceWithLog(stateData, sequenceData, zones, options).state;
}

/**
 * Same as executeSequence, but also returns one protocol entry per step:
 * `{ index, type, target, status, reason }` with status `ok` | `skipped`
 * (nothing happened, precondition missing) | `failed` (the step ran but could
 * not do what it says). A setup with three silently skipped steps must not
 * look like a correct one, so the caller is expected to show this.
 *
 * @returns {{ state: object, log: Array<{index:number,type:string,target:?string,status:string,reason:?string}> }}
 */
export function executeSequenceWithLog(stateData, sequenceData, zones = [], options = {}) {
  let state;
  try {
    state = typeof stateData === 'string' ? JSON.parse(stateData) : stateData;
  } catch (err) {
    return {
      state: stateData,
      log: [{ index: -1, type: '(sequence)', target: null, status: 'failed', reason: `state could not be parsed: ${err.message}` }],
    };
  }

  // Deep clone to avoid mutating the original
  state = JSON.parse(JSON.stringify(state));

  const log = [];
  if (!Array.isArray(sequenceData) || sequenceData.length === 0) {
    return { state, log };
  }

  // `cards` ist die Kartenbibliothek des Spiels, jede Zeile mit dem *Namen*
  // ihrer Kategorie – genau wie `assets` ihn schon führt. `place_stack`
  // adressiert die Kategorie über diesen Namen; die Kartenzeile selbst kennt
  // nur eine `category_id`, und eine Id ist im Setup keine Adresse.
  const { assets = [], cards = [], grids = [], scenarioData = {}, rng = Math.random } = options || {};
  // What `reveal_next` bound, for the placeholders in the steps behind it.
  // Beside the state for the same reason as the log: the state is persisted as
  // JSON, and a binding smuggled into it would end up in the database.
  //
  // `vars` ist die Ersetzungstabelle (Platzhaltername → Text), `revealedLast`
  // die eine Tatsache, die kein Text ist: kam das Aufgedeckte vom letzten Platz
  // der Leiste? Das ist, was der Endkampf liest (M7).
  const ctx = { vars: {}, revealedLast: false };

  sequenceData.forEach((step, index) => {
    const entry = { index, type: step?.type, target: stepTarget(step), status: 'ok', reason: null };
    log.push(entry);
    try {
      state = applyStep(state, step, zones, grids, assets, cards, scenarioData, rng, entry, ctx);
    } catch (err) {
      entry.status = 'failed';
      entry.reason = err.message;
    }
  });

  return { state, log, bindings: ctx.vars, revealedLast: ctx.revealedLast };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** What a step points at – enough to recognise it in the protocol. */
function stepTarget(step) {
  // `name` steht am Ende: nur place_counter benutzt es, und der Zähler heißt
  // im Protokoll so, wie er am Tisch heißt.
  // `category` vor `label`: wie bei jedem anderen Schritt steht im Protokoll,
  // *woraus* er baut (place_stack liest eine Kartenkategorie), nicht was dabei
  // herauskommt. `label` bleibt als Rückfall, damit die Zeile nie namenlos ist.
  return step?.assetName ?? step?.pool ?? step?.stackLabel ?? step?.zoneLabel ?? step?.targetZoneLabel ?? step?.gridLabel ?? step?.category ?? step?.label ?? step?.name ?? null;
}

/** Build a label→stack map from stateData.stacks (rebuilt before every step) */
function buildStackIndex(state) {
  const index = new Map(); // label → stack object
  if (!state.stacks) return index;
  for (const stack of state.stacks) {
    if (stack.label) {
      index.set(stack.label, stack);
    }
  }
  return index;
}

/** Fisher-Yates shuffle in-place. rng is injectable so draws are testable. */
function shuffleArray(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Re-assign zIndex values 1..N after a shuffle or split */
function reassignZIndices(cards) {
  cards.forEach((c, i) => { c.zIndex = i + 1; });
}

// ── Asset helpers ─────────────────────────────────────────────────────────────

const norm = (s) => String(s ?? '').trim().toLowerCase();

/** Look up a table_asset row by its name. */
function findAsset(assets, name) {
  if (!name) return null;
  return assets.find(a => norm(a.name) === norm(name)) || null;
}

/** Look up an already placed object (token or board) by asset id or name. */
function findPlaced(state, asset, name) {
  const n = norm(name ?? asset?.name);
  if (!asset && !n) return null;
  const match = (o) =>
    (asset && o.assetId && o.assetId === asset.id) ||
    (n && (norm(o.label) === n || norm(o.name) === n));
  return state.tokens.find(match) || state.boards.find(match) || null;
}

/**
 * Centre of the i-th of n slots inside a zone. A zone with a layout and a
 * capacity has fixed places and hands out place i; one without keeps the old
 * spread along the longer axis, so zones saved before M2 land where they
 * always did. n = 1 → centre.
 */
const zoneSlot = zoneSlotFor;

/** How many objects already sit in the zone – the number capacity is measured against. */
function occupancy(state, zone) {
  return countInZone(zone, state.cards, state.tokens);
}

/** The zone a step names, or null. */
function findZone(zones, label) {
  return zones.find(z => norm(z.label) === norm(label)) || null;
}

/** The grid a step names, or null. No name is no address, not "the nameless one". */
function findGrid(grids, label) {
  if (!label) return null;
  return grids.find(g => norm(g.label) === norm(label)) || null;
}

// ── Revealing and the names it binds ─────────────────────────────────────────

/**
 * The objects of a zone in the order its places are handed out, so that "the
 * first face-down one" means the same thing as "the first place" – the boss bar
 * is read left to right because that is the order `zoneSlots` lays out.
 *
 * With fixed places every object is sorted by the place nearest to it (an
 * object dragged between two places still belongs to one of them). A zone
 * without places has no order of its own, so reading order decides: down the
 * bar for a column, along it for a row – which is exactly where `zoneSlotFor`
 * puts them without a capacity.
 */
function inSlotOrder(zone, objects) {
  return slotOrder(zone, objects).entries.map(e => e.o);
}

/**
 * Dieselbe Reihenfolge, zusätzlich mit dem Platz, auf dem jedes Objekt liegt,
 * und mit der Anzahl der Plätze, die die Zone *hat* (M7).
 *
 * Die Zahl kommt von der Zone, nicht vom Zählen der Objekte: eine Leiste mit
 * vier Plätzen, auf der nur drei Dinge liegen, hat trotzdem vier Plätze - und
 * „letzter Platz" heißt dann der vierte, nicht der dritte. Genau das ist der
 * Kurzpartie-Fall, und ein Abzählen wäre dort still um eins daneben.
 *
 * Eine Zone ohne feste Plätze hat nur ihre Lesereihenfolge; dort *ist* die
 * Position darin der Platz - mehr weiß die Zone über sich nicht.
 */
function slotOrder(zone, objects) {
  const slots = zoneSlots(zone);
  const dist2 = (p, o) => (p.x - o.x) ** 2 + (p.y - o.y) ** 2;
  const place = (o) => (slots ? slots.reduce((best, s, i) => (dist2(s, o) < dist2(slots[best], o) ? i : best), 0) : 0);
  const sorted = objects
    .map(o => ({ o, k: [place(o), o.y, o.x] }))
    .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2]);
  return {
    slotCount: slots ? slots.length : sorted.length,
    entries: sorted.map((e, i) => ({ o: e.o, slot: slots ? e.k[0] : i })),
  };
}

/**
 * Ein Platzhalter: `$` und ein Name. Der gierige Name macht „längster zuerst"
 * automatisch - `$revealedBase` ist *ein* Treffer und nicht `$revealed` plus
 * „Base". Ein einzelnes `$` ohne Namen ist keiner.
 */
const PLACEHOLDER = /\$[A-Za-z][A-Za-z0-9]*/g;
const PLACEHOLDER_ONE = /\$[A-Za-z][A-Za-z0-9]*/;

/** Steht in diesem Wert ein Platzhalter? Auch die Validierung im Editor fragt das. */
export function hasPlaceholder(value) {
  return typeof value === 'string' && PLACEHOLDER_ONE.test(value);
}

/**
 * Die Namensfelder eines Schritts - jedes davon kann einen Platzhalter tragen
 * (M7). Eine Liste an einer Stelle, nicht eine Sonderbehandlung je Feld: der
 * `assetName`-Sonderfall hat genau deshalb jedes neue Feld verpasst.
 */
const NAME_FIELDS = ['assetName', 'cell', 'category', 'label', 'name'];

/** "Bösewicht: Patches" → "Patches"; a name without ": " is its own base. */
function baseName(name) {
  const i = name.indexOf(': ');
  return i < 0 ? name : name.slice(i + 2);
}

/**
 * Split candidate zones into the ones that take one more object of `kind` and
 * the reasons the others do not. `free` is how many more each usable zone
 * holds, `occupied` how many sit there already (= the next free place).
 */
function zoneRoom(state, targetZones, kind) {
  const usable = [], problems = [];
  const free = new Map(), occupied = new Map();
  for (const zone of targetZones) {
    const taken = occupancy(state, zone);
    const refusal = zoneRejects(zone, kind, taken);
    if (refusal) { problems.push(refusal); continue; }
    const cap = zoneCapacity(zone);
    usable.push(zone);
    occupied.set(zone, taken);
    free.set(zone, cap === null ? Infinity : cap - taken);
  }
  return { usable, free, occupied, problems };
}

/** Deal items round robin over the usable zones, stopping at each zone's free count. */
function shareOut(items, usable, free) {
  const groups = new Map(usable.map(z => [z, []]));
  const leftovers = [];
  let cursor = 0;
  for (const item of items) {
    let placed = false;
    for (let t = 0; t < usable.length; t++) {
      const zone = usable[(cursor + t) % usable.length];
      if (free.get(zone) > 0) {
        groups.get(zone).push(item);
        free.set(zone, free.get(zone) - 1);
        cursor = (cursor + t + 1) % usable.length;
        placed = true;
        break;
      }
    }
    if (!placed) leftovers.push(item);
  }
  return { groups, leftovers };
}

/** Was für ein Ding das ist, in der Sprache von `accepts`: Karte oder Asset. */
const kindOf = (o) => (o?.cardId ? 'card' : 'asset');

/** Wie ein Objekt im Protokoll heißt. */
const objName = (o) => o?.label || o?.name || o?.cardId || '?';

/** "zone X is full (4)" for every zone that ran out of room during this step. */
function fullZones(usable, free, kind) {
  return usable.filter(z => free.get(z) <= 0).map(z => zoneRejects(z, kind, Infinity)).filter(Boolean);
}

// ── Action handlers ───────────────────────────────────────────────────────────

function applyStep(state, step, allZones, allGrids, assets, cards, scenarioData, rng, entry, ctx = {}) {
  if (!state.stacks) state.stacks = [];
  if (!state.cards) state.cards = [];
  if (!state.tokens) state.tokens = [];
  if (!state.boards) state.boards = [];
  if (!state.counters) state.counters = [];

  // Anchored zones are resolved against the table as this step finds it, not
  // as the sequence started: step 1 lays the board out, step 2 fills a zone
  // printed on it. Resolving once up front would use the board's old position
  // - and a zone that is off by the width of a board is not subtle, but it is
  // also not visible in the protocol. A zone whose anchor is not on the table
  // keeps its saved absolute box (see anchoring.js).
  // Grids are resolved the same way and for the same reason: a grid printed on
  // a board that this very sequence has just laid out only sits on its fields
  // once the board is where it ends up.
  const boxes = anchorBoxes(state.boards, state.tokens);
  const zones = resolveZones(allZones, boxes);
  const grids = resolveGrids(allGrids, boxes);

  /** Nothing happened – a precondition was missing. */
  const skip = (reason) => { entry.status = 'skipped'; entry.reason = reason; return state; };
  /** The step ran but did not achieve what it says. */
  const fail = (reason) => { entry.status = 'failed'; entry.reason = reason; return state; };

  const idx = buildStackIndex(state);

  // Placeholders are resolved once, here, for *every* name field of the step,
  // so that none of the handlers repeats the substitution. Nothing bound means
  // unresolved: falling back to the literal "$revealed" would address whatever
  // asset happens to carry that name, and guessing a boss is worse than not
  // laying one out.
  for (const field of NAME_FIELDS) {
    const raw = step[field];
    if (!hasPlaceholder(raw)) continue;
    let missing = null;
    const filled = raw.replace(PLACEHOLDER, (m) => {
      const value = ctx.vars[m.slice(1)];
      if (value === undefined) { missing = missing || m; return m; }
      return value;
    });
    if (missing) return skip(`"${raw}": ${missing} is not bound`);
    step = { ...step, [field]: filled };
  }

  switch (step.type) {
    case 'shuffle': {
      const stack = idx.get(step.stackLabel);
      if (!stack) return skip(`stack "${step.stackLabel}" not found`);
      shuffleArray(stack.cards, rng);
      reassignZIndices(stack.cards);
      return state;
    }

    case 'set_face_down': {
      const stack = idx.get(step.stackLabel);
      if (!stack) return skip(`stack "${step.stackLabel}" not found`);
      stack.cards.forEach(c => { c.faceDown = true; });
      return state;
    }

    case 'set_face_up': {
      const stack = idx.get(step.stackLabel);
      if (!stack) return skip(`stack "${step.stackLabel}" not found`);
      stack.cards.forEach(c => { c.faceDown = false; });
      return state;
    }

    case 'flip_top_card': {
      const stack = idx.get(step.stackLabel);
      if (!stack || !stack.cards.length) return skip(`stack "${step.stackLabel}" not found or empty`);
      // Top card = highest zIndex
      const top = stack.cards.reduce((best, c) => c.zIndex > best.zIndex ? c : best, stack.cards[0]);
      top.faceDown = false;
      return state;
    }

    case 'split': {
      const { stackLabel, count, outputLabels = [], spacing = 130 } = step;
      const sourceStack = idx.get(stackLabel);
      if (!sourceStack) return skip(`stack "${stackLabel}" not found`);
      if (!count || count < 2) return skip('count must be at least 2');

      const allCards = [...sourceStack.cards].sort((a, b) => a.zIndex - b.zIndex);
      const totalCards = allCards.length;
      const baseSize = Math.floor(totalCards / count);
      const remainder = totalCards % count;

      const originX = sourceStack.x;
      const originY = sourceStack.y;

      // Remove source stack
      state.stacks = state.stacks.filter(s => s !== sourceStack);

      // Calculate total width to center the row of stacks
      const totalWidth = (count - 1) * spacing;
      const startX = originX - totalWidth / 2;

      for (let i = 0; i < count; i++) {
        const start = i * baseSize + Math.min(i, remainder);
        const end = start + baseSize + (i < remainder ? 1 : 0);
        const chunk = allCards.slice(start, end);

        if (chunk.length === 0) continue; // don't create empty stacks

        const label = outputLabels[i] || `${stackLabel} ${i + 1}`;
        const newStackId = crypto.randomUUID();

        reassignZIndices(chunk);

        state.stacks.push({
          stackId: newStackId,
          label,
          x: startX + i * spacing,
          y: originY,
          cards: chunk,
          card_ids: chunk.map(c => c.cardId),
          table_ids: chunk.map(c => c.tableId),
        });
      }

      return state;
    }

    // M7/T3: aus einer Kartenkategorie einen Nachziehstapel bauen. Im Client
    // gibt es das seit jeher als „+ Stack"; als Sequenzschritt fehlte es - und
    // damit war das Verhaltensdeck des Bösewichts, dessen Kategorie erst nach
    // dem Aufdecken feststeht, nicht aufbaubar.
    case 'place_stack': {
      const label = String(step.label ?? '').trim();
      // Der feste Name neben der variablen Kategorie ist der ganze Zweck: die
      // Kategorie heißt je Bösewicht anders, der Stapel immer „Verhaltensdeck",
      // und nur so findet `remove_stack` ihn beim nächsten Kampf wieder.
      if (!label) return skip('no stack name given');
      if (idx.get(label)) return skip(`stack "${label}" is already on the table`);

      const inCategory = cards.filter(c => norm(c.category) === norm(step.category));
      if (!inCategory.length) return skip(`category "${step.category ?? ''}" is empty or unknown`);

      // Leer ist keine 0 – dieselbe Rechnung wie bei `place_counter`: ein
      // Stapel klammheimlich in der Tischmitte ist schlimmer als ein gemeldeter
      // fehlender Wert.
      const coord = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
      const [x, y] = [coord(step.x), coord(step.y)];
      if (!Number.isFinite(x) || !Number.isFinite(y)) return skip(`no position given for stack "${label}"`);

      const stackId = crypto.randomUUID();
      const faceDown = Boolean(step.faceDown);
      // Die Bibliothekskarte per Spread, nicht über eine aufgezählte Feldliste:
      // die hat hier schon einmal `width`/`height` verschluckt, und quadratische
      // Karten lagen danach im Hochformat (Spec: Nachtrag zu M2.12). Position
      // trägt der Stapel, nicht die Karte – `move` verschiebt ihn, ohne die
      // Karten anzufassen, eine mitgeschriebene x/y wäre sofort veraltet.
      const stackCards = inCategory.map((card, i) => ({
        ...card,
        tableId: crypto.randomUUID(),
        cardId: card.id,
        zIndex: i + 1,
        faceDown,
        rotation: 0,
      }));

      state.stacks.push({
        stackId,
        label,
        x,
        y,
        cards: stackCards,
        card_ids: stackCards.map(c => c.cardId),
        table_ids: stackCards.map(c => c.tableId),
      });
      return state;
    }

    // Das Gegenstück dazu. `clear_zone` kann das nicht: es liest
    // `state.cards`/`state.tokens`, und die Karten eines Stapels liegen in
    // `stack.cards` und sind dort unsichtbar.
    case 'remove_stack': {
      const stack = idx.get(step.stackLabel);
      // Kein Stapel dieses Namens heißt: der gewünschte Zustand liegt schon vor
      // (dieselbe Entscheidung wie beim leeren `clear_zone`). Anders als Zonen
      // stehen Stapel nirgends im Setup, es gibt also keine Liste, gegen die
      // sich ein Tippfehler von einem „schon weg" unterscheiden ließe - und der
      // erste Kampf einer Partie räumt immer ein Deck weg, das es noch nicht
      // gibt. Der Grund steht trotzdem im Protokoll.
      if (!stack) {
        entry.reason = `no stack "${step.stackLabel}" on the table`;
        return state;
      }
      state.stacks = state.stacks.filter(s => s !== stack);
      return state;
    }

    case 'deal_to_zone': {
      const { stackLabel, count, targetZoneLabel, faceDown = false } = step;
      const stack = idx.get(stackLabel);
      if (!stack || !stack.cards.length) return skip(`stack "${stackLabel}" not found or empty`);

      // Determine target zones
      let targetZones = zones;
      if (targetZoneLabel) {
        targetZones = zones.filter(z => z.label === targetZoneLabel);
      }
      if (!targetZones.length) return skip(`zone "${targetZoneLabel ?? '(any)'}" not found`);

      // A zone that does not take cards, or that is already full, is not dealt
      // into at all - the cards stay in the stack where they can still be used.
      const { usable, free, occupied, problems } = zoneRoom(state, targetZones, 'card');
      if (!usable.length) return skip(problems.join('; '));

      const sorted = [...stack.cards].sort((a, b) => b.zIndex - a.zIndex); // top first
      const wanted = count > 0 ? sorted.slice(0, count) : sorted;
      const { groups, leftovers } = shareOut(wanted, usable, free);

      const dealt = [];
      for (const [zone, group] of groups) {
        const slots = zoneSlots(zone);
        const start = occupied.get(zone);
        group.forEach((card, i) => {
          // Fixed places seat the card on the next free one; a zone without
          // them keeps the old behaviour and drops every card on its centre.
          const pos = slots ? slots[Math.min(start + i, slots.length - 1)] : zoneCenter(zone);
          // Die ausgeteilte Karte ist die Quellkarte – sie unterscheidet sich
          // nur in Position, Seite und Stapelzugehoerigkeit. Eine feste
          // Feldliste verlor hier `width`/`height` (Spec: Nachtrag zu M2.12).
          const dealtCard = {
            ...card,
            tableId: card.tableId || crypto.randomUUID(),
            card_back_id: card.card_back_id || null,
            x: pos.x,
            y: pos.y,
            faceDown,
            rotation: card.rotation || 0,
            face_up: !faceDown,
          };
          delete dealtCard.inStack; // die Karte hat den Stapel gerade verlassen
          state.cards.push(dealtCard);
          dealt.push(card);
        });
      }

      // Remove dealt cards from stack
      const dealtIds = new Set(dealt.map(c => c.tableId));
      stack.cards = stack.cards.filter(c => !dealtIds.has(c.tableId));
      if (stack.cards.length === 0) {
        state.stacks = state.stacks.filter(s => s !== stack);
      }

      const notes = [...problems];
      if (leftovers.length) {
        notes.push(`${leftovers.length} of ${wanted.length} cards stayed in the stack: ${fullZones(usable, free, 'card').join('; ')}`);
      }
      if (count > 0 && dealt.length + leftovers.length < count) {
        notes.push(`stack "${stackLabel}" held only ${wanted.length} of ${count} requested cards`);
      }
      return notes.length ? fail(notes.join('; ')) : state;
    }

    case 'place_asset': {
      const asset = findAsset(assets, step.assetName);
      if (!asset) return skip(`asset "${step.assetName}" not found`);

      const existing = findPlaced(state, asset, step.assetName);
      let target = null;
      // What the object remembers about where it stands. Always written, also
      // as nulls: an object moved into a zone or onto free coordinates that
      // kept a stale `gridId`/`cell` would be dragged back onto the old field
      // by `placeOnGrids` on the next load (M3b).
      let onGrid = { gridId: null, cell: null };
      let noPos = `no position given for "${step.assetName}"`;

      if (step.targetZoneLabel) {
        const zone = findZone(zones, step.targetZoneLabel);
        if (!zone) {
          noPos = `zone "${step.targetZoneLabel}" not found`;
        } else {
          // Moving the object within its own zone must not count it twice.
          const here = existing && zoneContains(zone, existing.x, existing.y) ? 1 : 0;
          const taken = occupancy(state, zone) - here;
          const refusal = zoneRejects(zone, 'asset', taken);
          if (refusal) return skip(refusal);
          const slots = zoneSlots(zone);
          target = slots ? slots[Math.min(taken, slots.length - 1)] : zoneCenter(zone);
        }
      } else if (step.gridLabel || step.cell) {
        // Zone, grid field and x/y are three exclusive ways of saying where
        // something goes; the field is the middle one and never mixes with the
        // others. The field name travels with the object, the coordinates only
        // follow from it.
        const grid = findGrid(grids, step.gridLabel);
        const c = grid && cellFromLabel(grid, step.cell);
        if (!grid) {
          noPos = `grid "${step.gridLabel ?? ''}" not found`;
        } else if (!c) {
          noPos = `grid "${grid.label}" has no cell "${step.cell ?? ''}"`;
        } else {
          target = cellCenter(grid, c.col, c.row);
          onGrid = { gridId: grid.id, cell: cellLabel(grid, c.col, c.row) };
        }
      } else if (typeof step.x === 'number' && typeof step.y === 'number') {
        target = { x: step.x, y: step.y };
      }

      if (existing) {
        if (existing.locked) return skip(`"${step.assetName}" is locked, not moving it`);
        if (!target) return skip(noPos);
        existing.x = target.x;
        existing.y = target.y;
        Object.assign(existing, onGrid);
        return state;
      }

      if (!target) return skip(noPos);
      const token = assetToken(asset, target.x, target.y, step.faceDown);
      if (!token) return fail(`"${step.assetName}" has no back side and was not placed face down`);
      state.tokens.push(Object.assign(token, onGrid));
      return state;
    }

    case 'draw_assets': {
      const { pool, count = 1, targetZoneLabel, faceDown = false } = step;
      const candidates = pool ? assets.filter(a => norm(a.category) === norm(pool)) : [];
      if (!candidates.length) return skip(`pool "${pool}" is empty or unknown`);

      const targetZones = targetZoneLabel
        ? zones.filter(z => norm(z.label) === norm(targetZoneLabel))
        : zones;
      if (!targetZones.length) return skip(`zone "${targetZoneLabel ?? '(any)'}" not found`);

      // Same rule as for cards: a zone that refuses tokens, or is full, is not
      // drawn into. Nothing leaves the pool, so a corrected setup draws again.
      const { usable, free, occupied, problems } = zoneRoom(state, targetZones, 'asset');
      if (!usable.length) return skip(problems.join('; '));

      const wanted = Math.max(1, Number(count) || 1);
      const n = Math.min(wanted, candidates.length);

      const bag = [...candidates];
      shuffleArray(bag, rng);
      const drawn = bag.slice(0, n);

      // A drawn asset without a back side is dropped, the rest of the draw still
      // happens: three of four bosses in the bar is a visible gap and keeps the
      // work, while an empty bar would throw away three correct placements.
      // Dropping happens before the slots are handed out, so what is placed is
      // still spread evenly.
      const refused = faceDown ? drawn.filter(a => !a.back_image_path) : [];
      const placeable = faceDown ? drawn.filter(a => a.back_image_path) : drawn;

      // Group per target zone first, then spread each group inside its zone.
      const { groups: perZone, leftovers } = shareOut(placeable, usable, free);

      for (const [zone, group] of perZone) {
        const slots = zoneSlots(zone);
        const start = occupied.get(zone);
        group.forEach((asset, i) => {
          const { x, y } = slots
            ? slots[Math.min(start + i, slots.length - 1)]
            : zoneSlot(zone, i, group.length);
          state.tokens.push(assetToken(asset, x, y, faceDown));
        });
      }

      if (n < wanted) problems.push(`pool "${pool}" holds only ${n} of ${wanted} requested assets`);
      if (leftovers.length) {
        problems.push(`${leftovers.length} of ${placeable.length} assets not placed: ${fullZones(usable, free, 'asset').join('; ')}`);
      }
      if (refused.length) {
        problems.push(`no back side, not placed face down: ${refused.map(a => a.name).join(', ')}`);
      }
      return problems.length ? fail(problems.join('; ')) : state;
    }

    case 'set_asset_face': {
      const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
      if (!obj) return skip(`"${step.assetName}" is not on the table`);

      const face = assetFace(obj, step.faceDown);
      if (!face) {
        // Same rule as placing: rather off the table than face up by accident.
        state.tokens = state.tokens.filter(o => o !== obj);
        state.boards = state.boards.filter(o => o !== obj);
        return fail(`"${step.assetName}" has no back side; taken off the table instead of leaving it face up`);
      }
      Object.assign(obj, face);
      return state;
    }

    // Der Schritt für wiederkehrende Umbauten (Spec 11): welches Objekt an der
    // Reihe ist, weiß erst der Moment, in dem man es aufdeckt - feste Namen
    // reichen dafür nicht.
    case 'reveal_next': {
      const zone = findZone(zones, step.zoneLabel);
      if (!zone) return skip(`zone "${step.zoneLabel}" not found`);

      const { entries, slotCount } = slotOrder(zone, objectsInZone(zone, state.tokens, state.boards));
      const hit = entries.find(e => e.o.faceDown);
      if (!hit) return skip(`nothing face down in zone "${step.zoneLabel}"`);
      const obj = hit.o;

      if (step.targetZoneLabel) {
        const target = findZone(zones, step.targetZoneLabel);
        if (!target) return skip(`zone "${step.targetZoneLabel}" not found`);
        // Same counting as place_asset: moving inside its own zone must not
        // count the object twice. A full zone skips the whole step - turning it
        // over and leaving it where it was would be half a move.
        const here = zoneContains(target, obj.x, obj.y) ? 1 : 0;
        const taken = occupancy(state, target) - here;
        const refusal = zoneRejects(target, 'asset', taken);
        if (refusal) return skip(refusal);
        const slots = zoneSlots(target);
        const pos = slots ? slots[Math.min(taken, slots.length - 1)] : zoneCenter(target);
        obj.x = pos.x;
        obj.y = pos.y;
      }

      Object.assign(obj, assetFace(obj, false));

      // Der Platz bindet die Stufe, nicht die Runde (M7). Der Index fiel in
      // `slotOrder` ohnehin an; bisher wurde er weggeworfen.
      //
      // Jedes Aufdecken bindet neu, statt die alte Tabelle zu ergänzen: was
      // zum vorigen Bösewicht gehörte, gilt für diesen nicht mehr - ein
      // stehengebliebenes $revealedTier wäre still falsch.
      const name = obj.label || obj.name || null;
      const labels = Array.isArray(zone.slotLabels) ? zone.slotLabels : null;
      const tier = String(labels?.[hit.slot] ?? '').trim();
      ctx.vars = {};
      if (name) {
        ctx.vars.revealed = name;
        ctx.vars.revealedBase = baseName(name);
      }
      ctx.vars.revealedSlot = String(hit.slot + 1);
      // Kein Name heißt kein Name: $revealedTier bleibt ungebunden und der
      // Schritt dahinter wird übersprungen, statt dass hier ein Index als
      // Stufe ausgegeben wird, den niemand so aufgeschrieben hat.
      if (tier) ctx.vars.revealedTier = tier;
      ctx.revealedLast = hit.slot === slotCount - 1;
      return state;
    }

    // Das Gegenstück zu `deal_to_zone` (Spec 11, Nachtrag): eine Zone wieder
    // leer machen. Ohne Ziel wird gelöscht, und das ist die gefährlichere
    // Hälfte - deshalb gilt der Schritt nur für das, was *in* der Zone liegt,
    // nie für den Anker, auf dem sie hängt. Diese Ausnahme kennt
    // `objectsInZone` bereits; hier wird sie nur nicht umgangen.
    case 'clear_zone': {
      const zone = findZone(zones, step.zoneLabel);
      if (!zone) return skip(`zone "${step.zoneLabel}" not found`);

      // Eine leere Zone zu leeren ist gelungen, nicht gescheitert: der
      // gewünschte Zustand liegt schon vor. Anders als bei `reveal_next`, wo
      // "nichts da" heißt, dass die Absicht nicht erfüllt wurde. Sonst meldet
      // der erste Kampf einer frischen Partie zwei Fehlalarme.
      const inside = inSlotOrder(zone, objectsInZone(zone, state.cards, state.tokens));
      if (!inside.length) return state;

      // Gesperrt heißt gesperrt: `place_asset` und `move` verschieben ein
      // gesperrtes Objekt nicht, also räumt clear_zone es auch nicht weg -
      // das Schloss ausgerechnet gegen das Löschen wirkungslos zu machen wäre
      // die falsche Richtung.
      const locked = inside.filter(o => o.locked);
      const movable = inside.filter(o => !o.locked);
      const notes = locked.length ? [`left in place, locked: ${locked.map(objName).join(', ')}`] : [];
      if (!movable.length) return fail(notes.join('; '));

      // Vermerke, die den Schritt nicht scheitern lassen: er tut, was er soll,
      // nur nicht ganz das, was dastand.
      const remarks = [];
      if (step.targetZoneLabel && step.targetStackLabel) {
        remarks.push(`stack "${step.targetStackLabel}" ignored: a zone and a stack were given, the zone wins`);
      }

      if (step.targetZoneLabel) {
        const target = findZone(zones, step.targetZoneLabel);
        if (!target) return skip(`zone "${step.targetZoneLabel}" not found`);

        // Eine Zone kann Karten und Assets halten; `accepts` gilt je Sorte, die
        // Kapazität teilen sie sich (`occupancy` zählt beide). Darum einmal
        // `zoneRoom` pro Sorte, gerechnet wird mit dem ersten Ergebnis.
        const rooms = [...new Set(movable.map(kindOf))].map(k => zoneRoom(state, [target], k));
        const blocked = rooms.filter(r => !r.usable.length);
        if (blocked.length) return skip(blocked.flatMap(r => r.problems).join('; '));

        const { free, occupied } = rooms[0];
        const { groups, leftovers } = shareOut(movable, [target], free);
        const slots = zoneSlots(target);
        const start = occupied.get(target);
        groups.get(target).forEach((obj, i) => {
          const pos = slots ? slots[Math.min(start + i, slots.length - 1)] : zoneCenter(target);
          obj.x = pos.x;
          obj.y = pos.y;
        });

        // Was nicht mitkommt, bleibt liegen und steht mit Namen im Protokoll -
        // stillschweigend verschwinden darf hier nichts.
        if (leftovers.length) {
          notes.push(`${leftovers.length} of ${movable.length} objects stayed in zone "${step.zoneLabel}": ${fullZones([target], free, kindOf(leftovers[0])).join('; ')} (${leftovers.map(objName).join(', ')})`);
        }
      } else if (step.targetStackLabel) {
        // M5.1: der Rückweg von `deal_to_zone` - die Auslage kommt *unter* den
        // Nachschubstapel, statt aus dem Spiel zu fliegen.
        const stack = idx.get(step.targetStackLabel);
        if (!stack) return skip(`stack "${step.targetStackLabel}" not found`);
        if (!Array.isArray(stack.cards)) stack.cards = [];

        // In einen Kartenstapel kann nur eine Karte zurück; ein Token darin
        // wäre ein Fremdkörper, den kein Zug wieder herausholt. Es bleibt
        // liegen und steht mit Namen im Protokoll - wie eine volle Zielzone.
        const cards = movable.filter(o => kindOf(o) === 'card');
        const others = movable.filter(o => kindOf(o) !== 'card');
        if (others.length) {
          notes.push(`${others.length} of ${movable.length} objects stayed in zone "${step.zoneLabel}": only cards go back into a stack (${others.map(objName).join(', ')})`);
        }

        if (cards.length) {
          // Unten heißt unten: die vorhandenen Karten rücken um so viele
          // Plätze hoch, wie zurückgelegt werden, und die Zone behält ihre
          // Reihenfolge (`inSlotOrder` liefert sie bereits so).
          stack.cards.forEach(c => { c.zIndex += cards.length; });
          const back = cards.map((card, i) => {
            // Das Gegenstück zum Austeilen: die Karte behält jedes Feld und
            // tauscht nur Platz und Stapelzugehörigkeit. Ohne Position bliebe
            // sie beim nächsten Speichern in der Auslage liegen - `getGameState`
            // liest die Stapelposition aus der untersten Karte.
            const returned = { ...card, x: stack.x, y: stack.y, zIndex: i + 1, inStack: stack.stackId };
            delete returned.gridId;
            delete returned.cell;
            // Ohne `faceDown` am Schritt behält jede Karte ihre Seite: eine
            // geratene Seite wäre schlimmer als gar keine Ansage.
            if (typeof step.faceDown === 'boolean') {
              returned.faceDown = step.faceDown;
              returned.face_up = !step.faceDown;
            }
            return returned;
          });
          const gone = new Set(cards);
          state.cards = state.cards.filter(o => !gone.has(o));
          stack.cards = [...back, ...stack.cards];
        }
      } else {
        const gone = new Set(movable);
        state.cards = state.cards.filter(o => !gone.has(o));
        state.tokens = state.tokens.filter(o => !gone.has(o));
      }

      if (notes.length) return fail([...remarks, ...notes].join('; '));
      if (remarks.length) entry.reason = remarks.join('; ');
      return state;
    }

    // M7/T2: das Gegenstueck zu `clear_zone` fuer die Flaeche, auf der gekaempft
    // wird. Es loescht - was ueberleben soll (der besiegte Boesewicht in die
    // Trophaeenreihe), wird vorher mit `clear_zone` weggeraeumt.
    case 'clear_grid': {
      const grid = findGrid(grids, step.gridLabel);
      if (!grid) return skip(`grid "${step.gridLabel ?? ''}" not found`);

      // Ueber die Position, nicht ueber `gridId`: auch ein von Hand dorthin
      // gezogenes Objekt steht auf dem Raster und gehoert weg. `cellAt` ist die
      // Rechnung dafuer - eine zweite danebenzustellen waere eine zweite,
      // widersprechende Antwort auf dieselbe Frage.
      // Das Ankerobjekt bleibt: ein Brett, auf dem ein Raster haengt, steht
      // nicht *auf* ihm - dieselbe Ausnahme, die `objectsInZone` schon kennt.
      const anchorId = grid?.anchor?.assetId || null;
      const isAnchor = (o) => anchorId && (o?.assetId ?? o?.id) === anchorId;
      const on = [...state.cards, ...state.tokens].filter(o => !isAnchor(o) && cellAt(grid, o?.x, o?.y));

      // Ein leeres Raster zu leeren ist gelungen, nicht gescheitert: der
      // gewuenschte Zustand liegt schon vor (dieselbe Entscheidung wie bei
      // `clear_zone`).
      if (!on.length) return state;

      // Gesperrt heisst gesperrt - siehe den `clear_zone`-Zweig oben.
      const locked = on.filter(o => o.locked);
      const gone = new Set(on.filter(o => !o.locked));
      state.cards = state.cards.filter(o => !gone.has(o));
      state.tokens = state.tokens.filter(o => !gone.has(o));
      if (locked.length) return fail(`left in place, locked: ${locked.map(objName).join(', ')}`);
      return state;
    }

    // M7/T6: das Szenario des zuletzt aufgedeckten Boesewichts aufbauen.
    //
    // Der Schritt hat genau eine Einstellung. Das Raster steht in den Daten,
    // nicht am Schritt: es gehoert zu den abgetippten Feldnamen, und zwei
    // Quellen fuer dieselbe Adresse waeren eine Frage danach, welche gewinnt.
    case 'build_scenario': {
      const boss = ctx.vars?.revealedBase;
      // Dieselbe Regel wie bei jedem Platzhalter: nichts gebunden heisst
      // uebersprungen. Ein Rueckfall auf "irgendeinen" Eintrag waere geraten.
      if (!boss) return skip('$revealedBase is not bound - nothing has been revealed');

      const bosses = scenarioData?.bosses;
      // Der Schluessel ist der Basisname, und er wird wie jeder andere Name
      // hier verglichen: ohne Ruecksicht auf Gross- und Kleinschreibung.
      const key = bosses && typeof bosses === 'object'
        ? Object.keys(bosses).find(k => norm(k) === norm(boss))
        : undefined;
      if (key === undefined) return skip(`no scenario data for "${boss}"`);
      const entry = bosses[key];

      // „auto" heisst: Endkampf genau dann, wenn `reveal_next` vom **letzten**
      // Platz der Leiste genommen hat - nicht vom vierten und nicht aus einer
      // Rundenzahl. `true`/`false` ueberstimmen das.
      const useFinal = step.final === true || step.final === 'true' ? true
        : step.final === false || step.final === 'false' ? false
        : Boolean(ctx.revealedLast);
      // `final` ist additiv: derselbe Eintrag, ein zusaetzlicher Abschnitt.
      const parts = [entry, useFinal ? entry?.final : null].filter(Boolean);

      // Erst pruefen, dann legen. Geprueft wird der **ganze** Eintrag, auch der
      // Endkampf-Abschnitt, den dieser Aufbau vielleicht gar nicht braucht: ein
      // Tippfehler dort faellt sonst erst im letzten Kampf der Partie auf, und
      // dann steht schon alles andere.
      const problems = validateScenarioData(
        { gridLabel: scenarioData?.gridLabel, bosses: { [key]: entry } },
        { assets, grids }
      );
      if (problems.length) return fail(problems.join('; '));

      const grid = findGrid(grids, scenarioData?.gridLabel);
      if (!grid) return fail(`grid "${scenarioData?.gridLabel ?? ''}" not found`);

      // Gebaut wird in eine eigene Liste, gelegt wird erst danach: ein halb
      // gestelltes Kampffeld ist schlimmer als ein leeres, weil man das leere
      // sieht. Die Pruefung oben schweigt ohne Asset-Bibliothek ("kann ich
      // nicht wissen"), darum faengt diese Schleife denselben Fall noch einmal.
      const tokens = [];
      const missing = [];
      for (const part of parts) {
        for (const t of (Array.isArray(part?.terrain) ? part.terrain : [])) {
          const asset = findAsset(assets, t?.assetName);
          if (!asset) { missing.push(`asset "${t?.assetName ?? ''}" not found`); continue; }
          for (const label of (Array.isArray(t?.cells) ? t.cells : [])) {
            const c = cellFromLabel(grid, label);
            if (!c) { missing.push(`grid "${grid.label}" has no field "${label}"`); continue; }
            // Je Feld ein eigenes Objekt. `place_asset` wuerde das vorhandene
            // verschieben - drei gleiche Plaettchen waeren dann eines, das
            // zweimal umzieht. Genau dafuer gibt es diesen Schritt.
            const { x, y } = cellCenter(grid, c.col, c.row);
            tokens.push(Object.assign(assetToken(asset, x, y, false), {
              gridId: grid.id,
              cell: cellLabel(grid, c.col, c.row),
            }));
          }
        }
      }
      if (missing.length) return fail(missing.join('; '));
      state.tokens.push(...tokens);

      // Die benannten Felder binden - zusaetzlich zu dem, was `reveal_next`
      // gebunden hat, nicht anstelle davon: der folgende Schritt legt
      // `$revealed` auf `$B`. Ein String bindet den Schluessel allein, eine
      // Liste den Schluessel plus Position ab 1.
      for (const part of parts) {
        for (const [name, value] of Object.entries(part?.fields || {})) {
          if (Array.isArray(value)) value.forEach((cell, i) => { ctx.vars[`${name}${i + 1}`] = String(cell).trim(); });
          else ctx.vars[name] = String(value).trim();
        }
      }
      return state;
    }

    // M4a: ein Zähler ist kein Asset – er hat kein Bild und keinen Vorrat, nur
    // Name, Wert und Stelle. Er wird immer neu angelegt (der Aufbau läuft gegen
    // einen leeren Tisch); ein zweiter Lauf legt darum einen zweiten an.
    case 'place_counter': {
      const name = String(step.name ?? '').trim();
      if (!name) return skip('no counter name given');
      // Leer ist keine 0: `Number('')` wäre 0 und legte den Zähler klammheimlich
      // in die Tischmitte, statt den fehlenden Wert zu melden.
      const coord = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
      const [x, y] = [coord(step.x), coord(step.y)];
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return skip(`no position given for counter "${name}"`);
      }
      state.counters.push(normalizeCounter({ name, value: step.value, max: step.max, x, y }));
      return state;
    }

    case 'lock_asset':
    case 'unlock_asset': {
      const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
      if (!obj) return skip(`"${step.assetName}" is not on the table`);
      obj.locked = step.type === 'lock_asset';
      return state;
    }

    case 'move': {
      if (step.assetName) {
        const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
        if (!obj) return skip(`"${step.assetName}" is not on the table`);
        if (obj.locked) return skip(`"${step.assetName}" is locked, not moving it`);
        obj.x = step.x ?? obj.x;
        obj.y = step.y ?? obj.y;
        return state;
      }
      const stack = idx.get(step.stackLabel);
      if (!stack) return skip(`stack "${step.stackLabel}" not found`);
      stack.x = step.x ?? stack.x;
      stack.y = step.y ?? stack.y;
      return state;
    }

    default:
      return skip(`unknown step type "${step.type}"`);
  }
}
