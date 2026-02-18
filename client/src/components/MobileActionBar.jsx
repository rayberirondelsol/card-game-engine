import React, { useState, useCallback } from 'react';
import { isTouchDevice } from '../utils/touchUtils';
import { triggerHaptic } from '../utils/hapticUtils';

/**
 * MobileActionBar - Floating action bar for touch devices
 *
 * Shows contextual action buttons when a card or stack is selected on touch devices.
 * Replaces keyboard shortcuts (F, E, Q, G, number keys) which are unusable on mobile.
 *
 * Visibility rules:
 * - Only visible on touch devices (not desktop with mouse)
 * - Appears when one or more cards are selected
 * - Disappears when cards are deselected
 * - Does not obstruct card view (positioned at bottom of screen)
 */

const MIN_TOUCH_TARGET = 44; // minimum 44x44px touch targets per accessibility guidelines

export default function MobileActionBar({
  selectedCards,       // Set of selected card tableIds
  tableCards,          // Array of all table cards
  onFlip,             // () => void - flip selected cards
  onRotateCW,         // () => void - rotate clockwise
  onRotateCCW,        // () => void - rotate counter-clockwise
  onGroup,            // () => void - group selected cards into stack
  onDraw,             // (count) => void - draw N cards from stack
}) {
  const [showDrawPicker, setShowDrawPicker] = useState(false);

  // Only show on touch devices
  if (!isTouchDevice()) return null;

  // Only show when cards are selected
  if (!selectedCards || selectedCards.size === 0) return null;

  // Check if any selected card is in a stack (for draw functionality)
  let selectedStackId = null;
  let stackSize = 0;
  for (const tid of selectedCards) {
    const card = tableCards.find(c => c.tableId === tid);
    if (card && card.inStack) {
      selectedStackId = card.inStack;
      stackSize = tableCards.filter(c => c.inStack === selectedStackId).length;
      break;
    }
  }

  const canGroup = selectedCards.size >= 2;
  const canDraw = !!selectedStackId && stackSize > 0;

  function handleFlip(e) {
    e.stopPropagation();
    e.preventDefault();
    triggerHaptic('action');
    onFlip();
  }

  function handleRotateCW(e) {
    e.stopPropagation();
    e.preventDefault();
    triggerHaptic('action');
    onRotateCW();
  }

  function handleRotateCCW(e) {
    e.stopPropagation();
    e.preventDefault();
    triggerHaptic('action');
    onRotateCCW();
  }

  function handleGroup(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!canGroup) {
      triggerHaptic('error');
      return;
    }
    triggerHaptic('action');
    onGroup();
  }

  function handleDrawToggle(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!canDraw) {
      triggerHaptic('error');
      return;
    }
    triggerHaptic('action');
    setShowDrawPicker(!showDrawPicker);
  }

  function handleDrawCount(count) {
    triggerHaptic('action');
    onDraw(count);
    setShowDrawPicker(false);
  }

  const buttonBase = `
    flex items-center justify-center rounded-xl
    bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90
    text-white shadow-lg backdrop-blur-sm
    transition-colors duration-150
    border border-slate-500/40
  `;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[45] flex flex-col items-center gap-2"
      data-ui-element="true"
      data-testid="mobile-action-bar"
    >
      {/* Draw count picker (shown above action bar when active) */}
      {showDrawPicker && canDraw && (
        <div
          className="flex flex-wrap gap-1.5 bg-slate-800/95 backdrop-blur-md rounded-xl p-2 border border-slate-600/50 shadow-2xl max-w-[280px] justify-center"
          data-testid="mobile-draw-picker"
          data-ui-element="true"
        >
          <div className="w-full text-center text-white/70 text-xs font-medium mb-1">
            Draw cards to hand
          </div>
          {Array.from({ length: Math.min(stackSize, 10) }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={`${buttonBase} text-sm font-bold`}
              style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDrawCount(n); }}
              onTouchEnd={(e) => { e.stopPropagation(); }}
              data-testid={`mobile-draw-${n}`}
              data-ui-element="true"
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {/* Main action buttons row */}
      <div
        className="flex items-center gap-2 bg-slate-800/95 backdrop-blur-md rounded-2xl px-3 py-2 border border-slate-600/50 shadow-2xl"
        data-ui-element="true"
      >
        {/* Flip button */}
        <button
          className={buttonBase}
          style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, width: 52, height: 48 }}
          onClick={handleFlip}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-flip"
          data-ui-element="true"
          title="Flip card (F)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
        </button>

        {/* Rotate CCW button */}
        <button
          className={buttonBase}
          style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, width: 52, height: 48 }}
          onClick={handleRotateCCW}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-rotate-ccw"
          data-ui-element="true"
          title="Rotate counter-clockwise (Q)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
        </button>

        {/* Rotate CW button */}
        <button
          className={buttonBase}
          style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, width: 52, height: 48 }}
          onClick={handleRotateCW}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-rotate-cw"
          data-ui-element="true"
          title="Rotate clockwise (E)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-500/40" />

        {/* Group button */}
        <button
          className={`${buttonBase} ${!canGroup ? 'opacity-40' : ''}`}
          style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, width: 52, height: 48 }}
          onClick={handleGroup}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-group"
          data-ui-element="true"
          title="Group into stack (G)"
          disabled={!canGroup}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="16" height="14" rx="2" />
            <rect x="6" y="2" width="16" height="14" rx="2" />
          </svg>
        </button>

        {/* Draw button */}
        <button
          className={`${buttonBase} ${!canDraw ? 'opacity-40' : ''}`}
          style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, width: 52, height: 48 }}
          onClick={handleDrawToggle}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-draw"
          data-ui-element="true"
          title="Draw cards from stack"
          disabled={!canDraw}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
