import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useOrientationLayout - Hook for detecting device orientation and providing
 * layout hints for landscape optimization on mobile devices.
 *
 * Returns:
 * - isLandscape: true if in landscape orientation on a touch device
 * - isMobileLandscape: true if landscape on a small screen (mobile phone)
 * - isTabletLandscape: true if landscape on a medium screen (tablet)
 * - orientation: 'portrait' | 'landscape'
 * - screenSize: { width, height }
 * - layoutMode: 'desktop' | 'mobile-portrait' | 'mobile-landscape' | 'tablet-portrait' | 'tablet-landscape'
 *
 * Layout rules:
 * - Desktop (non-touch or large screen): full layout with labels
 * - Mobile portrait: standard mobile layout
 * - Mobile landscape: compact toolbar (icons only), reduced hand area, maximized table
 * - Tablet portrait: standard layout
 * - Tablet landscape: slightly compact, more table area
 */

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useOrientationLayout() {
  const isTouchDevice = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const getOrientationState = useCallback(() => {
    if (typeof window === 'undefined') {
      return {
        isLandscape: false,
        isMobileLandscape: false,
        isTabletLandscape: false,
        orientation: 'portrait',
        screenSize: { width: 0, height: 0 },
        layoutMode: 'desktop',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;

    // Use the shorter dimension to determine device class
    // In landscape, height is the shorter dimension
    const shortDim = Math.min(width, height);
    const isMobileSize = shortDim < MOBILE_BREAKPOINT;
    const isTabletSize = shortDim >= MOBILE_BREAKPOINT && shortDim < TABLET_BREAKPOINT;

    const isMobileLandscape = isTouchDevice && isLandscape && isMobileSize;
    const isTabletLandscape = isTouchDevice && isLandscape && isTabletSize;

    let layoutMode = 'desktop';
    if (isTouchDevice) {
      if (isMobileSize) {
        layoutMode = isLandscape ? 'mobile-landscape' : 'mobile-portrait';
      } else if (isTabletSize) {
        layoutMode = isLandscape ? 'tablet-landscape' : 'tablet-portrait';
      }
    }

    return {
      isLandscape: isTouchDevice && isLandscape,
      isMobileLandscape,
      isTabletLandscape,
      orientation: isLandscape ? 'landscape' : 'portrait',
      screenSize: { width, height },
      layoutMode,
    };
  }, [isTouchDevice]);

  const [state, setState] = useState(getOrientationState);
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChange = () => {
      const newState = getOrientationState();
      const prev = prevStateRef.current;

      // Only update if something actually changed
      if (
        prev.isLandscape !== newState.isLandscape ||
        prev.layoutMode !== newState.layoutMode ||
        prev.screenSize.width !== newState.screenSize.width ||
        prev.screenSize.height !== newState.screenSize.height
      ) {
        prevStateRef.current = newState;
        setState(newState);
      }
    };

    // Listen to both resize and orientation change events
    window.addEventListener('resize', handleChange);

    // screen.orientation API (modern browsers)
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleChange);
    }

    // Fallback: orientationchange event (older mobile browsers)
    window.addEventListener('orientationchange', handleChange);

    // Also listen for matchMedia changes as a secondary trigger
    const landscapeQuery = window.matchMedia('(orientation: landscape)');
    if (landscapeQuery.addEventListener) {
      landscapeQuery.addEventListener('change', handleChange);
    }

    return () => {
      window.removeEventListener('resize', handleChange);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleChange);
      }
      window.removeEventListener('orientationchange', handleChange);
      if (landscapeQuery.removeEventListener) {
        landscapeQuery.removeEventListener('change', handleChange);
      }
    };
  }, [getOrientationState]);

  return state;
}
