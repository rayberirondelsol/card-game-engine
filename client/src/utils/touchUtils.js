/**
 * Touch Detection and Utility Functions for Mobile Optimization
 *
 * This module provides utilities for:
 * - Detecting touch vs mouse input
 * - Normalizing touch/mouse events to a unified format
 * - Managing touch interactions (pinch, pan, etc.)
 */

/**
 * Detect if the device supports touch events
 * @returns {boolean} True if device has touch capability
 */
export function isTouchDevice() {
  const hasOntouchstart = 'ontouchstart' in window;
  const hasMaxTouchPoints = navigator.maxTouchPoints > 0;
  const hasMsMaxTouchPoints = navigator.msMaxTouchPoints > 0;
  const result = hasOntouchstart || hasMaxTouchPoints || hasMsMaxTouchPoints;

  console.log('[TouchDetection] isTouchDevice() called:', {
    hasOntouchstart,
    maxTouchPoints: navigator.maxTouchPoints,
    msMaxTouchPoints: navigator.msMaxTouchPoints,
    result
  });

  return result;
}

/**
 * Get the pointer position from either a mouse or touch event
 * @param {MouseEvent|TouchEvent} e - The event object
 * @returns {{clientX: number, clientY: number, pageX: number, pageY: number}}
 */
export function getPointerPosition(e) {
  let position;
  let source;

  // Handle touch events
  if (e.touches && e.touches.length > 0) {
    const touch = e.touches[0];
    position = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.pageX,
      pageY: touch.pageY,
    };
    source = 'touches';
  }
  // Handle touchend events (use changedTouches)
  else if (e.changedTouches && e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    position = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.pageX,
      pageY: touch.pageY,
    };
    source = 'changedTouches';
  }
  // Handle mouse events
  else {
    position = {
      clientX: e.clientX,
      clientY: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
    };
    source = 'mouse';
  }

  console.log('[TouchDetection] getPointerPosition():', {
    eventType: e.type,
    source,
    position,
    touchCount: e.touches ? e.touches.length : 0
  });

  return position;
}

/**
 * Create unified event handlers that work with both mouse and touch
 * @param {Object} handlers - Object containing start, move, and end handler functions
 * @returns {Object} Object with unified event handler properties
 */
export function createUnifiedHandlers(handlers) {
  const { onStart, onMove, onEnd } = handlers;

  return {
    // Mouse handlers
    onMouseDown: (e) => {
      if (onStart) onStart(e);
    },

    // Touch handlers
    onTouchStart: (e) => {
      if (onStart) onStart(e);
    },

    onTouchMove: (e) => {
      if (onMove) onMove(e);
    },

    onTouchEnd: (e) => {
      if (onEnd) onEnd(e);
    },
  };
}

/**
 * Prevent default touch behaviors like scrolling and zooming during interactions
 * @param {TouchEvent} e - The touch event
 * @param {boolean} preventDefault - Whether to prevent default behavior
 */
export function handleTouchPrevention(e, preventDefault = true) {
  if (preventDefault && e.cancelable) {
    e.preventDefault();
  }
  e.stopPropagation();
}

/**
 * Calculate distance between two touch points (for pinch gestures)
 * @param {Touch} touch1 - First touch point
 * @param {Touch} touch2 - Second touch point
 * @returns {number} Distance in pixels
 */
export function getTouchDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get the center point between two touches
 * @param {Touch} touch1 - First touch point
 * @param {Touch} touch2 - Second touch point
 * @returns {{x: number, y: number}}
 */
export function getTouchCenter(touch1, touch2) {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

/**
 * Debounce function for touch events to prevent excessive calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if an event is a touch event
 * @param {Event} e - The event to check
 * @returns {boolean} True if event is a touch event
 */
export function isTouchEvent(e) {
  const result = e.type.startsWith('touch');
  console.log('[TouchDetection] isTouchEvent():', {
    eventType: e.type,
    result,
    hasTouches: !!e.touches,
    touchCount: e.touches ? e.touches.length : 0
  });
  return result;
}

/**
 * Check if an event is a mouse event
 * @param {Event} e - The event to check
 * @returns {boolean} True if event is a mouse event
 */
export function isMouseEvent(e) {
  return e.type.startsWith('mouse');
}

/**
 * Get the number of active touches in an event
 * @param {TouchEvent} e - The touch event
 * @returns {number} Number of touches
 */
export function getTouchCount(e) {
  if (e.touches) {
    return e.touches.length;
  }
  return 0;
}

/**
 * Normalize wheel events for consistent zoom behavior
 * @param {WheelEvent} e - The wheel event
 * @returns {number} Normalized delta value
 */
export function normalizeWheel(e) {
  // Different browsers use different properties
  let delta = e.deltaY || e.detail || e.wheelDelta;

  // Normalize the delta
  if (e.deltaMode === 1) {
    // DOM_DELTA_LINE
    delta *= 40;
  } else if (e.deltaMode === 2) {
    // DOM_DELTA_PAGE
    delta *= 800;
  }

  return delta;
}

/**
 * Add passive event listeners for better scroll performance
 * @param {HTMLElement} element - The element to attach listeners to
 * @param {string} event - The event type
 * @param {Function} handler - The event handler
 * @param {boolean} passive - Whether to use passive listener
 */
export function addPassiveListener(element, event, handler, passive = true) {
  if (element && element.addEventListener) {
    element.addEventListener(event, handler, { passive });
  }
}

/**
 * Remove event listeners
 * @param {HTMLElement} element - The element to remove listeners from
 * @param {string} event - The event type
 * @param {Function} handler - The event handler
 */
export function removeListener(element, event, handler) {
  if (element && element.removeEventListener) {
    element.removeEventListener(event, handler);
  }
}

/**
 * Check if device is likely a mobile device based on screen size and touch support
 * @returns {boolean} True if likely mobile
 */
export function isMobileDevice() {
  const isTouch = isTouchDevice();
  const width = window.innerWidth;
  const result = isTouch && width < 768;

  console.log('[TouchDetection] isMobileDevice() called:', {
    isTouch,
    windowWidth: width,
    threshold: 768,
    result
  });

  return result;
}

/**
 * Check if device is likely a tablet
 * @returns {boolean} True if likely tablet
 */
export function isTabletDevice() {
  const isTouch = isTouchDevice();
  const width = window.innerWidth;
  const result = isTouch && width >= 768 && width < 1024;

  console.log('[TouchDetection] isTabletDevice() called:', {
    isTouch,
    windowWidth: width,
    minThreshold: 768,
    maxThreshold: 1024,
    result
  });

  return result;
}

/**
 * Check if device is likely a smartphone (touch device with small screen)
 * @returns {boolean} True if likely smartphone
 */
export function isSmartphone() {
  const isTouch = isTouchDevice();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const result = isTouch && width < 768;

  console.log('[TouchDetection] isSmartphone() called:', {
    isTouch,
    windowWidth: width,
    windowHeight: height,
    threshold: 768,
    result
  });

  return result;
}

/**
 * Get comprehensive device information for debugging
 * @returns {Object} Device information object
 */
export function getDeviceInfo() {
  const info = {
    // Touch detection
    hasOntouchstart: 'ontouchstart' in window,
    maxTouchPoints: navigator.maxTouchPoints,
    msMaxTouchPoints: navigator.msMaxTouchPoints,
    isTouchDevice: isTouchDevice(),

    // Screen dimensions
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,

    // Device classification
    isMobile: isMobileDevice(),
    isTablet: isTabletDevice(),
    isSmartphone: isSmartphone(),

    // User agent
    userAgent: navigator.userAgent,
    platform: navigator.platform,

    // Additional capabilities
    hasPointerEvents: 'PointerEvent' in window,
    orientation: window.screen.orientation ? window.screen.orientation.type : 'unknown'
  };

  console.log('[TouchDetection] Device Info:', info);

  return info;
}
