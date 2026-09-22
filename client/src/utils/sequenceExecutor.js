/**
 * executeSequence – pure transformation function for setup sequences.
 * Applies an ordered list of setup actions to a game state snapshot.
 * Never throws: failed steps are skipped with a console.warn.
 *
 * Card steps address stacks by `stackLabel`; asset steps (tokens, figures,
 * boards) address a single asset by `assetName` (the table_assets name) and a
 * draw pool by `pool` (the asset's category name) – the same human-readable
 * label idea the stacks and zones already use.
 *
 * @param {object|string} stateData  – serialized game state (object or JSON string)
 * @param {Array}         sequenceData – array of sequence step objects
 * @param {Array}         zones       – zone objects from the setup (for deal_to_zone)
 * @param {object}        [options]   – { assets: table_assets rows, rng: () => [0,1) }
 * @returns {object} – new (deep-cloned) game state with all steps applied
 */
export function executeSequence(stateData, sequenceData, zones = [], options = {}) {
  // Parse stateData if it's a string
  let state;
  try {
    state = typeof stateData === 'string' ? JSON.parse(stateData) : stateData;
  } catch (err) {
    console.error('[sequenceExecutor] Failed to parse stateData:', err);
    return stateData;
  }

  // Deep clone to avoid mutating the original
  state = JSON.parse(JSON.stringify(state));

  if (!Array.isArray(sequenceData) || sequenceData.length === 0) {
    return state;
  }

  const { assets = [], rng = Math.random } = options || {};

  for (const step of sequenceData) {
    try {
      state = applyStep(state, step, zones, assets, rng);
    } catch (err) {
      console.warn(`[sequenceExecutor] Step "${step.type}" failed, skipping:`, err.message);
    }
  }

  return state;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    if (zone) return zoneSlot(zone);
    console.warn(`[sequenceExecutor] zone "${step.targetZoneLabel}" not found`);
    return null;
  }
  if (typeof step.x === 'number' && typeof step.y === 'number') return { x: step.x, y: step.y };
  return null;
}

/**
 * Build a table token from a table_asset row.
 * An asset without back_image_path cannot be placed face down: it is still
 * placed, but face up, and a warning is logged.
 */
function assetToken(asset, x, y, faceDown) {
  const back = asset.back_image_path || null;
  if (faceDown && !back) {
    console.warn(`[sequenceExecutor] asset "${asset.name}" has no back_image_path, placing it face up`);
  }
  const down = Boolean(faceDown) && Boolean(back);
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

function applyStep(state, step, zones, assets, rng) {
  if (!state.stacks) state.stacks = [];
  if (!state.cards) state.cards = [];
  if (!state.tokens) state.tokens = [];
  if (!state.boards) state.boards = [];

  const idx = buildStackIndex(state);

  switch (step.type) {
    case 'shuffle': {
      const stack = idx.get(step.stackLabel);
      if (!stack) { console.warn(`[sequenceExecutor] shuffle: stack "${step.stackLabel}" not found`); return state; }
      shuffleArray(stack.cards, rng);
      reassignZIndices(stack.cards);
      return state;
    }

    case 'set_face_down': {
      const stack = idx.get(step.stackLabel);
      if (!stack) { console.warn(`[sequenceExecutor] set_face_down: stack "${step.stackLabel}" not found`); return state; }
      stack.cards.forEach(c => { c.faceDown = true; });
      return state;
    }

    case 'set_face_up': {
      const stack = idx.get(step.stackLabel);
      if (!stack) { console.warn(`[sequenceExecutor] set_face_up: stack "${step.stackLabel}" not found`); return state; }
      stack.cards.forEach(c => { c.faceDown = false; });
      return state;
    }

    case 'flip_top_card': {
      const stack = idx.get(step.stackLabel);
      if (!stack || !stack.cards.length) { console.warn(`[sequenceExecutor] flip_top_card: stack "${step.stackLabel}" not found or empty`); return state; }
      // Top card = highest zIndex
      const top = stack.cards.reduce((best, c) => c.zIndex > best.zIndex ? c : best, stack.cards[0]);
      top.faceDown = false;
      return state;
    }

    case 'split': {
      const { stackLabel, count, outputLabels = [], spacing = 130 } = step;
      const sourceStack = idx.get(stackLabel);
      if (!sourceStack) { console.warn(`[sequenceExecutor] split: stack "${stackLabel}" not found`); return state; }
      if (!count || count < 2) { console.warn(`[sequenceExecutor] split: count must be ≥ 2`); return state; }

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
      if (!stack || !stack.cards.length) { console.warn(`[sequenceExecutor] deal_to_zone: stack "${stackLabel}" not found or empty`); return state; }

      // Determine target zones
      let targetZones = zones;
      if (targetZoneLabel) {
        targetZones = zones.filter(z => z.label === targetZoneLabel);
      }
      if (!targetZones.length) { console.warn(`[sequenceExecutor] deal_to_zone: no zones found`); return state; }

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

      return state;
    }

    case 'place_asset': {
      const asset = findAsset(assets, step.assetName);
      if (!asset) { console.warn(`[sequenceExecutor] place_asset: asset "${step.assetName}" not found`); return state; }

      const existing = findPlaced(state, asset, step.assetName);
      const target = resolvePosition(step, zones);

      if (existing) {
        if (existing.locked) { console.warn(`[sequenceExecutor] place_asset: "${step.assetName}" is locked, not moving it`); return state; }
        if (!target) { console.warn(`[sequenceExecutor] place_asset: no position for "${step.assetName}"`); return state; }
        existing.x = target.x;
        existing.y = target.y;
        return state;
      }

      if (!target) { console.warn(`[sequenceExecutor] place_asset: no position for "${step.assetName}"`); return state; }
      state.tokens.push(assetToken(asset, target.x, target.y, step.faceDown));
      return state;
    }

    case 'draw_assets': {
      const { pool, count = 1, targetZoneLabel, faceDown = false } = step;
      const candidates = pool ? assets.filter(a => norm(a.category) === norm(pool)) : [];
      if (!candidates.length) { console.warn(`[sequenceExecutor] draw_assets: pool "${pool}" is empty or unknown`); return state; }

      const targetZones = targetZoneLabel
        ? zones.filter(z => norm(z.label) === norm(targetZoneLabel))
        : zones;
      if (!targetZones.length) { console.warn(`[sequenceExecutor] draw_assets: no zones found`); return state; }

      const wanted = Math.max(1, Number(count) || 1);
      const n = Math.min(wanted, candidates.length);
      if (n < wanted) {
        console.warn(`[sequenceExecutor] draw_assets: pool "${pool}" holds only ${n} of ${wanted} requested assets`);
      }

      const bag = [...candidates];
      shuffleArray(bag, rng);
      const drawn = bag.slice(0, n);

      // Group per target zone first, then spread each group inside its zone.
      const perZone = new Map();
      drawn.forEach((asset, i) => {
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

      return state;
    }

    case 'set_asset_face': {
      const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
      if (!obj) { console.warn(`[sequenceExecutor] set_asset_face: "${step.assetName}" is not on the table`); return state; }

      const down = Boolean(step.faceDown);
      if (down && !obj.backImageUrl) {
        console.warn(`[sequenceExecutor] set_asset_face: "${step.assetName}" has no back side, staying face up`);
        return state;
      }
      obj.faceDown = down;
      obj.imageUrl = down ? obj.backImageUrl : (obj.frontImageUrl || obj.imageUrl);
      return state;
    }

    case 'lock_asset':
    case 'unlock_asset': {
      const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
      if (!obj) { console.warn(`[sequenceExecutor] ${step.type}: "${step.assetName}" is not on the table`); return state; }
      obj.locked = step.type === 'lock_asset';
      return state;
    }

    case 'move': {
      if (step.assetName) {
        const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
        if (!obj) { console.warn(`[sequenceExecutor] move: "${step.assetName}" is not on the table`); return state; }
        if (obj.locked) { console.warn(`[sequenceExecutor] move: "${step.assetName}" is locked, not moving it`); return state; }
        obj.x = step.x ?? obj.x;
        obj.y = step.y ?? obj.y;
        return state;
      }
      const stack = idx.get(step.stackLabel);
      if (!stack) { console.warn(`[sequenceExecutor] move: stack "${step.stackLabel}" not found`); return state; }
      stack.x = step.x ?? stack.x;
      stack.y = step.y ?? stack.y;
      return state;
    }

    default:
      console.warn(`[sequenceExecutor] Unknown step type: "${step.type}"`);
      return state;
  }
}
