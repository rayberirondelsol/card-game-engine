/**
 * Haptic Feedback Utilities for Mobile Touch Interactions
 *
 * Provides vibration feedback for various game interactions on touch devices.
 * Uses the Vibration API (navigator.vibrate) where available.
 *
 * Haptic patterns:
 * - dragStart: Short vibration (25ms) when picking up a card
 * - drop: Short vibration (15ms) on card placement
 * - longPress: Medium vibration (50ms) on long-press stack recognition
 * - action: Short vibration (25ms) for flip/rotate/group via action buttons
 * - flip: Short vibration (25ms) for card flip (double-tap or action button)
 * - error: Two short pulses (25ms, pause, 25ms) for invalid actions
 */

import { isTouchDevice } from './touchUtils';

/**
 * Check if the Vibration API is available
 * @returns {boolean}
 */
function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Haptic feedback patterns (in milliseconds)
 * For navigator.vibrate():
 * - A single number: vibrate for that duration
 * - An array: [vibrate, pause, vibrate, pause, ...]
 */
const HAPTIC_PATTERNS = {
  dragStart: 25,          // Short vibration when picking up a card
  drop: 15,               // Short vibration on card placement/drop
  longPress: 50,          // Medium vibration on long-press stack recognition
  action: 25,             // Short vibration for action button presses (flip, rotate, group)
  flip: 25,               // Card flip via double-tap
  error: [25, 50, 25],    // Two short pulses for error/invalid action
};

/**
 * Trigger haptic feedback for a given interaction type.
 * Only fires on touch devices with Vibration API support.
 *
 * @param {'dragStart'|'drop'|'longPress'|'action'|'flip'|'error'} type - The interaction type
 * @returns {boolean} True if vibration was triggered, false otherwise
 */
export function triggerHaptic(type) {
  // Only fire on touch devices
  if (!isTouchDevice()) return false;

  // Check Vibration API availability
  if (!canVibrate()) return false;

  const pattern = HAPTIC_PATTERNS[type];
  if (!pattern) {
    console.warn('[Haptic] Unknown haptic type:', type);
    return false;
  }

  try {
    navigator.vibrate(pattern);
    return true;
  } catch (err) {
    // Silently fail - vibration is a nice-to-have
    return false;
  }
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic() {
  if (canVibrate()) {
    try {
      navigator.vibrate(0);
    } catch (err) {
      // ignore
    }
  }
}
