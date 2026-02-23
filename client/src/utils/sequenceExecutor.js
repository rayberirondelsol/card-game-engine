/**
 * executeSequence – pure transformation function for setup sequences.
 * Applies an ordered list of setup actions to a game state snapshot.
 * Never throws: failed steps are skipped with a console.warn.
 *
 * @param {object|string} stateData  – serialized game state (object or JSON string)
 * @param {Array}         sequenceData – array of sequence step objects
 * @param {Array}         zones       – zone objects from the setup (for deal_to_zone)
 * @returns {object} – new (deep-cloned) game state with all steps applied
 */
export function executeSequence(stateData, sequenceData, zones = []) {
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

  for (const step of sequenceData) {
    try {
      state = applyStep(state, step, zones);
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

/** Fisher-Yates shuffle in-place */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Re-assign zIndex values 1..N after a shuffle or split */
function reassignZIndices(cards) {
  cards.forEach((c, i) => { c.zIndex = i + 1; });
}

// ── Action handlers ───────────────────────────────────────────────────────────

function applyStep(state, step, zones) {
  if (!state.stacks) state.stacks = [];
  if (!state.cards) state.cards = [];

  const idx = buildStackIndex(state);

  switch (step.type) {
    case 'shuffle': {
      const stack = idx.get(step.stackLabel);
      if (!stack) { console.warn(`[sequenceExecutor] shuffle: stack "${step.stackLabel}" not found`); return state; }
      shuffleArray(stack.cards);
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

    case 'move': {
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
