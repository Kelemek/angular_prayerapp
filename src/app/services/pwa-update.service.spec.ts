import { PWAUpdateService } from './pwa-update.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ApplicationRef } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

describe('PWAUpdateService', () => {
  let service: PWAUpdateService;
  let swUpdateMock: Partial<SwUpdate>;
  let appRefMock: Partial<ApplicationRef>;
  let versionUpdatesSubject: Subject<any>;
  let isStableSubject: BehaviorSubject<boolean>;

  beforeEach(() => {
    versionUpdatesSubject = new Subject<any>();
    isStableSubject = new BehaviorSubject<boolean>(false);

    swUpdateMock = {
      isEnabled: true,
      versionUpdates: versionUpdatesSubject.asObservable(),
      checkForUpdate: vi.fn().mockResolvedValue(true),
      activateUpdate: vi.fn().mockResolvedValue(undefined),
    };

    appRefMock = {
      isStable: isStableSubject.asObservable(),
    };

    // Create service directly with mocks instead of using TestBed
    service = new PWAUpdateService(swUpdateMock as SwUpdate, appRefMock as ApplicationRef);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize update detection on creation', () => {
    // Simulate app stabilization
    isStableSubject.next(true);

    // Should have subscribed to versionUpdates
    const subscription = service.updateAvailable$.subscribe(() => {});
    expect(subscription).toBeTruthy();
  });

  it('should detect VERSION_READY event and emit update available', () => {
    const updateSpy = vi.fn();
    service.updateAvailable$.subscribe(updateSpy);

    // Emit VERSION_READY event
    const versionReadyEvent: VersionReadyEvent = {
      type: 'VERSION_READY',
      latestVersion: { hash: 'newVersion123', appData: {} },
      currentVersion: { hash: 'oldVersion456', appData: {} },
    };

    versionUpdatesSubject.next(versionReadyEvent);

    expect(updateSpy).toHaveBeenCalledWith(true);
  });

  it('should ignore non-VERSION_READY events', () => {
    const updateSpy = vi.fn();
    let callCount = 0;
    
    service.updateAvailable$.subscribe(() => {
      callCount++;
      updateSpy();
    });

    // First call is the initial emission from BehaviorSubject
    expect(callCount).toBe(1);

    // Emit a different event type
    const noUpdateEvent = {
      type: 'NO_NEW_VERSION_DETECTED',
    };

    versionUpdatesSubject.next(noUpdateEvent);

    // Should still be 1 (no additional call from non-VERSION_READY event)
    expect(callCount).toBe(1);
  });

  it('should check for updates manually', async () => {
    service.checkForUpdates();

    expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
  });

  it('should apply update and reload page', async () => {
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});

    await service.applyUpdate();

    expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();

    reloadSpy.mockRestore();
  });

  it('should defer update and clear notification', () => {
    const updateSpy = vi.fn();
    service.updateAvailable$.subscribe(updateSpy);

    service.deferUpdate();

    expect(updateSpy).toHaveBeenCalledWith(false);
  });

  it('should return update availability status', () => {
    const available = service.isUpdateAvailable();
    expect(typeof available).toBe('boolean');
    expect(available).toBe(false);
  });

  it('should handle service worker not enabled gracefully', () => {
    const swUpdateDisabled: Partial<SwUpdate> = { isEnabled: false };
    
    const testService = new PWAUpdateService(swUpdateDisabled as SwUpdate, appRefMock as ApplicationRef);
    expect(testService).toBeTruthy();
    expect(testService.isUpdateAvailable()).toBe(false);
  });

  it('should handle checkForUpdate error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorMock = new Error('Update check failed');
    
    const errorSwUpdateMock: Partial<SwUpdate> = {
      isEnabled: true,
      versionUpdates: versionUpdatesSubject.asObservable(),
      checkForUpdate: vi.fn().mockRejectedValue(errorMock),
      activateUpdate: vi.fn(),
    };

    const testService = new PWAUpdateService(errorSwUpdateMock as SwUpdate, appRefMock as ApplicationRef);
    isStableSubject.next(true);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(consoleSpy).toHaveBeenCalledWith(
      '[PWAUpdate] Failed to check for updates:',
      errorMock
    );

    consoleSpy.mockRestore();
  });
});
