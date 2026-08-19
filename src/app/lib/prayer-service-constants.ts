export const PRAYER_SERVICE_RESUME_REFRESH_DEBOUNCE_MS = 400;
export const PRAYER_SERVICE_LOAD_ERROR_TOAST_COOLDOWN_MS = 10_000;
export const PRAYER_SERVICE_INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;

export function shouldEmitPrayerLoadErrorToast(
  lastToastTime: number,
  cooldownMs: number
): boolean {
  return Date.now() - lastToastTime > cooldownMs;
}
