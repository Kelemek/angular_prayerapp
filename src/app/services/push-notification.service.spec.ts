import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockSupabase: any;
  let mockUserSession: any;
  let mockCapacitor: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: vi.fn(),
        functions: { invoke: vi.fn() },
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      },
    };
    mockUserSession = {
      getCurrentSession: vi.fn().mockReturnValue(null),
      userSession$: { subscribe: vi.fn((fn: (s: any) => void) => { fn(null); return { unsubscribe: vi.fn() }; }) },
    };
    mockCapacitor = {
      pushToken$: { subscribe: vi.fn((fn: (t: any) => void) => fn(null)) },
      isNative: vi.fn().mockReturnValue(false),
      getPushToken: vi.fn().mockReturnValue(null),
    };

    service = new PushNotificationService(
      mockSupabase as any,
      mockUserSession as any,
      mockCapacitor as any
    );
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
  });
});
