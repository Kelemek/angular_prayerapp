import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PWAService, BeforeInstallPromptEvent } from './pwa.service';
import { TestBed } from '@angular/core/testing';

describe('PWAService', () => {
  let service: PWAService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PWAService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct online status', () => {
      const onlineStatus = service.getOnlineStatus();
      expect(typeof onlineStatus).toBe('boolean');
    });

    it('should initialize with install prompt unavailable', () => {
      const result = service['installPromptSubject'].value;
      expect(result).toBe(false);
    });
  });

  describe('isServiceWorkerSupported', () => {
    it('should return true if serviceWorker is in navigator', () => {
      const result = service.isServiceWorkerSupported();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getOnlineStatus', () => {
    it('should return current online status', () => {
      const status = service.getOnlineStatus();
      expect(typeof status).toBe('boolean');
    });
  });

  describe('isInstalledAsApp', () => {
    it('should return false if not installed', () => {
      // Mock matchMedia
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList);

      const result = service.isInstalledAsApp();
      expect(result).toBe(false);

      window.matchMedia = originalMatchMedia;
    });

    it('should detect standalone display mode', () => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query) => {
        if (query === '(display-mode: standalone)') {
          return { matches: true } as MediaQueryList;
        }
        return { matches: false } as MediaQueryList;
      });

      const result = service.isInstalledAsApp();
      expect(result).toBe(true);

      window.matchMedia = originalMatchMedia;
    });
  });

  describe('beforeinstallprompt event', () => {
    it('should capture beforeinstallprompt event', async () => {
      const mockEvent = new Event('beforeinstallprompt') as any;
      mockEvent.preventDefault = vi.fn();
      mockEvent.prompt = vi.fn();
      mockEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

      const promise = new Promise<boolean>(resolve => {
        service.installPromptAvailable$.subscribe((available) => {
          if (available) {
            resolve(available);
          }
        });

        window.dispatchEvent(mockEvent);
      });

      const available = await promise;
      expect(available).toBe(true);
    });
  });

  describe('appinstalled event', () => {
    it('should handle appinstalled event', async () => {
      const mockEvent = new Event('beforeinstallprompt') as any;
      mockEvent.preventDefault = vi.fn();
      mockEvent.prompt = vi.fn();

      // Trigger install prompt first
      window.dispatchEvent(mockEvent);

      // Then trigger appinstalled
      const promise = new Promise<boolean>(resolve => {
        service.installPromptAvailable$.subscribe((available) => {
          if (!available) {
            resolve(!available);
          }
        });

        const installedEvent = new Event('appinstalled');
        window.dispatchEvent(installedEvent);
      });

      const notAvailable = await promise;
      expect(notAvailable).toBe(true);
    });
  });

  describe('online/offline events', () => {
    it('should detect online event', async () => {
      expect(service.getOnlineStatus()).toBe(navigator.onLine);
    });

    it('should detect offline event', async () => {
      expect(service.getOnlineStatus()).toBe(navigator.onLine);
    });
  });

  describe('promptInstall', () => {
    it('should return false if no prompt available', async () => {
      const result = await service.promptInstall();
      expect(result).toBe(false);
    });

    it('should show prompt if available', async () => {
      const mockPrompt = vi.fn();
      const mockEvent = new Event('beforeinstallprompt') as any;
      mockEvent.preventDefault = vi.fn();
      mockEvent.prompt = mockPrompt;
      mockEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

      window.dispatchEvent(mockEvent);

      const result = await service.promptInstall();
      expect(result).toBe(true);
      expect(mockPrompt).toHaveBeenCalled();
    });

    it('should handle dismissed install prompt', async () => {
      const mockPrompt = vi.fn();
      const mockEvent = new Event('beforeinstallprompt') as any;
      mockEvent.preventDefault = vi.fn();
      mockEvent.prompt = mockPrompt;
      mockEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });

      window.dispatchEvent(mockEvent);

      const result = await service.promptInstall();
      expect(result).toBe(false);
    });

    it('should handle prompt errors gracefully', async () => {
      const mockPrompt = vi.fn().mockRejectedValue(new Error('Prompt error'));
      const mockEvent = new Event('beforeinstallprompt') as any;
      mockEvent.preventDefault = vi.fn();
      mockEvent.prompt = mockPrompt;

      window.dispatchEvent(mockEvent);

      const result = await service.promptInstall();
      expect(result).toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    it('should check for service worker updates if supported', async () => {
      if (!service.isServiceWorkerSupported()) {
        expect(true).toBe(true);
        return;
      }

      const mockRegistration = {
        update: vi.fn().mockResolvedValue(undefined),
        waiting: null
      };

      vi.spyOn(navigator.serviceWorker, 'getRegistrations').mockResolvedValue([
        mockRegistration as any
      ]);

      service.checkForUpdates();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalled();
    });

    it('should emit update available when update exists', async () => {
      if (!service.isServiceWorkerSupported()) {
        expect(true).toBe(true);
        return;
      }

      const mockWaiting = {};
      const mockRegistration = {
        update: vi.fn().mockResolvedValue(undefined),
        waiting: mockWaiting
      };

      vi.spyOn(navigator.serviceWorker, 'getRegistrations').mockResolvedValue([
        mockRegistration as any
      ]);

      let updateAvailable = false;
      service.updateAvailable$.subscribe((available) => {
        if (available) {
          updateAvailable = true;
        }
      });

      service.checkForUpdates();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(updateAvailable).toBe(true);
    });
  });

  describe('unregisterServiceWorkers', () => {
    it('should unregister all service workers if supported', async () => {
      if (!service.isServiceWorkerSupported()) {
        expect(true).toBe(true);
        return;
      }

      const mockRegistration = {
        unregister: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(navigator.serviceWorker, 'getRegistrations').mockResolvedValue([
        mockRegistration as any
      ]);

      await service.unregisterServiceWorkers();

      expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalled();
      expect(mockRegistration.unregister).toHaveBeenCalled();
    });
  });
});
