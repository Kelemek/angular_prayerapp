import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';
import { SupabaseDataAccessGateService } from './supabase-data-access-gate.service';

describe('SupabaseDataAccessGateService', () => {
  let service: SupabaseDataAccessGateService;
  let mockSupabase: { client: { auth: { getSession: ReturnType<typeof vi.fn> } } };

  beforeEach(() => {
    mockSupabase = wireGatedSupabaseMock({
      client: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
        },
      },
    });
    service = new SupabaseDataAccessGateService(mockSupabase as never);
  });

  it('is ready when logged out without a JWT', async () => {
    await service.syncAuthenticated(false);
    expect(service.isReady).toBe(true);
  });

  it('is not ready when signed in without a JWT', async () => {
    await service.syncAuthenticated(true);
    expect(service.isReady).toBe(false);
  });

  it('is ready when signed in with a JWT email on the session', async () => {
    mockSupabase.client.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { email: 'user@example.com' },
          access_token: 'jwt',
        },
      },
      error: null,
    });
    await service.syncAuthenticated(true);
    expect(service.isReady).toBe(true);
  });

  it('waitForReady resolves immediately when already ready', async () => {
    await service.syncAuthenticated(false);
    await expect(service.waitForReady()).resolves.toBeUndefined();
  });

  it('registerTimeoutHandler stores the handler for waitForReady', () => {
    const onTimeout = vi.fn();
    service.registerTimeoutHandler(onTimeout);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('ready$ emits after refresh', async () => {
    await service.syncAuthenticated(false);
    const ready = await firstValueFrom(service.ready$);
    expect(ready).toBe(true);
  });

  it('bindAuthenticatedStream refreshes when auth flips', async () => {
    const auth$ = new BehaviorSubject(false);
    service.bindAuthenticatedStream(auth$);
    await vi.waitFor(() => expect(service.isReady).toBe(true));
    auth$.next(true);
    await vi.waitFor(() => expect(service.isReady).toBe(false));
  });
});
