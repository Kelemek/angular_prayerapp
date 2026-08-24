import { Injectable } from '@angular/core';
import { Capacitor, CapacitorException } from '@capacitor/core';
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { ToastService } from './toast.service';
import { BehaviorSubject, Subject, Observable } from 'rxjs';

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export type PushNotificationEventType =
  | 'prayer_approved'
  | 'update_approved'
  | 'prayer_update'
  | 'reminder'
  | 'prayer_reminder'
  | 'prayer_item_reminder'
  | 'memorization_reminder'
  | 'verse_memorization_prayer'
  | 'generic';

export interface PushNotificationEvent {
  type: PushNotificationEventType;
  source: 'received' | 'tap';
  data?: Record<string, any>;
  raw: PushNotificationSchema | ActionPerformed['notification'];
}

@Injectable({
  providedIn: 'root'
})
export class CapacitorService {
  private pushTokenSubject = new BehaviorSubject<PushNotificationToken | null>(null);
  public pushToken$ = this.pushTokenSubject.asObservable();

  private notificationEventsSubject = new Subject<PushNotificationEvent>();
  /**
   * Stream of push notification events for the app to react to (e.g. refresh prayers).
   * Only emits in native apps where Capacitor PushNotifications is active.
   */
  public notificationEvents$ = this.notificationEventsSubject.asObservable();

  private isNativeApp = Capacitor.isNativePlatform();
  private currentPlatform = Capacitor.getPlatform();

  constructor(private toastService: ToastService) {
    if (this.isNativeApp) {
      this.initializeCapacitor();
    }
  }

  /**
   * Initialize Capacitor and platform-specific features
   */
  async initializeCapacitor(): Promise<void> {
    try {
      console.log(`Initializing Capacitor on ${this.currentPlatform}`);
      
      if (this.currentPlatform === 'ios' || this.currentPlatform === 'android') {
        await this.setupPushNotifications();
      }
    } catch (error) {
      console.error('Error initializing Capacitor:', error);
      this.toastService.error('Failed to initialize push notifications');
    }
  }

  /**
   * Set up push notifications for the app
   */
  private async setupPushNotifications(): Promise<void> {
    try {
      // Request notification permissions
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        // Add listeners BEFORE register() so we don't miss the token if APNs returns it immediately (real device).
        PushNotifications.addListener(
          'registrationError',
          (err: { error: string }) => {
            console.error('[Capacitor] Push registration error:', err?.error || err);
          }
        );

        PushNotifications.addListener(
          'registration',
          (token) => {
            const pushToken: PushNotificationToken = {
              token: token.value,
              platform: this.currentPlatform as 'ios' | 'android'
            };
            this.pushTokenSubject.next(pushToken);
            console.log('Push token received:', token.value);
            this.storePushToken(pushToken);
          }
        );

        // On Android, register() requires google-services.json in android/app/. Emulators often don't return a token; use a physical device for reliable push.
        try {
          await PushNotifications.register();
          console.log('[Capacitor] Push register() called; token will arrive via registration listener.');
        } catch (err) {
          if (this.currentPlatform === 'android') {
            console.warn('Android push registration failed (add google-services.json to android/app/ for FCM).', err);
          } else {
            console.error('[Capacitor] Push registration error:', err);
          }
        }

        // Listen for push notifications when the app is in the foreground
        PushNotifications.addListener(
          'pushNotificationReceived',
          async (notification) => {
            console.log('Push notification received:', notification);
            
            // Handle the notification
            this.handlePushNotification(notification);
          }
        );

        // Listen for push notifications when the app is opened from a notification
        PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action: ActionPerformed) => {
            console.log('Push notification action performed:', action);
            
            // Handle notification tap/action
            this.handlePushNotificationAction(action);
          }
        );

        // Create notification channels for Android
        if (this.currentPlatform === 'android') {
          await this.createAndroidNotificationChannels();
        }
      } else {
        console.warn('Notification permissions not granted');
      }
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  }

  /**
   * Create Android notification channels (required for Android 8+)
   */
  private async createAndroidNotificationChannels(): Promise<void> {
    try {
      // Create channels by calling createChannel for each
      const prayersChannel = {
        id: 'prayers',
        name: 'Prayer Updates',
        description: 'Notifications about prayer updates',
        importance: 2,
        sound: 'default',
        vibration: true,
        lightColor: '#39704D'
      };

      const remindersChannel = {
        id: 'reminders',
        name: 'Reminders',
        description: 'Prayer reminders and notifications',
        importance: 4,
        sound: 'default',
        vibration: true,
        lightColor: '#39704D'
      };

      await PushNotifications.createChannel(prayersChannel as any);
      await PushNotifications.createChannel(remindersChannel as any);
      
      console.log('Android notification channels created');
    } catch (error) {
      console.error('Error creating Android notification channels:', error);
    }
  }

  /**
   * Handle incoming push notification when app is in foreground
   */
  private handlePushNotification(notification: PushNotificationSchema): void {
    const title = notification.title || 'Prayer App';
    const body = notification.body || 'You have a new notification';
    
    // Show toast notification
    this.toastService.success(body);

    // Emit an app-level event so services/components can react (e.g. refresh prayers)
    const type = (notification.data?.type as PushNotificationEventType) || 'generic';
    this.notificationEventsSubject.next({
      type,
      source: 'received',
      data: notification.data || undefined,
      raw: notification
    });

    if (notification.data) {
      console.log('Notification data:', notification.data);
    }
  }

  /**
   * Handle push notification action (when user taps the notification)
   */
  private handlePushNotificationAction(action: ActionPerformed): void {
    console.log('User interacted with push notification:', action);

    const notification = action.notification;

    // Emit an app-level event so services/components can react (e.g. refresh prayers)
    const type = (notification.data?.type as PushNotificationEventType) || 'generic';
    this.notificationEventsSubject.next({
      type,
      source: 'tap',
      data: notification.data || undefined,
      raw: notification
    });
    
    // Navigate based on notification data (navigation wiring can be added later if desired)
    if (notification.data?.type === 'prayer_update') {
      // Navigate to prayer details
      console.log('Navigate to prayer:', notification.data.prayerId);
    } else if (notification.data?.type === 'reminder') {
      // Handle reminder
      console.log('Handle reminder:', notification.data.reminderId);
    }
  }

  /**
   * Store push token locally and send to backend
   */
  private storePushToken(pushToken: PushNotificationToken): void {
    // Store in localStorage for reference
    localStorage.setItem(
      'push_notification_token',
      JSON.stringify(pushToken)
    );

    // TODO: Send to your backend to store for this device
    // This would be done via your push-notification service
  }

  /**
   * Get the current push notification token
   */
  getPushToken(): PushNotificationToken | null {
    return this.pushTokenSubject.value;
  }

  /**
   * Check if running as a native app
   */
  isNative(): boolean {
    return this.isNativeApp;
  }

  /**
   * Check if running on web as an installed PWA (standalone display mode).
   * Used to show push notification settings when the app is "installed" even on web.
   */
  isPwaStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (nav.standalone === true)
    );
  }

  /**
   * Whether to show the push notification setting in UI.
   * True in native app always; true on web only when app is installed (PWA standalone).
   */
  showPushNotificationSetting(): boolean {
    return this.isNativeApp || this.isPwaStandalone();
  }

  /**
   * Get current platform ('ios', 'android', 'web', etc.)
   */
  getPlatform(): string {
    return this.currentPlatform;
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    PushNotifications.removeAllListeners();
  }
}
