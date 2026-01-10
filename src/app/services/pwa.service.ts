import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWAService manages Progressive Web App functionality
 * - Install prompts (Add to Home Screen)
 * - Online/offline detection
 * - Service worker management
 */
@Injectable({
  providedIn: 'root'
})
export class PWAService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installPromptSubject = new BehaviorSubject<boolean>(false);
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  private updateAvailableSubject = new BehaviorSubject<boolean>(false);

  public installPromptAvailable$: Observable<boolean> = this.installPromptSubject.asObservable();
  public isOnline$: Observable<boolean> = this.onlineSubject.asObservable();
  public updateAvailable$: Observable<boolean> = this.updateAvailableSubject.asObservable();

  constructor() {
    this.initializeListeners();
  }

  /**
   * Initialize PWA listeners
   */
  private initializeListeners(): void {
    // Install prompt listener
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.installPromptSubject.next(true);
      console.log('[PWA] Install prompt available');
    });

    // App installed listener
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.deferredPrompt = null;
      this.installPromptSubject.next(false);
    });

    // Online/offline listeners
    window.addEventListener('online', () => {
      console.log('[PWA] App is online');
      this.onlineSubject.next(true);
    });

    window.addEventListener('offline', () => {
      console.log('[PWA] App is offline');
      this.onlineSubject.next(false);
    });
  }

  /**
   * Check if service worker is supported
   */
  isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Check if PWA is installed as app
   */
  isInstalledAsApp(): boolean {
    // Check various methods of detection
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
    
    // @ts-ignore - iOS specific
    const isIOSApp = navigator.standalone === true;

    return isStandalone || isFullscreen || isMinimalUI || isIOSApp;
  }

  /**
   * Check current online status
   */
  getOnlineStatus(): boolean {
    return navigator.onLine;
  }

  /**
   * Prompt user to install app
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('[PWA] Install prompt not available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        this.deferredPrompt = null;
        this.installPromptSubject.next(false);
        return true;
      } else {
        console.log('[PWA] User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Error showing install prompt:', error);
      return false;
    }
  }

  /**
   * Check for service worker updates
   */
  checkForUpdates(): void {
    if (!this.isServiceWorkerSupported()) {
      return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.update().then(() => {
          if (registration.waiting) {
            console.log('[PWA] Update available');
            this.updateAvailableSubject.next(true);
          }
        }).catch((error) => {
          console.error('[PWA] Error checking for updates:', error);
        });
      });
    }).catch((error) => {
      console.error('[PWA] Error getting service worker registrations:', error);
    });
  }

  /**
   * Activate waiting service worker (requires page reload)
   */
  activateUpdate(): void {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // Reload page when service worker is activated
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Service worker activated, reloading page');
      window.location.reload();
    });
  }

  /**
   * Unregister all service workers (for testing or cleanup)
   */
  async unregisterServiceWorkers(): Promise<void> {
    if (!this.isServiceWorkerSupported()) {
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      console.log('[PWA] Service workers unregistered');
    } catch (error) {
      console.error('[PWA] Error unregistering service workers:', error);
    }
  }
}
