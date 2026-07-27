import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { firstValueFrom, of, BehaviorSubject } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import { PrayerEncouragementService } from './prayer-encouragement.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

describe('PrayerEncouragementService', () => {
  let service: PrayerEncouragementService;
  let mockSupabase: any;
  let mockUserSessionService: {
    getPersonalPrayerCooldownHours: ReturnType<typeof vi.fn>;
    isSessionInitialized: ReturnType<typeof vi.fn>;
    getCurrentSession: ReturnType<typeof vi.fn>;
    sessionInitialized$: ReturnType<typeof of>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockSupabase = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { prayer_encouragement_enabled: true, prayer_encouragement_cooldown_hours: 4 },
                error: null
              })
            })
          })
        })
      }
    };

    mockUserSessionService = {
      getPersonalPrayerCooldownHours: vi.fn().mockReturnValue(2),
      getPersonalPrayerCooldownHours$: vi.fn().mockReturnValue(of(2)),
      isSessionInitialized: vi.fn().mockReturnValue(true),
      getCurrentSession: vi.fn().mockReturnValue({ personalPrayerCooldownHours: 2 }),
      sessionInitialized$: new BehaviorSubject(true).asObservable()
    };

    service = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getCooldownKey', () => {
    it('returns key with prefix and prayer id', () => {
      expect(service.getCooldownKey('abc-123')).toBe('prayed_for_abc-123');
    });
  });

  describe('getPersonalCooldownKey', () => {
    it('returns personal prefix and prayer id', () => {
      expect(service.getPersonalCooldownKey('abc-123')).toBe('prayed_for_personal_abc-123');
    });
  });

  describe('canPrayFor', () => {
    it('returns true when no key in localStorage', () => {
      expect(service.canPrayFor('p1')).toBe(true);
    });

    it('returns false when key exists and is within 4h', () => {
      service.recordPrayedFor('p1');
      expect(service.canPrayFor('p1')).toBe(false);
    });

    it('returns true and removes key when cooldown expired', () => {
      const over4hAgo = new Date(Date.now() - (5 * 60 * 60 * 1000)).toISOString();
      localStorage.setItem('prayed_for_p1', over4hAgo);
      expect(service.canPrayFor('p1')).toBe(true);
      expect(localStorage.getItem('prayed_for_p1')).toBeNull();
    });

    it('returns true and removes key when value is invalid', () => {
      localStorage.setItem('prayed_for_p1', 'not-a-date');
      expect(service.canPrayFor('p1')).toBe(true);
      expect(localStorage.getItem('prayed_for_p1')).toBeNull();
    });

    it('returns true when localStorage throws', () => {
      const originalGetItem = localStorage.getItem.bind(localStorage);
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      expect(service.canPrayFor('p1')).toBe(true);
      localStorage.getItem = originalGetItem;
    });

    it('uses separate personal cooldown keys and duration', () => {
      service.recordPrayedFor('p-personal', true);
      expect(service.canPrayFor('p-personal', true)).toBe(false);
      expect(service.canPrayFor('p-personal', false)).toBe(true);

      const over2hAgo = new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString();
      localStorage.setItem('prayed_for_personal_p-personal', over2hAgo);
      expect(service.canPrayFor('p-personal', true)).toBe(true);
      expect(localStorage.getItem('prayed_for_personal_p-personal')).toBeNull();
    });

    it('blocks personal cooldown until the user cooldown setting is loaded', () => {
      mockUserSessionService.isSessionInitialized.mockReturnValue(false);
      mockUserSessionService.getCurrentSession.mockReturnValue({});
      const fiveHoursAgo = new Date(Date.now() - (5 * 60 * 60 * 1000)).toISOString();
      localStorage.setItem('prayed_for_personal_p1', fiveHoursAgo);
      expect(service.canPrayFor('p1', true)).toBe(false);
      expect(localStorage.getItem('prayed_for_personal_p1')).toBe(fiveHoursAgo);
    });
  });

  describe('getCanPrayFor$', () => {
    it('emits true after session cleanup removes an expired personal cooldown key', async () => {
      mockUserSessionService.getPersonalPrayerCooldownHours.mockReturnValue(2);
      mockUserSessionService.isSessionInitialized.mockReturnValue(true);
      mockUserSessionService.getCurrentSession.mockReturnValue({ personalPrayerCooldownHours: 2 });
      mockUserSessionService.getPersonalPrayerCooldownHours$ = vi
        .fn()
        .mockReturnValue(of(2));
      const over2hAgo = new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString();
      localStorage.setItem('prayed_for_personal_p1', over2hAgo);

      const s2 = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      const canPray = await firstValueFrom(s2.getCanPrayFor$('p1', true));

      expect(canPray).toBe(true);
      expect(localStorage.getItem('prayed_for_personal_p1')).toBeNull();
    });

    it('re-emits true when an active cooldown expires', async () => {
      vi.useFakeTimers();
      const almostExpired = new Date(
        Date.now() - (4 * 60 * 60 * 1000 - 50)
      ).toISOString();
      localStorage.setItem('prayed_for_p1', almostExpired);

      const values: boolean[] = [];
      const sub = service.getCanPrayFor$('p1').subscribe((value) => values.push(value));

      expect(values).toEqual([false]);
      await vi.advanceTimersByTimeAsync(100);
      expect(values).toEqual([false, true]);
      expect(localStorage.getItem('prayed_for_p1')).toBeNull();

      sub.unsubscribe();
      vi.useRealTimers();
    });
  });

  describe('clearPrayedForCooldown', () => {
    it('removes cooldown key and allows praying again', () => {
      service.recordPrayedFor('p4');
      expect(service.canPrayFor('p4')).toBe(false);
      service.clearPrayedForCooldown('p4');
      expect(service.canPrayFor('p4')).toBe(true);
      expect(localStorage.getItem('prayed_for_p4')).toBeNull();
    });
  });

  describe('recordPrayedFor', () => {
    it('sets localStorage key with ISO timestamp', () => {
      service.recordPrayedFor('p2');
      const raw = localStorage.getItem('prayed_for_p2');
      expect(raw).toBeTruthy();
      expect(new Date(raw!).getTime()).toBeLessThanOrEqual(Date.now());
      expect(service.canPrayFor('p2')).toBe(false);
    });

    it('catches when localStorage.setItem throws and does not throw', () => {
      const originalSetItem = localStorage.setItem.bind(localStorage);
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      service.recordPrayedFor('p3');
      expect(localStorage.getItem('prayed_for_p3')).toBeNull();
      localStorage.setItem = originalSetItem;
    });
  });

  describe('clearCooldownKeys', () => {
    it('removes all prayed_for_ keys from localStorage', () => {
      service.recordPrayedFor('a');
      service.recordPrayedFor('b');
      localStorage.setItem('other_key', 'value');
      service.clearCooldownKeys();
      expect(localStorage.getItem('prayed_for_a')).toBeNull();
      expect(localStorage.getItem('prayed_for_b')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('value');
    });

    it('does nothing when no prayed_for_ keys exist', () => {
      localStorage.setItem('other', 'x');
      service.clearCooldownKeys();
      expect(localStorage.getItem('other')).toBe('x');
    });
  });

  describe('getPrayerEncouragementEnabled$', () => {
    it('returns observable that emits after fetch', async () => {
      const value = await firstValueFrom(service.getPrayerEncouragementEnabled$());
      expect(typeof value).toBe('boolean');
    });

    it('fetches from admin_settings when subscribed', async () => {
      await firstValueFrom(service.getPrayerEncouragementEnabled$());
      expect(mockSupabase.client.from).toHaveBeenCalledWith('admin_settings');
    });
  });

  describe('getCooldownHours$', () => {
    it('emits cooldown hours from fetch (default 4 when not in response)', async () => {
      const hours = await firstValueFrom(service.getCooldownHours$());
      expect(hours).toBe(4);
    });

    it('emits cooldown hours from fetch when set in response', async () => {
      localStorage.removeItem('prayer_encouragement_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { prayer_encouragement_enabled: true, prayer_encouragement_cooldown_hours: 8 },
              error: null
            })
          })
        })
      });
      const newService = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      // Skip initial default (4), take value after fetch completes (8)
      const hours = await firstValueFrom(newService.getCooldownHours$().pipe(skip(1), take(1)));
      expect(hours).toBe(8);
    });
  });

  describe('fetchAndCacheFlag', () => {
    it('uses DEFAULT_COOLDOWN_HOURS when rawHours is out of range', async () => {
      localStorage.removeItem('prayer_encouragement_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { prayer_encouragement_enabled: true, prayer_encouragement_cooldown_hours: 0 },
              error: null
            })
          })
        })
      });
      const newService = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      const hours = await firstValueFrom(newService.getCooldownHours$().pipe(skip(1), take(1)));
      expect(hours).toBe(4);
    });

    it('uses DEFAULT_COOLDOWN_HOURS when rawHours is above 168', async () => {
      localStorage.removeItem('prayer_encouragement_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { prayer_encouragement_enabled: true, prayer_encouragement_cooldown_hours: 200 },
              error: null
            })
          })
        })
      });
      const newService = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      const hours = await firstValueFrom(newService.getCooldownHours$().pipe(skip(1), take(1)));
      expect(hours).toBe(4);
    });

    it('warns and returns when fetch returns error', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.removeItem('prayer_encouragement_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'db error' }
            })
          })
        })
      });
      const newService = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      newService.getCooldownHours$().subscribe(() => {});
      await Promise.resolve();
      await Promise.resolve();
      expect(warn).toHaveBeenCalledWith('[PrayerEncouragement] Failed to load flag', { message: 'db error' });
      warn.mockRestore();
    });

    it('warns when fetch throws', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.removeItem('prayer_encouragement_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('Network error'))
          })
        })
      });
      const newService = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      await firstValueFrom(newService.getCooldownHours$().pipe(take(1)));
      expect(warn).toHaveBeenCalledWith('[PrayerEncouragement] Error loading flag', expect.any(Error));
      warn.mockRestore();
    });

    it('continues when localStorage.setItem in fetch throws', async () => {
      localStorage.removeItem('prayer_encouragement_enabled');
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { prayer_encouragement_enabled: true, prayer_encouragement_cooldown_hours: 4 },
              error: null
            })
          })
        })
      });
      const newService = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      const hours = await firstValueFrom(newService.getCooldownHours$().pipe(skip(1), take(1)));
      expect(hours).toBe(4);
      setItem.mockRestore();
    });
  });

  describe('seedFromLocalStorage', () => {
    it('uses DEFAULT_COOLDOWN_HOURS when cached cooldownHours is out of range', () => {
      localStorage.setItem(
        'prayer_encouragement_enabled',
        JSON.stringify({ value: true, cooldownHours: 0, timestamp: Date.now() })
      );
      const newService = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      const hours = firstValueFrom(newService.getCooldownHours$());
      return hours.then((h) => expect(h).toBe(4));
    });

    it('does not update subjects when cache timestamp is expired', () => {
      const oneHourAgo = Date.now() - (2 * 60 * 60 * 1000);
      localStorage.setItem(
        'prayer_encouragement_enabled',
        JSON.stringify({ value: true, cooldownHours: 6, timestamp: oneHourAgo })
      );
      const newService = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      return firstValueFrom(newService.getCooldownHours$().pipe(skip(1), take(1))).then((h) => {
        expect(h).toBe(4);
      });
    });
  });

  describe('ensureLoaded', () => {
    it('does not refetch when already loaded', async () => {
      await firstValueFrom(service.getPrayerEncouragementEnabled$());
      const fromSpy = mockSupabase.client.from;
      fromSpy.mockClear();
      await firstValueFrom(service.getPrayerEncouragementEnabled$());
      expect(fromSpy).not.toHaveBeenCalled();
    });
  });

  describe('invalidateFlagCache', () => {
    it('removes flag from localStorage and triggers reload', async () => {
      localStorage.setItem(
        'prayer_encouragement_enabled',
        JSON.stringify({ value: true, cooldownHours: 4, timestamp: Date.now() })
      );
      service.invalidateFlagCache();
      expect(localStorage.getItem('prayer_encouragement_enabled')).toBeNull();
    });
  });

  describe('cleanExpiredCooldownKeys on init', () => {
    it('removes expired prayed_for_ keys after session is initialized', () => {
      const over4hAgo = new Date(Date.now() - (5 * 60 * 60 * 1000)).toISOString();
      localStorage.setItem('prayed_for_old', over4hAgo);
      const s2 = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      expect(localStorage.getItem('prayed_for_old')).toBeNull();
    });

    it('keeps personal cooldown keys that are still within the user setting', () => {
      mockUserSessionService.getPersonalPrayerCooldownHours.mockReturnValue(24);
      const fiveHoursAgo = new Date(Date.now() - (5 * 60 * 60 * 1000)).toISOString();
      localStorage.setItem('prayed_for_personal_p1', fiveHoursAgo);
      const s2 = new PrayerEncouragementService(mockSupabase, mockUserSessionService as unknown as UserSessionService);
      expect(localStorage.getItem('prayed_for_personal_p1')).toBe(fiveHoursAgo);
    });
  });
});
