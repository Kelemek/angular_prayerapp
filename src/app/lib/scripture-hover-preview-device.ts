import { Capacitor } from '@capacitor/core';

export function isScriptureHoverPreviewTouchOnlyDevice(): boolean {
  return (
    Capacitor.isNativePlatform() ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none)').matches)
  );
}
