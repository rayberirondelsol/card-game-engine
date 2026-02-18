import React, { useRef, useState, useCallback, useEffect } from 'react';

/**
 * SwipeModal - A modal wrapper that supports swipe-down to dismiss on touch devices
 *
 * Wraps the modal backdrop and adds touch swipe detection.
 * - Swipe down 50px+ in under 500ms dismisses the modal
 * - Visual feedback: modal content translates down following the finger
 * - Only active on touch devices
 */

const SWIPE_MIN_DISTANCE = 50;
const SWIPE_MAX_TIME = 500;

export default function SwipeModal({ isOpen, onDismiss, children, className = '', testId }) {
  const touchStartRef = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const contentRef = useRef(null);

  const isTouchCapable = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Reset offset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSwipeOffset(0);
      setIsSwiping(false);
    }
  }, [isOpen]);

  const handleTouchStart = useCallback((e) => {
    if (!isTouchCapable || e.touches.length !== 1) return;

    // Don't intercept touches on interactive elements inside modal
    const target = e.target;
    const isInteractive = target.closest('input, textarea, select, button, [contenteditable]');
    if (isInteractive) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsSwiping(false);
  }, [isTouchCapable]);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dy = touch.clientY - touchStartRef.current.y;
    const dx = touch.clientX - touchStartRef.current.x;

    // Only handle downward swipes that are more vertical than horizontal
    if (dy > 10 && Math.abs(dy) > Math.abs(dx)) {
      setSwipeOffset(Math.max(0, dy));
      setIsSwiping(true);
      // Prevent scrolling during swipe
      if (e.cancelable) e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const dy = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    if (dy >= SWIPE_MIN_DISTANCE && elapsed <= SWIPE_MAX_TIME && onDismiss) {
      onDismiss();
    }

    // Reset
    touchStartRef.current = null;
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [onDismiss]);

  if (!isOpen) return null;

  // Compute opacity for visual feedback during swipe
  const backdropOpacity = isSwiping ? Math.max(0.1, 0.5 - (swipeOffset / 400)) : 0.5;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center sm:p-4 p-2 ${className}`}
      data-ui-element="true"
      data-testid={testId ? `${testId}-backdrop` : undefined}
      style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        // Click on backdrop dismisses
        if (e.target === e.currentTarget && onDismiss) {
          onDismiss();
        }
      }}
    >
      <div
        ref={contentRef}
        style={{
          transform: isSwiping ? `translateY(${swipeOffset}px)` : 'translateY(0)',
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
          opacity: isSwiping ? Math.max(0.3, 1 - swipeOffset / 300) : 1,
        }}
      >
        {children}
        {/* Swipe indicator for touch devices */}
        {isTouchCapable && (
          <div className="flex justify-center mt-2 pointer-events-none">
            <div className="w-10 h-1 bg-white/30 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
