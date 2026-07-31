import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemorizationReciteSettingsService } from './memorization-recite-settings.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

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
    const supabase = {
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
    };
    const userSession = {
      getCurrentSession: vi.fn(() => null),
    };

    service = new MemorizationReciteSettingsService(
      supabase as unknown as SupabaseService,
      userSession as unknown as UserSessionService
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
      } as unknown as SupabaseService,
      { getCurrentSession: vi.fn(() => null) } as unknown as UserSessionService
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
      } as unknown as SupabaseService,
      { getCurrentSession: vi.fn(() => null) } as unknown as UserSessionService
    );

    const settings = await freshService.getSettingsFromServer();
    expect(settings.enabled).toBe(true);
  });

  it('loadUsageSummary passes MFA admin email to RPC without session start', async () => {
    localStorage.setItem('mfa_authenticated_email', 'Admin@Example.com');
    rpc.mockResolvedValue({
      data: [{ attempt_count: 2, billable_audio_seconds: 30, estimated_cost_usd: 0.01 }],
      error: null,
    });

    const summary = await service.loadUsageSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-31T00:00:00.000Z')
    );

    expect(rpc).toHaveBeenCalledWith('get_memorization_recite_usage_summary', {
      p_start: '2026-07-01T00:00:00.000Z',
      p_end: '2026-07-31T00:00:00.000Z',
      p_email: 'admin@example.com',
    });
    expect(summary.attemptCount).toBe(2);
  });

  it('loadUsageSummary prefers MFA admin email over user session email', async () => {
    localStorage.setItem('mfa_authenticated_email', 'admin@example.com');
    const userSession = {
      getCurrentSession: vi.fn(() => ({ email: 'member@example.com', fullName: 'Member', isActive: true })),
    };
    const freshService = new MemorizationReciteSettingsService(
      {
        directQuery: vi.fn(),
        getSupabaseUrl: vi.fn(() => 'https://test.supabase.co'),
        getSupabaseKey: vi.fn(() => 'test-anon-key'),
        client: {
          from: vi.fn(),
          rpc,
          auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
          },
        },
      } as unknown as SupabaseService,
      userSession as unknown as UserSessionService
    );
    rpc.mockResolvedValue({
      data: [{ attempt_count: 0, billable_audio_seconds: 0, estimated_cost_usd: 0 }],
      error: null,
    });

    await freshService.loadUsageSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-31T00:00:00.000Z')
    );

    expect(rpc).toHaveBeenCalledWith('get_memorization_recite_usage_summary', {
      p_start: '2026-07-01T00:00:00.000Z',
      p_end: '2026-07-31T00:00:00.000Z',
      p_email: 'admin@example.com',
    });
  });

  it('fetchOpenAiOrgUsage includes user_email for MFA admin sessions', async () => {
    localStorage.setItem('mfa_authenticated_email', 'admin@example.com');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true,
        period_days: 30,
        total_usd: 1.25,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const usage = await service.fetchOpenAiOrgUsage();

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(calledUrl.searchParams.get('user_email')).toBe('admin@example.com');
    expect(calledUrl.searchParams.get('mfa_session_start')).toBeNull();
    expect(fetchMock.mock.calls[0]?.[1]?.headers?.Authorization).toBe('Bearer test-anon-key');
    expect(usage.configured).toBe(true);
    expect(usage.totalUsd).toBe(1.25);

    vi.unstubAllGlobals();
  });

  it('fetchOpenAiOrgUsage maps admin_key_required to adminKeyRequired', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ configured: false, admin_key_required: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const usage = await service.fetchOpenAiOrgUsage();

    expect(usage.configured).toBe(false);
    expect(usage.adminKeyRequired).toBe(true);

    vi.unstubAllGlobals();
  });

  it('fetchOpenAiOrgUsage maps api_key_id_required to apiKeyIdRequired', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ configured: false, api_key_id_required: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const usage = await service.fetchOpenAiOrgUsage();

    expect(usage.configured).toBe(false);
    expect(usage.apiKeyIdRequired).toBe(true);

    vi.unstubAllGlobals();
  });

  it('fetchOpenAiOrgUsage surfaces error from body even when HTTP status is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        configured: true,
        error: 'Could not load OpenAI API key usage',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const usage = await service.fetchOpenAiOrgUsage();

    expect(usage.configured).toBe(true);
    expect(usage.error).toBe('Could not load OpenAI API key usage');

    vi.unstubAllGlobals();
  });
});
