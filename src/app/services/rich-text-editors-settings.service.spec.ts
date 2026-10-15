import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';
import { firstValueFrom } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import { RichTextEditorsSettingsService } from './rich-text-editors-settings.service';

describe('RichTextEditorsSettingsService', () => {
  let service: RichTextEditorsSettingsService;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockSupabase = wireGatedSupabaseMock({
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { rich_text_editors_enabled: true },
                error: null,
              }),
            }),
          }),
        }),
      },
    });

    service = new RichTextEditorsSettingsService(mockSupabase);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getRichTextEditorsEnabled$', () => {
    it('emits boolean after fetch', async () => {
      const value = await firstValueFrom(service.getRichTextEditorsEnabled$());
      expect(typeof value).toBe('boolean');
      expect(value).toBe(true);
    });

    it('fetches from admin_settings when subscribed', async () => {
      await firstValueFrom(service.getRichTextEditorsEnabled$());
      expect(mockSupabase.client.from).toHaveBeenCalledWith('admin_settings');
    });

    it('emits false when column is false', async () => {
      localStorage.removeItem('rich_text_editors_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { rich_text_editors_enabled: false },
              error: null,
            }),
          }),
        }),
      });
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      const value = await firstValueFrom(
        newService.getRichTextEditorsEnabled$().pipe(skip(1), take(1))
      );
      expect(value).toBe(false);
    });

    it('treats missing row as enabled', async () => {
      localStorage.removeItem('rich_text_editors_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      const value = await firstValueFrom(
        newService.getRichTextEditorsEnabled$().pipe(skip(1), take(1))
      );
      expect(value).toBe(true);
    });
  });

  describe('getSnapshot', () => {
    it('returns current BehaviorSubject value', () => {
      expect(service.getSnapshot()).toBe(true);
    });
  });

  describe('ensureLoaded', () => {
    it('does not refetch when already loaded', async () => {
      await firstValueFrom(service.getRichTextEditorsEnabled$());
      const fromSpy = mockSupabase.client.from;
      fromSpy.mockClear();
      await firstValueFrom(service.getRichTextEditorsEnabled$());
      expect(fromSpy).not.toHaveBeenCalled();
    });
  });

  describe('invalidateFlagCache', () => {
    it('removes flag from localStorage', () => {
      localStorage.setItem(
        'rich_text_editors_enabled',
        JSON.stringify({ value: true, timestamp: Date.now() })
      );
      service.invalidateFlagCache();
      expect(localStorage.getItem('rich_text_editors_enabled')).toBeNull();
    });
  });

  describe('fetch errors', () => {
    it('warns when fetch returns error', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.removeItem('rich_text_editors_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'db error' },
            }),
          }),
        }),
      });
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      newService.getRichTextEditorsEnabled$().subscribe(() => {});
      await Promise.resolve();
      await Promise.resolve();
      expect(warn).toHaveBeenCalledWith(
        '[RichTextEditorsSettings] Failed to load flag',
        { message: 'db error' }
      );
      warn.mockRestore();
    });

    it('warns when fetch throws', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.removeItem('rich_text_editors_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      });
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      newService.getRichTextEditorsEnabled$().subscribe();
      await vi.waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          '[RichTextEditorsSettings] Error loading flag',
          expect.any(Error)
        )
      );
      warn.mockRestore();
    });
  });

  describe('seedFromLocalStorage', () => {
    it('uses cached value when within TTL', () => {
      localStorage.setItem(
        'rich_text_editors_enabled',
        JSON.stringify({ value: false, timestamp: Date.now() })
      );
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      expect(newService.getSnapshot()).toBe(false);
    });

    it('does not apply cache when timestamp is expired', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      localStorage.setItem(
        'rich_text_editors_enabled',
        JSON.stringify({ value: false, timestamp: twoHoursAgo })
      );
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      expect(newService.getSnapshot()).toBe(true);
    });

    it('ignores cache when JSON shape is invalid (non-boolean value)', () => {
      localStorage.setItem(
        'rich_text_editors_enabled',
        JSON.stringify({ value: 'true', timestamp: Date.now() })
      );
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      expect(newService.getSnapshot()).toBe(true);
    });

    it('ignores cache when JSON shape is invalid (non-number timestamp)', () => {
      localStorage.setItem(
        'rich_text_editors_enabled',
        JSON.stringify({ value: true, timestamp: '2024-01-01' })
      );
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      expect(newService.getSnapshot()).toBe(true);
    });

    it('swallows invalid JSON in localStorage', () => {
      localStorage.setItem('rich_text_editors_enabled', 'not-json');
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      expect(newService.getSnapshot()).toBe(true);
    });
  });

  describe('ensureLoaded', () => {
    it('does not start a second fetch while the first is in flight', () => {
      let resolveFetch: (v: { data: unknown; error: null }) => void;
      const pending = new Promise<{ data: unknown; error: null }>(resolve => {
        resolveFetch = resolve;
      });
      localStorage.removeItem('rich_text_editors_enabled');
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockReturnValue(pending),
          }),
        }),
      });
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      newService.getRichTextEditorsEnabled$().subscribe();
      newService.getRichTextEditorsEnabled$().subscribe();
      expect(mockSupabase.db).toHaveBeenCalledTimes(1);
      resolveFetch!({ data: { rich_text_editors_enabled: true }, error: null });
    });
  });

  describe('invalidateFlagCache', () => {
    it('still triggers ensureLoaded when removeItem throws', () => {
      const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      expect(() => service.invalidateFlagCache()).not.toThrow();
      removeItem.mockRestore();
    });
  });

  describe('fetchAndCacheFlag persistence', () => {
    it('continues when localStorage.setItem throws after successful fetch', async () => {
      localStorage.removeItem('rich_text_editors_enabled');
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      const newService = new RichTextEditorsSettingsService(mockSupabase);
      const value = await firstValueFrom(
        newService.getRichTextEditorsEnabled$().pipe(skip(1), take(1))
      );
      expect(value).toBe(true);
      setItem.mockRestore();
    });
  });
});
