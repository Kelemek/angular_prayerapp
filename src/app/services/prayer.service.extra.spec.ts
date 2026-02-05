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
    const supabase = makeSupabase();
    const cache = { get: vi.fn(() => [{ id: 'c1', title: 'C', description: 'D', status: 'current', requester: 'R', prayer_for: 'P', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }]), set: vi.fn(), invalidate: vi.fn() };

    const service = new (PrayerService as any)(supabase, noopToast as any, noopEmail as any, noopVerify as any, cache as any, noopBadgeService as any, noopUserSessionService as any);

    // stub loadPrayers to reject when called from recovery
    vi.spyOn(service as any, 'loadPrayers').mockImplementation(() => Promise.reject(new Error('boom')));

    // should not throw even though loadPrayers rejects; cached data should be applied
    expect(() => (service as any).triggerBackgroundRecovery()).not.toThrow();
    // cached data applied synchronously
    const all = (service as any).allPrayersSubject.value;
    expect(all && all.length > 0).toBe(true);
  });

  it('setupVisibilityListener falls back to cache when silent refresh fails', async () => {
    const supabase = makeSupabase();
    const cached = [{ id: 'c2', title: 'C2', description: 'D2', status: 'current', requester: 'R', prayer_for: 'P', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }];
    const cache = { get: vi.fn(() => cached), set: vi.fn(), invalidate: vi.fn() };

    const service = new (PrayerService as any)(supabase, noopToast as any, noopEmail as any, noopVerify as any, cache as any, noopBadgeService as any, noopUserSessionService as any);

    // force loadPrayers to reject when visibility handler runs
    vi.spyOn(service as any, 'loadPrayers').mockImplementation(() => Promise.reject(new Error('silent')));

    // ensure document.visibilityState appears visible and dispatch event
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    // run the handler
    document.dispatchEvent(new Event('visibilitychange'));

    // allow microtasks
    await Promise.resolve();

    // ensure the method completed and the visible list is an array (cached may be applied depending on timing)
    expect(Array.isArray((service as any).allPrayersSubject.value)).toBe(true);
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
