import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';
import { MemorizationReciteSettingsService } from './memorization-recite-settings.service';
import { SupabaseService } from './supabase.service';

describe('MemorizationReciteSettingsService', () => {
  let service: MemorizationReciteSettingsService;
  let directQuery: ReturnType<typeof vi.fn>;
  let maybeSingle: ReturnType<typeof vi.fn>;
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    directQuery = vi.fn();
    maybeSingle = vi.fn();
    rpc = vi.fn();
    const supabase = wireGatedSupabaseMock({
      directQuery,
      getSupabaseUrl: vi.fn(() => 'https://test.supabase.co'),
      getSupabaseKey: vi.fn(() => 'test-anon-key'),
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle,
            })),
          })),
        })),
        rpc,
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      },
    });

    service = new MemorizationReciteSettingsService(
      supabase as unknown as SupabaseService
    );
  });

  it('getSettingsFromServer refetches even after getSettings cached disabled', async () => {
    directQuery.mockResolvedValueOnce({
      data: [{ memorization_recite_enabled: false }],
      error: null,
    });
    await service.getSettings();
    expect((await service.getSettings()).enabled).toBe(false);

    directQuery.mockResolvedValueOnce({
      data: [{ memorization_recite_enabled: true }],
      error: null,
    });
    const fresh = await service.getSettingsFromServer();
    expect(fresh.enabled).toBe(true);
    expect(directQuery).toHaveBeenCalledTimes(2);
  });

  it('clears stale localStorage enabled=true when server fetch fails', async () => {
    localStorage.setItem(
      'memorization_recite_enabled',
      JSON.stringify({ value: true, timestamp: Date.now() })
    );
    directQuery.mockResolvedValue({ data: null, error: new Error('network') });
    maybeSingle.mockResolvedValue({ data: null, error: new Error('network') });

    const freshService = new MemorizationReciteSettingsService(
      {
        directQuery,
        getSupabaseUrl: vi.fn(() => 'https://test.supabase.co'),
        client: {
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle,
              })),
            })),
          })),
        },
      } as unknown as SupabaseService
    );

    const settings = await freshService.getSettingsFromServer();

    expect(settings.enabled).toBe(false);
    expect(localStorage.getItem('memorization_recite_enabled')).toBeNull();
  });

  it('ignores stale localStorage disabled=false and uses server enabled=true', async () => {
    localStorage.setItem(
      'memorization_recite_enabled',
      JSON.stringify({ value: false, timestamp: Date.now() })
    );
    directQuery.mockResolvedValue({
      data: [{ memorization_recite_enabled: true }],
      error: null,
    });

    const freshService = new MemorizationReciteSettingsService(
      {
        directQuery,
        getSupabaseUrl: vi.fn(() => 'https://test.supabase.co'),
        client: { from: vi.fn() },
      } as unknown as SupabaseService
    );

    const settings = await freshService.getSettingsFromServer();
    expect(settings.enabled).toBe(true);
  });
});
