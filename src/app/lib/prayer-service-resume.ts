import { fromEvent, type Subscription } from 'rxjs';
import type { PrayerRequest } from './prayer-types';

export const PRAYER_SERVICE_INACTIVITY_ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
] as const;

export const PRAYER_APP_BECAME_VISIBLE_EVENT = 'app-became-visible';

export const PRAYER_SERVICE_INACTIVITY_DETECTED_LOG =
  '[PrayerService] Inactivity detected, next activity will trigger refresh';

export function shouldSchedulePrayerResumeRefresh(): boolean {
  return !document.hidden;
}

export function isPrayerAppDocumentVisible(): boolean {
  return document.visibilityState === 'visible';
}

export function registerPrayerAppBecameVisibleListener(onVisible: () => void): void {
  window.addEventListener(PRAYER_APP_BECAME_VISIBLE_EVENT, () => {
    if (shouldSchedulePrayerResumeRefresh()) {
      onVisible();
    }
  });
}

export function scheduleDebouncedResumeRefresh(
  existingTimeoutId: ReturnType<typeof setTimeout> | null,
  debounceMs: number,
  onRun: () => void
): ReturnType<typeof setTimeout> {
  if (existingTimeoutId != null) {
    clearTimeout(existingTimeoutId);
  }
  return setTimeout(onRun, debounceMs);
}

export function clearTimeoutIdMap(timeouts: Map<string, number>): void {
  timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  timeouts.clear();
}

export function resetInactivityTimeout(
  existingTimeoutId: ReturnType<typeof setTimeout> | null | undefined,
  thresholdMs: number,
  onInactive: () => void
): ReturnType<typeof setTimeout> {
  if (existingTimeoutId != null) {
    clearTimeout(existingTimeoutId);
  }
  return setTimeout(onInactive, thresholdMs);
}

export function readNonEmptyPrayerCache(
  readCache: () => PrayerRequest[] | null | undefined
): PrayerRequest[] | null {
  try {
    const cached = readCache();
    if (cached && cached.length > 0) {
      return cached;
    }
  } catch {
    // Cache may throw (e.g. storage unavailable)
  }
  return null;
}

export type ResumeCommunityPrayerRefreshContext = {
  readCachedPrayers: () => PrayerRequest[] | null | undefined;
  onShowCachedPrayers: (prayers: PrayerRequest[]) => void;
  ensureConnected: () => Promise<void>;
  loadPrayersSilent: () => Promise<void>;
  reconnectRealtimeIfNeeded: () => void;
};

export async function runResumeCommunityPrayerRefresh(
  ctx: ResumeCommunityPrayerRefreshContext
): Promise<void> {
  try {
    console.log('[PrayerService] Resume refresh: ensuring connection then loading prayers');
    const cached = readNonEmptyPrayerCache(ctx.readCachedPrayers);
    if (cached) {
      ctx.onShowCachedPrayers(cached);
    }
    await ctx.ensureConnected();
    await ctx.loadPrayersSilent();
  } catch (err) {
    console.debug('[PrayerService] Resume refresh failed, keeping cached data visible:', err);
    const fallback = readNonEmptyPrayerCache(ctx.readCachedPrayers);
    if (fallback) {
      ctx.onShowCachedPrayers(fallback);
    }
  } finally {
    ctx.reconnectRealtimeIfNeeded();
  }
}

export type WirePrayerResumeListenersContext = {
  scheduleResumeRefresh: () => void;
  onEnterBackground: () => void;
  onLeaveBackground: () => void;
  inactivityThresholdMs: number;
  getInactivityTimeout: () => ReturnType<typeof setTimeout> | null;
  setInactivityTimeout: (id: ReturnType<typeof setTimeout> | null) => void;
  clearBackgroundRecoveryTimeouts: () => void;
};

/**
 * Single wiring point for focus, inactivity, visibility, and app-became-visible resume triggers.
 */
export function wirePrayerResumeListeners(
  ctx: WirePrayerResumeListenersContext
): Subscription[] {
  const subs: Subscription[] = [];

  subs.push(
    fromEvent(window, 'focus').subscribe(() => {
      if (shouldSchedulePrayerResumeRefresh()) {
        ctx.scheduleResumeRefresh();
      }
    })
  );

  const resetInactivityTimer = () => {
    ctx.setInactivityTimeout(
      resetInactivityTimeout(ctx.getInactivityTimeout(), ctx.inactivityThresholdMs, () => {
        console.log(PRAYER_SERVICE_INACTIVITY_DETECTED_LOG);
      })
    );
  };

  resetInactivityTimer();

  for (const event of PRAYER_SERVICE_INACTIVITY_ACTIVITY_EVENTS) {
    subs.push(fromEvent(document, event).subscribe(() => resetInactivityTimer()));
  }

  subs.push(
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (document.hidden) {
        ctx.onEnterBackground();
      } else {
        ctx.onLeaveBackground();
        if (shouldSchedulePrayerResumeRefresh()) {
          ctx.scheduleResumeRefresh();
        }
      }
    })
  );

  registerPrayerAppBecameVisibleListener(() => {
    console.log('[PrayerService] Received app-became-visible event, triggering recovery');
    ctx.onLeaveBackground();
  });

  return subs;
}

export function unsubscribePrayerResumeListeners(
  subscriptions: Subscription[]
): void {
  subscriptions.forEach((sub) => sub.unsubscribe());
}

export function mergePrayerResumeListenerSubscriptions(
  existing: Subscription[],
  added: Subscription[]
): Subscription[] {
  return [...existing, ...added];
}
