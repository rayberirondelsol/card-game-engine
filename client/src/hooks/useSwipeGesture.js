import { useRef, useCallback, useEffect } from 'react';

/**
 * useSwipeGesture - Hook for detecting swipe gestures on touch devices
 *
 * Supports:
 * - Edge swipe from left to open drawer
 * - Swipe left on drawer to close it
 * - Swipe down on modals to dismiss them
 * - Visual feedback during swipe (progress callbacks)
 *
 * Configuration:
 * - minDistance: minimum 50px movement
 * - maxTime: under 500ms
 * - Only active on touch devices
 * - Does not interfere with card drag operations
 */

const SWIPE_MIN_DISTANCE = 50; // pixels
const SWIPE_MAX_TIME = 500; // milliseconds
const EDGE_ZONE_WIDTH = 30; // pixels from left edge for edge swipe detection

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  onSwipeProgress, // called during swipe with { direction, distance, progress }
  onSwipeCancel, // called when swipe is cancelled (didn't meet threshold)
  enabled = true,
  edgeSwipeOnly = false, // if true, only detect swipes starting from the left edge
  ignoreSelector = '[data-drag-handle], [data-card-element], [data-table-card]', // elements to ignore swipe on
} = {}) {
  const touchStartRef = useRef(null);
  const swipingRef = useRef(false);
  const directionLockedRef = useRef(null); // 'horizontal' or 'vertical' once determined

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;

    // Only handle single touch
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.touches[0];

    // Check if touch started on an element we should ignore
    // (card elements, drag handles, etc.)
    const target = e.target;
    if (target && ignoreSelector) {
      const shouldIgnore = target.closest(ignoreSelector);
      if (shouldIgnore) {
        touchStartRef.current = null;
        return;
      }
    }

    // For edge swipe, check if the touch starts near the left edge
    const isEdgeSwipe = touch.clientX <= EDGE_ZONE_WIDTH;

    if (edgeSwipeOnly && !isEdgeSwipe) {
      touchStartRef.current = null;
      return;
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      isEdge: isEdgeSwipe,
    };
    swipingRef.current = false;
    directionLockedRef.current = null;
  }, [enabled, edgeSwipeOnly, ignoreSelector]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || !touchStartRef.current) return;

    const touch = e.touches[0];
    const start = touchStartRef.current;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Lock direction once we've moved 10px
    if (!directionLockedRef.current && (absDx > 10 || absDy > 10)) {
      directionLockedRef.current = absDx > absDy ? 'horizontal' : 'vertical';
    }

    // Once direction is locked, report progress
    if (directionLockedRef.current) {
      swipingRef.current = true;

      if (directionLockedRef.current === 'horizontal' && onSwipeProgress) {
        const direction = dx > 0 ? 'right' : 'left';
        const distance = absDx;
        const progress = Math.min(1, distance / 200); // 0-1 progress over 200px
        onSwipeProgress({ direction, distance, progress, dx, dy });
      }

      if (directionLockedRef.current === 'vertical' && dy > 0 && onSwipeProgress) {
        const distance = absDy;
        const progress = Math.min(1, distance / 200);
        onSwipeProgress({ direction: 'down', distance, progress, dx, dy });
      }
    }
  }, [enabled, onSwipeProgress]);

  const handleTouchEnd = useCallback((e) => {
    if (!enabled || !touchStartRef.current) return;

    const start = touchStartRef.current;
    const elapsed = Date.now() - start.time;

    // Use changedTouches for end event
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Check if swipe meets threshold requirements
    const isValidSwipe = elapsed <= SWIPE_MAX_TIME;
    const isHorizontalSwipe = absDx >= SWIPE_MIN_DISTANCE && absDx > absDy;
    const isVerticalSwipe = absDy >= SWIPE_MIN_DISTANCE && absDy > absDx;

    if (isValidSwipe && isHorizontalSwipe) {
      if (dx > 0 && onSwipeRight) {
        onSwipeRight({ distance: absDx, duration: elapsed, fromEdge: start.isEdge });
      } else if (dx < 0 && onSwipeLeft) {
        onSwipeLeft({ distance: absDx, duration: elapsed, fromEdge: start.isEdge });
      }
    } else if (isValidSwipe && isVerticalSwipe && dy > 0) {
      if (onSwipeDown) {
        onSwipeDown({ distance: absDy, duration: elapsed });
      }
    } else if (swipingRef.current && onSwipeCancel) {
      // Swipe was in progress but didn't meet threshold
      onSwipeCancel();
    }

    // Reset
    touchStartRef.current = null;
    swipingRef.current = false;
    directionLockedRef.current = null;
  }, [enabled, onSwipeLeft, onSwipeRight, onSwipeDown, onSwipeCancel]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * useDrawerSwipe - Specialized hook for drawer swipe open/close with visual feedback
 *
 * Returns:
 * - swipeHandlers: touch event handlers to spread on the container
 * - drawerSwipeOffset: current pixel offset during swipe (for translateX)
 * - isSwipingDrawer: whether a drawer swipe is in progress
 */
export function useDrawerSwipe({
  isOpen,
  onOpen,
  onClose,
  drawerWidth = 256, // default sm:w-64 = 256px
  enabled = true,
} = {}) {
  const swipeOffsetRef = useRef(0);
  const isSwipingRef = useRef(false);
  const callbackRef = useRef({ onOpen, onClose });

  // Keep callbacks fresh
  useEffect(() => {
    callbackRef.current = { onOpen, onClose };
  }, [onOpen, onClose]);

  // State for triggering re-renders during swipe for visual feedback
  const offsetUpdateRef = useRef(null);
  const [, forceUpdate] = useRef(0);

  const swipeHandlers = useSwipeGesture({
    enabled: enabled && typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    edgeSwipeOnly: !isOpen, // edge swipe only when drawer is closed
    ignoreSelector: isOpen
      ? '[data-table-card], [data-drag-handle]' // when drawer is open, ignore cards but allow swipe on drawer
      : '[data-table-card], [data-drag-handle], [data-card-element]',
    onSwipeProgress: useCallback(({ direction, distance, dx }) => {
      if (!isOpen && direction === 'right') {
        // Opening: offset from 0 to drawerWidth
        swipeOffsetRef.current = Math.min(distance, drawerWidth);
        isSwipingRef.current = true;
      } else if (isOpen && direction === 'left') {
        // Closing: offset from 0 to -drawerWidth
        swipeOffsetRef.current = Math.max(-distance, -drawerWidth);
        isSwipingRef.current = true;
      }
    }, [isOpen, drawerWidth]),
    onSwipeRight: useCallback(({ fromEdge }) => {
      if (!isOpen && fromEdge) {
        callbackRef.current.onOpen?.();
      }
      swipeOffsetRef.current = 0;
      isSwipingRef.current = false;
    }, [isOpen]),
    onSwipeLeft: useCallback(() => {
      if (isOpen) {
        callbackRef.current.onClose?.();
      }
      swipeOffsetRef.current = 0;
      isSwipingRef.current = false;
    }, [isOpen]),
    onSwipeCancel: useCallback(() => {
      swipeOffsetRef.current = 0;
      isSwipingRef.current = false;
    }, []),
  });

  return {
    swipeHandlers,
    getSwipeOffset: () => swipeOffsetRef.current,
    getIsSwiping: () => isSwipingRef.current,
  };
}

/**
 * useModalSwipeDismiss - Specialized hook for dismissing modals with swipe down
 *
 * Returns touch handlers to spread on the modal backdrop or content
 */
export function useModalSwipeDismiss({
  isOpen,
  onDismiss,
  enabled = true,
} = {}) {
  const callbackRef = useRef({ onDismiss });

  useEffect(() => {
    callbackRef.current = { onDismiss };
  }, [onDismiss]);

  const swipeHandlers = useSwipeGesture({
    enabled: enabled && isOpen && typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    onSwipeDown: useCallback(() => {
      callbackRef.current.onDismiss?.();
    }, []),
  });

  return swipeHandlers;
}
