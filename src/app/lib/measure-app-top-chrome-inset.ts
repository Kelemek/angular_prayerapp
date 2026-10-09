/** Breathing room below optional top chrome when measuring legacy switcher hosts. */
export const APP_TOP_CHROME_OVERLAY_GAP = '0.75rem';

/** Sticky app chrome above main content (legacy; org switcher moved to Settings). */
export function measureAppTopChromeInsetPx(): number {
  return 0;
}

/** Overlay `padding-top` so a full-screen modal sits below the tenant switcher bar. */
export function appTopChromeOverlayPaddingTop(): string | null {
  const chromePx = measureAppTopChromeInsetPx();
  if (chromePx <= 0) {
    return null;
  }
  return appTopChromeOverlayPaddingTopFromPx(chromePx);
}

export function appTopChromeOverlayPaddingTopFromPx(chromePx: number): string {
  // Native switcher padding already includes the status-bar inset, so measuring
  // the bar and adding env() again would push modals down twice.
  if (document.documentElement.classList.contains('native-app')) {
    return `calc(${chromePx}px + ${APP_TOP_CHROME_OVERLAY_GAP})`;
  }
  return `calc(env(safe-area-inset-top, 0px) + ${chromePx}px + ${APP_TOP_CHROME_OVERLAY_GAP})`;
}
