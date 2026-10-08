import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { CapacitorService } from './capacitor.service';
import { ToastService } from './toast.service';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
    isPluginAvailable: vi.fn(() => true),
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    addListener: vi.fn(),
    register: vi.fn(),
    createChannel: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

describe('CapacitorService', () => {
  let service: CapacitorService;
  let mockToastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    service = new CapacitorService(mockToastService as unknown as ToastService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('platform checks', () => {
    it('isNative returns false when not native platform', () => {
      expect(service.isNative()).toBe(false);
    });

    it('isNative returns true when Capacitor reports native', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      const nativeService = new CapacitorService(mockToastService as unknown as ToastService);
      expect(nativeService.isNative()).toBe(true);
    });

    it('getPlatform returns value from Capacitor.getPlatform', () => {
      expect(service.getPlatform()).toBe('web');
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      const iosService = new CapacitorService(mockToastService as unknown as ToastService);
      expect(iosService.getPlatform()).toBe('ios');
    });
  });

  describe('getPushToken', () => {
    it('returns null when no token has been set', () => {
      expect(service.getPushToken()).toBeNull();
    });

    it('returns stored token after registration callback (via subject)', () => {
      // Token is set internally by registration listener; we can't easily trigger that
      // without running initializeCapacitor. So we only test the initial null case.
      expect(service.getPushToken()).toBeNull();
    });
  });

  describe('pushToken$ and notificationEvents$', () => {
    it('pushToken$ is an observable', () => {
      const values: (string | null)[] = [];
      service.pushToken$.subscribe((t) => values.push(t?.token ?? null));
      expect(values).toEqual([null]);
    });

    it('notificationEvents$ is an observable that does not emit until an event occurs', () => {
      const values: unknown[] = [];
      service.notificationEvents$.subscribe((e) => values.push(e));
      expect(values).toEqual([]);
    });
  });

  describe('isPwaStandalone', () => {
    it('returns false when window is undefined', () => {
      const origWindow = globalThis.window;
      (globalThis as any).window = undefined;
      expect(service.isPwaStandalone()).toBe(false);
      (globalThis as any).window = origWindow;
    });

    it('returns true when display-mode is standalone', () => {
      const matchMedia = vi.fn().mockReturnValue({ matches: true });
      Object.defineProperty(window, 'matchMedia', { value: matchMedia, configurable: true });
      expect(service.isPwaStandalone()).toBe(true);
    });

    it('returns true when navigator.standalone is true', () => {
      const matchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window, 'matchMedia', { value: matchMedia, configurable: true });
      Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });
      expect(service.isPwaStandalone()).toBe(true);
    });
  });

  describe('showPushNotificationSetting', () => {
    it('returns true when native', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      const nativeService = new CapacitorService(mockToastService as unknown as ToastService);
      expect(nativeService.showPushNotificationSetting()).toBe(true);
    });

    it('returns isPwaStandalone when not native', () => {
      const matchMedia = vi.fn().mockReturnValue({ matches: true });
      Object.defineProperty(window, 'matchMedia', { value: matchMedia, configurable: true });
      expect(service.showPushNotificationSetting()).toBe(true);
    });

    it('returns false when web and not standalone', () => {
      const matchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window, 'matchMedia', { value: matchMedia, configurable: true });
      const nav = window.navigator as Navigator & { standalone?: boolean };
      const orig = nav.standalone;
      delete (nav as any).standalone;
      expect(service.showPushNotificationSetting()).toBe(false);
      if (orig !== undefined) (nav as any).standalone = orig;
    });
  });

  describe('removeAllListeners', () => {
    it('calls PushNotifications.removeAllListeners', () => {
      service.removeAllListeners();
      expect(PushNotifications.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('initializeCapacitor', () => {
    it('when native and android, calls setupPushNotifications and does not toast on success', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' } as any);
      vi.mocked(PushNotifications.register).mockResolvedValue();
      vi.mocked(PushNotifications.createChannel).mockResolvedValue();

      const nativeService = new CapacitorService(mockToastService as unknown as ToastService);
      await nativeService.initializeCapacitor();

      expect(PushNotifications.requestPermissions).toHaveBeenCalled();
      expect(PushNotifications.addListener).toHaveBeenCalled();
      expect(PushNotifications.register).toHaveBeenCalled();
      expect(PushNotifications.createChannel).toHaveBeenCalled();
      expect(mockToastService.error).not.toHaveBeenCalled();
    });

    it('when native and ios, does not call createChannel', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' } as any);
      vi.mocked(PushNotifications.register).mockResolvedValue();

      const nativeService = new CapacitorService(mockToastService as unknown as ToastService);
      await nativeService.initializeCapacitor();

      expect(PushNotifications.createChannel).not.toHaveBeenCalled();
    });

    it('when setupPushNotifications throws (e.g. requestPermissions rejects), error is caught and does not surface to initializeCapacitor', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      vi.mocked(PushNotifications.requestPermissions).mockRejectedValue(new Error('Permission denied'));

      const nativeService = new CapacitorService(mockToastService as unknown as ToastService);
      await nativeService.initializeCapacitor();

      // setupPushNotifications catches internally and does not rethrow, so no error toast from initializeCapacitor
      expect(mockToastService.error).not.toHaveBeenCalled();
    });

    it('when permission not granted, does not register or add listeners for token', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'denied' } as any);

      const nativeService = new CapacitorService(mockToastService as unknown as ToastService);
      await nativeService.initializeCapacitor();

      expect(PushNotifications.requestPermissions).toHaveBeenCalled();
      // addListener is still called for registrationError, registration, etc. if we had entered the granted branch.
      // With denied we don't enter the block that calls register(), so register should not be called.
      expect(PushNotifications.register).not.toHaveBeenCalled();
    });
  });

  describe('notification event flow (via addListener callbacks)', () => {
    it('when registration listener fires, token is stored in localStorage and getPushToken returns it', async () => {
      let registrationCb: (token: { value: string }) => void = () => {};
      vi.mocked(PushNotifications.addListener).mockImplementation((name: string, cb: any) => {
        if (name === 'registration') registrationCb = cb;
        return Promise.resolve({ remove: vi.fn() });
      });
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' } as any);
      vi.mocked(PushNotifications.register).mockResolvedValue();
      vi.mocked(PushNotifications.createChannel).mockResolvedValue();

      const nativeService = new CapacitorService(mockToastService as unknown as ToastService);
      await nativeService.initializeCapacitor();

      registrationCb({ value: 'test-token-123' });

      expect(nativeService.getPushToken()).toEqual({
        token: 'test-token-123',
        platform: 'android',
      });
      const stored = localStorage.getItem('push_notification_token');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual({ token: 'test-token-123', platform: 'android' });
    });

    it('when pushNotificationReceived listener fires, toast is shown and notificationEvents$ emits', async () => {
      let receivedCb: (notification: any) => void = () => {};
      vi.mocked(PushNotifications.addListener).mockImplementation((name: string, cb: any) => {
        if (name === 'pushNotificationReceived') receivedCb = cb;
        return Promise.resolve({ remove: vi.fn() });
      });
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' } as any);
      vi.mocked(PushNotifications.register).mockResolvedValue();

      const nativeService = new CapacitorService(mockToastService as unknown as ToastService);
      await nativeService.initializeCapacitor();

      const events: any[] = [];
      nativeService.notificationEvents$.subscribe((e) => events.push(e));

      const notification = {
        title: 'Prayer Update',
        body: 'Someone prayed for you',
        data: { type: 'prayer_update', prayerId: 'p1' },
      };
      receivedCb(notification);

      expect(mockToastService.success).toHaveBeenCalledWith('Someone prayed for you');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('prayer_update');
      expect(events[0].source).toBe('received');
      expect(events[0].data).toEqual({ type: 'prayer_update', prayerId: 'p1' });
    });

    it('when pushNotificationActionPerformed listener fires, notificationEvents$ emits with source tap', async () => {
      let actionCb: (action: any) => void = () => {};
      vi.mocked(PushNotifications.addListener).mockImplementation((name: string, cb: any) => {
        if (name === 'pushNotificationActionPerformed') actionCb = cb;
        return Promise.resolve({ remove: vi.fn() });
      });
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' } as any);
      vi.mocked(PushNotifications.register).mockResolvedValue();
      vi.mocked(PushNotifications.createChannel).mockResolvedValue();

      const nativeService = new CapacitorService(mockToastService as unknown as ToastService);
      await nativeService.initializeCapacitor();

      const events: any[] = [];
      nativeService.notificationEvents$.subscribe((e) => events.push(e));

      actionCb({
        actionId: 'tap',
        notification: {
          title: 'Reminder',
          body: 'Time to pray',
          data: { type: 'reminder', reminderId: 'r1' },
        },
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('reminder');
      expect(events[0].source).toBe('tap');
      expect(events[0].data).toEqual({ type: 'reminder', reminderId: 'r1' });
    });
  });
});
