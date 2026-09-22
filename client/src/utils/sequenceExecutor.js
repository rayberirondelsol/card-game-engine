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
 * @param {object}        [options]   – { assets: table_assets rows, rng: () => [0,1) }
 * @returns {object} – new (deep-cloned) game state with all steps applied
 */
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

  const { assets = [], rng = Math.random } = options || {};

  sequenceData.forEach((step, index) => {
    const entry = { index, type: step?.type, target: stepTarget(step), status: 'ok', reason: null };
    log.push(entry);
    try {
      state = applyStep(state, step, zones, assets, rng, entry);
    } catch (err) {
      entry.status = 'failed';
      entry.reason = err.message;
    }
  });

  return { state, log };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** What a step points at – enough to recognise it in the protocol. */
function stepTarget(step) {
  return step?.assetName ?? step?.pool ?? step?.stackLabel ?? step?.targetZoneLabel ?? null;
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
 * Centre of the i-th of n slots inside a zone, spread along the zone's longer
 * axis so several drawn assets don't end up on the same spot. n = 1 → centre.
 */
function zoneSlot(zone, i = 0, n = 1) {
  const w = zone.width || 100;
  const h = zone.height || 140;
  const frac = (i + 0.5) / n;
  return h >= w
    ? { x: zone.x + w / 2, y: zone.y + h * frac }
    : { x: zone.x + w * frac, y: zone.y + h / 2 };
}

/** Target position of a step: an explicit x/y, or the centre of a named zone. */
function resolvePosition(step, zones) {
  if (step.targetZoneLabel) {
    const zone = zones.find(z => norm(z.label) === norm(step.targetZoneLabel));
    return zone ? zoneSlot(zone) : null;
  }
  if (typeof step.x === 'number' && typeof step.y === 'number') return { x: step.x, y: step.y };
  return null;
}

/**
 * Build a table token from a table_asset row.
 * Laying an object face down needs a back side; without one it is NOT placed
 * (spec §6) – an unintentionally face-up token gives away exactly the
 * information that was meant to stay hidden, and nobody would notice. The
 * caller turns the null into a protocol entry.
 */
function assetToken(asset, x, y, faceDown) {
  const back = asset.back_image_path || null;
  if (faceDown && !back) return null;
  const down = Boolean(faceDown);
  return {
    id: crypto.randomUUID(),
    assetId: asset.id,
    shape: 'image',
    color: null,
    label: asset.name || '',
    imageUrl: down ? back : asset.image_path,
    frontImageUrl: asset.image_path,
    backImageUrl: back,
    faceDown: down,
    size: asset.width || 60,
    x,
    y,
    attachedTo: null,
    attachedCorner: null,
    locked: false,
  };
}

// ── Action handlers ───────────────────────────────────────────────────────────

function applyStep(state, step, zones, assets, rng, entry) {
  if (!state.stacks) state.stacks = [];
  if (!state.cards) state.cards = [];
  if (!state.tokens) state.tokens = [];
  if (!state.boards) state.boards = [];

  /** Nothing happened – a precondition was missing. */
  const skip = (reason) => { entry.status = 'skipped'; entry.reason = reason; return state; };
  /** The step ran but did not achieve what it says. */
  const fail = (reason) => { entry.status = 'failed'; entry.reason = reason; return state; };

  const idx = buildStackIndex(state);

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

      const sorted = [...stack.cards].sort((a, b) => b.zIndex - a.zIndex); // top first
      let cardsToDeal = count > 0 ? sorted.slice(0, count) : sorted;
      const dealtIds = new Set(cardsToDeal.map(c => c.tableId));

      // Remove dealt cards from stack
      stack.cards = stack.cards.filter(c => !dealtIds.has(c.tableId));
      if (stack.cards.length === 0) {
        state.stacks = state.stacks.filter(s => s !== stack);
      }

      // Distribute cards to zones
      cardsToDeal.forEach((card, i) => {
        const zone = targetZones[i % targetZones.length];
        const x = zone.x + (zone.width || 100) / 2;
        const y = zone.y + (zone.height || 140) / 2;
        state.cards.push({
          tableId: card.tableId || crypto.randomUUID(),
          cardId: card.cardId,
          name: card.name,
          image_path: card.image_path,
          card_back_id: card.card_back_id || null,
          x,
          y,
          zIndex: card.zIndex,
          faceDown,
          rotation: card.rotation || 0,
          face_up: !faceDown,
        });
      });

      if (count > 0 && cardsToDeal.length < count) {
        return fail(`stack "${stackLabel}" held only ${cardsToDeal.length} of ${count} requested cards`);
      }
      return state;
    }

    case 'place_asset': {
      const asset = findAsset(assets, step.assetName);
      if (!asset) return skip(`asset "${step.assetName}" not found`);

      const existing = findPlaced(state, asset, step.assetName);
      const target = resolvePosition(step, zones);
      const noPos = step.targetZoneLabel
        ? `zone "${step.targetZoneLabel}" not found`
        : `no position given for "${step.assetName}"`;

      if (existing) {
        if (existing.locked) return skip(`"${step.assetName}" is locked, not moving it`);
        if (!target) return skip(noPos);
        existing.x = target.x;
        existing.y = target.y;
        return state;
      }

      if (!target) return skip(noPos);
      const token = assetToken(asset, target.x, target.y, step.faceDown);
      if (!token) return fail(`"${step.assetName}" has no back side and was not placed face down`);
      state.tokens.push(token);
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
      const perZone = new Map();
      placeable.forEach((asset, i) => {
        const zone = targetZones[i % targetZones.length];
        if (!perZone.has(zone)) perZone.set(zone, []);
        perZone.get(zone).push(asset);
      });

      for (const [zone, group] of perZone) {
        group.forEach((asset, i) => {
          const { x, y } = zoneSlot(zone, i, group.length);
          state.tokens.push(assetToken(asset, x, y, faceDown));
        });
      }

      const problems = [];
      if (n < wanted) problems.push(`pool "${pool}" holds only ${n} of ${wanted} requested assets`);
      if (refused.length) {
        problems.push(`no back side, not placed face down: ${refused.map(a => a.name).join(', ')}`);
      }
      return problems.length ? fail(problems.join('; ')) : state;
    }

    case 'set_asset_face': {
      const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
      if (!obj) return skip(`"${step.assetName}" is not on the table`);

      const down = Boolean(step.faceDown);
      if (down && !obj.backImageUrl) {
        // Same rule as placing: rather off the table than face up by accident.
        state.tokens = state.tokens.filter(o => o !== obj);
        state.boards = state.boards.filter(o => o !== obj);
        return fail(`"${step.assetName}" has no back side; taken off the table instead of leaving it face up`);
      }
      obj.faceDown = down;
      obj.imageUrl = down ? obj.backImageUrl : (obj.frontImageUrl || obj.imageUrl);
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
