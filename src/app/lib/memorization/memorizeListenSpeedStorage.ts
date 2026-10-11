import { emitClientPreferencesLocalChange } from '../client-preferences-notify';

/** Pause between repeated plays (memorize listen). */
export const MEMORIZE_LISTEN_REPEAT_GAP_MS = 650;

export const MEMORIZE_LISTEN_SPEED_STORAGE_KEY = 'prayer-app:memorize-listen-speed';

export const MEMORIZE_LISTEN_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type MemorizeListenSpeed = (typeof MEMORIZE_LISTEN_SPEEDS)[number];

const speedSet = new Set<number>(MEMORIZE_LISTEN_SPEEDS as unknown as number[]);

export function formatMemorizeListenSpeedLabel(rate: number): string {
  const preset = MEMORIZE_LISTEN_SPEEDS.find((s) => s === rate);
  const n = preset ?? 1;
  if (n === 1) return '1x';
  return `${n}x`;
}

export function normalizeMemorizeListenSpeed(raw: string | null): MemorizeListenSpeed {
  if (raw == null || raw === '') {
    return 1;
  }
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n) || !speedSet.has(n)) {
    return 1;
  }
  return n as MemorizeListenSpeed;
}

export function readMemorizeListenSpeedFromStorage(): MemorizeListenSpeed {
  if (typeof window === 'undefined') {
    return 1;
  }
  try {
    return normalizeMemorizeListenSpeed(
      window.localStorage.getItem(MEMORIZE_LISTEN_SPEED_STORAGE_KEY)
    );
  } catch {
    return 1;
  }
}

export function writeMemorizeListenSpeedToStorage(rate: MemorizeListenSpeed): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(MEMORIZE_LISTEN_SPEED_STORAGE_KEY, String(rate));
    emitClientPreferencesLocalChange();
  } catch {
    // ignore
  }
}

export function applyMemorizeListenPlaybackRateToMediaElement(
  el: HTMLMediaElement,
  rate: number
): void {
  if (!Number.isFinite(rate) || rate <= 0) {
    return;
  }
  el.playbackRate = rate;
  try {
    if ('preservesPitch' in el) {
      Object.assign(el, { preservesPitch: true });
    }
  } catch {
    // ignore
  }
}

/** iOS WebKit speech rate scale to match streaming audio presets. */
export const MEMORIZE_IOS_WEB_SPEECH_RATE_SCALE = 0.82;

export function toMemorizeWebSpeechUtteranceRate(
  preset: MemorizeListenSpeed,
  isIosWeb: boolean
): number {
  const raw = isIosWeb ? preset * MEMORIZE_IOS_WEB_SPEECH_RATE_SCALE : preset;
  if (!Number.isFinite(raw)) return 1;
  return Math.min(2, Math.max(0.4, raw));
}
