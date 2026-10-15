import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockSupabase: any;
  let mockUserSession: any;
  let mockCapacitor: any;
  let pushTokenCallback: (t: any) => void;
  let sessionCallback: (s: any) => void;

  beforeEach(() => {
    mockSupabase = wireGatedSupabaseMock({
      client: {
        from: vi.fn(),
        functions: { invoke: vi.fn() },
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      },
    });
    mockUserSession = {
      getCurrentSession: vi.fn().mockReturnValue(null),
      userSession$: {
        subscribe: vi.fn((fn: (s: any) => void) => {
          sessionCallback = fn;
          fn(null);
          return { unsubscribe: vi.fn() };
        }),
      },
    };
    mockCapacitor = {
      pushToken$: {
        subscribe: vi.fn((fn: (t: any) => void) => {
          pushTokenCallback = fn;
          fn(null);
          return { unsubscribe: vi.fn() };
        }),
      },
      isNative: vi.fn().mockReturnValue(false),
      getPushToken: vi.fn().mockReturnValue(null),
    };

    service = new PushNotificationService(
      mockSupabase as any,
      mockUserSession as any,
      mockCapacitor as any
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('sendPushToAdmins', () => {
    it('queries email_subscribers with is_admin and receive_admin_push and invokes edge function', async () => {
      const admins = [{ email: 'admin1@test.com' }, { email: 'admin2@test.com' }];
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: admins, error: null }),
        }),
      });
      mockSupabase.client.from = vi.fn().mockReturnValue({ select: selectMock });
      mockSupabase.client.functions.invoke = vi.fn().mockResolvedValue({ error: null });

      await service.sendPushToAdmins({
        title: 'Admin alert',
        body: 'Test body',
        data: { type: 'prayer' },
      });

      expect(mockSupabase.client.from).toHaveBeenCalledWith('email_subscribers');
      expect(selectMock).toHaveBeenCalledWith('email');
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalledWith(
        'send-push-notification',
        {
          body: {
            emails: ['admin1@test.com', 'admin2@test.com'],
            title: 'Admin alert',
            body: 'Test body',
            data: { type: 'prayer', target: 'admin' },
          },
        }
      );
    });

    it('does not invoke edge function when no admins have receive_admin_push', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      });

      await service.sendPushToAdmins({ title: 'Alert', body: 'Body' });

      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('sendPushToEmails', () => {
    it('queries email_subscribers with in(), is_blocked and receive_push, invokes edge function with allowed emails', async () => {
      const rows = [{ email: 'user1@test.com' }];
      const selectMock = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      });
      mockSupabase.client.from = vi.fn().mockReturnValue({ select: selectMock });
      mockSupabase.client.functions.invoke = vi.fn().mockResolvedValue({ error: null });

      await service.sendPushToEmails(
        ['user1@test.com', 'user2@test.com'],
        { title: 'Prayer approved', body: 'Your prayer was approved', data: { type: 'prayer_approved', prayerId: '1' } }
      );

      expect(mockSupabase.client.from).toHaveBeenCalledWith('email_subscribers');
      expect(selectMock).toHaveBeenCalledWith('email');
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalledWith(
        'send-push-notification',
        {
          body: {
            emails: ['user1@test.com'],
            title: 'Prayer approved',
            body: 'Your prayer was approved',
            data: { type: 'prayer_approved', prayerId: '1' },
          },
        }
      );
    });

    it('does not invoke when emails array is empty', async () => {
      await service.sendPushToEmails([], { title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });

    it('does not invoke when no subscribers have receive_push for given emails', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: () => ({
          in: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      });
      await service.sendPushToEmails(['nopush@test.com'], { title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });

    it('returns early on fetchError and does not invoke', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: () => ({
          in: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: null, error: { message: 'db error' } }),
            }),
          }),
        }),
      });
      await service.sendPushToEmails(['a@test.com'], { title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });

    it('logs and does not throw when invoke returns error', async () => {
      const selectMock = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ email: 'u@test.com' }], error: null }),
          }),
        }),
      });
      mockSupabase.client.from = vi.fn().mockReturnValue({ select: selectMock });
      mockSupabase.client.functions.invoke = vi.fn().mockResolvedValue({ error: new Error('invoke failed') });
      await service.sendPushToEmails(['u@test.com'], { title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('catches and logs when sendPushToEmails throws', async () => {
      mockSupabase.client.from = vi.fn().mockImplementation(() => {
        throw new Error('connection lost');
      });
      await service.sendPushToEmails(['a@test.com'], { title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('setupDeviceTokenHandling', () => {
    it('calls storeDeviceToken when pushToken$ emits a token and isNative is true', async () => {
      mockCapacitor.isNative.mockReturnValue(true);
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'user@test.com' });
      const token = { token: 'dev-token-1', platform: 'android' as const };
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return { select: selectMock, insert: vi.fn().mockReturnValue(Promise.resolve({ error: null })) };
        }
        if (table === 'email_subscribers') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        return {};
      });
      const svc = new PushNotificationService(
        mockSupabase as any,
        mockUserSession as any,
        mockCapacitor as any
      );
      pushTokenCallback(token);
      await new Promise((r) => setTimeout(r, 0));
      expect(mockSupabase.client.from).toHaveBeenCalledWith('device_tokens');
      expect(mockSupabase.client.from).toHaveBeenCalledWith('email_subscribers');
    });
  });

  describe('setupSessionChangeHandling', () => {
    it('calls storeDeviceToken when session has email and getPushToken returns token', async () => {
      mockCapacitor.isNative.mockReturnValue(true);
      mockCapacitor.getPushToken.mockReturnValue({ token: 'tok', platform: 'ios' });
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'session@test.com' });
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'email_subscribers') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        return {};
      });
      const svc = new PushNotificationService(
        mockSupabase as any,
        mockUserSession as any,
        mockCapacitor as any
      );
      sessionCallback({ email: 'session@test.com' });
      await new Promise((r) => setTimeout(r, 0));
      expect(mockSupabase.client.from).toHaveBeenCalledWith('device_tokens');
    });
  });

  describe('storeDeviceToken', () => {
    const token = { token: 't1', platform: 'android' as const };

    it('returns early when no user email from any source', async () => {
      mockUserSession.getCurrentSession.mockReturnValue(null);
      mockSupabase.client.auth.getSession.mockResolvedValue({ data: { session: { user: { email: null } } } });
      await service.storeDeviceToken(token);
      expect(mockSupabase.client.from).not.toHaveBeenCalled();
    });

    it('uses getCurrentSession email when available', async () => {
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'current@test.com' });
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      });
      await service.storeDeviceToken(token);
      expect(mockSupabase.client.from).toHaveBeenCalledWith('device_tokens');
    });

    it('uses localStorage prayerapp_user_email when session has no email', async () => {
      localStorage.setItem('prayerapp_user_email', 'stored@test.com');
      mockUserSession.getCurrentSession.mockReturnValue(null);
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      });
      await service.storeDeviceToken(token);
      expect(mockSupabase.client.from).toHaveBeenCalledWith('device_tokens');
    });

    it('returns early when fetchError and code is not PGRST116', async () => {
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'u@test.com' });
      mockSupabase.client.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'err' } }),
            }),
          }),
        }),
      }));
      await service.storeDeviceToken(token);
      expect(mockSupabase.client.from).toHaveBeenCalledWith('device_tokens');
    });

    it('updates existing token and calls setReceivePushForEmail on success', async () => {
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'u@test.com' });
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const updateChain = vi.fn().mockReturnValue({ eq: updateEq });
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-id' }, error: null }),
                }),
              }),
            }),
            update: updateChain,
          };
        }
        return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      });
      await service.storeDeviceToken(token);
      expect(updateChain).toHaveBeenCalledWith(expect.objectContaining({ last_seen_at: expect.any(String) }));
      expect(updateEq).toHaveBeenCalledWith('id', 'existing-id');
    });

    it('does not call setReceivePushForEmail when update fails', async () => {
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'u@test.com' });
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'id' }, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'update failed' } }) }),
          };
        }
        return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      });
      await service.storeDeviceToken(token);
      const fromCalls = mockSupabase.client.from.mock.calls.map((c: string[]) => c[0]);
      expect(fromCalls).toContain('device_tokens');
    });

    it('inserts new token and calls setReceivePushForEmail on success', async () => {
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'newuser@test.com' });
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: insertMock,
          };
        }
        return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      });
      await service.storeDeviceToken(token);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_email: 'newuser@test.com',
          token: 't1',
          platform: 'android',
        })
      );
    });

    it('handles insert error without throwing', async () => {
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'u@test.com' });
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: { message: 'insert failed' } }),
          };
        }
        return {};
      });
      await service.storeDeviceToken(token);
      expect(mockSupabase.client.from).toHaveBeenCalledWith('device_tokens');
    });

    it('uses auth.getSession email when session and localStorage are empty', async () => {
      mockUserSession.getCurrentSession.mockReturnValue(null);
      mockSupabase.client.auth.getSession.mockResolvedValue({
        data: { session: { user: { email: 'auth@test.com' } } },
      });
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      });
      await service.storeDeviceToken(token);
      expect(mockSupabase.client.from).toHaveBeenCalledWith('device_tokens');
    });

    it('catches and logs when storeDeviceToken throws', async () => {
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'u@test.com' });
      mockSupabase.client.from = vi.fn(() => {
        throw new Error('unexpected db error');
      });
      await service.storeDeviceToken(token);
      expect(mockSupabase.client.from).toHaveBeenCalled();
    });

    it('logs warn when setReceivePushForEmail (email_subscribers update) fails', async () => {
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'u@test.com' });
      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'device_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'email_subscribers') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: 'constraint violation' } }),
            }),
          };
        }
        return {};
      });
      await service.storeDeviceToken(token);
      expect(mockSupabase.client.from).toHaveBeenCalledWith('email_subscribers');
    });
  });

  describe('getDeviceTokensForUser', () => {
    it('returns tokens when fetch succeeds', async () => {
      const data = [{ token: 't1', platform: 'android' }];
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data, error: null }),
        }),
      });
      const result = await service.getDeviceTokensForUser('user@test.com');
      expect(result).toEqual(data);
    });

    it('returns empty array on fetch error', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error('fetch failed') }),
        }),
      });
      const result = await service.getDeviceTokensForUser('user@test.com');
      expect(result).toEqual([]);
    });

    it('returns empty array when catch throws', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('network error')),
        }),
      });
      const result = await service.getDeviceTokensForUser('user@test.com');
      expect(result).toEqual([]);
    });
  });

  describe('cleanupOldTokens', () => {
    it('returns count of deleted tokens on success', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null }),
          }),
        }),
      });
      const result = await service.cleanupOldTokens();
      expect(result).toBe(2);
    });

    it('returns 0 on delete error', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: null, error: new Error('delete failed') }),
          }),
        }),
      });
      const result = await service.cleanupOldTokens();
      expect(result).toBe(0);
    });

    it('returns 0 when data is not array', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      const result = await service.cleanupOldTokens();
      expect(result).toBe(0);
    });

    it('returns 0 when catch throws', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockRejectedValue(new Error('err')),
          }),
        }),
      });
      const result = await service.cleanupOldTokens();
      expect(result).toBe(0);
    });
  });

  describe('sendPushToSubscribers', () => {
    it('fetches subscribers and invokes edge function with emails', async () => {
      const subscribers = [{ email: 's1@test.com' }, { email: 's2@test.com' }];
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: subscribers, error: null }),
        }),
      });
      mockSupabase.client.from = vi.fn().mockReturnValue({ select: selectMock });
      mockSupabase.client.functions.invoke = vi.fn().mockResolvedValue({ error: null });
      await service.sendPushToSubscribers({ title: 'Hi', body: 'Body', data: { key: 'v' } });
      expect(mockSupabase.client.from).toHaveBeenCalledWith('email_subscribers');
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalledWith('send-push-notification', {
        body: { emails: ['s1@test.com', 's2@test.com'], title: 'Hi', body: 'Body', data: { key: 'v' } },
      });
    });

    it('returns early when fetchError', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: new Error('fetch error') }),
          }),
        }),
      });
      await service.sendPushToSubscribers({ title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });

    it('returns early when no subscribers', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });
      await service.sendPushToSubscribers({ title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });

    it('does not throw when invoke returns error', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ email: 'a@test.com' }], error: null }),
          }),
        }),
      });
      mockSupabase.client.functions.invoke = vi.fn().mockResolvedValue({ error: new Error('invoke err') });
      await service.sendPushToSubscribers({ title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('catches and logs when catch block runs', async () => {
      mockSupabase.client.from = vi.fn().mockImplementation(() => {
        throw new Error('boom');
      });
      await service.sendPushToSubscribers({ title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('sendPushToAdmins', () => {
    it('does not invoke when fetchError', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: new Error('err') }),
          }),
        }),
      });
      await service.sendPushToAdmins({ title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });

    it('does not throw when invoke returns error', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ email: 'admin@test.com' }], error: null }),
          }),
        }),
      });
      mockSupabase.client.functions.invoke = vi.fn().mockResolvedValue({ error: new Error('invoke failed') });
      await service.sendPushToAdmins({ title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('catches and logs when catch block runs', async () => {
      mockSupabase.client.from = vi.fn().mockImplementation(() => {
        throw new Error('boom');
      });
      await service.sendPushToAdmins({ title: 'T', body: 'B' });
      expect(mockSupabase.client.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('removeDeviceToken', () => {
    it('returns early when no push token', async () => {
      mockCapacitor.getPushToken.mockReturnValue(null);
      await service.removeDeviceToken();
      expect(mockSupabase.client.from).not.toHaveBeenCalled();
    });

    it('deletes token and logs on success', async () => {
      mockCapacitor.getPushToken.mockReturnValue({ token: 'dev-tok', platform: 'android' });
      const deleteEq = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.client.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: deleteEq }),
      });
      await service.removeDeviceToken();
      expect(mockSupabase.client.from).toHaveBeenCalledWith('device_tokens');
      expect(deleteEq).toHaveBeenCalledWith('token', 'dev-tok');
    });

    it('logs error when delete fails', async () => {
      mockCapacitor.getPushToken.mockReturnValue({ token: 'dev-tok', platform: 'ios' });
      mockSupabase.client.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('delete failed') }),
        }),
      });
      await service.removeDeviceToken();
      expect(mockSupabase.client.from).toHaveBeenCalledWith('device_tokens');
    });

    it('catches and logs when catch throws', async () => {
      mockCapacitor.getPushToken.mockReturnValue({ token: 't', platform: 'android' });
      mockSupabase.client.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('network error')),
        }),
      });
      await service.removeDeviceToken();
      expect(mockSupabase.client.from).toHaveBeenCalled();
    });
  });
});
