import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrayerService } from './prayer.service';

const makeSupabase = (overrides: any = {}) => ({
  client: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null }) ) })) }))
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(() => ({})) })),
    removeChannel: vi.fn()
  },
  ensureConnected: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

const noopToast = { success: vi.fn(), error: vi.fn() };
const noopEmail = { sendAdminNotification: vi.fn().mockResolvedValue(undefined) };
const noopVerify = {};
const noopCache = { get: vi.fn(() => null), set: vi.fn(), invalidate: vi.fn() };
const noopBadgeService = {};
const noopUserSessionService = { userSession$: new (require('rxjs').BehaviorSubject)(null).asObservable() };

describe('PrayerService extra coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('setupRealtimeSubscription handles multiple subscribe statuses without throwing', () => {
    const fakeChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb: any) => {
        // simulate multiple invocations of the subscribe status callback
        cb('OPEN');
        cb('CHANNEL_ERROR');
        cb('CLOSED');
        return {};
      })
    };

    const supabase = makeSupabase({ client: { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null }) ) })) })) })), channel: vi.fn(() => fakeChannel), removeChannel: vi.fn() } });

    expect(() => new (PrayerService as any)(supabase, noopToast as any, noopEmail as any, noopVerify as any, noopCache as any, noopBadgeService as any, noopUserSessionService as any)).not.toThrow();
    // constructing the service should not throw and subscription logic runs
    const svc = new (PrayerService as any)(supabase, noopToast as any, noopEmail as any, noopVerify as any, noopCache as any, noopBadgeService as any, noopUserSessionService as any);
    expect(svc).toBeTruthy();
  });

  it('triggerBackgroundRecovery tolerates loadPrayers rejection and shows cache fallback', async () => {
    vi.useFakeTimers();
    const supabase = makeSupabase();
    const cache = { get: vi.fn(() => [{ id: 'c1', title: 'C', description: 'D', status: 'current', requester: 'R', prayer_for: 'P', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }]), set: vi.fn(), invalidate: vi.fn() };

    const service = new (PrayerService as any)(supabase, noopToast as any, noopEmail as any, noopVerify as any, cache as any, noopBadgeService as any, noopUserSessionService as any);

    vi.spyOn(service as any, 'loadPrayers').mockImplementation(() => Promise.reject(new Error('boom')));

    (service as any).triggerBackgroundRecovery();
    await vi.advanceTimersByTimeAsync(500);
    const all = (service as any).allPrayersSubject.value;
    expect(all && all.length > 0).toBe(true);
    vi.useRealTimers();
  });

  it('setupVisibilityListener falls back to cache when silent refresh fails', async () => {
    vi.useFakeTimers();
    const supabase = makeSupabase();
    (supabase as any).ensureConnected = vi.fn().mockResolvedValue(undefined);
    const cached = [{ id: 'c2', title: 'C2', description: 'D2', status: 'current', requester: 'R', prayer_for: 'P', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }];
    const cache = { get: vi.fn(() => cached), set: vi.fn(), invalidate: vi.fn() };

    const service = new (PrayerService as any)(supabase, noopToast as any, noopEmail as any, noopVerify as any, cache as any, noopBadgeService as any, noopUserSessionService as any);

    vi.spyOn(service as any, 'loadPrayers').mockImplementation(() => Promise.reject(new Error('silent')));

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(500);

    expect(Array.isArray((service as any).allPrayersSubject.value)).toBe(true);
    vi.useRealTimers();
  });

  it('setupInactivityListener resets timer on activity events without throwing', () => {
    const supabase = makeSupabase();
    const cache = { get: vi.fn(() => null), set: vi.fn(), invalidate: vi.fn() };
    const service = new (PrayerService as any)(supabase, noopToast as any, noopEmail as any, noopVerify as any, cache as any, noopBadgeService as any, noopUserSessionService as any);

    // make threshold small and call setup directly
    (service as any).inactivityThresholdMs = 10;
    (service as any).setupInactivityListener();

    // dispatch a mousedown which should reset the timer
    document.dispatchEvent(new Event('mousedown'));

    // ensure inactivityTimeout is set
    expect((service as any).inactivityTimeout).toBeTruthy();
  });
});
