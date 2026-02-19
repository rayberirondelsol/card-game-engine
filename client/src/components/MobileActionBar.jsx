import React, { useState } from 'react';
import { isTouchDevice } from '../utils/touchUtils';
import { triggerHaptic } from '../utils/hapticUtils';

/**
 * MobileActionBar - Expandable floating action bar for touch devices
 *
 * Shows contextual action buttons when a card or stack is selected on touch devices.
 * Slim bar: Flip, Rotate CW, Rotate CCW, Group, Draw
 * Expanded: Pick Up to Hand, Lock/Unlock, Shuffle, Split, Browse, Remove
 */

const MIN_TOUCH_TARGET = 44;

export default function MobileActionBar({
  selectedCards,
  tableCards,
  onFlip,
  onRotateCW,
  onRotateCCW,
  onGroup,
  onDraw,
  onPickUpToHand,
  onLockToggle,
  onShuffle,
  onSplitStack,
  onBrowse,
  onFlipStack,
  onRemove,
  isLandscape = false,
}) {
  const [showDrawPicker, setShowDrawPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!isTouchDevice()) return null;
  if (!selectedCards || selectedCards.size === 0) return null;

  // Check if any selected card is in a stack
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

  // Check lock state
  let isLocked = false;
  for (const tid of selectedCards) {
    const card = tableCards.find(c => c.tableId === tid);
    if (card?.locked) { isLocked = true; break; }
  }

  const canGroup = selectedCards.size >= 2;
  const canDraw = !!selectedStackId && stackSize > 0;
  const canSplit = !!selectedStackId && stackSize >= 2;
  const canBrowse = !!selectedStackId;
  const canShuffle = !!selectedStackId && stackSize >= 2;

  function handleAction(e, fn) {
    e.stopPropagation();
    e.preventDefault();
    triggerHaptic('action');
    fn();
  }

  function handleDrawToggle(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!canDraw) { triggerHaptic('error'); return; }
    triggerHaptic('action');
    setShowDrawPicker(!showDrawPicker);
  }

  function handleDrawCount(count) {
    triggerHaptic('action');
    onDraw(count);
    setShowDrawPicker(false);
  }

  function toggleExpand(e) {
    e.stopPropagation();
    e.preventDefault();
    triggerHaptic('action');
    setExpanded(!expanded);
    setShowDrawPicker(false);
  }

  const buttonBase = `
    flex items-center justify-center rounded-xl
    bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90
    text-white shadow-lg backdrop-blur-sm
    transition-colors duration-150
    border border-slate-500/40
  `;

  const btnSize = { minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, width: isLandscape ? 46 : 52, height: isLandscape ? 42 : 48 };
  const iconSize = isLandscape ? 18 : 22;

  return (
    <div
      className={`fixed z-[45] flex flex-col items-center gap-2 transition-all duration-300 ease-in-out ${
        isLandscape
          ? 'bottom-4 left-1/2 -translate-x-1/2'
          : 'bottom-20 left-1/2 -translate-x-1/2'
      }`}
      style={isLandscape ? { paddingLeft: 'calc(52px + env(safe-area-inset-left, 0px))' } : {}}
      data-ui-element="true"
      data-testid="mobile-action-bar"
    >
      {/* Draw count picker */}
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

      {/* Expanded actions panel */}
      {expanded && (
        <div
          className="bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-600/50 shadow-2xl p-3 min-w-[280px] max-w-[320px]"
          data-ui-element="true"
          data-testid="mobile-action-expanded"
        >
          {/* Card actions */}
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 px-1">
            {selectedStackId ? 'Stack Actions' : 'Card Actions'}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button
              className={`${buttonBase} px-3 text-xs font-medium gap-1.5`}
              style={{ minHeight: MIN_TOUCH_TARGET }}
              onClick={(e) => handleAction(e, () => onPickUpToHand())}
              onTouchEnd={(e) => e.stopPropagation()}
              data-ui-element="true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              To Hand
            </button>
            <button
              className={`${buttonBase} px-3 text-xs font-medium gap-1.5`}
              style={{ minHeight: MIN_TOUCH_TARGET }}
              onClick={(e) => handleAction(e, () => onLockToggle())}
              onTouchEnd={(e) => e.stopPropagation()}
              data-ui-element="true"
            >
              {isLocked ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 019.9-1" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
              {isLocked ? 'Unlock' : 'Lock'}
            </button>
          </div>

          {/* Stack-specific actions */}
          {selectedStackId && (
            <>
              <div className="border-t border-slate-700/60 my-2" />
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 px-1">
                Stack
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {canShuffle && (
                  <button
                    className={`${buttonBase} px-3 text-xs font-medium gap-1.5`}
                    style={{ minHeight: MIN_TOUCH_TARGET }}
                    onClick={(e) => handleAction(e, () => onShuffle())}
                    onTouchEnd={(e) => e.stopPropagation()}
                    data-ui-element="true"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 3 21 3 21 8" />
                      <line x1="4" y1="20" x2="21" y2="3" />
                      <polyline points="21 16 21 21 16 21" />
                      <line x1="15" y1="15" x2="21" y2="21" />
                      <line x1="4" y1="4" x2="9" y2="9" />
                    </svg>
                    Shuffle
                  </button>
                )}
                {canSplit && (
                  <button
                    className={`${buttonBase} px-3 text-xs font-medium gap-1.5`}
                    style={{ minHeight: MIN_TOUCH_TARGET }}
                    onClick={(e) => handleAction(e, () => onSplitStack())}
                    onTouchEnd={(e) => e.stopPropagation()}
                    data-ui-element="true"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="2" x2="12" y2="22" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                    Split
                  </button>
                )}
                <button
                  className={`${buttonBase} px-3 text-xs font-medium gap-1.5`}
                  style={{ minHeight: MIN_TOUCH_TARGET }}
                  onClick={(e) => handleAction(e, () => onFlipStack())}
                  onTouchEnd={(e) => e.stopPropagation()}
                  data-ui-element="true"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 1l4 4-4 4" />
                    <path d="M3 11V9a4 4 0 014-4h14" />
                    <path d="M7 23l-4-4 4-4" />
                    <path d="M21 13v2a4 4 0 01-4 4H3" />
                  </svg>
                  Flip All
                </button>
                {canBrowse && (
                  <button
                    className={`${buttonBase} px-3 text-xs font-medium gap-1.5`}
                    style={{ minHeight: MIN_TOUCH_TARGET }}
                    onClick={(e) => handleAction(e, () => { onBrowse(); setExpanded(false); })}
                    onTouchEnd={(e) => e.stopPropagation()}
                    data-ui-element="true"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Browse
                  </button>
                )}
              </div>
            </>
          )}

          {/* Danger zone */}
          <div className="border-t border-slate-700/60 my-2" />
          <button
            className={`${buttonBase} px-3 text-xs font-medium gap-1.5 !text-red-400 !border-red-500/30 !bg-red-900/30 hover:!bg-red-800/40 active:!bg-red-700/40 w-full justify-center`}
            style={{ minHeight: MIN_TOUCH_TARGET }}
            onClick={(e) => handleAction(e, () => { onRemove(); setExpanded(false); })}
            onTouchEnd={(e) => e.stopPropagation()}
            data-ui-element="true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Remove from Table
          </button>
        </div>
      )}

      {/* Main action buttons row */}
      <div
        className={`flex items-center bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-600/50 shadow-2xl transition-all duration-300 ease-in-out ${
          isLandscape ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-3 py-2'
        }`}
        data-ui-element="true"
      >
        {/* Expand/collapse toggle */}
        <button
          className={`${buttonBase} ${expanded ? '!bg-cyan-600/80 !border-cyan-400/50' : ''}`}
          style={btnSize}
          onClick={toggleExpand}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-expand"
          data-ui-element="true"
          title={expanded ? 'Collapse' : 'More actions'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        {/* Divider */}
        <div className={`bg-slate-500/40 ${isLandscape ? 'w-px h-6' : 'w-px h-8'}`} />

        {/* Flip button */}
        <button
          className={buttonBase}
          style={btnSize}
          onClick={(e) => handleAction(e, onFlip)}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-flip"
          data-ui-element="true"
          title="Flip card (F)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
        </button>

        {/* Rotate CCW button */}
        <button
          className={buttonBase}
          style={btnSize}
          onClick={(e) => handleAction(e, onRotateCCW)}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-rotate-ccw"
          data-ui-element="true"
          title="Rotate counter-clockwise (Q)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
        </button>

        {/* Rotate CW button */}
        <button
          className={buttonBase}
          style={btnSize}
          onClick={(e) => handleAction(e, onRotateCW)}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-rotate-cw"
          data-ui-element="true"
          title="Rotate clockwise (E)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
        </button>

        {/* Divider */}
        <div className={`bg-slate-500/40 ${isLandscape ? 'w-px h-6' : 'w-px h-8'}`} />

        {/* Group button */}
        <button
          className={`${buttonBase} ${!canGroup ? 'opacity-40' : ''}`}
          style={btnSize}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (!canGroup) { triggerHaptic('error'); return; } triggerHaptic('action'); onGroup(); }}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-group"
          data-ui-element="true"
          title="Group into stack (G)"
          disabled={!canGroup}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="16" height="14" rx="2" />
            <rect x="6" y="2" width="16" height="14" rx="2" />
          </svg>
        </button>

        {/* Draw button */}
        <button
          className={`${buttonBase} ${!canDraw ? 'opacity-40' : ''}`}
          style={btnSize}
          onClick={handleDrawToggle}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="mobile-action-draw"
          data-ui-element="true"
          title="Draw cards from stack"
          disabled={!canDraw}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
