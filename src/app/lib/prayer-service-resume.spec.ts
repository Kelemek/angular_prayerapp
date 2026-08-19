import { describe, expect, it, vi } from 'vitest';
import {
  clearTimeoutIdMap,
  readNonEmptyPrayerCache,
  resetInactivityTimeout,
  scheduleDebouncedResumeRefresh,
  unsubscribePrayerResumeListeners,
  wirePrayerResumeListeners,
} from './prayer-service-resume';

describe('prayer-service-resume', () => {
  it('scheduleDebouncedResumeRefresh clears prior timeout', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();

    const t1 = scheduleDebouncedResumeRefresh(null, 400, first);
    const t2 = scheduleDebouncedResumeRefresh(t1, 400, second);

    vi.advanceTimersByTime(400);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('readNonEmptyPrayerCache returns null for empty or throwing reads', () => {
    expect(readNonEmptyPrayerCache(() => [])).toBeNull();
    expect(readNonEmptyPrayerCache(() => [{ id: 'p1' } as never])).toEqual([{ id: 'p1' }]);
    expect(readNonEmptyPrayerCache(() => { throw new Error('fail'); })).toBeNull();
  });

  it('clearTimeoutIdMap clears every entry', () => {
    vi.useFakeTimers();
    const map = new Map<string, number>();
    map.set('a', setTimeout(() => {}, 1000) as unknown as number);
    map.set('b', setTimeout(() => {}, 1000) as unknown as number);
    clearTimeoutIdMap(map);
    expect(map.size).toBe(0);
    vi.useRealTimers();
  });

  it('resetInactivityTimeout replaces existing timer', () => {
    vi.useFakeTimers();
    const onInactive = vi.fn();
    const first = resetInactivityTimeout(null, 50, onInactive);
    resetInactivityTimeout(first, 50, onInactive);
    vi.advanceTimersByTime(50);
    expect(onInactive).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('wirePrayerResumeListeners schedules resume on focus when visible', () => {
    const schedule = vi.fn();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });

    wirePrayerResumeListeners({
      scheduleResumeRefresh: schedule,
      onEnterBackground: vi.fn(),
      onLeaveBackground: vi.fn(),
      inactivityThresholdMs: 1000,
      getInactivityTimeout: () => null,
      setInactivityTimeout: vi.fn(),
      clearBackgroundRecoveryTimeouts: vi.fn(),
    });

    window.dispatchEvent(new Event('focus'));
    expect(schedule).toHaveBeenCalled();
  });

  it('unsubscribePrayerResumeListeners unsubscribes all subscriptions', () => {
    const sub = { unsubscribe: vi.fn() };
    unsubscribePrayerResumeListeners([sub as never]);
    expect(sub.unsubscribe).toHaveBeenCalled();
  });
});
